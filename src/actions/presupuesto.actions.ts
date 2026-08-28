"use server";

// ---------------------------------------------------------------------------
// Server actions del cotizador del vendedor.
//
// Reglas que no se negocian:
//   • Scope duro por vendedor, mismo patrón que datos-vendedor.actions.ts. Un
//     VENDEDOR solo ve lo suyo (el vendedorId que mande de afuera se ignora),
//     un ADMIN ve todo y puede filtrar, MARKETING no entra.
//   • Ninguna action tira: todas devuelven { ok:false, error } y el editor
//     decide qué mostrar. Un autosave que explota no puede tumbar la pantalla.
//   • Nada de $transaction interactiva: la DB va por pgbouncer con
//     connection_limit=1 y un callback largo se come la única conexión. Se
//     escriben operaciones sueltas y tolerantes; la bitácora es best-effort.
//   • `contenido` es la fuente de verdad. Las columnas del modelo son un
//     espejo derivado que se recalcula en cada guardado (derivados.ts).
//   • El estado "vencida automática" (enviada, sin abrir, pasada la vigencia)
//     NO se persiste: lo calcula el cliente contra expiraAt.
// ---------------------------------------------------------------------------

import { z } from "zod";
import type { EstadoPresupuesto, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { COTIZADOR_SETTINGS } from "@/lib/site-settings-bootstrap";
import { generarNumeroPresupuesto } from "@/lib/presupuesto/numero";
import {
  parseContenido,
  estadoUiADb,
  FACTOR_DEFAULT,
  VIGENCIA_DEFAULT,
  VIGENCIA_MIN,
  VIGENCIA_MAX,
  type ContenidoPresupuesto,
} from "@/lib/presupuesto/schema";
import { sanitizarContenidoGuardado } from "@/lib/presupuesto/sanitizar";
import {
  columnasDesdeContenido,
  precioOpcion,
  soloDigitos,
} from "@/lib/presupuesto/derivados";
import { urlDeToken } from "@/lib/presupuesto/links";
import {
  condicionesConHabiles,
  horasHabilesEntre,
  sumarHorasHabiles,
  textoVencimiento,
} from "@/lib/presupuesto/habiles";
import {
  ErrorDeNegocio,
  NO_ENCONTRADA,
  cargarPropia,
  emitirORenovar,
  fallar,
  linkVivo,
  scopeVendedor,
  type FilaPropia,
  type LinkEmitido,
  type Scope,
} from "@/lib/presupuesto/acceso";
import { SITE_BASE_URL } from "@/lib/datos-email";
import { sendEmail, type EmailAttachment } from "@/lib/email";
import {
  codigoDeError,
  nombreArchivoPdf,
  pdfDisponible,
  renderizarPdfDeCotizacion,
} from "@/lib/pdf";
import { cotizacionEmail } from "@/lib/presupuesto-email";
// El pedido de datos desde el cotizador no reimplementa nada: llama a la MISMA
// action que el modal del vendedor, con el destino y el número precargados.
import { crearSolicitud } from "@/actions/datos-vendedor.actions";

const log = logger.child({ module: "presupuesto.actions" });

const GENERICO = "No pudimos completar la operación. Probá de nuevo.";
/** Código que el editor reconoce para recargar y avisar, no un texto de UI. */
const CONFLICTO = "CONFLICTO";

/** Vigencia siempre entre 1 hora y 30 días, venga de donde venga. */
function acotarVigencia(horas: unknown): number {
  const n = Math.round(Number(horas));
  if (!Number.isFinite(n)) return VIGENCIA_DEFAULT;
  return Math.min(Math.max(n, VIGENCIA_MIN), VIGENCIA_MAX);
}

/** Tope del listado. Más que esto no entra en pantalla ni sirve. */
const TAKE_MAX = 500;
const TAKE_DEFAULT = 200;

/** Cuántos eventos de bitácora viajan con el detalle. */
const EVENTOS_MAX = 100;

/** Cuántas aperturas del pasajero viajan con cada fila (las más recientes). */
const APERTURAS_MAX = 20;

// La vigencia se cuenta en HORAS HÁBILES: el sábado y el domingo no corren.
// Todo el que necesite un vencimiento pasa por `sumarHorasHabiles`
// (@/lib/presupuesto/habiles) — mandar una cotización el viernes a la tarde y
// que venza el domingo, cuando nadie puede renovarla, era regalarle dos días
// al olvido.

/** Resultados del buscador de historial (el panel muestra pocos). */
const HISTORIAL_MAX = 8;

// ---------------------------------------------------------------------------
// Contrato de salida
// ---------------------------------------------------------------------------

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Envoltorio único: corre la action y traduce cualquier excepción a
 * { ok:false, error }. Los mensajes de negocio se levantan con `fallar()`
 * (de `@/lib/presupuesto/acceso`) para que lleguen tal cual al vendedor; el
 * resto sale genérico y queda el detalle en los logs.
 */
async function ejecutar<T>(
  nombre: string,
  fn: () => Promise<T>,
): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ErrorDeNegocio) return { ok: false, error: err.message };
    // requireAuth/requireAdmin tiran Error con texto ya redactado para el usuario.
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("No autorizado") || msg.startsWith("Acceso restringido")) {
      return { ok: false, error: msg };
    }
    log.error(`${nombre}.fail`, { err });
    return { ok: false, error: GENERICO };
  }
}

// ---------------------------------------------------------------------------
// Scope
//
// `scopeVendedor` y `cargarPropia` viven en `@/lib/presupuesto/acceso` desde
// que la ruta del PDF (`/api/cotizador/[id]/pdf`) necesitó el mismo scope: un
// route handler no puede importar de un archivo "use server" sin volver cada
// helper un endpoint. Acá queda solo lo que usa el listado.
// ---------------------------------------------------------------------------

/** WHERE base del listado: marca, vivos y el scope de quien mira. */
function whereScope(s: Scope): Prisma.PresupuestoWhereInput {
  return {
    brandId: s.brandId,
    deletedAt: null,
    ...(s.targetId ? { vendedorId: s.targetId } : {}),
  };
}

/** Bitácora best-effort: si falla, la operación que la disparó ya se hizo. */
async function anotar(
  presupuestoId: string,
  evento: {
    tipo: string;
    titulo: string;
    detalle?: string | null;
    actorTipo?: "vendedor" | "pasajero" | "sistema";
    actorId?: string | null;
  },
): Promise<void> {
  try {
    await prisma.presupuestoEvento.create({
      data: {
        presupuestoId,
        tipo: evento.tipo,
        titulo: evento.titulo,
        detalle: evento.detalle ?? null,
        actorTipo: evento.actorTipo ?? "vendedor",
        actorId: evento.actorId ?? null,
      },
    });
  } catch (err) {
    log.error("presupuesto.evento.fail", { presupuestoId, tipo: evento.tipo, err });
  }
}

// ---------------------------------------------------------------------------
// Formas de salida
// ---------------------------------------------------------------------------

/** Columnas del listado: todo menos el JSON, que pesa y no se usa en la grilla. */
const SELECT_FILA = {
  id: true,
  numero: true,
  estado: true,
  estadoManual: true,
  clienteNombre: true,
  clienteApellido: true,
  clienteEmail: true,
  clienteTelefono: true,
  destino: true,
  mes: true,
  anio: true,
  fechaSalida: true,
  montoPrincipal: true,
  moneda: true,
  vendedorId: true,
  vigenciaHoras: true,
  enviadaAt: true,
  expiraAt: true,
  confirmadaAt: true,
  aperturas: true,
  primeraAperturaAt: true,
  ultimaAperturaAt: true,
  notasInternas: true,
  createdAt: true,
  updatedAt: true,
  vendedor: { select: { name: true } },
  // El link "vivo" y sus aperturas. Un presupuesto tiene UN link sin revocar a
  // la vez (`emitirLink` reutiliza el activo y revoca los viejos), así que
  // `take:1` alcanza y las aperturas no se mezclan entre rondas de envío.
  links: {
    where: { revocadoAt: null },
    orderBy: { emitidoAt: "desc" },
    take: 1,
    select: {
      token: true,
      canal: true,
      vigenciaHoras: true,
      emitidoAt: true,
      expiraAt: true,
      aperturas: {
        orderBy: { abiertaAt: "desc" },
        take: APERTURAS_MAX,
        select: {
          id: true,
          abiertaAt: true,
          dispositivo: true,
          seccionMax: true,
          segundos: true,
        },
      },
    },
  },
} satisfies Prisma.PresupuestoSelect;

/** Una apertura del pasajero, como la dibuja el drawer. */
export interface AperturaPresupuesto {
  id: string;
  abiertaAt: Date;
  dispositivo: string | null;
  seccionMax: string | null;
  segundos: number | null;
}

/** El link público vivo de una cotización. */
export interface LinkPresupuesto {
  token: string;
  url: string;
  canal: string;
  vigenciaHoras: number;
  emitidoAt: Date;
  expiraAt: Date;
  /** `true` cuando ya pasó `expiraAt`: el link existe pero no abre. */
  vencido: boolean;
}

export interface FilaPresupuesto {
  id: string;
  numero: string;
  estado: EstadoPresupuesto;
  /**
   * Estado que tiene que mostrar la UI: el manual si lo hay, "VENCIDA" si la
   * vigencia se cumplió, y si no el estado real. No se persiste — se calcula
   * en cada lectura contra `expiraAt`, igual que hacía el cliente.
   */
  estadoEfectivo: EstadoPresupuesto;
  estadoManual: EstadoPresupuesto | null;
  clienteNombre: string | null;
  clienteApellido: string | null;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  destino: string | null;
  mes: number | null;
  anio: number | null;
  fechaSalida: Date | null;
  montoPrincipal: number | null;
  moneda: string;
  vendedorId: string;
  vendedorNombre: string;
  vigenciaHoras: number;
  enviadaAt: Date | null;
  expiraAt: Date | null;
  confirmadaAt: Date | null;
  aperturas: number;
  primeraAperturaAt: Date | null;
  ultimaAperturaAt: Date | null;
  notasInternas: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** El link público vivo, o `null` si nunca se emitió uno. */
  link: LinkPresupuesto | null;
  /** Aperturas del pasajero sobre ese link, de la más nueva a la más vieja. */
  aperturasDet: AperturaPresupuesto[];
}

