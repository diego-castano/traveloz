"use server";

// ---------------------------------------------------------------------------
// Alta rápida de hoteles desde el cotizador.
//
// El buscador de hoteles del cotizador siempre tuvo dos salidas: elegir uno del
// catálogo o escribirlo como texto libre. El texto libre no queda en ningún
// lado —vive lo que dura la sesión del vendedor— así que el mismo hotel se
// vuelve a tipear en cada cotización y nunca entra al ABM. Esta action es la
// tercera salida: crearlo en el catálogo, ahí mismo, con lo mínimo (nombre,
// ciudad y estrellas). Después alguien le carga fotos y precios desde
// /backend/alojamientos.
//
// ⚠️ POR QUÉ `requireAuth()` Y NO `requireCanEdit()`
// `requireCanEdit` hoy solo deja pasar a ADMIN: VENDEDOR y MARKETING son
// read-only del lado del servidor. Este alta es la EXCEPCIÓN pedida por el
// cliente —"deben poder crear hoteles rápido"— y el que cotiza es el vendedor,
// no el máster. Así que la puerta es `requireAuth()` + un chequeo de rol propio
// acá abajo: ADMIN y VENDEDOR sí, MARKETING no. Es deliberado y acotado a este
// alta; cualquier otra mutación de servicios sigue con `requireCanEdit`.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateSequentialId } from "@/lib/sequential-id";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "alojamiento-rapido.actions" });

/** Los mismos tags que invalida `bustServicesCacheGlobal()` en
 *  service.actions.ts: el catálogo de servicios del panel y las páginas
 *  públicas de paquetes, que renderizan el nombre y la categoría del hotel. */
const SERVICES_GLOBAL_TAG = "services-global";
const PUBLIC_SITE_PACKAGES_TAG = "paquetes";

/** Quiénes pueden dar de alta un hotel desde el cotizador. */
const ROLES_HABILITADOS = new Set(["ADMIN", "VENDEDOR"]);

const Entrada = z.object({
  nombre: z.string().trim().min(2, "El nombre del hotel es muy corto").max(120),
  ciudadId: z.string().trim().min(1, "Elegí la ciudad"),
  categoria: z.number().int().min(1).max(5).nullish(),
});

/**
 * El hotel tal cual lo espera el provider.
 *
 * Son TODOS los escalares del modelo más `ciudad`: es exactamente lo que trae
 * `getBaseServices()` (`include: { ciudad }`, sin `select`), y por lo tanto
 * exactamente la forma de las filas que ya viven en `ServiceProvider`. Si acá
 * viajara un subconjunto, la fila que mete `ADD_ALOJAMIENTO` quedaría más
 * pobre que sus vecinas hasta la próxima recarga y cualquier pantalla que lea
 * un campo de los que faltan mostraría un hueco solo en el hotel recién
 * creado. Un campo nuevo en el modelo se suma acá y en `SELECT`.
 */
export interface AlojamientoRapido {
  id: string;
  brandId: string;
  nombre: string;
  ciudadId: string | null;
  paisId: string | null;
  categoria: number | null;
  categoriaTexto: string | null;
  sitioWeb: string | null;
  comentarios: string | null;
  ubicacion: string | null;
  aclaracion: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  /** La relación que `ServiceProvider` trae con `getAllServices` y que
   *  `catalogo.js` lee para mostrar la ciudad sin cruzar índices. */
  ciudad: { id: string; nombre: string; paisId: string } | null;
}

export type ResultadoAlojamientoRapido =
  | { ok: true; alojamiento: AlojamientoRapido; existente: boolean }
  | { ok: false; error: string };

/** Sin acentos, sin mayúsculas, sin espacios de más: así se comparan dos
 *  nombres de hotel escritos por dos personas distintas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SELECT = {
  id: true,
  brandId: true,
  nombre: true,
  ciudadId: true,
  paisId: true,
  categoria: true,
  categoriaTexto: true,
  sitioWeb: true,
  comentarios: true,
  ubicacion: true,
  aclaracion: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  ciudad: { select: { id: true, nombre: true, paisId: true } },
} as const;

/** Lo mínimo para comparar nombres: el ganador se trae después completo. */
const SELECT_DEDUP = { id: true, nombre: true } as const;

