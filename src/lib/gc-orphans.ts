import { prisma } from "@/lib/db";
import { listAllObjects } from "@/lib/storage";

/**
 * Recolector de objetos huérfanos del bucket - la lógica pura, sin HTTP.
 * El endpoint que la expone es /api/files/gc-orphans (GET reporta, POST borra).
 *
 *   1. Lista todos los objetos del bucket (con su fecha de modificación).
 *   2. Arma el set de keys REFERENCIADAS por la base. Dos capas:
 *        a) fuentes explícitas, campo por campo (ver referenciasExplicitas);
 *        b) un barrido genérico por SQL sobre toda columna de texto/json/array
 *           del schema, que atrapa cualquier ruta embebida en HTML, JSON o en
 *           un campo que nadie enumeró todavía.
 *   3. Todo objeto que no esté referenciado es candidato a huérfano, salvo que
 *      lo salve una de las dos redes de seguridad:
 *        - VENTANA DE GRACIA: nada subido en las últimas 24 h se borra. Cubre
 *          la carrera entre subir el archivo y guardar la fila.
 *        - FRENO DE MANO: si los huérfanos superan el 30% del bucket, no se
 *          borra nada. Esa proporción no es basura acumulada, es un error de
 *          configuración (una fuente que dejó de leerse, la base equivocada).
 *
 * ⚠️ El borrado de archivos NO se hace desde la UI al sacar una foto (eso
 * borraba archivos todavía referenciados; ver el comentario en
 * ImageUploader.handleRemoveImage). El único que borra es este recolector.
 *
 * `collectOrphans` es solo lectura: lista y consulta, nunca borra.
 */

/** Nada más nuevo que esto se borra, aunque parezca huérfano. */
export const VENTANA_GRACIA_MS = 24 * 60 * 60 * 1000;

/** Si los huérfanos pasan este porcentaje del bucket, frenamos todo. */
export const RATIO_MAXIMO_HUERFANOS = 0.3;

// ---------------------------------------------------------------------------
// Extracción de keys desde valores de la base
// ---------------------------------------------------------------------------

/**
 * Captura `/api/image/<key>` incluso embebido en HTML, JSON o markdown.
 *
 * La clase excluye separadores porque las keys que generamos nunca los tienen
 * (uploadBuffer sanitiza el nombre a [A-Za-z0-9._-]). Sin la coma, un array
 * de Postgres serializado como `{/api/image/a,/api/image/b}` se leía como una
 * sola key gigante y la segunda imagen quedaba sin proteger.
 */
const RE_URL_PROXY = /\/api\/image\/([^\s"'?<>)\]}{,;\\]+)/g;

/**
 * Mete en `sink` toda key de bucket que se pueda deducir de `value`. Recorre
 * arrays y objetos (para columnas Json y String[]).
 *
 * Es deliberadamente generosa: sumar de más solo protege archivos, mientras
 * que quedarse corta borra archivos en uso. Ante la duda, sumamos.
 */
function extraerKeys(value: unknown, sink: Set<string>): void {
  if (value == null) return;

  if (Array.isArray(value)) {
    for (const v of value) extraerKeys(v, sink);
    return;
  }

  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extraerKeys(v, sink);
    }
    return;
  }

  if (typeof value !== "string") return;

  // 1. Rutas servidas por el proxy /api/image/<key>.
  RE_URL_PROXY.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_URL_PROXY.exec(value)) !== null) {
    const key = decodificar(m[1].split("?")[0]);
    if (key) sink.add(key);
  }

  // 2. Valores guardados como key cruda del bucket (`paquetes/168...-foo.webp`)
  //    o como ruta con barra inicial. No exigimos que exista: si no matchea
  //    ningún objeto, no molesta.
  const crudo = value.trim().split("?")[0].split("#")[0].replace(/^\/+/, "");
  if (
    crudo &&
    crudo.length < 512 &&
    crudo.includes("/") &&
    !crudo.includes("://") &&
    !crudo.startsWith("api/image/") &&
    /^[\w./%@()+-]+$/.test(crudo)
  ) {
    sink.add(decodificar(crudo));
  }
}

