/**
 * Auditoría de la resolución de región de los paquetes públicos.
 *
 * SOLO LECTURA: no escribe nada en la base, no acepta APPLY. Reproduce, tal
 * cual, el criterio con el que el sitio público arma la URL de un paquete
 * (/destinos/<region>/<slug>):
 *
 *     paquete.destinos[0] → ciudad → pais → regionId
 *       → mapa { regionId → slug } de las regiones DEL BRAND PÚBLICO
 *       → si el regionId no está en ese mapa, el sitio cae en silencio a
 *         regiones[0].slug (hoy "europa", la región de menor `orden`).
 *
 * Ese fallback silencioso es el origen del bug reportado: paquetes cuyo país
 * cuelga de una región de OTRA marca (o cuya ciudad pertenece a otra marca)
 * terminan publicados bajo /destinos/europa/… sin importar el destino real.
 *
 * Reporta:
 *   1. BRAND_ID público y el juego de regiones de cada marca.
 *   2. Paquetes publicados que caen al fallback, con la región que les
 *      correspondería (match por slug contra el juego de la otra marca).
 *   3. Destinos de paquetes públicos que apuntan a ciudades/países de otra
 *      marca, y si existe la ciudad equivalente en el brand público.
 *   4. Países del brand público cuyo regionId apunta a una región de otra
 *      marca.
 *   5. Países duplicados (mismo nombre) dentro del brand público.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/audit-regiones-paquetes.ts
 */
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

