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
import { requireAuth } from "@/lib/require-auth";
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
import {
  columnasDesdeContenido,
  soloDigitos,
} from "@/lib/presupuesto/derivados";

const log = logger.child({ module: "presupuesto.actions" });

const SIN_PERMISO = "Tu rol no tiene acceso al cotizador.";
const NO_ENCONTRADA = "No encontramos esa cotización.";
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

/** Resultados del buscador de historial (el panel muestra pocos). */
const HISTORIAL_MAX = 8;

// ---------------------------------------------------------------------------
// Contrato de salida
// ---------------------------------------------------------------------------

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Envoltorio único: corre la action y traduce cualquier excepción a
 * { ok:false, error }. Los mensajes de negocio se levantan con `fallar()`
 * para que lleguen tal cual al vendedor; el resto sale genérico y queda el
 * detalle en los logs.
 */
class ErrorDeNegocio extends Error {}
function fallar(mensaje: string): never {
  throw new ErrorDeNegocio(mensaje);
}

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
// ---------------------------------------------------------------------------

interface Scope {
  userId: string;
  role: string;
  brandId: string;
  isAdmin: boolean;
  /** null = sin filtro por vendedor (solo puede pasar siendo ADMIN). */
  targetId: string | null;
}

/**
 * Quién mira y qué puede tocar.
 *
 * Un VENDEDOR llega acá con `canEdit:false` del contrato general del panel —
 * eso es sobre el catálogo (paquetes, hoteles, precios), que solo edita el
 * máster. El cotizador es otra cosa: es la herramienta de trabajo del
 * vendedor y las cotizaciones son suyas, así que acá escribe. Lo que lo
 * encierra no es el permiso de edición sino el scope: `targetId` lo clava en
 * su propio `vendedorId` y el `vendedorId` que mande de afuera se ignora.
 */
async function scopeVendedor(vendedorId?: string | null): Promise<Scope> {
  const ctx = await requireAuth();
  if (ctx.role !== "ADMIN" && ctx.role !== "VENDEDOR") fallar(SIN_PERMISO);
  const isAdmin = ctx.role === "ADMIN";
  return {
    userId: ctx.userId,
    role: ctx.role,
    brandId: ctx.brandId,
    isAdmin,
    // El vendedor siempre lo suyo; el admin lo que pida, o todo si no filtra.
    targetId: isAdmin ? (vendedorId ?? null) : ctx.userId,
  };
}

/** WHERE base del listado: marca, vivos y el scope de quien mira. */
function whereScope(s: Scope): Prisma.PresupuestoWhereInput {
  return {
    brandId: s.brandId,
    deletedAt: null,
    ...(s.targetId ? { vendedorId: s.targetId } : {}),
  };
}

/**
 * Trae la cotización comprobando que quien pide la pueda tocar. A un ajeno le
 * responde lo mismo que a una inexistente: no confirmamos que exista.
 */
async function cargarPropia(id: string, s: Scope) {
  const row = await prisma.presupuesto.findFirst({
    where: { id, brandId: s.brandId, deletedAt: null },
    select: {
      id: true,
      numero: true,
      vendedorId: true,
      estado: true,
      estadoManual: true,
      vigenciaHoras: true,
      enviadaAt: true,
      expiraAt: true,
      contenido: true,
    },
  });
  if (!row) fallar(NO_ENCONTRADA);
  if (!s.isAdmin && row.vendedorId !== s.userId) fallar(NO_ENCONTRADA);
  return row;
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
} satisfies Prisma.PresupuestoSelect;

export interface FilaPresupuesto {
  id: string;
  numero: string;
  estado: EstadoPresupuesto;
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
}

type FilaCruda = Prisma.PresupuestoGetPayload<{ select: typeof SELECT_FILA }>;

function aFila(r: FilaCruda): FilaPresupuesto {
  const { vendedor, ...resto } = r;
  return { ...resto, vendedorNombre: vendedor?.name ?? "" };
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
  condiciones: semillaAjuste("cotizador_condiciones")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean),
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

  const condiciones = texto("cotizador_condiciones")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

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
    const contenido: ContenidoPresupuesto = {
      ...parsed.contenido,
      numero,
      estado: parsed.contenido.estado || "borrador",
    };
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
    const contenido: ContenidoPresupuesto = { ...parsed.contenido, numero: actual.numero };
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
  canal: z.enum(["whatsapp", "email", "manual"]),
  vigenciaHoras: z.number().int().positive().max(24 * 30),
});

