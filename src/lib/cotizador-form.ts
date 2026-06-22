// ---------------------------------------------------------------------------
// Constructor de formularios por marca (B): el formulario de cada landing de
// cotizador es una lista de campos configurable desde el admin, sin código.
//
// Una marca nueva con campos distintos NO necesita un desarrollador: el cliente
// arma su formulario en /backend/cotizadores/[id]. Acá viven el contrato de
// datos (FormField), la semilla estándar, la validación de la definición y la
// construcción/validación de respuestas en el server.
//
// Contacto fijo: `nombre` y `email` SIEMPRE se piden (no son configurables) y
// se guardan en columnas tipadas del lead. El resto es dinámico y se guarda en
// `respuestas` con snapshot de etiqueta.
// ---------------------------------------------------------------------------

import { z } from "zod";

export type FormFieldType =
  | "texto" // texto corto
  | "parrafo" // textarea
  | "numero" // stepper (pax, etc.)
  | "email"
  | "telefono"
  | "rango_fechas"
  | "seleccion" // una sola opción (radio)
  | "multiple" // varias opciones (checkboxes)
  | "casilla" // sí/no
  | "nota"; // bloque informativo, sin input

export type FormFieldOption = {
  id: string;
  label: string;
  // Texto fino opcional bajo la opción (ej. cláusula de un voucher).
  descripcion?: string;
};

export type FormField = {
  id: string; // estable; es la clave de la respuesta
  tipo: FormFieldType;
  etiqueta: string;
  ayuda?: string;
  requerido: boolean;
  placeholder?: string;
  opciones?: FormFieldOption[]; // seleccion / multiple
  contenido?: string; // nota
  // Visibilidad condicional: mostrar este campo solo si el campo `campoId`
  // tiene el valor `igualA` (id de la opción elegida, o "si" para una casilla).
  mostrarSi?: { campoId: string; igualA: string };
};

export type Respuesta = { id: string; etiqueta: string; valor: string };

export const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  texto: "Texto corto",
  parrafo: "Párrafo",
  numero: "Número",
  email: "Email",
  telefono: "Teléfono",
  rango_fechas: "Rango de fechas",
  seleccion: "Selección única",
  multiple: "Selección múltiple",
  casilla: "Casilla (sí/no)",
  nota: "Nota informativa",
};

export const TIPOS_CON_OPCIONES: FormFieldType[] = ["seleccion", "multiple"];

const LIMITES = {
  campos: 40,
  opciones: 20,
  etiqueta: 200,
  ayuda: 300,
  contenido: 2000,
  valorTexto: 5000,
} as const;

// id corto y estable para campos/opciones nuevos.
export function nuevoId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return uuid.replace(/-/g, "").slice(0, 10);
}

// ---------------------------------------------------------------------------
// Semilla: el formulario de cotización estándar. Cada landing nuevo arranca con
// estos campos (sin nombre/email, que son fijos). El cliente edita desde acá.
// ---------------------------------------------------------------------------
export function camposEstandar(): FormField[] {
  return [
    {
      id: "destino",
      tipo: "texto",
      etiqueta: "¿A dónde querés ir?",
      placeholder: "Ej. Caribe, Europa, Brasil…",
      requerido: true,
    },
    { id: "fechas", tipo: "rango_fechas", etiqueta: "Fechas del viaje", requerido: false },
    { id: "adultos", tipo: "numero", etiqueta: "Adultos", requerido: false },
    {
      id: "ninos",
      tipo: "numero",
      etiqueta: "Niños",
      ayuda: "2 a 11 años",
      requerido: false,
    },
    { id: "telefono", tipo: "telefono", etiqueta: "Teléfono / WhatsApp", requerido: false },
    {
      id: "preferencia",
      tipo: "seleccion",
      etiqueta: "¿Cómo preferís que te contactemos?",
      requerido: false,
      opciones: [
        { id: "whatsapp", label: "WhatsApp" },
        { id: "llamada", label: "Llamada" },
        { id: "email", label: "Email" },
      ],
    },
    {
      id: "comentarios",
      tipo: "parrafo",
      etiqueta: "Contanos más sobre tu viaje",
      placeholder: "Presupuesto, intereses, fechas flexibles…",
      requerido: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Validación de la definición (al guardar desde el admin).
// ---------------------------------------------------------------------------
const optionSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1, "La opción no puede estar vacía.").max(LIMITES.etiqueta),
  descripcion: z.string().trim().max(LIMITES.ayuda).optional(),
});

const fieldSchema = z.object({
  id: z.string().trim().min(1).max(60),
  tipo: z.enum([
    "texto",
    "parrafo",
    "numero",
    "email",
    "telefono",
    "rango_fechas",
    "seleccion",
    "multiple",
    "casilla",
    "nota",
  ]),
  etiqueta: z.string().trim().min(1, "Cada campo necesita una etiqueta.").max(LIMITES.etiqueta),
  ayuda: z.string().trim().max(LIMITES.ayuda).optional(),
  requerido: z.boolean(),
  placeholder: z.string().trim().max(LIMITES.etiqueta).optional(),
  opciones: z.array(optionSchema).max(LIMITES.opciones).optional(),
  contenido: z.string().trim().max(LIMITES.contenido).optional(),
  mostrarSi: z
    .object({ campoId: z.string().trim().min(1), igualA: z.string().trim().min(1) })
    .optional(),
});