type FilaCruda = Prisma.PresupuestoGetPayload<{ select: typeof SELECT_FILA }>;

/**
 * Estado que ve el vendedor.
 *
 * El manual gana siempre. Después, una cotización enviada o abierta cuya
 * vigencia se cumplió es VENCIDA aunque la columna diga otra cosa: el
 * vencimiento no se persiste (nadie corre un cron para escribirlo), se calcula
 * al leer. Una confirmada no vence nunca.
 */
function estadoEfectivoDe(r: {
  estado: EstadoPresupuesto;
  estadoManual: EstadoPresupuesto | null;
  expiraAt: Date | null;
  confirmadaAt: Date | null;
}): EstadoPresupuesto {
  if (r.estadoManual) return r.estadoManual;
  if (r.estado === "CONFIRMADA" || r.confirmadaAt) return r.estado;
  if (r.estado !== "ENVIADA" && r.estado !== "ABIERTA") return r.estado;
  if (r.expiraAt && r.expiraAt.getTime() < Date.now()) return "VENCIDA";
  return r.estado;
}

function aFila(r: FilaCruda): FilaPresupuesto {
  const { vendedor, links, ...resto } = r;
  const vivo = links?.[0] ?? null;
  return {
    ...resto,
    vendedorNombre: vendedor?.name ?? "",
    estadoEfectivo: estadoEfectivoDe(resto),
    link: vivo
      ? {
          token: vivo.token,
          url: urlDeToken(SITE_BASE_URL, vivo.token),
          canal: vivo.canal,
          vigenciaHoras: vivo.vigenciaHoras,
          emitidoAt: vivo.emitidoAt,
          expiraAt: vivo.expiraAt,
          vencido: vivo.expiraAt.getTime() < Date.now(),
        }
      : null,
    aperturasDet: vivo?.aperturas ?? [],
  };
}

export interface EventoPresupuesto {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  actorTipo: string;
  actorId: string | null;
  ocurridoAt: Date;
}

export interface PresupuestoCompleto extends FilaPresupuesto {
  contenido: ContenidoPresupuesto;
  origenTipo: string | null;
  origenRef: string | null;
  confirmadaOpcion: string | null;
  confirmadaVia: string | null;
  tiempoArmadoSeg: number | null;
  eventos: EventoPresupuesto[];
}

/** Detalle completo, con el JSON validado y la bitácora. */
async function cargarCompleto(id: string, s: Scope): Promise<PresupuestoCompleto> {
  const row = await prisma.presupuesto.findFirst({
    where: { id, brandId: s.brandId, deletedAt: null },
    select: {
      ...SELECT_FILA,
      contenido: true,
      origenTipo: true,
      origenRef: true,
      confirmadaOpcion: true,
      confirmadaVia: true,
      tiempoArmadoSeg: true,
      eventos: {
        orderBy: { ocurridoAt: "desc" },
        take: EVENTOS_MAX,
        select: {
          id: true,
          tipo: true,
          titulo: true,
          detalle: true,
          actorTipo: true,
          actorId: true,
          ocurridoAt: true,
        },
      },
    },
  });
  if (!row) fallar(NO_ENCONTRADA);
  if (!s.isAdmin && row.vendedorId !== s.userId) fallar(NO_ENCONTRADA);

  const {
    contenido, origenTipo, origenRef, confirmadaOpcion, confirmadaVia,
    tiempoArmadoSeg, eventos, ...fila
  } = row;
  // `fila` conserva `links` y `vendedor`: los consume aFila().


  // El JSON guardado se re-valida al leer: una cotización vieja se normaliza
  // a la forma de hoy en vez de romper el editor con campos faltantes.
  const parsed = parseContenido(contenido);
  if (!parsed.ok) fallar(parsed.error);

  return {
    ...aFila(fila as FilaCruda),
    contenido: parsed.contenido,
    origenTipo,
    origenRef,
    confirmadaOpcion,
    confirmadaVia,
    tiempoArmadoSeg,
    eventos,
  };
}

// ---------------------------------------------------------------------------
// Contexto del editor
// ---------------------------------------------------------------------------

const CLAVES_AJUSTES = [
  "cotizador_plantilla_mensaje",
  "cotizador_condiciones",
  "cotizador_vigencia_default",
  "cotizador_email_copia",
  "cotizador_factor_default",
] as const;

/**
 * Defaults del cotizador. Salen de la MISMA semilla que usa el bootstrap de
 * SiteSetting (y que escribió la migración): si estuvieran copiados acá, el
 * día que el máster cambie el texto semilla el fallback quedaría hablando de
 * otra cosa.
 */
function semillaAjuste(key: string): string {
  return COTIZADOR_SETTINGS.find((e) => e.key === key)?.value ?? "";
}

const AJUSTES_DEFAULT: AjustesCotizador = {
  plantillaMensaje: semillaAjuste("cotizador_plantilla_mensaje"),
  condiciones: condicionesConHabiles(
    semillaAjuste("cotizador_condiciones")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  ),
  vigenciaDefault: Number(semillaAjuste("cotizador_vigencia_default")) || VIGENCIA_DEFAULT,
  emailCopia: semillaAjuste("cotizador_email_copia"),
  factorDefault: Number(semillaAjuste("cotizador_factor_default")) || FACTOR_DEFAULT,
};

export interface VendedorContexto {
  id: string;
  name: string;
  email: string;
  role: string;
  slug: string | null;
  fotoUrl: string | null;
  firmaUrl: string | null;
  telefono: string | null;
  whatsapp: string | null;
  cargo: string | null;
  linkActivo: boolean;
}

export interface AjustesCotizador {
  plantillaMensaje: string;
  condiciones: string[];
  vigenciaDefault: number;
  emailCopia: string;
  factorDefault: number;
}

export interface ContextoCotizador {
  yo: VendedorContexto;
  vendedores: VendedorContexto[];
  ajustes: AjustesCotizador;
  favoritos: string[];
  aeropuertos: { codigo: string; ciudad: string; nombre: string; terminal: string | null }[];
  aerolineas: { codigo: string; nombre: string }[];
}

const SELECT_VENDEDOR = {
  id: true,
  name: true,
  email: true,
  role: true,
  slug: true,
  fotoUrl: true,
  // La firma de email viaja con el vendedor: la hoja del pasajero la imprime
  // en lugar de la tarjeta (pedido del cliente 28/08).
  firmaUrl: true,
  telefono: true,
  whatsapp: true,
  cargo: true,
  linkActivo: true,
} satisfies Prisma.UserSelect;

/**
 * Todo lo que el editor necesita para arrancar, en una sola ida: quién soy,
 * a quién puedo mirar, los textos del máster, mis hoteles favoritos y el
 * catálogo IATA para el bloque de vuelos.
 */
