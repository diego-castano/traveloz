// ---------------------------------------------------------------------------
// Gate de publicación — fuente de verdad única del invariante
// "estado ACTIVO ⇔ publicado".
//
// Vive en su propio módulo (NO "use server") para poder importarse tanto desde
// los server actions (`updatePaquete` en package.actions, `updatePaqueteFrontend`
// en paquete-frontend.actions) como desde cualquier otro consumidor. Chequea
// que el paquete tenga todo lo necesario para salir al sitio público antes de
// permitir la transición a ACTIVO.
//
// Exigencias comunes a ambas modalidades: slug, título, al menos 1 aéreo, foto
// principal del slider y período de viaje. Por modalidad:
//   • CLASICO  → al menos 1 destino, al menos 1 opción hotelera y coherencia de
//                noches (la suma por destino iguala las noches del paquete).
//   • CIRCUITO → un circuito asignado con precio vigente, itinerario y noches>0.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { resolvePrecioCircuito } from "@/lib/utils";
import type { PrecioCircuito } from "@/lib/types";

export interface PublicableResult {
  ok: boolean;
  missing: string[];
}

/**
 * Chequea si un paquete puede publicarse (salir al sitio público). Devuelve la
 * lista de faltantes cuando no puede.
 *
 * @param overrides Valores del formulario que todavía no se persistieron pero
 *   se están por guardar en el mismo request (slug / heroImage). Cuando se pasan
 *   se usan en lugar del valor en DB, para que publicar y setear el slug en el
 *   mismo save no falle por leer el valor viejo.
 */
export async function checkPaquetePublicable(
  paqueteId: string,
  overrides?: { slug?: string | null; heroImage?: string | null },
): Promise<PublicableResult> {
  const current = await prisma.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      slug: true,
      titulo: true,
      noches: true,
      heroImage: true,
      modalidad: true,
      viajeDesde: true,
      viajeHasta: true,
      validezDesde: true,
      destinos: { select: { noches: true } },
      opcionesHoteleras: { select: { id: true } },
      aereos: { select: { id: true } },
      // Circuito asignado — incluimos su itinerario, noches y precios para poder
      // validar la modalidad CIRCUITO (precio vigente + itinerario).
      circuitos: {
        select: {
          circuito: {
            select: {
              id: true,
              noches: true,
              itinerario: { select: { id: true } },
              precios: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  circuitoId: true,
                  periodoDesde: true,
                  periodoHasta: true,
                  precio: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!current) return { ok: false, missing: ["paquete no encontrado"] };

  const incomingSlug =
    overrides && typeof overrides.slug === "string"
      ? overrides.slug.trim()
      : current.slug;
  const heroImage =
    overrides && typeof overrides.heroImage === "string"
      ? overrides.heroImage.trim()
      : current.heroImage;

  const missing: string[] = [];

  // Exigencias comunes a ambas modalidades.
  if (!incomingSlug) missing.push("slug (URL pública)");
  if (!current.titulo?.trim()) missing.push("título");
  if (current.aereos.length === 0) missing.push("al menos 1 aéreo asignado");
  if (!heroImage) missing.push("foto principal del slider");
  // Sin período de viaje el resolver de precios cae al fallback y el sitio
  // público puede mostrar "Desde $0". Exigirlo antes de publicar.
  if (!current.viajeDesde || !current.viajeHasta)
    missing.push("período del viaje (desde / hasta)");

  if (current.modalidad === "CIRCUITO") {
    // Modalidad CIRCUITO: el circuito incluye todo (hotel, comidas, paseos).
    // NO se exigen opciones hoteleras, destinos ni suma de noches. Sí se exige
    // un circuito con precio vigente, itinerario y noches > 0.
    const circ = current.circuitos[0]?.circuito ?? null;
    if (!circ) {
      missing.push("un circuito asignado con precio vigente");
    } else {
      const fecha = current.viajeDesde ?? current.validezDesde;
      const precioVigente = resolvePrecioCircuito(
        circ.precios as unknown as PrecioCircuito[],
        circ.id,
        fecha,
      );
      if (!precioVigente) {
        missing.push("un circuito asignado con precio vigente");
      }
      if (circ.itinerario.length === 0) {
        missing.push("itinerario del circuito (día por día)");
      }
      if (!circ.noches || circ.noches <= 0) {
        missing.push("noches del circuito mayores a 0");
      }
    }
  } else {
    // Modalidad CLASICO: opciones + destinos + coherencia de noches.
    if (current.destinos.length === 0)
      missing.push("al menos 1 destino en el itinerario");
    if (current.opcionesHoteleras.length === 0)
      missing.push("al menos 1 opción hotelera");

    const nochesPaquete = current.noches ?? 0;
    const nochesDestinos = current.destinos.reduce(
      (sum, d) => sum + (d.noches || 0),
      0,
    );
    if (nochesPaquete > 0 && nochesDestinos !== nochesPaquete) {
      missing.push(
        `noches por destino suman ${nochesDestinos} (paquete declara ${nochesPaquete})`,
      );
    }
  }

  return { ok: missing.length === 0, missing };
}
