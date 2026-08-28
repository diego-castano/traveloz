// ---------------------------------------------------------------------------
// /c/<token> — el link público de una cotización.
//
// Lo abre el pasajero desde WhatsApp o desde el email. No hay cuenta, no hay
// sesión: el token de 8 caracteres es toda la credencial, y por eso se valida
// forma, vigencia y revocación antes de tocar nada.
//
// Estados:
//   • token con forma rara / inexistente / cotización borrada → notFound()
//   • link revocado o vencido                                  → pantalla de cortesía
//   • todo bien                                                → la ficha del pasajero
//
// `?print=1` dibuja la misma hoja que la vista de impresión del editor (sin la
// barra de acciones, que del lado del pasajero no tiene sentido) y NO registra
// apertura: es la superficie que va a levantar el render server-side del PDF.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkFormRate, peekFormRate } from "@/lib/rate-limit";
import { ipConfiableDeHeaders } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import { SITE_BASE_URL } from "@/lib/datos-email";
import { COTIZADOR_SETTINGS } from "@/lib/site-settings-bootstrap";
import { parseContenido, VIGENCIA_DEFAULT } from "@/lib/presupuesto/schema";
import { contenidoPublico } from "@/lib/presupuesto/publico";
import { TOKEN_RE } from "@/lib/presupuesto/links";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import CotizacionPublica from "./CotizacionPublica";
import { CotizacionNoDisponible } from "./NoDisponible";

const log = logger.child({ module: "c/[token]" });

// El link se abre una vez y tiene que reflejar el estado de ESTE momento: si
// el vendedor la reactivó hace un minuto, el pasajero la ve viva.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu cotización · TravelOz",
  // Un link con el nombre, el destino y el precio de una persona no entra a
  // ningún buscador. Nunca.
  robots: { index: false, follow: false, nocache: true },
};

/** Ancho de thumbnail que le pedimos al proxy de imágenes. Mismo que el panel. */
const THUMB_W = 640;

/** Bucket del limitador. Propio: no comparte cupo con los formularios. */
const RATE_SCOPE = "cotizacion-publica";

/** Mismo hash que `seedDe` en _mockup/catalogo.js: igual id ⇒ igual gradiente. */
function seedDe(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function semilla(key: string): string {
  return COTIZADOR_SETTINGS.find((e) => e.key === key)?.value ?? "";
}

/**
 * Los dos ajustes que la ficha del pasajero necesita: las condiciones del pie
 * y la vigencia por defecto.
 *
 * La línea de la vigencia —la que el máster escribe con `{vigencia}` adentro—
 * se cae acá y no llega a la página. El documento que el pasajero lee y el PDF
 * que se guarda no llevan fecha de vencimiento impresa: el que la necesita es
 * el vendedor, y la tiene donde corresponde (el link vence solo, el email la
 * dice y el listado la muestra con su semáforo). La semilla de
 * `cotizador_condiciones` no se toca: el filtro es del render.
 *
 * Deliberadamente NO se reusa `getContextoCotizador`: esa action exige sesión
 * de vendedor y acá del otro lado hay un pasajero.
 */
async function ajustesPublicos() {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ["cotizador_condiciones", "cotizador_vigencia_default"] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const crudo = (map.get("cotizador_condiciones") ?? semilla("cotizador_condiciones"))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.includes("{vigencia}"));
  const vig = Number(map.get("cotizador_vigencia_default") ?? semilla("cotizador_vigencia_default"));

  return {
    plantillaMensaje: "",
    condiciones: crudo,
    vigenciaDefault: Number.isFinite(vig) && vig > 0 ? vig : VIGENCIA_DEFAULT,
    emailCopia: "",
    factorDefault: 0.88,
  };
}