export async function getContextoCotizador(): Promise<Resultado<ContextoCotizador>> {
  return ejecutar("getContextoCotizador", async () => {
    const s = await scopeVendedor();

    const [yo, lista, settings, favoritos, aeropuertos, aerolineas] = await Promise.all([
      prisma.user.findUnique({ where: { id: s.userId }, select: SELECT_VENDEDOR }),
      // El vendedor no arma la lista del equipo: se ve solo a él.
      s.isAdmin
        ? prisma.user.findMany({
            where: { brandId: s.brandId, isActive: true, role: { in: ["ADMIN", "VENDEDOR"] } },
            select: SELECT_VENDEDOR,
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      prisma.siteSetting.findMany({
        where: { key: { in: [...CLAVES_AJUSTES] } },
        select: { key: true, value: true },
      }),
      prisma.hotelFavorito.findMany({
        where: { vendedorId: s.userId },
        select: { alojamientoId: true },
      }),
      prisma.aeropuerto.findMany({ orderBy: { codigo: "asc" } }),
      prisma.aerolinea.findMany({ orderBy: { codigo: "asc" } }),
    ]);

    if (!yo) fallar(NO_ENCONTRADA);

    return {
      yo,
      vendedores: s.isAdmin ? lista : [yo],
      ajustes: leerAjustes(settings),
      favoritos: favoritos.map((f) => f.alojamientoId),
      aeropuertos,
      aerolineas,
    };
  });
}

/**
 * Los ajustes del máster son texto libre en SiteSetting: cualquiera con acceso
 * al ABM puede dejar un "1,2" en el factor o un "0" en la vigencia. Fuera de
 * rango no se acepta a medias — se cae al default y el cotizador sigue
 * calculando bien.
 */
function leerAjustes(rows: { key: string; value: string }[]): AjustesCotizador {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const texto = (k: string) => (map.get(k) ?? "").trim();
  const numero = (k: string) => Number(texto(k).replace(",", "."));

  // `condicionesConHabiles` reescribe la línea del máster para que el
  // `{vigencia}` que resuelve la ficha del pasajero termine diciendo "48 horas
  // hábiles (no corren sábados ni domingos)". El texto guardado no se toca:
  // la regla se agrega al leer, así el día que cambie no hay que migrar nada.
  const condiciones = condicionesConHabiles(
    texto("cotizador_condiciones")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );

  // El factor divide al neto: fuera de (0, 1] el precio de venta sale mal
  // (0 regala el viaje, >1 lo vende por debajo del costo).
  const factor = numero("cotizador_factor_default");
  const factorDefault =
    Number.isFinite(factor) && factor > 0 && factor <= 1
      ? factor
      : AJUSTES_DEFAULT.factorDefault;

  // La vigencia va a `expiraAt`: entera, de 1 hora a 30 días.
  const vigencia = numero("cotizador_vigencia_default");
  const vigenciaDefault =
    Number.isInteger(vigencia) && vigencia >= VIGENCIA_MIN && vigencia <= VIGENCIA_MAX
      ? vigencia
      : AJUSTES_DEFAULT.vigenciaDefault;

  return {
    plantillaMensaje: map.get("cotizador_plantilla_mensaje") || AJUSTES_DEFAULT.plantillaMensaje,
    condiciones: condiciones.length ? condiciones : AJUSTES_DEFAULT.condiciones,
    vigenciaDefault,
    emailCopia: texto("cotizador_email_copia") || AJUSTES_DEFAULT.emailCopia,
    factorDefault,
  };
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

const listarSchema = z.object({
  vendedorId: z.string().trim().min(1).optional(),
  estado: z.string().trim().min(1).optional(),
  texto: z.string().trim().optional(),
  take: z.number().int().positive().max(TAKE_MAX).optional(),
});

/** Grilla de cotizaciones. Sin `contenido`: el JSON solo se abre en el detalle. */
export async function listarPresupuestos(
  input?: z.input<typeof listarSchema>,
): Promise<Resultado<FilaPresupuesto[]>> {
  return ejecutar("listarPresupuestos", async () => {
    const parsed = listarSchema.safeParse(input ?? {});
    if (!parsed.success) fallar(parsed.error.issues[0]?.message ?? "Filtros inválidos.");
    const { vendedorId, estado, texto, take } = parsed.data;

    const s = await scopeVendedor(vendedorId);
    const where: Prisma.PresupuestoWhereInput = whereScope(s);

    if (estado) {
      const db = estadoUiADb(estado);
      if (!db) fallar(`Estado desconocido: ${estado}`);
      // El estado manual pisa al calculado, así que el filtro mira los dos.
      where.OR = [{ estadoManual: db }, { estadoManual: null, estado: db }];
    }

    const q = (texto ?? "").trim();
    if (q) {
      const contiene = { contains: q, mode: "insensitive" as const };
      const digitos = soloDigitos(q);
      where.AND = [
        {
          OR: [
            { numero: contiene },
            { clienteNombre: contiene },
            { clienteApellido: contiene },
            { clienteEmail: contiene },
            { destino: contiene },
            ...(digitos.length >= 3
              ? [{ clienteTelefonoDigitos: { contains: digitos } }]
              : []),
          ],
        },
      ];
    }

    const rows = await prisma.presupuesto.findMany({
      where,
      select: SELECT_FILA,
      orderBy: { updatedAt: "desc" },
      take: take ?? TAKE_DEFAULT,
    });
    return rows.map(aFila);
  });
}

/**
 * Los cuatro números del semáforo, sin traerse la grilla entera.
 *
 * Lo llama el botón "Cotizador" del shell del vendedor para el badge de "Para
 * hoy", así que tiene que ser barato: seis columnas, las confirmadas por
 * `count`. Los buckets son los mismos que dibuja `semaforo()` en el cliente
 * (_mockup/data.js), con las horas contadas en hábiles:
 *
 *   rojas      vencida sin ninguna apertura — el pasajero nunca la vio
 *   amarillas  enviada, sin abrir, +24 h hábiles — toca recordatorio
 *   verdes     confirmada, o abierta y todavía vigente
 *   borradores nunca salió
 *
 * No es una partición: una enviada de hace tres horas ("en ventana") y una
 * vencida que el pasajero sí abrió no entran en ningún chip, porque no hay
 * nada que hacer con ellas hoy.
 *
 * DÓNDE SE VE ESTO. El único consumidor es `VendedorShell`: el badge "Para
 * hoy" del botón Cotizador, con rol VENDEDOR y por lo tanto con `scopeVendedor`
 * acotado a lo propio. El ADMIN no ve este badge, y los chips que sí ve arriba
 * del listado son otra cosa: los cuenta el cliente sobre las filas que trajo la
 * grilla, o sea sobre lo filtrado en pantalla. Los dos números pueden no
 * coincidir y está bien — responden preguntas distintas.
 */
export interface ResumenSemaforo {
  rojas: number;
  amarillas: number;
  verdes: number;
  borradores: number;
  /** Lo que va en el badge: rojas + amarillas. */
  paraHoy: number;
}

export async function resumenSemaforo(): Promise<Resultado<ResumenSemaforo>> {
  return ejecutar("resumenSemaforo", async () => {
    const s = await scopeVendedor();

    /* Sin `take`. El badge cuenta lo que hay, no las 500 más recientes: un
       vendedor con historia dejaba afuera justo las vencidas viejas, que son
       las rojas que el chip existe para mostrar. Lo que abarata la query es
       traer seis columnas y sacar las confirmadas de la lista — que son la
       mayoría del archivo histórico y para el badge valen un solo número.

       El estado manual pisa al de la base (mismo criterio que el filtro del
       listado), así que las dos consultas lo miran primero: entre las dos
       parten el universo en dos mitades sin superposición ni agujero. */
    const PENDIENTES = ["BORRADOR", "ENVIADA", "ABIERTA", "VENCIDA"] as const;
    const [rows, confirmadas] = await Promise.all([
      prisma.presupuesto.findMany({
        where: {
          ...whereScope(s),
          OR: [
            { estadoManual: { in: [...PENDIENTES] } },
            { estadoManual: null, estado: { in: [...PENDIENTES] } },
          ],
        },
        select: {
          estado: true,
          estadoManual: true,
          enviadaAt: true,
          expiraAt: true,
          confirmadaAt: true,
          aperturas: true,
        },
      }),
      prisma.presupuesto.count({
        where: {
          ...whereScope(s),
          OR: [
            { estadoManual: "CONFIRMADA" },
            { estadoManual: null, estado: "CONFIRMADA" },
          ],
        },
      }),
    ]);

    const ahora = new Date();
    // Las verdes arrancan con las confirmadas, que ya vinieron contadas.
    const res: ResumenSemaforo = {
      rojas: 0, amarillas: 0, verdes: confirmadas, borradores: 0, paraHoy: 0,
    };

    for (const r of rows) {
      const estado = estadoEfectivoDe(r);
      if (estado === "BORRADOR") { res.borradores++; continue; }
      // Una vencida que el pasajero SÍ abrió no es roja (la vio) ni verde (el
      // link ya no abre): sale por el filtro de estado "Vencida", que existe
      // desde siempre en la misma barra.
      if (estado === "VENCIDA") {
        if (r.aperturas === 0) res.rojas++;
        continue;
      }
      if (r.aperturas > 0) { res.verdes++; continue; }
      if (r.enviadaAt && horasHabilesEntre(r.enviadaAt, ahora) >= 24) res.amarillas++;
    }
    res.paraHoy = res.rojas + res.amarillas;
    return res;
  });
}

/** Detalle completo, con el JSON y los últimos 100 eventos de bitácora. */
export async function obtenerPresupuesto(
  id: string,
): Promise<Resultado<PresupuestoCompleto>> {
  return ejecutar("obtenerPresupuesto", async () => {
    const s = await scopeVendedor();
    return cargarCompleto(String(id ?? ""), s);
  });
}

// ---------------------------------------------------------------------------
// Alta y guardado
// ---------------------------------------------------------------------------

const crearSchema = z.object({
  contenido: z.unknown(),
  origenTipo: z.string().trim().max(60).optional(),
  origenRef: z.string().trim().max(200).optional(),
  tiempoArmadoSeg: z.number().int().nonnegative().max(86_400).optional(),
  /** UUID que genera el editor por cotización nueva. Ver `claveEdicion`. */
  claveEdicion: z.string().trim().min(8).max(64).optional(),
  /** Solo ADMIN: firmar la cotización a nombre de otro vendedor. */
  vendedorId: z.string().trim().min(1).max(64).optional(),
});

/**
 * A nombre de quién queda la cotización.
 *
 * Un VENDEDOR firma siempre él, punto. El ADMIN puede elegir a otro desde el
 * selector del editor, pero el destinatario se comprueba contra la base: tiene
 * que ser un usuario activo de la misma marca y con rol que cotice. Sin esa
 * comprobación el selector sería un "asignale la venta a cualquier id".
 */
async function resolverVendedor(s: Scope, pedido?: string): Promise<string> {
  if (!pedido || pedido === s.userId) return s.userId;
  if (!s.isAdmin) fallar("Solo un administrador puede cotizar a nombre de otro.");

  const destino = await prisma.user.findFirst({
    where: {
      id: pedido,
      brandId: s.brandId,
      isActive: true,
      role: { in: ["ADMIN", "VENDEDOR"] },
    },
    select: { id: true },
  });
  if (!destino) fallar("Ese vendedor no está disponible.");
  return destino.id;
}

/**
 * Alta. Reserva el número del año, deriva las columnas y sella el JSON con su
 * propio número (el editor lo muestra en el encabezado y en el PDF).
 *
 * Idempotente por `claveEdicion`: si el autosave reintenta porque se perdió la
 * respuesta, la segunda llamada devuelve la fila que ya se creó en vez de
 * duplicarla y quemar otro correlativo.
 */
export async function crearPresupuesto(
  input: z.input<typeof crearSchema>,
): Promise<Resultado<PresupuestoCompleto>> {
  return ejecutar("crearPresupuesto", async () => {
    const parsedInput = crearSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const s = await scopeVendedor();
    const clave = parsedInput.data.claveEdicion ?? null;

    if (clave) {
      const yaEsta = await prisma.presupuesto.findFirst({
        where: { claveEdicion: clave, brandId: s.brandId, deletedAt: null },
        select: { id: true },
      });
      if (yaEsta) return cargarCompleto(yaEsta.id, s);
    }

    const parsed = parseContenido(parsedInput.data.contenido);
    if (!parsed.ok) fallar(parsed.error);

    const vendedorId = await resolverVendedor(s, parsedInput.data.vendedorId);

    const numero = await generarNumeroPresupuesto(prisma);
    // El HTML del vendedor se limpia ANTES de escribirlo: de la base sale para
    // el PDF, el email y el link público del pasajero.
    const contenido: ContenidoPresupuesto = sanitizarContenidoGuardado({
      ...parsed.contenido,
      numero,
      estado: parsed.contenido.estado || "borrador",
    });
    const cols = columnasDesdeContenido(contenido);
    const vigenciaHoras = acotarVigencia(contenido.vigencia || VIGENCIA_DEFAULT);

    let creadaId: string;
    try {
      const creada = await prisma.presupuesto.create({
        data: {
          numero,
          claveEdicion: clave,
          brandId: s.brandId,
          vendedorId,
          estado: "BORRADOR",
          ...cols,
          vigenciaHoras,
          origenTipo: parsedInput.data.origenTipo ?? null,
          origenRef: parsedInput.data.origenRef ?? null,
          tiempoArmadoSeg: parsedInput.data.tiempoArmadoSeg ?? null,
          contenido: contenido as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      creadaId = creada.id;
    } catch (err) {
      // Dos intentos en paralelo con la misma clave: el unique frena al
      // segundo y devolvemos la fila del primero.
      const chocada = clave
        ? await prisma.presupuesto.findFirst({
            where: { claveEdicion: clave, brandId: s.brandId, deletedAt: null },
            select: { id: true },
          })
        : null;
      if (!chocada) throw err;
      return cargarCompleto(chocada.id, s);
    }

    await anotar(creadaId, {
      tipo: "creada",
      titulo: `Cotización ${numero} creada`,
      detalle: parsedInput.data.origenRef ?? null,
      actorId: s.userId,
    });

    return cargarCompleto(creadaId, s);
  });
}

const guardarSchema = z.object({
  contenido: z.unknown(),
  tiempoArmadoSeg: z.number().int().nonnegative().max(86_400).optional(),
  /**
   * `updatedAt` de la última versión que el editor conoce, en ISO. Es el
   * control de concurrencia: si en la base hay uno más nuevo, alguien guardó
   * desde otra pestaña y este guardado se rechaza en vez de pisarlo.
   */
  updatedAtEsperado: z.string().trim().min(1).max(40).optional(),
});

export interface GuardadoResumen {
  id: string;
  numero: string;
  montoPrincipal: number | null;
  updatedAt: Date;
}

/**
 * Guardado del editor (también el autosave). Liviano a propósito: valida,
 * recalcula las columnas y escribe. Solo el primer guardado deja evento — si
 * no, la bitácora sería una lista de "guardada" cada 20 segundos.
 */
export async function guardarPresupuesto(
  id: string,
  input: z.input<typeof guardarSchema>,
): Promise<Resultado<GuardadoResumen>> {
  return ejecutar("guardarPresupuesto", async () => {
    const parsedInput = guardarSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const s = await scopeVendedor();
    const actual = await cargarPropia(String(id ?? ""), s);

    const parsed = parseContenido(parsedInput.data.contenido);
    if (!parsed.ok) fallar(parsed.error);

    // El número lo manda la base, no el cliente: un editor viejo no lo pisa.
    // El HTML de las notas del pasajero pasa por el saneo en cada guardado.
    const contenido: ContenidoPresupuesto = sanitizarContenidoGuardado({
      ...parsed.contenido,
      numero: actual.numero,
    });
    const cols = columnasDesdeContenido(contenido);
    const vigenciaHoras = acotarVigencia(contenido.vigencia || actual.vigenciaHoras);

    const datos = {
      ...cols,
      vigenciaHoras,
      ...(parsedInput.data.tiempoArmadoSeg !== undefined
        ? { tiempoArmadoSeg: parsedInput.data.tiempoArmadoSeg }
        : {}),
      contenido: contenido as unknown as Prisma.InputJsonValue,
    };

    const esperadoRaw = parsedInput.data.updatedAtEsperado;
    const esperado = esperadoRaw ? new Date(esperadoRaw) : null;
    if (esperado && Number.isNaN(esperado.getTime())) fallar("Datos inválidos.");

    if (esperado) {
      // updateMany porque el WHERE lleva `updatedAt`: si no matchea, count 0 y
      // nadie escribió nada. El editor recarga y avisa.
      const escrito = await prisma.presupuesto.updateMany({
        where: {
          id: actual.id,
          updatedAt: esperado,
          brandId: s.brandId,
          deletedAt: null,
        },
        data: datos,
      });
      if (escrito.count === 0) fallar(CONFLICTO);
    } else {
      await prisma.presupuesto.update({ where: { id: actual.id }, data: datos });
    }

    const row = await prisma.presupuesto.findUniqueOrThrow({
      where: { id: actual.id },
      select: { id: true, numero: true, montoPrincipal: true, updatedAt: true },
    });

    const yaHubo = await prisma.presupuestoEvento.findFirst({
      where: { presupuestoId: actual.id, tipo: "guardada" },
      select: { id: true },
    });
    if (!yaHubo) {
      await anotar(actual.id, {
        tipo: "guardada",
        titulo: "Primer guardado",
        actorId: s.userId,
      });
    }

    return row;
  });
}

/** Copia con número nuevo, en borrador y con la trazabilidad en las dos puntas. */
export async function duplicarPresupuesto(
  id: string,
): Promise<Resultado<PresupuestoCompleto>> {
  return ejecutar("duplicarPresupuesto", async () => {
    const s = await scopeVendedor();
    const origen = await cargarPropia(String(id ?? ""), s);

    const parsed = parseContenido(origen.contenido);
    if (!parsed.ok) fallar(parsed.error);

    const numero = await generarNumeroPresupuesto(prisma);
    const contenido: ContenidoPresupuesto = {
      ...parsed.contenido,
      numero,
      estado: "borrador",
      origen: `Duplicada de ${origen.numero}`,
    };
    const cols = columnasDesdeContenido(contenido);

    const copia = await prisma.presupuesto.create({
      data: {
        numero,
        brandId: s.brandId,
        // El admin duplica para el equipo: la copia sigue siendo del vendedor
        // que la armó. Un vendedor solo puede duplicar lo suyo, así que ahí
        // las dos ramas dan lo mismo.
        vendedorId: s.isAdmin ? origen.vendedorId : s.userId,
        estado: "BORRADOR",
        ...cols,
        vigenciaHoras: acotarVigencia(origen.vigenciaHoras),
        origenTipo: "duplicada",
        origenRef: origen.numero,
        contenido: contenido as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await anotar(copia.id, {
      tipo: "duplicada",
      titulo: `Duplicada de ${origen.numero}`,
      actorId: s.userId,
    });
    await anotar(origen.id, {
      tipo: "duplicada",
      titulo: `Se duplicó en ${numero}`,
      actorId: s.userId,
    });

    return cargarCompleto(copia.id, s);
  });
}

/** Baja lógica. La fila queda para el histórico y la auditoría. */
export async function eliminarPresupuesto(
  id: string,
): Promise<Resultado<{ id: string; numero: string }>> {
  return ejecutar("eliminarPresupuesto", async () => {
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    await prisma.presupuesto.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });

    await anotar(row.id, {
      tipo: "eliminada",
      titulo: "Cotización eliminada",
      actorId: s.userId,
    });
    await logAudit({
      action: "presupuesto.delete",
      userId: s.userId,
      targetType: "Presupuesto",
      targetId: row.id,
      metadata: { numero: row.numero, vendedorId: row.vendedorId },
    });

    return { id: row.id, numero: row.numero };
  });
}

// ---------------------------------------------------------------------------
// Estado y seguimiento
// ---------------------------------------------------------------------------

/**
 * Pisa el estado a mano. `null` devuelve el control al estado calculado.
 * Ojo: NO toca `estado`, que sigue reflejando lo que pasó de verdad (enviada,
 * abierta…). El cliente resuelve estadoManual ?? estado.
 */
export async function setEstadoManual(
  id: string,
  estadoUi: string | null,
): Promise<Resultado<{ id: string; estado: EstadoPresupuesto; estadoManual: EstadoPresupuesto | null }>> {
  return ejecutar("setEstadoManual", async () => {
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    let destino: EstadoPresupuesto | null = null;
    if (estadoUi !== null && estadoUi !== undefined && estadoUi !== "") {
      destino = estadoUiADb(estadoUi);
      if (!destino) fallar(`Estado desconocido: ${estadoUi}`);
    }

    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: { estadoManual: destino },
      select: { id: true, estado: true, estadoManual: true },
    });

    await anotar(row.id, {
      tipo: "estado_manual",
      titulo: destino ? `Estado fijado a mano: ${destino}` : "Estado devuelto al automático",
      actorId: s.userId,
    });
    await logAudit({
      action: "presupuesto.estado.manual",
      userId: s.userId,
      targetType: "Presupuesto",
      targetId: row.id,
      metadata: { numero: row.numero, desde: row.estadoManual, hasta: destino },
    });

    return actualizada;
  });
}

/** Bloc interno del vendedor. No lo ve el pasajero. */
export async function setNotasInternas(
  id: string,
  texto: string,
): Promise<Resultado<{ id: string }>> {
  return ejecutar("setNotasInternas", async () => {
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);
    const limpio = String(texto ?? "").slice(0, 20_000);

    await prisma.presupuesto.update({
      where: { id: row.id },
      data: { notasInternas: limpio.trim() === "" ? null : limpio },
    });
    return { id: row.id };
  });
}

const enviarSchema = z.object({
  canal: z.enum(["whatsapp", "email", "pdf", "manual"]),
  vigenciaHoras: z.number().int().positive().max(24 * 30),
});

/**
 * Sella el envío y arranca el reloj de la vigencia.
 *
 * Es el camino de "ya se la mandé por otro medio": el vendedor mandó el PDF
 * por su cuenta y solo quiere que el seguimiento arranque. Igual deja el link
 * emitido, así el drawer siempre tiene una URL para copiar.
 */
export async function marcarEnviada(
  id: string,
  input: z.input<typeof enviarSchema>,
): Promise<Resultado<{ id: string; enviadaAt: Date; expiraAt: Date; link: LinkEmitido }>> {
  return ejecutar("marcarEnviada", async () => {
    const parsedInput = enviarSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const { canal, vigenciaHoras } = parsedInput.data;

    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);
    const horas = acotarVigencia(vigenciaHoras);

    const sellado = await sellarEnvio(row, canal, horas, s.userId);

    return {
      id: row.id,
      enviadaAt: sellado.enviadaAt,
      expiraAt: sellado.expiraAt,
      link: sellado.link,
    };
  });
}

// ---------------------------------------------------------------------------
// Links públicos
//
// Un presupuesto tiene UN link vivo a la vez. Reenviar no emite otro: mueve el
// vencimiento del que ya está y le cambia el canal. Es lo que hace que el
// seguimiento cierre — si cada envío emitiera un token nuevo, las aperturas
// quedarían repartidas entre links y el drawer mostraría "1 apertura" cuando el
// pasajero la abrió seis veces.
//
// La emisión en sí (`linkVivo`, `emitirORenovar`) vive en
// `@/lib/presupuesto/acceso`: la comparten estas actions y la ruta del PDF.
// ---------------------------------------------------------------------------

/**
 * Sella el envío y deja el link listo. Es el corazón compartido de
 * `marcarEnviada`, `emitirLink` y `enviarPorEmail`.
 *
 * `enviadaAt` solo se escribe la primera vez de la ronda (borrador o vencida).
 * Un recordatorio sobre una cotización ya enviada NO lo pisa: si lo pisara,
 * "tardó 3 h en abrirla" pasaría a ser negativo en cuanto el vendedor insiste.
 * El reinicio de ronda es tarea de `reactivarPresupuesto`.
 */
async function sellarEnvio(
  row: FilaPropia,
  canal: string,
  vigenciaHoras: number,
  actorId: string,
  opts: {
    evento?: string;
    tituloEvento?: string;
    detalleExtra?: string;
    /**
     * `true` para los sellados que NO son un envío del vendedor (emitir el
     * link, correr la vigencia desde el modal): ahí el evento "enviada" solo
     * se anota si el link es nuevo o si el estado se movió. Sin esto, tocar
     * 24h/48h/72h dejaba una "Enviada por whatsapp" por toque.
     */
    soloSiCambia?: boolean;
    /**
     * Vencimiento ya calculado. Lo pasa `enviarPorEmail`, que necesita la
     * fecha ANTES de sellar (va escrita en el cuerpo del email): sin esto el
     * email prometía un vencimiento y la base guardaba otro unos segundos
     * después.
     */
    expiraAt?: Date;
  } = {},
): Promise<{ link: LinkEmitido; enviadaAt: Date; expiraAt: Date }> {
  const ahora = new Date();
  const expira = opts.expiraAt ?? sumarHorasHabiles(ahora, vigenciaHoras);

  const arrancaRonda = row.estado === "BORRADOR" || row.estado === "VENCIDA" || !row.enviadaAt;
  // Una confirmada o una abierta no vuelven a "enviada" porque el vendedor
  // mande un recordatorio: el estado cuenta lo que pasó, no lo último que se hizo.
  const estado =
    row.estado === "BORRADOR" || row.estado === "VENCIDA" ? "ENVIADA" : row.estado;

  const link = await emitirORenovar(row.id, canal, vigenciaHoras, expira);

  const actualizada = await prisma.presupuesto.update({
    where: { id: row.id },
    data: {
      estado,
      // Volver a mandarla saca la marca manual de "vencida": el vendedor acaba
      // de decir con los hechos que sigue viva.
      ...(row.estadoManual === "VENCIDA" ? { estadoManual: null } : {}),
      ...(arrancaRonda ? { enviadaAt: ahora } : {}),
      expiraAt: expira,
      vigenciaHoras,
    },
    select: { enviadaAt: true, expiraAt: true },
  });

  const detalle = `Vigencia ${vigenciaHoras} h hábiles · vence el ${textoVencimiento(expira)} · link /c/${link.token}${
    opts.detalleExtra ? ` · ${opts.detalleExtra}` : ""
  }`;

  if (!opts.soloSiCambia) {
    await anotar(row.id, {
      tipo: opts.evento ?? "enviada",
      titulo: opts.tituloEvento ?? `Enviada por ${canal}`,
      detalle,
      actorId,
    });
  } else if (link.nuevo || estado !== row.estado || arrancaRonda) {
    // Link recién emitido o cotización que recién ahora sale a la cancha: eso
    // sí es un envío.
    await anotar(row.id, {
      tipo: opts.evento ?? "enviada",
      titulo: opts.tituloEvento ?? `Enviada por ${canal}`,
      detalle,
      actorId,
    });
  } else if (!row.expiraAt || Math.abs(row.expiraAt.getTime() - expira.getTime()) > 60_000) {
    // Mismo link, mismo estado: lo único que se movió es el vencimiento.
    await anotar(row.id, {
      tipo: "vigencia_extendida",
      titulo: `Vigencia actualizada a ${vigenciaHoras} h`,
      detalle,
      actorId,
    });
  }
  // Si no cambió nada, no se anota nada: la bitácora cuenta hechos.

  return {
    link,
    enviadaAt: (actualizada.enviadaAt ?? ahora) as Date,
    expiraAt: actualizada.expiraAt as Date,
  };
}

const emitirLinkSchema = z.object({
  canal: z.enum(["whatsapp", "email", "pdf", "manual"]),
  vigenciaHoras: z.number().int().positive().max(VIGENCIA_MAX).optional(),
});

/**
 * Devuelve el link público de la cotización, emitiéndolo si hace falta, y de
 * paso la sella como enviada. Es lo que llama el modal de compartir cuando el
 * vendedor abre la pestaña de WhatsApp o toca "Generar link".
 */
export async function emitirLink(
  id: string,
  input: z.input<typeof emitirLinkSchema>,
): Promise<Resultado<LinkEmitido>> {
  return ejecutar("emitirLink", async () => {
    const parsedInput = emitirLinkSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const { canal } = parsedInput.data;

    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);
    const horas = acotarVigencia(parsedInput.data.vigenciaHoras ?? row.vigenciaHoras);

    // `soloSiCambia`: el modal llama a esta action al generar el link y cada
    // vez que el vendedor mueve la vigencia. Solo la primera es un envío.
    const { link } = await sellarEnvio(row, canal, horas, s.userId, { soloSiCambia: true });
    return link;
  });
}

/**
 * El link vivo, sin emitir nada. Lo usa el drawer para "Copiar link" cuando ya
 * existe y para mostrar la URL real en la vista previa de escritorio.
 */
export async function obtenerLinkActivo(
  id: string,
): Promise<Resultado<LinkEmitido | null>> {
  return ejecutar("obtenerLinkActivo", async () => {
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);
    const vivo = await linkVivo(row.id);
    if (!vivo) return null;
    return {
      token: vivo.token,
      url: urlDeToken(SITE_BASE_URL, vivo.token),
      expiraAt: vivo.expiraAt,
      nuevo: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Envío por email
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EXTRAS_MAX = 5;

function emailValido(v: unknown): string | null {
  const e = String(v ?? "").trim().toLowerCase();
  return EMAIL_RE.test(e) && e.length <= 200 ? e : null;
}

const enviarEmailSchema = z.object({
  vigenciaHoras: z.number().int().positive().max(VIGENCIA_MAX).optional(),
  /** Destinatarios sueltos que el vendedor escribió en el modal. */
  extras: z.array(z.string()).max(20).optional(),
  /** Recordatorio: mismo email, otro asunto y otro evento. */
  esRecordatorio: z.boolean().optional(),
});

export interface EnvioEmailResumen extends LinkEmitido {
  /** A quién salió, ya validado y deduplicado. */
  destinatarios: string[];
  copias: string[];
  /** `false` cuando no hay RESEND_API_KEY (dev): el link igual quedó emitido. */
  entregado: boolean;
  /** `false` si el PDF no se pudo generar: el email salió igual, con el link. */
  pdfAdjunto: boolean;
}

/**
 * Manda la cotización por email con el link adentro y el PDF adjunto.
 *
 * El PDF se renderiza acá mismo, contra el MISMO token que viaja en el cuerpo:
 * el pasajero abre el link y el adjunto y ve exactamente lo mismo. Tarda 3–6 s
 * y por eso el botón de la UI muestra "Enviando…" ese rato.
 *
 * El adjunto nunca frena el envío. Si el servidor no tiene Chromium, si el
 * render se cuelga o si alguien apagó la función con COTIZADOR_PDF_OFF, el
 * email sale igual con el link y la bitácora anota "sin PDF adjunto: <código>".
 * Un pasajero sin PDF pero con la cotización a un toque es infinitamente mejor
 * que un vendedor mirando un error.
 *
 * Si Resend rechaza el envío, el envío NO se sella: la cotización no pasa a
 * Enviada y el reloj no arranca, así el vendedor reintenta sin que la fila
 * mienta. El link ya emitido queda y se reutiliza en el reintento.
 */
export async function enviarPorEmail(
  id: string,
  input: z.input<typeof enviarEmailSchema> = {},
): Promise<Resultado<EnvioEmailResumen>> {
  return ejecutar("enviarPorEmail", async () => {
    const parsedInput = enviarEmailSchema.safeParse(input ?? {});
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const esRecordatorio = parsedInput.data.esRecordatorio === true;

    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    const parsed = parseContenido(row.contenido);
    if (!parsed.ok) fallar(parsed.error);
    const q = parsed.contenido;

    const para = emailValido(q.cliente?.email);
    if (!para) fallar("El cliente no tiene un email válido cargado.");

    const extras = (parsedInput.data.extras ?? [])
      .map(emailValido)
      .filter((e): e is string => !!e && e !== para);
    if (extras.length > EXTRAS_MAX) {
      fallar(`No más de ${EXTRAS_MAX} destinatarios extra.`);
    }

    const [vendedor, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: row.vendedorId },
        select: { name: true, email: true, cargo: true, telefono: true, whatsapp: true, fotoUrl: true, firmaUrl: true, slug: true, linkActivo: true },
      }),
      prisma.siteSetting.findMany({
        where: { key: { in: [...CLAVES_AJUSTES] } },
        select: { key: true, value: true },
      }),
    ]);
    if (!vendedor) fallar(NO_ENCONTRADA);
    const ajustes = leerAjustes(settings);

    const horas = acotarVigencia(
      parsedInput.data.vigenciaHoras ?? q.vigencia ?? row.vigenciaHoras,
    );
    const expira = sumarHorasHabiles(new Date(), horas);

    // El link se emite ANTES de armar el email porque el email lo lleva
    // adentro; el sellado del envío va después, solo si Resend lo aceptó.
    const link = await emitirORenovar(row.id, "email", horas, expira);

    // El PDF sale del link recién emitido, así que el adjunto y el cuerpo
    // apuntan a la misma hoja. Best-effort: cualquier falla se anota y sigue.
    let adjuntarPdf: EmailAttachment | undefined;
    let motivoSinPdf: string | null = null;
    if (await pdfDisponible()) {
      try {
        const pdf = await renderizarPdfDeCotizacion({
          token: link.token,
          numero: row.numero,
        });
        adjuntarPdf = {
          filename: nombreArchivoPdf(row.numero),
          content: pdf.toString("base64"),
          contentType: "application/pdf",
        };
      } catch (err) {
        motivoSinPdf = codigoDeError(err) ?? "DESCONOCIDO";
        log.warn("presupuesto.email.pdf.fail", {
          id: row.id,
          codigo: motivoSinPdf,
          err,
        });
      }
    } else {
      motivoSinPdf =
        process.env.COTIZADOR_PDF_OFF === "1" ? "APAGADO" : "SIN_CHROMIUM";
    }

    const copiaMaster = emailValido(ajustes.emailCopia);
    const copias = Array.from(
      new Set([...(copiaMaster ? [copiaMaster] : []), ...extras]),
    ).filter((c) => c !== para);

    const plantilla = cotizacionEmail({
      q,
      url: link.url,
      vigenciaHoras: horas,
      // La fecha concreta, no "48 horas": el pasajero no tiene por qué hacer
      // la cuenta, y menos ahora que la cuenta salta el fin de semana.
      expiraAt: expira,
      // El recordatorio recuerda cuándo salió la primera: si la ronda arranca
      // recién ahora, `enviadaAt` todavía está vacío y el email no la nombra.
      enviadaAt: row.enviadaAt,
      esRecordatorio,
      saludo: q.mensajeAuto
        ? renderPlantillaServidor(
            String(q.mensajeAuto),
            q.cliente?.nombre,
            vendedor.slug && vendedor.linkActivo
              ? `${SITE_BASE_URL}/datos-de-pasajeros/${vendedor.slug}`
              : null,
          )
        : null,
      vendedor: {
        nombre: vendedor.name,
        cargo: vendedor.cargo,
        email: vendedor.email,
        tel: vendedor.whatsapp || vendedor.telefono,
        foto: vendedor.fotoUrl,
        // Si la cargó, el email lleva la firma institucional en vez de la
        // tarjeta armada a mano.
        firma: vendedor.firmaUrl,
      },
    });

    const envio = await sendEmail({
      to: para,
      cc: copias,
      // El pasajero responde al vendedor, no a la casilla de notificaciones.
      replyTo: vendedor.email,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
      attachments: adjuntarPdf ? [adjuntarPdf] : undefined,
    });

    if (!envio.delivered && envio.provider === "resend") {
      log.error("presupuesto.email.fail", { id: row.id, error: envio.error });
      fallar("No pudimos mandar el email. Revisá la dirección y probá de nuevo.");
    }

    await sellarEnvio(row, "email", horas, s.userId, {
      expiraAt: expira,
      evento: esRecordatorio ? "recordatorio" : "enviada",
      tituloEvento: esRecordatorio
        ? `Recordatorio por email a ${para}`
        : `Enviada por email a ${para}`,
      detalleExtra: motivoSinPdf
        ? `sin PDF adjunto: ${motivoSinPdf}`
        : "con PDF adjunto",
    });

    return {
      ...link,
      expiraAt: expira,
      destinatarios: [para],
      copias,
      entregado: envio.delivered,
      pdfAdjunto: !!adjuntarPdf,
    };
  });
}

/**
 * `{nombre}` y `{link}` del mensaje automático, resueltos del lado del server.
 * Es la misma regla que `renderPlantilla()` en _mockup/data.js: sin link
 * cargado la línea entera se va, nunca se imprime "{link}" crudo al pasajero.
 */
function renderPlantillaServidor(
  tpl: string,
  nombre: unknown,
  link: string | null,
): string {
  const conNombre = tpl.replace(/\{nombre\}/g, String(nombre ?? "").trim());
  const conLink = link
    ? conNombre.replace(/\{link\}/g, link)
    : conNombre
        .split("\n")
        .filter((l) => !l.includes("{link}"))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+$/, "");
  return conLink.replace(/Hola\s+,/, "Hola,");
}