export const camposSchema = z
  .array(fieldSchema)
  .max(LIMITES.campos)
  .superRefine((campos, ctx) => {
    const ids = new Set<string>();
    for (const c of campos) {
      if (ids.has(c.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Campo duplicado: ${c.id}` });
      }
      ids.add(c.id);
      if (TIPOS_CON_OPCIONES.includes(c.tipo) && (!c.opciones || c.opciones.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${c.etiqueta}" necesita al menos una opción.`,
        });
      }
    }
    // La condición debe apuntar a un campo previo existente (evita ciclos y
    // referencias colgadas).
    const previos = new Set<string>();
    for (const c of campos) {
      if (c.mostrarSi && !previos.has(c.mostrarSi.campoId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${c.etiqueta}" depende de un campo que no existe o está más abajo.`,
        });
      }
      previos.add(c.id);
    }
  });

/** Parsea/limpia una definición arbitraria (JSON de la DB) a FormField[]. */
export function parseCampos(raw: unknown): FormField[] {
  const result = camposSchema.safeParse(raw);
  if (result.success) return result.data as FormField[];
  return [];
}

// ---------------------------------------------------------------------------
// Visibilidad condicional (compartida client/server).
// ---------------------------------------------------------------------------
export function esVisible(campo: FormField, valorDe: (campoId: string) => string): boolean {
  if (!campo.mostrarSi) return true;
  return valorDe(campo.mostrarSi.campoId) === campo.mostrarSi.igualA;
}

// ---------------------------------------------------------------------------
// Construcción + validación de respuestas en el server (desde FormData).
// Devuelve las respuestas visibles con snapshot de etiqueta, o un error legible.
// ---------------------------------------------------------------------------
const dateFmt = new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", year: "numeric" });

function fmtFecha(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : dateFmt.format(d);
}

// Valor crudo de control de un campo (para evaluar mostrarSi en el server).
function valorControl(fd: FormData, campoId: string): string {
  const v = fd.get(campoId);
  return typeof v === "string" ? v.trim() : "";
}

export type BuildResult =
  | { ok: true; respuestas: Respuesta[] }
  | { ok: false; message: string };

export function buildRespuestas(campos: FormField[], fd: FormData): BuildResult {
  const respuestas: Respuesta[] = [];
  const valorDe = (id: string) => valorControl(fd, id);

  for (const campo of campos) {
    if (campo.tipo === "nota") continue;
    if (!esVisible(campo, valorDe)) continue;

    const faltante = (): BuildResult => ({
      ok: false,
      message: `Completá: ${campo.etiqueta}`,
    });

    switch (campo.tipo) {
      case "multiple": {
        const ids = fd.getAll(campo.id).map(String).filter(Boolean);
        const labels = ids
          .map((id) => campo.opciones?.find((o) => o.id === id)?.label)
          .filter((l): l is string => Boolean(l));
        if (labels.length === 0) {
          if (campo.requerido) return faltante();
          break;
        }
        respuestas.push({ id: campo.id, etiqueta: campo.etiqueta, valor: labels.join(" · ") });
        break;
      }
      case "seleccion": {
        const id = valorControl(fd, campo.id);
        const label = campo.opciones?.find((o) => o.id === id)?.label;
        if (!label) {
          if (campo.requerido) return faltante();
          break;
        }
        respuestas.push({ id: campo.id, etiqueta: campo.etiqueta, valor: label });
        break;
      }
      case "casilla": {
        const marcada = valorControl(fd, campo.id) === "si";
        if (!marcada) {
          if (campo.requerido) return faltante();
          break;
        }
        respuestas.push({ id: campo.id, etiqueta: campo.etiqueta, valor: "Sí" });
        break;
      }
      case "rango_fechas": {
        const desde = fmtFecha(String(fd.get(`${campo.id}__desde`) ?? "").trim());
        const hasta = fmtFecha(String(fd.get(`${campo.id}__hasta`) ?? "").trim());
        if (!desde && !hasta) {
          if (campo.requerido) return faltante();
          break;
        }
        respuestas.push({
          id: campo.id,
          etiqueta: campo.etiqueta,
          valor: [desde ?? "…", hasta ?? "…"].join(" → "),
        });
        break;
      }
      case "numero": {
        const n = Number(valorControl(fd, campo.id));
        const val = Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : "";
        if (!val) {
          if (campo.requerido) return faltante();
          break;
        }
        respuestas.push({ id: campo.id, etiqueta: campo.etiqueta, valor: val });
        break;
      }
      case "email": {
        const v = valorControl(fd, campo.id).slice(0, LIMITES.valorTexto);
        if (!v) {
          if (campo.requerido) return faltante();
          break;
        }
        if (!z.string().email().safeParse(v).success) {
          return { ok: false, message: `Email inválido en: ${campo.etiqueta}` };
        }
        respuestas.push({ id: campo.id, etiqueta: campo.etiqueta, valor: v });
        break;
      }
      default: {
        // texto, parrafo, telefono
        const v = valorControl(fd, campo.id).slice(0, LIMITES.valorTexto);
        if (!v) {
          if (campo.requerido) return faltante();
          break;
        }
        respuestas.push({ id: campo.id, etiqueta: campo.etiqueta, valor: v });
        break;
      }
    }
  }

  return { ok: true, respuestas };
}

/** Lee respuestas almacenadas (JSON de la DB) de forma tolerante. */
export function parseRespuestas(raw: unknown): Respuesta[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is Respuesta =>
        r != null &&
        typeof r === "object" &&
        typeof (r as Respuesta).etiqueta === "string" &&
        typeof (r as Respuesta).valor === "string",
    )
    .map((r) => ({ id: String(r.id ?? ""), etiqueta: r.etiqueta, valor: r.valor }));
}
