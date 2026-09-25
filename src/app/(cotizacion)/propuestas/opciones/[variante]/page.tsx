// ---------------------------------------------------------------------------
// /propuestas/opciones/<n> — formas de mostrar las opciones de alojamiento,
// para que el cliente elija una (Gero, 23/09).
//
// Es temporal: cuando el cliente elija, la ganadora pasa a ser el
// comportamiento por defecto de la ficha y esta carpeta se borra entera.
//
//   0 · como está hoy        2 · una debajo de la otra
//   1 · pestañas claras      3 · tarjetas que se deslizan
//                            4 · lista para elegir
//
// Lo que la separa del link público:
//   • pide sesión del panel: detrás hay una cotización real y no es para
//     pasajeros ni para buscadores (además de noindex y del Disallow);
//   • muestra siempre la misma cotización de ejemplo, la que eligió Diego, y
//     no mira si su link venció: la comparación tiene que seguir viva
//     mientras el cliente decide;
//   • no registra aperturas ni confirma nada (ver PropuestaOpciones.jsx).
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { SITE_BASE_URL } from "@/lib/datos-email";
import { COTIZADOR_SETTINGS } from "@/lib/site-settings-bootstrap";
import { parseContenido, VIGENCIA_DEFAULT } from "@/lib/presupuesto/schema";
import { contenidoPublico } from "@/lib/presupuesto/publico";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import PropuestaOpciones from "./PropuestaOpciones";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Propuestas de opciones · TravelOz",
  robots: { index: false, follow: false, nocache: true },
};

/** La cotización de ejemplo (COT-2026-0303, tres opciones en Río). */
const TOKEN_EJEMPLO = "qph424z3";

const VARIANTES = ["actual", "pestanas", "lista", "carrusel", "selector"] as const;

/** Mismo hash que `seedDe` en _mockup/catalogo.js: igual id ⇒ igual gradiente. */
function seedDe(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Los ajustes que lee la ficha: el mismo filtro que la página pública. */
async function ajustesFicha() {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ["cotizador_condiciones", "cotizador_vigencia_default"] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const semilla = (k: string) => COTIZADOR_SETTINGS.find((e) => e.key === k)?.value ?? "";
  const condiciones = (map.get("cotizador_condiciones") ?? semilla("cotizador_condiciones"))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.includes("{vigencia}"));
  const vig = Number(map.get("cotizador_vigencia_default") ?? semilla("cotizador_vigencia_default"));
  return {
    plantillaMensaje: "",
    condiciones,
    vigenciaDefault: Number.isFinite(vig) && vig > 0 ? vig : VIGENCIA_DEFAULT,
    emailCopia: "",
    factorDefault: 0.88,
  };
}

export default async function PropuestasOpcionesPage({
  params,
}: {
  params: { variante: string };
}) {
  const n = Number(params.variante);
  if (!Number.isInteger(n) || n < 0 || n >= VARIANTES.length) notFound();

  const session = await auth();
  if (!session?.user) {
    redirect(`/backend/login?next=${encodeURIComponent(`/propuestas/opciones/${n}`)}`);
  }

  const link = await prisma.presupuestoLink.findUnique({
    where: { token: TOKEN_EJEMPLO },
    select: {
      presupuesto: {
        select: {
          numero: true,
          contenido: true,
          deletedAt: true,
          vendedor: {
            select: {
              id: true, name: true, email: true, cargo: true, telefono: true, whatsapp: true,
              fotoUrl: true, firmaUrl: true, firmaEstaticaUrl: true,
            },
          },
        },
      },
    },
  });
  if (!link || link.presupuesto.deletedAt) notFound();

  const parsed = parseContenido(link.presupuesto.contenido);
  if (!parsed.ok) notFound();
  const pub = contenidoPublico(parsed.contenido);

  const u = link.presupuesto.vendedor;
  const vendedor = {
    id: u.id,
    nombre: u.name,
    inicial:
      u.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?",
    cargo: u.cargo?.trim() || "Ejecutivo/a de ventas",
    tel: (u.whatsapp || u.telefono || "").trim(),
    email: u.email,
    linkDatos: null,
    linkPago: null,
    foto: u.fotoUrl?.trim() || null,
    firma: u.firmaUrl?.trim() || null,
    firmaEstatica: u.firmaEstaticaUrl?.trim() || null,
    rol: "",
  };

  const idsHotel = Array.from(
    new Set(
      (pub.opciones ?? [])
        .flatMap((o) => o.hoteles ?? [])
        .map((h) => String(h?.hotelId ?? "").trim())
        .filter(Boolean),
    ),
  );
  const codigos = Array.from(
    new Set(
      // Los tres itinerarios: el principal, las alternativas y los vuelos
      // adicionales. Antes solo el principal, y las otras mostraban "SSA" en
      // vez de la ciudad en el link del pasajero.
      [
        ...(pub.vuelos ?? []),
        ...(pub.vuelosNota ?? []).flatMap((n) => n.vuelos ?? []),
        ...(pub.vuelosExtra?.vuelos ?? []),
      ]
        .flatMap((v) => [String(v.origen ?? ""), String(v.destino ?? "")])
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  const [alojamientos, aeropuertosRows, ajustes] = await Promise.all([
    idsHotel.length
      ? prisma.alojamiento.findMany({
          where: { id: { in: idsHotel } },
          select: {
            id: true,
            nombre: true,
            categoria: true,
            ciudad: { select: { nombre: true } },
            fotos: { orderBy: { orden: "asc" }, take: 1, select: { url: true } },
          },
        })
      : Promise.resolve([]),
    codigos.length ? prisma.aeropuerto.findMany({ where: { codigo: { in: codigos } } }) : Promise.resolve([]),
    ajustesFicha(),
  ]);

  const hoteles = Object.fromEntries(
    alojamientos.map((a) => {
      const url = a.fotos[0]?.url ?? null;
      return [
        a.id,
        {
          id: a.id,
          nombre: a.nombre,
          ciudad: a.ciudad?.nombre ?? "",
          cat: a.categoria ?? 0,
          foto: url ? proxyThumbUrl(url, 640) : null,
          seed: seedDe(a.id),
        },
      ];
    }),
  );
  const aeropuertos = Object.fromEntries(aeropuertosRows.map((a) => [a.codigo, a]));

  return (
    <div className="cot-publica">
      <PropuestaOpciones
        variante={VARIANTES[n]}
        q={pub}
        vendedor={vendedor}
        ajustes={ajustes}
        hoteles={hoteles}
        aeropuertos={aeropuertos}
        siteBaseUrl={SITE_BASE_URL}
        numero={link.presupuesto.numero}
      />
    </div>
  );
}