/**
 * Vuelve a poner en juego una cotización que venció o que nadie abrió: reloj
 * desde cero y contador de aperturas en cero, así el seguimiento no arrastra
 * lo de la ronda anterior.
 */
export async function reactivarPresupuesto(
  id: string,
): Promise<Resultado<{ id: string; enviadaAt: Date; expiraAt: Date; link: LinkEmitido }>> {
  return ejecutar("reactivarPresupuesto", async () => {
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    // El mismo estado que ve el vendedor en la lista: una ABIERTA cuya
    // vigencia se cumplió muestra "Vencida" y tiene que poder reactivarse. Con
    // el estado crudo la UI ofrecía el botón y el server lo rechazaba.
    const efectivo = estadoEfectivoDe(row);
    if (efectivo !== "VENCIDA" && efectivo !== "ENVIADA") {
      fallar("Solo se reactivan cotizaciones enviadas o vencidas.");
    }

    const ahora = new Date();
    const horas = acotarVigencia(row.vigenciaHoras || VIGENCIA_DEFAULT);
    const expira = sumarHorasHabiles(ahora, horas);

    // Ronda nueva: el link viejo se revoca y sale uno nuevo. Reactivar borra el
    // contador de aperturas, y si el token siguiera vivo las aperturas de la
    // ronda anterior se le pegarían al link nuevo por el `linkId`.
    await prisma.presupuestoLink.updateMany({
      where: { presupuestoId: row.id, revocadoAt: null },
      data: { revocadoAt: ahora },
    });
    const link = await emitirORenovar(row.id, "manual", horas, expira);

    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: {
        estado: "ENVIADA",
        // El estado a mano se limpia: reactivar es volver al flujo automático.
        estadoManual: null,
        enviadaAt: ahora,
        expiraAt: expira,
        vigenciaHoras: horas,
        aperturas: 0,
        primeraAperturaAt: null,
        ultimaAperturaAt: null,
      },
      select: { id: true, enviadaAt: true, expiraAt: true },
    });

    await anotar(row.id, {
      tipo: "reactivada",
      titulo: `Reactivada por ${horas} h hábiles`,
      detalle: `Vence el ${textoVencimiento(expira)} · link nuevo /c/${link.token}`,
      actorId: s.userId,
    });

    return {
      id: actualizada.id,
      enviadaAt: actualizada.enviadaAt as Date,
      expiraAt: actualizada.expiraAt as Date,
      link,
    };
  });
}