/**
 * Sella el envío y arranca el reloj de la vigencia. El link público lo emite
 * la próxima ola: acá solo queda registrado que salió y por dónde.
 */
export async function marcarEnviada(
  id: string,
  input: z.input<typeof enviarSchema>,
): Promise<Resultado<{ id: string; enviadaAt: Date; expiraAt: Date }>> {
  return ejecutar("marcarEnviada", async () => {
    const parsedInput = enviarSchema.safeParse(input);
    if (!parsedInput.success) {
      fallar(parsedInput.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const { canal, vigenciaHoras } = parsedInput.data;

    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    const ahora = new Date();
    const expira = new Date(ahora.getTime() + vigenciaHoras * 3_600_000);

    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: {
        estado: "ENVIADA",
        enviadaAt: ahora,
        expiraAt: expira,
        vigenciaHoras,
      },
      select: { id: true, enviadaAt: true, expiraAt: true },
    });

    await anotar(row.id, {
      tipo: "enviada",
      titulo: `Enviada por ${canal}`,
      detalle: `Vigencia ${vigenciaHoras} h`,
      actorId: s.userId,
    });

    return {
      id: actualizada.id,
      enviadaAt: actualizada.enviadaAt as Date,
      expiraAt: actualizada.expiraAt as Date,
    };
  });
}

/**
 * Vuelve a poner en juego una cotización que venció o que nadie abrió: reloj
 * desde cero y contador de aperturas en cero, así el seguimiento no arrastra
 * lo de la ronda anterior.
 */
export async function reactivarPresupuesto(
  id: string,
): Promise<Resultado<{ id: string; enviadaAt: Date; expiraAt: Date }>> {
  return ejecutar("reactivarPresupuesto", async () => {
    const s = await scopeVendedor();
    const row = await cargarPropia(String(id ?? ""), s);

    const efectivo = row.estadoManual ?? row.estado;
    if (efectivo !== "VENCIDA" && efectivo !== "ENVIADA") {
      fallar("Solo se reactivan cotizaciones enviadas o vencidas.");
    }

    const ahora = new Date();
    const horas = acotarVigencia(row.vigenciaHoras || VIGENCIA_DEFAULT);
    const expira = new Date(ahora.getTime() + horas * 3_600_000);

    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: {
        estado: "ENVIADA",
        // El estado a mano se limpia: reactivar es volver al flujo automático.
        estadoManual: null,
        enviadaAt: ahora,
        expiraAt: expira,
        aperturas: 0,
        primeraAperturaAt: null,
        ultimaAperturaAt: null,
      },
      select: { id: true, enviadaAt: true, expiraAt: true },
    });

    await anotar(row.id, {
      tipo: "reactivada",
      titulo: `Reactivada por ${horas} h`,
      actorId: s.userId,
    });

    return {
      id: actualizada.id,
      enviadaAt: actualizada.enviadaAt as Date,
      expiraAt: actualizada.expiraAt as Date,
    };
  });
}

/** Corre el vencimiento hacia adelante sin resetear el seguimiento. */
export async function extenderVigencia(
  id: string,
  horas: number = VIGENCIA_DEFAULT,
): Promise<Resultado<{ id: string; expiraAt: Date }>> {
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
    const expira = new Date(base.getTime() + n * 3_600_000);

    // `vigenciaHoras` es la ventana con la que se envía y con la que reactiva:
    // acumular acá la inflaba sola (48 + 48 + 48…) y una reactivación después
    // de tres extensiones daba una semana de vigencia sin que nadie lo pida.
    const actualizada = await prisma.presupuesto.update({
      where: { id: row.id },
      data: { expiraAt: expira },
      select: { id: true, expiraAt: true },
    });

    await anotar(row.id, {
      tipo: "vigencia_extendida",
      titulo: `Vigencia extendida ${n} h`,
      actorId: s.userId,
    });

    return { id: actualizada.id, expiraAt: actualizada.expiraAt as Date };
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