export default async function CotizacionPublicaPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { print?: string };
}) {
  // ── el oráculo ───────────────────────────────────────────────────────────
  // El token son 8 caracteres: probar de a miles cuesta poco y la respuesta
  // (404 contra pantalla de cortesía) dice si existe. El cupo lo gasta SOLO el
  // intento que no encuentra nada, así el pasajero recarga cuanto quiera y el
  // render del PDF —que entra por la IP de salida de Railway, la misma para
  // toda la agencia— nunca se queda sin turno.
  const ip = ipConfiableDeHeaders(headers());
  if (!peekFormRate(RATE_SCOPE, ip).allowed) notFound();
  const noExiste: () => never = () => {
    checkFormRate(RATE_SCOPE, ip);
    notFound();
  };

  const token = String(params.token ?? "").trim().toLowerCase();
  if (!TOKEN_RE.test(token)) noExiste();

  const link = await prisma.presupuestoLink.findUnique({
    where: { token },
    select: {
      expiraAt: true,
      revocadoAt: true,
      presupuesto: {
        select: {
          id: true,
          numero: true,
          contenido: true,
          confirmadaOpcion: true,
          confirmadaAt: true,
          deletedAt: true,
          vendedorId: true,
          vendedor: {
            select: {
              id: true,
              name: true,
              email: true,
              cargo: true,
              telefono: true,
              whatsapp: true,
              fotoUrl: true,
              firmaUrl: true,
              slug: true,
              linkActivo: true,
            },
          },
        },
      },
    },
  });

  if (!link || link.presupuesto.deletedAt) noExiste();

  const u = link.presupuesto.vendedor;
  const vendedor = {
    id: u.id,
    nombre: u.name,
    inicial:
      u.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "?",
    cargo: u.cargo?.trim() || "Ejecutivo/a de ventas",
    tel: (u.whatsapp || u.telefono || "").trim(),
    email: u.email,
    // Solo la URL: del vendedor cruzan nombre, cargo, contacto y estos dos
    // links públicos, nada más. Si no tiene slug o lo apagó, van en null y la
    // ficha no dibuja el botón.
    linkDatos:
      u.slug && u.linkActivo ? `${SITE_BASE_URL}/datos-de-pasajeros/${u.slug}` : null,
    linkPago:
      u.slug && u.linkActivo ? `${SITE_BASE_URL}/datos-de-pago/${u.slug}` : null,
    foto: u.fotoUrl?.trim() || null,
    // Firma de email en GIF: con ella la hoja cierra con la imagen tal cual
    // (pedido del cliente 28/08).
    firma: u.firmaUrl?.trim() || null,
    rol: "",
  };

  // Revocado o pasado de fecha: no es un 404, es una conversación que sigue.
  if (link.revocadoAt || link.expiraAt.getTime() < Date.now()) {
    return <CotizacionNoDisponible vendedor={vendedor} vencida />;
  }

  const parsed = parseContenido(link.presupuesto.contenido);
  if (!parsed.ok) {
    // Un JSON que no valida es un bug nuestro, no del pasajero: se loguea y se
    // lo manda con el vendedor en vez de mostrarle un error técnico.
    log.error("cotizacion.publica.contenido.invalido", {
      presupuestoId: link.presupuesto.id,
      error: parsed.error,
    });
    return <CotizacionNoDisponible vendedor={vendedor} />;
  }
  const q = parsed.contenido;

  // Lo único que cruza al navegador del pasajero. De acá en adelante no se
  // toca más `q`: netos, factores, notas internas y datos de contacto se
  // quedan de este lado (ver src/lib/presupuesto/publico.ts).
  const pub = contenidoPublico(q);

  // ── catálogo mínimo: solo lo que esta cotización nombra ──────────────────
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
      (pub.vuelos ?? [])
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
    codigos.length
      ? prisma.aeropuerto.findMany({ where: { codigo: { in: codigos } } })
      : Promise.resolve([]),
    ajustesPublicos(),
  ]);

  // Misma forma que arma `useCatalogoCotizador()` en el panel: la ficha del
  // pasajero lee `nombre`, `cat`, `foto` y `seed` y no sabe de dónde salieron.
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
          foto: url ? proxyThumbUrl(url, THUMB_W) : null,
          seed: seedDe(a.id),
        },
      ];
    }),
  );
  const aeropuertos = Object.fromEntries(aeropuertosRows.map((a) => [a.codigo, a]));

  // Ya confirmada: la página abre en ese estado con la opción elegida y el CTA
  // de datos de pasajeros. `confirmadaOpcion` guarda el NOMBRE, así que se
  // busca el id por nombre y, si no matchea, cae a la primera opción.
  let confirmadaInicial: string | null = null;
  if (link.presupuesto.confirmadaAt) {
    const nombre = (link.presupuesto.confirmadaOpcion ?? "").trim().toLowerCase();
    const idx = (pub.opciones ?? []).findIndex(
      (o, i) =>
        (String(o.nombre ?? "").trim() || `Opción ${i + 1}`).toLowerCase() === nombre,
    );
    const elegida = idx >= 0 ? pub.opciones[idx] : pub.opciones?.[0];
    confirmadaInicial = elegida ? String(elegida.id) : null;
  }

  const print = searchParams?.print === "1";

  // El CSS del cotizador y el chrome (wordmark arriba, datos de la agencia
  // abajo) los pone el layout del route group. Acá queda solo la hoja.
  return (
    <div className="cot-publica">
      <CotizacionPublica
        token={token}
        q={pub}
        vendedor={vendedor}
        ajustes={ajustes}
        hoteles={hoteles}
        aeropuertos={aeropuertos}
        aerolineas={{}}
        siteBaseUrl={SITE_BASE_URL}
        print={print}
        confirmadaInicial={confirmadaInicial}
      />
    </div>
  );
}