/** Corre el vencimiento hacia adelante sin resetear el seguimiento. */
export async function extenderVigencia(
  id: string,
  horas: number = VIGENCIA_DEFAULT,
): Promise<Resultado<{ id: string; expiraAt: Date; link: LinkEmitido }>> {
  return ejecutar("extenderVigencia", async () => {
    const n = Math.round(Number(horas));
    if (!Number.isFinite(n) || n <= 0 || n > 24 * 30) {
      fallar("La extensión tiene que ir entre 1 hora y 30 días.");
    }
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    // Desde el vencimiento si todavía no pasó, y desde ahora si ya venció:
    // extender una cotización vencida hace tres días tiene que dar `n` horas
    // desde este momento, no `n` horas desde hace tres días.
    const ahora = new Date();
    const base = row.expiraAt && row.expiraAt > ahora ? row.expiraAt : ahora;
    const expira = sumarHorasHabiles(base, n);

    // `vigenciaHoras` es la ventana con la que se envía y con la que reactiva:
    // acumular acá la inflaba sola (48 + 48 + 48…) y una reactivación después
    // de tres extensiones daba una semana de vigencia sin que nadie lo pida.
    // El vencimiento que manda para el pasajero es el del LINK: la página
    // pública mira `PresupuestoLink.expiraAt`, no la columna del presupuesto.
    // Si acá se corriera solo la columna, el drawer diría "quedan 48 h" y el
    // link seguiría dando "esta cotización venció". Si no hay link vivo (nunca
    // se compartió, o se revocó al reactivar) se emite uno.
    const link = await emitirORenovar(row.id, "manual", acotarVigencia(row.vigenciaHoras), expira);

    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: {
        expiraAt: expira,
        // Extender es decir "sigue viva": la marca manual de vencida se cae.
        ...(row.estadoManual === "VENCIDA" ? { estadoManual: null } : {}),
      },
      select: { id: true, expiraAt: true },
    });

    await anotar(row.id, {
      tipo: "vigencia_extendida",
      titulo: `Vigencia extendida ${n} h hábiles`,
      detalle: `Vence el ${textoVencimiento(expira)} · link /c/${link.token}`,
      actorId: s.userId,
    });

    return { id: actualizada.id, expiraAt: actualizada.expiraAt as Date, link };
  });
}