/**
 * Cuántos hoteles de la ciudad se miran para el dedup.
 *
 * Una ciudad del catálogo tiene decenas, no miles. El tope está para que una
 * ciudad degenerada (una importación duplicada, por ejemplo) no se traiga toda
 * la tabla; ordenado por nombre para que el recorte sea siempre el mismo y no
 * dependa de en qué orden devuelva Postgres.
 */
const DEDUP_MAX = 300;

/**
 * Crea un `Alojamiento` con lo mínimo y lo devuelve listo para el provider.
 *
 * Si en esa ciudad ya hay un hotel con el mismo nombre (comparado sin acentos
 * ni mayúsculas) NO crea nada: devuelve el que existe con `existente: true`.
 * Que dos vendedores tipeen "Meliá" y "Melia" el mismo día no puede dejar dos
 * filas en el ABM.
 */
export async function crearAlojamientoRapido(
  entrada: { nombre: string; ciudadId: string; categoria?: number | null },
): Promise<ResultadoAlojamientoRapido> {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch {
    return { ok: false, error: "Tenés que volver a iniciar sesión." };
  }
  if (!ROLES_HABILITADOS.has(ctx.role)) {
    return { ok: false, error: "Tu rol no puede dar de alta hoteles." };
  }

  const parsed = Entrada.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos incompletos." };
  }
  const { nombre, ciudadId, categoria } = parsed.data;

  try {
    const ciudad = await prisma.ciudad.findUnique({
      where: { id: ciudadId },
      select: { id: true, nombre: true, paisId: true },
    });
    if (!ciudad) return { ok: false, error: "Esa ciudad ya no está en el catálogo." };

    // Dedup por nombre normalizado dentro de la ciudad. Se compara en memoria
    // y no en SQL a propósito: Postgres sin `unaccent` no sabe que "Meliá" y
    // "Melia" son lo mismo. Bajan dos columnas y nada más: para comparar
    // nombres no hace falta el resto de la fila, y el ganador —si hay— se trae
    // completo abajo, que es una sola fila por id.
    const enLaCiudad = await prisma.alojamiento.findMany({
      where: { brandId: ctx.brandId, deletedAt: null, ciudadId },
      select: SELECT_DEDUP,
      orderBy: { nombre: "asc" },
      take: DEDUP_MAX,
    });
    const buscado = normalizar(nombre);
    const yaEsta = enLaCiudad.find((a) => normalizar(a.nombre) === buscado);
    if (yaEsta) {
      const completo = await prisma.alojamiento.findUnique({
        where: { id: yaEsta.id },
        select: SELECT,
      });
      if (completo) return { ok: true, alojamiento: completo, existente: true };
      // Se borró entre las dos queries. Sigue de largo y lo crea.
    }

    // CARRERA ACEPTADA. Entre el dedup y el `create` no hay candado: dos
    // vendedores que tipeen el mismo hotel en el mismo segundo dejan dos filas.
    // No se pone un índice único sobre (brandId, ciudadId, nombre) a propósito:
    // la migración que lo agregue FALLA si la tabla de producción ya tiene
    // duplicados —y los tiene, de las importaciones viejas—, así que el índice
    // costaría una limpieza previa de datos para tapar un choque de segundos
    // que casi no pasa. La cura es la de siempre: unificar a mano desde
    // /backend/alojamientos, que es donde alguien mira el catálogo igual.

    const autor = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    });
    const firma = autor?.name?.trim() || autor?.email || "un vendedor";

    const creado = await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "alojamiento");
      return await tx.alojamiento.create({
        data: {
          id,
          brandId: ctx.brandId,
          nombre,
          ciudadId: ciudad.id,
          paisId: ciudad.paisId,
          categoria: categoria ?? null,
          comentarios: `Creado desde el cotizador por ${firma}`,
        },
        select: SELECT,
      });
    });

    revalidateTag(SERVICES_GLOBAL_TAG);
    revalidateTag(PUBLIC_SITE_PACKAGES_TAG);

    void logAudit({
      action: "alojamiento.create.cotizador",
      userId: ctx.userId,
      userEmail: autor?.email ?? null,
      targetType: "alojamiento",
      targetId: creado.id,
      metadata: { nombre: creado.nombre, ciudad: ciudad.nombre, categoria: creado.categoria },
    });

    return { ok: true, alojamiento: creado, existente: false };
  } catch (error) {
    log.error("creando alojamiento rápido", error);
    return { ok: false, error: "No pudimos crear el hotel. Probá de nuevo." };
  }
}