function decodificar(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// ---------------------------------------------------------------------------
// Barrido genérico por SQL
// ---------------------------------------------------------------------------

interface ColumnaTexto {
  table_name: string;
  column_name: string;
}

/**
 * Escanea TODA columna de texto / varchar / json / jsonb / array de texto del
 * schema `public` buscando valores que parezcan rutas del bucket. Es la red
 * que atrapa lo que las fuentes explícitas no enumeran: HTML con `<img>`
 * embebido, respuestas de formularios dinámicos, campos nuevos que alguien
 * agregue al schema y se olvide de sumar acá.
 *
 * Solo lectura. Si falla, el POST se aborta (ver arriba).
 */
async function barridoGenerico(
  prefijosBucket: string[],
  sink: Set<string>,
): Promise<{ ok: boolean; columnas: number; matches: number; error?: string }> {
  try {
    const columnas = await prisma.$queryRaw<ColumnaTexto[]>`
      SELECT table_name, column_name
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name NOT LIKE '\\_%'
        AND (
          c.data_type IN ('text', 'character varying', 'character', 'json', 'jsonb')
          OR (c.data_type = 'ARRAY' AND c.udt_name IN ('_text', '_varchar', '_bpchar'))
        )
        AND EXISTS (
          SELECT 1 FROM information_schema.tables t
          WHERE t.table_schema = c.table_schema
            AND t.table_name = c.table_name
            AND t.table_type = 'BASE TABLE'
        )
    `;

    // Patrones LIKE: el proxy de imágenes, más cada carpeta de primer nivel que
    // exista hoy en el bucket (así también encontramos keys crudas).
    const patrones = [
      "%/api/image/%",
      ...prefijosBucket.map((p) => `%${p}/%`),
    ];

    let matches = 0;
    const LOTE = 40;
    for (let i = 0; i < columnas.length; i += LOTE) {
      const lote = columnas.slice(i, i + LOTE);
      const sql = lote
        .map(
          (c) =>
            `SELECT DISTINCT ${ident(c.column_name)}::text AS v ` +
            `FROM "public".${ident(c.table_name)} ` +
            `WHERE ${ident(c.column_name)}::text LIKE ANY ($1::text[])`,
        )
        .join(" UNION ALL ");
      const filas = await prisma.$queryRawUnsafe<{ v: string | null }[]>(
        sql,
        patrones,
      );
      for (const f of filas) {
        if (!f.v) continue;
        matches++;
        extraerKeys(f.v, sink);
      }
    }

    return { ok: true, columnas: columnas.length, matches };
  } catch (err) {
    return {
      ok: false,
      columnas: 0,
      matches: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Cita un identificador de Postgres. Los nombres vienen de information_schema. */
function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// Fuentes explícitas
// ---------------------------------------------------------------------------

/**
 * REFERENCIAS - todo campo del schema que puede guardar la URL o la key de un
 * archivo del bucket. Si agregás un campo así al schema, sumalo acá.
 *
 * Los blobs de texto largo (descripciones, bodyHtml, itinerarioPublico, notas,
 * respuestas de formularios) no se enumeran: los cubre el barrido genérico.
 *
 * Ojo: NO filtramos por `deletedAt`. Una fila borrada lógicamente se puede
 * restaurar y sigue apuntando a sus archivos.
 */
async function referenciasExplicitas(): Promise<Map<string, Set<string>>> {
  const [
    paqueteFotos,
    alojamientoFotos,
    aereos,
    paquetes,
    regiones,
    traslados,
    categorias,
    testimonios,
    siteSettings,
    postulaciones,
    cotizadorLandings,
    faqTopics,
    clientes,
    personas,
  ] = await Promise.all([
    prisma.paqueteFoto.findMany({ select: { url: true } }),
    prisma.alojamientoFoto.findMany({ select: { url: true } }),
    prisma.aereo.findMany({ select: { itinerarioImagenes: true } }),
    prisma.paquete.findMany({ select: { heroImage: true } }),
    prisma.region.findMany({ select: { heroImage: true } }),
    prisma.traslado.findMany({ select: { imagenes: true } }),
    prisma.categoriaDestacada.findMany({ select: { imagen: true } }),
    prisma.testimonio.findMany({ select: { imageUrl: true } }),
    prisma.siteSetting.findMany({ select: { value: true } }),
    prisma.postulacion.findMany({ select: { cvUrl: true } }),
    prisma.cotizadorLanding.findMany({ select: { logoUrl: true } }),
    prisma.faqTopic.findMany({ select: { iconUrl: true } }),
    prisma.clienteCorporativo.findMany({ select: { logoUrl: true } }),
    prisma.personaContacto.findMany({ select: { photoUrl: true } }),
  ]);

  const fuentes: [string, unknown[]][] = [
    ["PaqueteFoto.url", paqueteFotos.map((r) => r.url)],
    ["AlojamientoFoto.url", alojamientoFotos.map((r) => r.url)],
    ["Aereo.itinerarioImagenes[]", aereos.map((r) => r.itinerarioImagenes)],
    ["Paquete.heroImage", paquetes.map((r) => r.heroImage)],
    ["Region.heroImage", regiones.map((r) => r.heroImage)],
    ["Traslado.imagenes[]", traslados.map((r) => r.imagenes)],
    ["CategoriaDestacada.imagen", categorias.map((r) => r.imagen)],
    ["Testimonio.imageUrl", testimonios.map((r) => r.imageUrl)],
    ["SiteSetting.value", siteSettings.map((r) => r.value)],
    ["Postulacion.cvUrl", postulaciones.map((r) => r.cvUrl)],
    ["CotizadorLanding.logoUrl", cotizadorLandings.map((r) => r.logoUrl)],
    ["FaqTopic.iconUrl", faqTopics.map((r) => r.iconUrl)],
    ["ClienteCorporativo.logoUrl", clientes.map((r) => r.logoUrl)],
    ["PersonaContacto.photoUrl", personas.map((r) => r.photoUrl)],
  ];

  const porFuente = new Map<string, Set<string>>();
  for (const [nombre, valores] of fuentes) {
    const set = new Set<string>();
    for (const v of valores) extraerKeys(v, set);
    porFuente.set(nombre, set);
  }
  return porFuente;
}

// ---------------------------------------------------------------------------
// collectOrphans
// ---------------------------------------------------------------------------

export type ReporteHuerfanos = Awaited<ReturnType<typeof collectOrphans>>;

/** Solo lectura: lista el bucket, consulta la base y saca cuentas. No borra. */
export async function collectOrphans() {
  // 1. Bucket completo, con fechas.
  const objetos = await listAllObjects();
  const enBucket = new Set(objetos.map((o) => o.key));

  // Carpetas de primer nivel presentes hoy en el bucket. Alimentan el barrido
  // genérico para encontrar keys guardadas crudas.
  const prefijos = Array.from(
    new Set(
      objetos
        .map((o) => o.key.split("/")[0])
        .filter((p) => p && /^[\w.-]+$/.test(p)),
    ),
  );

  // 2. Referencias.
  const porFuente = await referenciasExplicitas();
  const genericas = new Set<string>();
  const scanGenerico = await barridoGenerico(prefijos, genericas);
  porFuente.set("(barrido genérico SQL)", genericas);

  const referenced = new Set<string>();
  porFuente.forEach((set) => {
    set.forEach((k) => referenced.add(k));
  });

  // 3. Diff + redes de seguridad.
  const ahora = Date.now();
  const orphans: string[] = [];
  let protegidosPorAntiguedad = 0;

  for (const obj of objetos) {
    if (referenced.has(obj.key)) continue;
    // Sin fecha no arriesgamos: puede ser recién subido.
    const edadMs =
      obj.lastModified == null ? 0 : ahora - obj.lastModified.getTime();
    if (edadMs < VENTANA_GRACIA_MS) {
      protegidosPorAntiguedad++;
      continue;
    }
    orphans.push(obj.key);
  }

  const ratio = objetos.length > 0 ? orphans.length / objetos.length : 0;

  // Diagnóstico: referencias de la base que ya no existen en el bucket. Son
  // imágenes rotas en el sitio; este endpoint no las arregla, solo las reporta.
  // Filtramos por el patrón de key que genera uploadBuffer
  // (`<carpeta>/<epoch-ms>-<nombre>`) para no listar rutas de assets estáticos
  // de /public que el extractor generoso también junta.
  const referenciasRotas = Array.from(referenced).filter((k) => {
    if (enBucket.has(k)) return false;
    if (!/\/\d{10,}-/.test(k)) return false;
    return prefijos.some((p) => k.startsWith(`${p}/`));
  });

  const detallePorFuente: Record<string, { refs: number; enBucket: number }> = {};
  porFuente.forEach((set, nombre) => {
    let presentes = 0;
    set.forEach((k) => {
      if (enBucket.has(k)) presentes++;
    });
    detallePorFuente[nombre] = { refs: set.size, enBucket: presentes };
  });

  let referenciadasEnBucket = 0;
  referenced.forEach((k) => {
    if (enBucket.has(k)) referenciadasEnBucket++;
  });

  return {
    bucket: {
      objetos: objetos.length,
      bytes: objetos.reduce((acc, o) => acc + o.size, 0),
    },
    protegidos: {
      porFuente: detallePorFuente,
      referenciasUnicas: referenced.size,
      objetosReferenciadosEnBucket: referenciadasEnBucket,
      porAntiguedad: protegidosPorAntiguedad,
      ventanaGraciaHoras: VENTANA_GRACIA_MS / 3_600_000,
    },
    referenciasRotas: {
      cantidad: referenciasRotas.length,
      keys: referenciasRotas,
    },
    scanGenerico,
    frenoDeMano: {
      umbral: RATIO_MAXIMO_HUERFANOS,
      ratio,
      activado: ratio > RATIO_MAXIMO_HUERFANOS,
    },
    // Campos históricos, para no romper a quien lea la respuesta vieja.
    bucketKeys: objetos.length,
    referencedKeys: referenced.size,
    orphanCount: orphans.length,
    orphans,
  };
}