const confirmarSchema = z.object({
  opcion: z.string().trim().min(1).max(200),
  via: z.string().trim().min(1).max(60),
});

/** El pasajero eligió. Queda qué opción y por qué canal llegó la confirmación. */
export async function registrarConfirmacion(
  id: string,
  input: z.input<typeof confirmarSchema>,
): Promise<Resultado<{ id: string; confirmadaAt: Date }>> {
  return ejecutar("registrarConfirmacion", async () => {
    const parsedInput = confirmarSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const { opcion, via } = parsedInput.data;

    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    const ahora = new Date();
    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: {
        estado: "CONFIRMADA",
        estadoManual: null,
        confirmadaAt: ahora,
        confirmadaOpcion: opcion,
        confirmadaVia: via,
      },
      select: { id: true, confirmadaAt: true },
    });

    await anotar(row.id, {
      tipo: "confirmada",
      titulo: `Confirmada: ${opcion}`,
      detalle: `Vía ${via}`,
      actorId: s.userId,
    });

    return { id: actualizada.id, confirmadaAt: actualizada.confirmadaAt as Date };
  });
}

// ---------------------------------------------------------------------------
// Plantillas
// ---------------------------------------------------------------------------

export interface FilaPlantilla {
  id: string;
  nombre: string;
  destino: string | null;
  detalle: string | null;
  vendedorId: string | null;
  usos: number;
  ultimoUsoAt: Date | null;
  createdAt: Date;
}