async function main() {
  console.log("=".repeat(78));
  console.log(`AUDITORÍA DE REGIONES DE PAQUETES — BRAND_ID público: ${BRAND_ID}`);
  console.log("=".repeat(78));

  // ── 1. Regiones de todas las marcas ───────────────────────────────────────
  const todasLasRegiones = await prisma.region.findMany({
    orderBy: [{ brandId: "asc" }, { orden: "asc" }],
    select: { id: true, brandId: true, nombre: true, slug: true, orden: true },
  });
  const regionesPublicas = todasLasRegiones.filter((r) => r.brandId === BRAND_ID);
  const regionPorId = new Map(todasLasRegiones.map((r) => [r.id, r]));
  const slugPorRegionIdPublica = new Map(regionesPublicas.map((r) => [r.id, r.slug]));
  const publicaPorSlug = new Map(regionesPublicas.map((r) => [r.slug, r]));
  const fallbackRegionSlug = regionesPublicas[0]?.slug ?? "(ninguna)";

  console.log(`\n[1] REGIONES POR MARCA`);
  for (const r of todasLasRegiones) {
    const marca = r.brandId === BRAND_ID ? "PÚBLICA " : "otra    ";
    console.log(
      `  ${marca} ${r.brandId.padEnd(8)} ${r.id.padEnd(10)} orden=${r.orden} slug="${r.slug}" (${r.nombre})`,
    );
  }
  console.log(
    `\n  Fallback silencioso del sitio hoy = regiones[0].slug = "${fallbackRegionSlug}"`,
  );

  // ── 2. Resolución de región por paquete publicado ─────────────────────────
  const paquetes = await prisma.paquete.findMany({
    where: { brandId: BRAND_ID, publicado: true, deletedAt: null },
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      titulo: true,
      destinos: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          orden: true,
          ciudad: {
            select: {
              id: true,
              nombre: true,
              pais: {
                select: { id: true, nombre: true, brandId: true, regionId: true },
              },
            },
          },
        },
      },
    },
  });

  console.log(`\n[2] RESOLUCIÓN DE REGIÓN — ${paquetes.length} paquete(s) publicado(s)`);

  type Caso = {
    slug: string | null;
    titulo: string;
    ciudad: string;
    pais: string;
    paisBrand: string;
    regionId: string | null;
    esperado: string | null;
    motivo: string;
  };
  const alFallback: Caso[] = [];
  const okPorRegion = new Map<string, number>();

  for (const p of paquetes) {
    const d0 = p.destinos[0];
    const pais = d0?.ciudad?.pais ?? null;
    const regionId = pais?.regionId ?? null;
    const slugDirecto = regionId ? slugPorRegionIdPublica.get(regionId) : undefined;

    if (slugDirecto) {
      okPorRegion.set(slugDirecto, (okPorRegion.get(slugDirecto) ?? 0) + 1);
      continue;
    }

    // Cae al fallback. ¿A qué región DEBERÍA ir? Si el regionId existe pero es
    // de otra marca, matcheamos por slug contra el juego público.
    const regionCruzada = regionId ? regionPorId.get(regionId) : undefined;
    const esperado = regionCruzada
      ? (publicaPorSlug.get(regionCruzada.slug)?.slug ?? null)
      : null;
    const motivo = !d0
      ? "el paquete no tiene destinos cargados"
      : !d0.ciudad
        ? "el destino[0] no tiene ciudad"
        : !pais
          ? "la ciudad del destino[0] no tiene país"
          : !regionId
            ? "el país del destino[0] no tiene regionId"
            : !regionCruzada
              ? `regionId "${regionId}" no existe en la tabla Region`
              : `regionId "${regionId}" es de la marca ${regionCruzada.brandId} (slug "${regionCruzada.slug}")`;

    alFallback.push({
      slug: p.slug,
      titulo: p.titulo,
      ciudad: d0?.ciudad?.nombre ?? "(sin ciudad)",
      pais: pais?.nombre ?? "(sin país)",
      paisBrand: pais?.brandId ?? "(n/a)",
      regionId,
      esperado,
      motivo,
    });
  }

  console.log(`\n  Resuelven bien (${paquetes.length - alFallback.length}):`);
  for (const [slug, n] of Array.from(okPorRegion.entries()).sort()) {
    console.log(`     ${slug.padEnd(18)} ${n}`);
  }

  console.log(`\n  CAEN AL FALLBACK "${fallbackRegionSlug}" (${alFallback.length}):`);
  if (alFallback.length === 0) {
    console.log("     — ninguno —");
  }
  for (const c of alFallback) {
    console.log(`\n     • ${c.slug ?? "(sin slug)"} — ${c.titulo}`);
    console.log(`         destino[0]: ciudad="${c.ciudad}" país="${c.pais}" (brand ${c.paisBrand})`);
    console.log(`         regionId del país: ${c.regionId ?? "NULL"}`);
    console.log(`         motivo: ${c.motivo}`);
    console.log(`         URL actual  : /destinos/${fallbackRegionSlug}/${c.slug ?? ""}`);
    console.log(
      `         URL correcta: ${c.esperado ? `/destinos/${c.esperado}/${c.slug ?? ""}` : "NO RESOLUBLE — hay que corregir los datos a mano"}`,
    );
  }

  // ── 3. Destinos que apuntan a ciudades/países de otra marca ───────────────
  console.log(`\n[3] DESTINOS DE PAQUETES PÚBLICOS QUE APUNTAN A OTRA MARCA`);
  const ciudadesPublicas = await prisma.ciudad.findMany({
    where: { pais: { brandId: BRAND_ID } },
    select: {
      id: true,
      nombre: true,
      pais: { select: { id: true, nombre: true, brandId: true, regionId: true } },
    },
  });
  const ciudadPublicaPorClave = new Map<string, (typeof ciudadesPublicas)[number][]>();
  for (const c of ciudadesPublicas) {
    const k = `${norm(c.nombre)}||${norm(c.pais.nombre)}`;
    const arr = ciudadPublicaPorClave.get(k) ?? [];
    arr.push(c);
    ciudadPublicaPorClave.set(k, arr);
  }

  let cruzados = 0;
  for (const p of paquetes) {
    for (const d of p.destinos) {
      const pais = d.ciudad?.pais;
      if (!pais || pais.brandId === BRAND_ID) continue;
      cruzados++;
      const k = `${norm(d.ciudad!.nombre)}||${norm(pais.nombre)}`;
      const equivalentes = ciudadPublicaPorClave.get(k) ?? [];
      console.log(`\n     • paquete "${p.slug ?? p.id}" destino[orden=${d.orden}] (${d.id})`);
      console.log(
        `         ciudad="${d.ciudad!.nombre}" (${d.ciudad!.id}) país="${pais.nombre}" (${pais.id}) brand=${pais.brandId}`,
      );
      if (equivalentes.length === 0) {
        console.log(`         equivalente en ${BRAND_ID}: NO EXISTE — crear a mano`);
      } else {
        for (const e of equivalentes) {
          console.log(
            `         equivalente en ${BRAND_ID}: ciudad ${e.id} ("${e.nombre}") país ${e.pais.id} region=${e.pais.regionId}`,
          );
        }
      }
    }
  }
  if (cruzados === 0) {
    console.log("     — ningún destino de paquete público apunta a otra marca —");
  } else {
    console.log(`\n     Total destinos cruzados: ${cruzados}`);
  }

  // ── 4. Países del brand público con regionId de otra marca ────────────────
  console.log(`\n[4] PAÍSES DE ${BRAND_ID} CON regionId DE OTRA MARCA (o inválido/NULL)`);
  const paisesPublicos = await prisma.pais.findMany({
    where: { brandId: BRAND_ID },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, regionId: true },
  });
  let paisesRotos = 0;
  for (const pais of paisesPublicos) {
    if (pais.regionId && slugPorRegionIdPublica.has(pais.regionId)) continue;
    paisesRotos++;
    const reg = pais.regionId ? regionPorId.get(pais.regionId) : undefined;
    const destinoSugerido = reg ? publicaPorSlug.get(reg.slug) : undefined;
    const nCiudades = await prisma.ciudad.count({ where: { paisId: pais.id } });
    const nDestinos = await prisma.paqueteDestino.count({
      where: { ciudad: { paisId: pais.id } },
    });
    console.log(`\n     • "${pais.nombre}" (${pais.id})`);
    console.log(
      `         regionId=${pais.regionId ?? "NULL"}` +
        (reg ? ` → región "${reg.slug}" de la marca ${reg.brandId}` : " → región inexistente"),
    );
    console.log(`         ciudades=${nCiudades} · destinos de paquete que las usan=${nDestinos}`);
    console.log(
      `         debería apuntar a: ${destinoSugerido ? `${destinoSugerido.id} ("${destinoSugerido.slug}", ${BRAND_ID})` : "SIN EQUIVALENTE por slug — revisar a mano"}`,
    );
  }
  if (paisesRotos === 0) {
    console.log(`     — todos los países de ${BRAND_ID} cuelgan de una región de ${BRAND_ID} —`);
  }

  // ── 5. Países duplicados dentro del brand público ─────────────────────────
  console.log(`\n[5] PAÍSES DUPLICADOS (mismo nombre) DENTRO DE ${BRAND_ID}`);
  const porNombre = new Map<string, typeof paisesPublicos>();
  for (const p of paisesPublicos) {
    const k = norm(p.nombre);
    const arr = porNombre.get(k) ?? [];
    arr.push(p);
    porNombre.set(k, arr);
  }
  let dups = 0;
  for (const [k, lista] of Array.from(porNombre.entries())) {
    if (lista.length < 2) continue;
    dups++;
    console.log(`\n     • "${k}" → ${lista.length} filas`);
    for (const pais of lista) {
      const nCiudades = await prisma.ciudad.count({ where: { paisId: pais.id } });
      const nDestinos = await prisma.paqueteDestino.count({
        where: { ciudad: { paisId: pais.id } },
      });
      console.log(
        `         - ${pais.id} nombre="${pais.nombre}" regionId=${pais.regionId ?? "NULL"} · ciudades=${nCiudades} · destinos=${nDestinos}`,
      );
    }
  }
  if (dups === 0) console.log(`     — sin duplicados en ${BRAND_ID} —`);

  // Referencia: duplicados en las otras marcas (informativo, no se toca nada).
  const paisesOtros = await prisma.pais.findMany({
    where: { brandId: { not: BRAND_ID } },
    orderBy: [{ brandId: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, brandId: true, regionId: true },
  });
  const porNombreOtros = new Map<string, typeof paisesOtros>();
  for (const p of paisesOtros) {
    const k = `${p.brandId}||${norm(p.nombre)}`;
    const arr = porNombreOtros.get(k) ?? [];
    arr.push(p);
    porNombreOtros.set(k, arr);
  }
  const dupsOtros = Array.from(porNombreOtros.entries()).filter(([, l]) => l.length > 1);
  if (dupsOtros.length > 0) {
    console.log(`\n     (informativo) duplicados en otras marcas — NO se tocan:`);
    for (const [k, lista] of dupsOtros) {
      console.log(`       • ${k} → ${lista.map((p) => p.id).join(", ")}`);
    }
  }

  console.log(`\n${"=".repeat(78)}\nFIN — script de solo lectura, no se modificó nada.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
