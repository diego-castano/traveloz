// ---------------------------------------------------------------------------
// Contrato de los formularios públicos de datos (pasajeros y pago).
//
// Cada vendedor tiene dos links permanentes:
//   /datos-de-pasajeros/<User.slug>  → EnvioPasajeros + N PasajeroDato
//   /datos-de-pago/<User.slug>       → DatosPagoCifrado (bóveda 96 h)
//
// Los campos DUROS del pasajero (nombres, documento, email, …) van tipados a
// columnas: se buscan, se exportan y se leen sin adivinar. Todo lo que el
// admin agregue de más es un FormField del cotizador (mismo contrato,
// src/lib/cotizador-form.ts) y se guarda en `respuestas` con snapshot de
// etiqueta, así un envío viejo se sigue leyendo aunque el form cambie después.
//
// OJO al importar desde un componente cliente: este módulo trae Prisma. Desde
// "use client" usá SOLO `import type` (se borra en compilación) y pasá las
// constantes que necesites como props desde el server component.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseCampos, type FormField } from "@/lib/cotizador-form";
import type { TipoFormularioDato } from "@prisma/client";

// ---------------------------------------------------------------------------
// Límites del envío
// ---------------------------------------------------------------------------

/** Tope duro de pasajeros por envío. Arriba de esto es un grupo, no una familia. */
export const MAX_PASAJEROS = 12;
/** A partir de acá el formulario avisa que el grupo se está haciendo grande. */
export const AVISO_PASAJEROS = 9;
/** Tope por adjunto (foto del documento / archivo adicional). Lo impone también el route handler. */
export const MAX_ADJUNTO_BYTES = 8 * 1024 * 1024;
/** Tipos de adjunto aceptados, verificados por magic bytes en el server. */
export const ADJUNTO_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const ADJUNTO_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** Prefijo del bucket. Empieza con `leads/` → /api/image ya exige sesión. */
export const PREFIJO_ADJUNTOS = "leads/datos-pasajeros";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PasajeroInput {
  /**
   * "Nombre y apellido" en UN solo campo (decisión del cliente, 26/08/2026).
   * Se guarda entero en PasajeroDato.nombres y `apellidos` queda "". Los
   * envíos VIEJOS sí tienen apellidos cargados: para mostrarlos se concatena
   * (ver `nombreCompleto`).
   */
  nombres: string;
  /** Siempre "" en los envíos nuevos. Sobrevive por los viejos. */
  apellidos: string;
  /** ISO "YYYY-MM-DD" tal como lo manda <input type="date">. Obligatorio. */
  fechaNacimiento: string | null;
  /** Cédula o pasaporte, el que el pasajero use para viajar. */
  documento: string;
  /** Ya no se pide: null en los envíos nuevos. Se sigue mostrando si existe. */
  pasaporte: string | null;
  email: string;
  telefono: string;
  /** Los tres dejaron de pedirse en el formulario (quedan null). */
  direccion: string | null;
  pais: string | null;
  ciudad: string | null;
  /** Key del bucket de la foto del documento (OPCIONAL desde el 26/08/2026). */
  documentoKey: string | null;
  /** Key del bucket del archivo adicional (opcional). */
  pasaporteKey: string | null;
  /** Campos EXTRA definidos en FormularioDato.campos. */
  respuestas: { id: string; etiqueta: string; valor: string }[];
}

export interface FacturaInput {
  rut: string;
  razonSocial: string;
  email: string;
  direccion: string | null;
}

export interface EnvioPasajerosInput {
  /**
   * Ya no se le pide al pasajero: el vendedor sabe de quién es el link. Si el
   * link vino de una solicitud (?s=token) con destino cargado, viaja oculto y
   * se guarda igual en EnvioPasajeros.destino.
   */
  destino: string | null;
  referencia: string | null;
  factura: FacturaInput | null;
  pasajeros: PasajeroInput[];
}

// ---------------------------------------------------------------------------
// Validación (zod v4). Server-side siempre: los `required` del HTML solo
// cubren al navegador, y el formulario se puede postear con curl.
// ---------------------------------------------------------------------------

const texto = (max: number) => z.string().trim().max(max);
const textoReq = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);

// Cumpleaños plausible: nadie nacido antes de 1900 ni en el futuro. No pedimos
// mayoría de edad - los menores viajan y también cargan sus datos.
const MIN_NACIMIENTO = Date.UTC(1900, 0, 1);

const fechaNacimientoSchema = z
  .string({ message: "Cada pasajero necesita su fecha de nacimiento." })
  .trim()
  .min(1, "Cada pasajero necesita su fecha de nacimiento.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de nacimiento tiene que ser una fecha válida.")
  .refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    return Number.isFinite(t) && t >= MIN_NACIMIENTO && t <= Date.now();
  }, "La fecha de nacimiento tiene que ser una fecha válida.");

// Las keys las genera el route handler de subida; validamos la forma para que
// nadie mande una key arbitraria del bucket y se la adjunte a un envío.
const adjuntoKeySchema = z
  .string()
  .trim()
  .regex(
    new RegExp(`^${PREFIJO_ADJUNTOS}/[a-f0-9-]{36}/[A-Za-z0-9._-]{1,120}$`),
    "El archivo adjunto no se subió correctamente.",
  );

const respuestaSchema = z.object({
  id: texto(60),
  etiqueta: texto(200),
  valor: texto(5000),
});