/** Las globales del equipo más las propias. Las de otro vendedor no se ven. */
export async function listarPlantillas(): Promise<Resultado<FilaPlantilla[]>> {
  return ejecutar("listarPlantillas", async () => {
    const s = await scopeVendedor();
    return prisma.plantillaPresupuesto.findMany({
      where: {
        brandId: s.brandId,
        deletedAt: null,
        OR: [{ vendedorId: null }, { vendedorId: s.userId }],
      },
      select: {
        id: true,
        nombre: true,
        destino: true,
        detalle: true,
        vendedorId: true,
        usos: true,
        ultimoUsoAt: true,
        createdAt: true,
      },
      orderBy: [{ usos: "desc" }, { nombre: "asc" }],
    });
  });
}

const plantillaSchema = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre para la plantilla.").max(120),
  destino: z.string().trim().max(120).optional(),
  detalle: z.string().trim().max(400).optional(),
  contenido: z.unknown(),
});

export async function crearPlantilla(
  input: z.input<typeof plantillaSchema>,
): Promise<Resultado<FilaPlantilla>> {
  return ejecutar("crearPlantilla", async () => {
    const parsedInput = plantillaSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const s = await scopeVendedor();

    const parsed = parseContenido(parsedInput.data.contenido);
    if (!parsed.ok) fallar(parsed.error);

    // La plantilla no arrastra al cliente ni el número de la cotización origen.
    const contenido: ContenidoPresupuesto = {
      ...parsed.contenido,
      numero: "",
      estado: "borrador",
      cliente: { nombre: "", apellido: "", email: "", telefono: "" },
    };

    return prisma.plantillaPresupuesto.create({
      data: {
        brandId: s.brandId,
        nombre: parsedInput.data.nombre,
        destino: parsedInput.data.destino || null,
        detalle: parsedInput.data.detalle || null,
        // Toda plantilla nace privada; el admin la vuelve global cambiando la fila.
        vendedorId: s.userId,
        contenido: contenido as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        nombre: true,
        destino: true,
        detalle: true,
        vendedorId: true,
        usos: true,
        ultimoUsoAt: true,
        createdAt: true,
      },
    });
  });
}

/** Solo la borra su dueño o un admin (las globales, únicamente el admin). */
export async function eliminarPlantilla(
  id: string,
): Promise<Resultado<{ id: string }>> {
  return ejecutar("eliminarPlantilla", async () => {
    const s = await scopeVendedor();
    const row = await prisma.plantillaPresupuesto.findFirst({
      where: { id: String(id ?? ""), brandId: s.brandId, deletedAt: null },
      select: { id: true, vendedorId: true, nombre: true },
    });
    if (!row) fallar("No encontramos esa plantilla.");
    if (!s.isAdmin && row.vendedorId !== s.userId) fallar("No encontramos esa plantilla.");

    await prisma.plantillaPresupuesto.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
    await logAudit({
      action: "presupuesto.plantilla.delete",
      userId: s.userId,
      targetType: "PlantillaPresupuesto",
      targetId: row.id,
      metadata: { nombre: row.nombre },
    });
    return { id: row.id };
  });
}

export interface ContenidoPlantilla {
  id: string;
  nombre: string;
  contenido: ContenidoPresupuesto;
}

/** Trae y valida la plantilla comprobando que el que pide la pueda ver. */
async function cargarPlantilla(id: string, s: Scope): Promise<ContenidoPlantilla> {
  const row = await prisma.plantillaPresupuesto.findFirst({
    where: {
      id: String(id ?? ""),
      brandId: s.brandId,
      deletedAt: null,
      OR: [{ vendedorId: null }, { vendedorId: s.userId }],
    },
    select: { id: true, nombre: true, contenido: true },
  });
  if (!row) fallar("No encontramos esa plantilla.");

  const parsed = parseContenido(row.contenido);
  if (!parsed.ok) fallar(parsed.error);

  return { id: row.id, nombre: row.nombre, contenido: parsed.contenido };
}

/**
 * Lee la plantilla sin tocar el contador.
 *
 * "Usos" mide cuántas cotizaciones salieron de esta plantilla; duplicarla o
 * mirarla no es usarla, y contando eso el orden del listado (que ordena por
 * usos) terminaba mintiendo.
 */
export async function leerPlantilla(
  id: string,
): Promise<Resultado<ContenidoPlantilla>> {
  return ejecutar("leerPlantilla", async () => {
    const s = await scopeVendedor();
    return cargarPlantilla(id, s);
  });
}

/** Devuelve el contenido para arrancar una cotización y cuenta el uso. */
export async function usarPlantilla(
  id: string,
): Promise<Resultado<ContenidoPlantilla>> {
  return ejecutar("usarPlantilla", async () => {
    const s = await scopeVendedor();
    const plantilla = await cargarPlantilla(id, s);

    // El contador no puede tumbar el uso de la plantilla: best-effort.
    await prisma.plantillaPresupuesto
      .update({
        where: { id: plantilla.id },
        data: { usos: { increment: 1 }, ultimoUsoAt: new Date() },
      })
      .catch((err) => log.error("usarPlantilla.contador.fail", { id: plantilla.id, err }));

    return plantilla;
  });
}

// ---------------------------------------------------------------------------
// Favoritos e historial
// ---------------------------------------------------------------------------

/** Estrella del buscador de hoteles. Devuelve la lista ya actualizada. */
export async function toggleFavorito(
  alojamientoId: string,
): Promise<Resultado<string[]>> {
  return ejecutar("toggleFavorito", async () => {
    const s = await scopeVendedor();
    const id = String(alojamientoId ?? "").trim();
    if (!id) fallar("Falta el hotel.");

    const clave = { vendedorId_alojamientoId: { vendedorId: s.userId, alojamientoId: id } };
    const existe = await prisma.hotelFavorito.findUnique({
      where: clave,
      select: { alojamientoId: true },
    });

    if (existe) {
      await prisma.hotelFavorito.delete({ where: clave });
    } else {
      const hotel = await prisma.alojamiento.findFirst({
        where: { id, brandId: s.brandId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) fallar("Ese hotel no está en el catálogo.");
      await prisma.hotelFavorito.create({
        data: { vendedorId: s.userId, alojamientoId: id },
      });
    }

    const lista = await prisma.hotelFavorito.findMany({
      where: { vendedorId: s.userId },
      select: { alojamientoId: true },
    });
    return lista.map((f) => f.alojamientoId);
  });
}

export interface FilaHistorial {
  id: string;
  numero: string;
  clienteNombre: string | null;
  clienteApellido: string | null;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  destino: string | null;
  mes: number | null;
  anio: number | null;
  montoPrincipal: number | null;
  updatedAt: Date;
}

/**
 * Memoria del vendedor: pega un teléfono, un nombre o un mail y aparecen las
 * cotizaciones anteriores de esa persona. El teléfono matchea por dígitos, así
 * que "+598 99 123 456" y "099123456" encuentran lo mismo.
 */
export async function buscarEnHistorial(
  texto: string,
): Promise<Resultado<FilaHistorial[]>> {
  return ejecutar("buscarEnHistorial", async () => {
    const s = await scopeVendedor();
    const q = String(texto ?? "").trim();
    if (q.length < 3) return [];

    const digitos = soloDigitos(q);
    const contiene = { contains: q, mode: "insensitive" as const };
    const or: Prisma.PresupuestoWhereInput[] = [
      { clienteNombre: contiene },
      { clienteApellido: contiene },
      { clienteEmail: contiene },
    ];
    if (digitos.length >= 3) {
      or.push({ clienteTelefonoDigitos: { contains: digitos } });
    }

    return prisma.presupuesto.findMany({
      where: { ...whereScope(s), OR: or },
      select: {
        id: true,
        numero: true,
        clienteNombre: true,
        clienteApellido: true,
        clienteEmail: true,
        clienteTelefono: true,
        destino: true,
        mes: true,
        anio: true,
        montoPrincipal: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: HISTORIAL_MAX,
    });
  });
}

// ---------------------------------------------------------------------------
// Pasajeros y Pagos, atados a la cotización
//
// El puente entre los dos módulos es el `numero` de la cotización (COT-2026-…):
// va como `referencia` en la solicitud que se crea desde el cotizador y vuelve
// pegado al envío del pasajero. Es texto libre en la DB, así que el vínculo se
// arma acá con una comparación exacta contra el número, siempre dentro del
// vendedor dueño de la cotización.
//
// `DatosPagoCifrado` NO tiene columna `referencia`: el único hilo que lo ata a
// una cotización es su `solicitudId`. Por eso una tarjeta aparece en este
// bloque solo si el pasajero la cargó desde el link de una solicitud creada
// desde el cotizador. Si algún día se quiere lo mismo para la carga por link
// permanente, hace falta agregarle `referencia String?` al modelo.
// ---------------------------------------------------------------------------

const DATOS_TIPOS = ["PASAJEROS", "PAGO"] as const;
type TipoDato = (typeof DATOS_TIPOS)[number];

/** Tope de filas por bloque: una cotización no junta cien envíos. */
const DATOS_MAX = 20;

const SOLO_EL_FIRMANTE =
  "La solicitud sale a nombre de quien la manda. Esta cotización la firma otro vendedor: pedísela desde su usuario o pasale el link a mano.";

export type EstadoSolicitudDato = "completada" | "vigente" | "vencida";

export interface SolicitudDeCotizacion {
  id: string;
  tipo: TipoDato;
  destinatarioEmail: string;
  enviadoAt: Date;
  expiraAt: Date;
  completadoAt: Date | null;
  estado: EstadoSolicitudDato;
}

export interface EnvioDeCotizacion {
  id: string;
  createdAt: Date;
  cantidad: number;
  contacto: string;
  destino: string | null;
  vistoAt: Date | null;
  /** Ruta del panel: abre para el dueño y para el admin, cada uno por su lado. */
  href: string;
}

export interface PagoDeCotizacion {
  id: string;
  titular: string;
  emisor: string | null;
  ultimos4: string;
  createdAt: Date;
  expiraAt: Date;
  vistoAt: Date | null;
  purgadoAt: Date | null;
  estado: "vivo" | "visto" | "purgado";
  href: string;
}

export interface DatosDelPasajero {
  /** El número de la cotización: es la referencia con la que se ata todo. */
  referencia: string;
  /** `false` cuando quien mira no es el vendedor que firma. */
  puedePedir: boolean;
  /** Por qué no puede pedir, listo para mostrar. */
  motivo: string | null;
  solicitudes: SolicitudDeCotizacion[];
  envios: EnvioDeCotizacion[];
  pagos: PagoDeCotizacion[];
}

function estadoDeSolicitud(f: {
  completadoAt: Date | null;
  expiraAt: Date;
}): EstadoSolicitudDato {
  if (f.completadoAt) return "completada";
  return f.expiraAt.getTime() <= Date.now() ? "vencida" : "vigente";
}

/**
 * Lo que llegó (o está por llegar) del pasajero para ESTA cotización.
 *
 * Se lee siempre contra el vendedor dueño de la cotización, no contra el de la
 * sesión: un admin que abre el drawer de una cotización ajena tiene que ver los
 * envíos de ese vendedor, no los suyos.
 */
export async function datosDelPasajero(
  presupuestoId: string,
): Promise<Resultado<DatosDelPasajero>> {
  return ejecutar("datosDelPasajero", async () => {
    const s = await scopeVendedor();
    const p = await cargarPropia(String(presupuestoId ?? ""), s);

    const referencia = p.numero;
    const puedePedir = p.vendedorId === s.userId;

    const solicitudes = await prisma.solicitudDato.findMany({
      where: { vendedorId: p.vendedorId, referencia },
      orderBy: { enviadoAt: "desc" },
      take: DATOS_MAX,
      select: {
        id: true,
        tipo: true,
        destinatarioEmail: true,
        enviadoAt: true,
        expiraAt: true,
        completadoAt: true,
      },
    });
    const idsSolicitud = solicitudes.map((x) => x.id);

    const [envios, pagos] = await Promise.all([
      prisma.envioPasajeros.findMany({
        where: {
          vendedorId: p.vendedorId,
          OR: [
            { referencia },
            ...(idsSolicitud.length ? [{ solicitudId: { in: idsSolicitud } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: DATOS_MAX,
        select: {
          id: true,
          createdAt: true,
          destino: true,
          vistoAt: true,
          _count: { select: { pasajeros: true } },
          pasajeros: {
            orderBy: { orden: "asc" },
            take: 1,
            select: { nombres: true, apellidos: true },
          },
        },
      }),
      // Sin `referencia` en el modelo, la solicitud es el único hilo.
      idsSolicitud.length
        ? prisma.datosPagoCifrado.findMany({
            where: { vendedorId: p.vendedorId, solicitudId: { in: idsSolicitud } },
            orderBy: { createdAt: "desc" },
            take: DATOS_MAX,
            // Select explícito: payload / iv / tag NUNCA salen de la bóveda.
            select: {
              id: true,
              titular: true,
              emisor: true,
              ultimos4: true,
              createdAt: true,
              expiraAt: true,
              vistoAt: true,
              purgadoAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const ahora = Date.now();
    return {
      referencia,
      puedePedir,
      motivo: puedePedir ? null : SOLO_EL_FIRMANTE,
      solicitudes: solicitudes.map((f) => ({
        ...f,
        tipo: f.tipo as TipoDato,
        estado: estadoDeSolicitud(f),
      })),
      envios: envios.map((e) => {
        const primero = e.pasajeros[0];
        return {
          id: e.id,
          createdAt: e.createdAt,
          cantidad: e._count.pasajeros,
          contacto: primero ? `${primero.nombres} ${primero.apellidos}`.trim() : "·",
          destino: e.destino,
          vistoAt: e.vistoAt,
          href: `/backend/datos/pasajeros/${e.id}`,
        };
      }),
      pagos: pagos.map((f) => ({
        ...f,
        estado:
          f.purgadoAt || f.expiraAt.getTime() <= ahora
            ? ("purgado" as const)
            : f.vistoAt
              ? ("visto" as const)
              : ("vivo" as const),
        href: `/backend/datos/pagos/${f.id}`,
      })),
    };
  });
}

const pedirDatosSchema = z.object({
  tipo: z.enum(DATOS_TIPOS),
  canal: z.enum(["email", "whatsapp", "link"]),
});

export interface PedidoDatosResumen {
  /** Texto para el toast. */
  mensaje: string;
  /** `true` cuando además salió el email con el token de un uso. */
  solicitud: boolean;
}

const TITULO_PEDIDO: Record<TipoDato, string> = {
  PASAJEROS: "Datos de pasajeros pedidos",
  PAGO: "Datos de tarjeta pedidos",
};
const TIPO_EVENTO: Record<TipoDato, string> = {
  PASAJEROS: "datos_pasajeros_pedidos",
  PAGO: "datos_pago_pedidos",
};
const CANAL_TEXTO: Record<string, string> = {
  email: "por email",
  whatsapp: "por WhatsApp",
  link: "link copiado",
};

/**
 * Le pide al pasajero los datos desde la cotización.
 *
 * Con `canal: "email"` crea una solicitud de verdad —la misma action que usa el
 * modal del vendedor— con el destino y el número de la cotización precargados,
 * así lo que vuelva queda atado sin que nadie escriba una referencia a mano.
 * Con "whatsapp" o "link" no manda nada: el vendedor comparte el link
 * permanente desde su teléfono y acá solo queda anotado en la bitácora.
 *
 * Scope: la solicitud sale SIEMPRE a nombre del vendedor de la sesión (así lo
 * resuelve `crearSolicitud`), así que un admin mirando la cotización de otro no
 * puede pedir en su nombre. Se corta acá con un mensaje que lo explica en vez
 * de mandar un email firmado por quien no corresponde.
 */
export async function pedirDatosDelPasajero(
  presupuestoId: string,
  input: z.input<typeof pedirDatosSchema>,
): Promise<Resultado<PedidoDatosResumen>> {
  return ejecutar("pedirDatosDelPasajero", async () => {
    const parsed = pedirDatosSchema.safeParse(input ?? {});
    if (!parsed.success) fallar(parsed.error.issues[0]?.message ?? "Pedido inválido.");
    const { tipo, canal } = parsed.data;

    const s = await scopeVendedor();
    const p = await cargarPropia(String(presupuestoId ?? ""), s);
    // Copiar el link o abrirlo en WhatsApp lo puede hacer cualquiera que vea la
    // cotización: el link es público y el mensaje sale de su teléfono. Lo que
    // no se puede es mandar un email firmado por otro vendedor.
    if (canal === "email" && p.vendedorId !== s.userId) fallar(SOLO_EL_FIRMANTE);

    const fila = await prisma.presupuesto.findUnique({
      where: { id: p.id },
      select: {
        clienteNombre: true,
        clienteApellido: true,
        clienteEmail: true,
        destino: true,
      },
    });

    let mensaje: string;
    let solicitud = false;

    if (canal === "email") {
      const email = (fila?.clienteEmail ?? "").trim();
      if (!email) {
        fallar("Esta cotización no tiene email del cliente. Cargalo y volvé a intentar.");
      }
      const r = await crearSolicitud({
        tipo,
        email,
        nombre: [fila?.clienteNombre, fila?.clienteApellido].filter(Boolean).join(" ").trim(),
        destino: fila?.destino ?? undefined,
        referencia: p.numero,
      });
      if (!r.ok) fallar(r.message);
      mensaje = r.message;
      solicitud = true;
    } else {
      mensaje =
        tipo === "PAGO"
          ? "Anotado: le pasaste el link de datos de tarjeta."
          : "Anotado: le pasaste el link de datos de pasajeros.";
    }

    await anotar(p.id, {
      tipo: TIPO_EVENTO[tipo],
      titulo: TITULO_PEDIDO[tipo],
      detalle:
        canal === "email"
          ? `${CANAL_TEXTO[canal]} a ${(fila?.clienteEmail ?? "").trim()}`
          : CANAL_TEXTO[canal],
      actorId: s.userId,
    });

    return { mensaje, solicitud };
  });
}

export interface PresupuestoPorNumero {
  id: string;
  numero: string;
  destino: string | null;
  clienteNombre: string | null;
  clienteApellido: string | null;
}

/** Tope de referencias por consulta: una página de la bandeja son 20 filas. */
const REFERENCIAS_MAX = 50;

/**
 * Del número al expediente. La usan las pantallas de Pasajeros y Pagos para
 * convertir la `referencia` que quedó pegada al envío en un link que abre el
 * drawer de esa cotización (`/backend/cotizador?abrir=<id>`).
 *
 * Devuelve solo las que existen y caen dentro del scope de quien mira: es una
 * comodidad de navegación, no un buscador. Una referencia escrita a mano que
 * no matchea ningún número simplemente no vuelve, y la fila se queda sin link.
 */
export async function cotizacionesPorReferencia(
  numeros: string[],
): Promise<Resultado<PresupuestoPorNumero[]>> {
  return ejecutar("cotizacionesPorReferencia", async () => {
    const limpios = Array.from(
      new Set((numeros ?? []).map((n) => String(n ?? "").trim()).filter(Boolean)),
    ).slice(0, REFERENCIAS_MAX);
    if (!limpios.length) return [];

    const s = await scopeVendedor();
    return prisma.presupuesto.findMany({
      where: { ...whereScope(s), numero: { in: limpios } },
      select: {
        id: true,
        numero: true,
        destino: true,
        clienteNombre: true,
        clienteApellido: true,
      },
      take: REFERENCIAS_MAX,
    });
  });
}