// Cinco obligatorios y nada más (cliente, 26/08/2026): nombre y apellido,
// documento de viaje, fecha de nacimiento, email y teléfono. Ningún adjunto
// bloquea el envío.
export const pasajeroSchema = z.object({
  nombres: textoReq(200, "Cada pasajero necesita su nombre y apellido."),
  // Vacío en todo envío nuevo: el formulario pide un solo campo de nombre.
  apellidos: texto(100).default(""),
  fechaNacimiento: fechaNacimientoSchema,
  documento: textoReq(40, "Cada pasajero necesita su documento de viaje."),
  pasaporte: texto(40).nullable(),
  email: z.email("Revisá el email de los pasajeros.").max(254),
  telefono: textoReq(40, "Cada pasajero necesita un teléfono.").refine(
    (v) => (v.match(/\d/g) ?? []).length >= 8,
    "El teléfono tiene que tener al menos 8 dígitos.",
  ),
  direccion: texto(200).nullable(),
  pais: texto(60).nullable(),
  ciudad: texto(120).nullable(),
  documentoKey: adjuntoKeySchema.nullable(),
  pasaporteKey: adjuntoKeySchema.nullable(),
  respuestas: z.array(respuestaSchema).max(40),
});

export const facturaSchema = z.object({
  rut: textoReq(20, "Ingresá el RUT para la factura."),
  razonSocial: textoReq(200, "Ingresá la razón social para la factura."),
  email: z.email("Revisá el email de facturación.").max(254),
  direccion: texto(200).nullable(),
});

export const envioPasajerosSchema = z.object({
  // Oculto: solo llega si la solicitud lo traía precargado.
  destino: texto(160).nullable(),
  referencia: texto(160).nullable(),
  factura: facturaSchema.nullable(),
  pasajeros: z
    .array(pasajeroSchema)
    .min(1, "Cargá al menos un pasajero.")
    .max(MAX_PASAJEROS, `No se pueden cargar más de ${MAX_PASAJEROS} pasajeros por envío.`),
});

// ── Pago ───────────────────────────────────────────────────────────────
// El número, el CVV y el documento se validan acá y se cifran de inmediato:
// no se loguean, no se devuelven al cliente y no tocan ninguna columna en claro.

/** Cuotas ofrecidas. El cliente cortó la lista en 6 (26/08/2026). */
export const CUOTAS_OPCIONES = [1, 2, 3, 4, 5, 6] as const;

export const datosPagoSchema = z.object({
  // El pasajero va PRIMERO y en claro: es con ese nombre que el vendedor y
  // Administración identifican el pago, no con el titular de la tarjeta.
  pasajeroNombre: textoReq(150, "Ingresá el nombre y apellido del pasajero."),
  pasajeroDocumento: textoReq(40, "Ingresá el documento del pasajero."),
  titular: textoReq(150, "Ingresá el nombre del titular tal cual figura en la tarjeta."),
  documentoTitular: textoReq(40, "Ingresá el documento del titular."),
  numero: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 13 && v.length <= 19, "El número de tarjeta no es válido."),
  vencimiento: z
    .string()
    .trim()
    .regex(/^\d{2}\s*\/?\s*\d{2}$/, "El vencimiento va en formato MM/AA."),
  cvv: z.string().trim().regex(/^\d{3,4}$/, "El código de seguridad tiene 3 o 4 dígitos."),
  cuotas: texto(20)
    .nullable()
    .refine(
      (v) => !v || CUOTAS_OPCIONES.some((n) => String(n) === v),
      "Elegí entre 1 y 6 cuotas.",
    ),
  autorizo: z.literal("si", { message: "Necesitamos tu autorización para usar la tarjeta." }),
  respuestas: z.array(respuestaSchema).max(40),
});

/** Primer mensaje legible de un ZodError (zod v4 → `issues`, no `errors`). */
export function primerError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Revisá los datos ingresados.";
}

// ---------------------------------------------------------------------------
// FormularioDato - definición editable de cada pantalla.
//
// Self-healing como el manifiesto de SiteSettings (site-settings-bootstrap.ts):
// si la fila no existe todavía, la creamos con los defaults en la primera
// lectura. Así se deploya sin correr un seed, y `publicado: false` mantiene la
// página pública apagada hasta que el admin la encienda.
// ---------------------------------------------------------------------------

export interface FormularioDatoView {
  id: string;
  tipo: TipoFormularioDato;
  titulo: string;
  texto: string | null;
  campos: FormField[];
  publicado: boolean;
}

const DEFAULTS: Record<TipoFormularioDato, { titulo: string; texto: string }> = {
  PASAJEROS: {
    titulo: "Datos de pasajeros",
    texto:
      "Para emitir tus servicios necesitamos los datos de cada persona que viaja, tal cual figuran en el documento. Cargalos una sola vez y tu asesor se encarga del resto.",
  },
  PAGO: {
    titulo: "Datos de pago",
    texto:
      "Completá los datos de la tarjeta para que tu asesor pueda gestionar el pago. La información viaja cifrada y se elimina automáticamente a las 96 horas.",
  },
};

export async function getFormularioDato(
  tipo: TipoFormularioDato,
): Promise<FormularioDatoView> {
  const existente = await prisma.formularioDato.findUnique({ where: { tipo } });
  const row =
    existente ??
    (await prisma.formularioDato.upsert({
      where: { tipo },
      update: {},
      create: {
        tipo,
        titulo: DEFAULTS[tipo].titulo,
        texto: DEFAULTS[tipo].texto,
        campos: [],
        publicado: false,
      },
    }));

  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    texto: row.texto,
    campos: parseCampos(row.campos),
    publicado: row.publicado,
  };
}
