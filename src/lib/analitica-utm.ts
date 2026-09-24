import { prisma } from "@/lib/db";
import { touchSchema, utmDePauta } from "@/lib/atribucion";

// ---------------------------------------------------------------------------
// Analítica UTM: cuántas visitas y consultas trajo cada UTM.
//
// Visitas: filas de PaginaVista cuyo link traía utm_* en el query string (el
// beacon guarda la ruta con el query). Cada clic en un link con UTM es una;
// recargar la página también suma.
//
// Consultas: los leads del período (cotizaciones, landings, contacto y
// corporativo), atribuidos con `utmDePauta`: el mismo criterio que la línea
// "Pauta" del CRM y los campos UTM de Bitrix.
// ---------------------------------------------------------------------------

export type AgrupacionUtm = "combinaciones" | "campanas" | "fuentes";

export interface FilaUtm {
  clave: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  visitas: number;
  visitantes: number;
  consultas: number;
  /** "aaaa-mm-dd" (hora de Montevideo) → cantidad. */
  visitasPorDia: Record<string, number>;
  consultasPorDia: Record<string, number>;
}

export interface AnaliticaUtm {
  /** Primer día del período, "aaaa-mm-dd". */
  desde: string;
  /** Primer día con datos de visitas (arranque del tracking o retención). */
  datosDesde: string | null;
  paginasVistas: number;
  visitas: number;
  visitantes: number;
  consultas: number;
  consultasConUtm: number;
  filas: Record<AgrupacionUtm, FilaUtm[]>;
}

// Uruguay no tiene horario de verano desde 2015: UTC-3 fijo.
const OFFSET_MVD_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

function diaMvd(d: Date): string {
  return new Date(d.getTime() - OFFSET_MVD_MS).toISOString().slice(0, 10);
}

/**
 * Deja un valor de UTM comparable. URLSearchParams ya sacó una capa de
 * encoding; hay links codificados dos veces ("BR%252BCaribe") y acá sale la
 * otra. También corta lo pegado después de un segundo "?"
 * ("organic?fbclid=..."), que viene de links mal armados.
 */
function limpiar(v: string | null | undefined): string | null {
  if (!v) return null;
  let s = v;
  if (/%[0-9a-f]{2}/i.test(s)) {
    try {
      s = decodeURIComponent(s);
    } catch {
      // Un "%" suelto: queda como vino.
    }
  }
  s = s.split("?")[0].trim();
  return s || null;
}

type Utm3 = { source: string | null; medium: string | null; campaign: string | null };

const CLAVES: Record<AgrupacionUtm, (u: Utm3) => Utm3> = {
  combinaciones: (u) => u,
  campanas: (u) => ({ source: null, medium: null, campaign: u.campaign }),
  fuentes: (u) => ({ source: u.source, medium: null, campaign: null }),
};

interface Acumulado {
  fila: FilaUtm;
  vids: Set<string>;
  // Cómo se escribe cada valor → cuántas veces, para mostrar la forma más usada
  // ("Instagram" e "instagram" cuentan juntas).
  formas: Map<string, number>;
}

function acumular(
  grupos: Map<string, Acumulado>,
  u: Utm3,
  dia: string,
  tipo: "visita" | "consulta",
  vid?: string,
) {
  // Sin mayúsculas y con "+" igual a espacio: un "+" sin codificar en el link
  // llega como espacio, y "BR+Caribe" y "BR Caribe" son la misma campaña.
  const clave = [u.source, u.medium, u.campaign]
    .map((v) => (v ?? "").toLowerCase().replace(/[+\s]+/g, " "))
    .join("|");
  let g = grupos.get(clave);
  if (!g) {
    g = {
      fila: {
        clave,
        source: null,
        medium: null,
        campaign: null,
        visitas: 0,
        visitantes: 0,
        consultas: 0,
        visitasPorDia: {},
        consultasPorDia: {},
      },
      vids: new Set(),
      formas: new Map(),
    };
    grupos.set(clave, g);
  }
  const forma = JSON.stringify([u.source, u.medium, u.campaign]);
  g.formas.set(forma, (g.formas.get(forma) ?? 0) + 1);
  if (tipo === "visita") {
    g.fila.visitas++;
    g.fila.visitasPorDia[dia] = (g.fila.visitasPorDia[dia] ?? 0) + 1;
    if (vid) g.vids.add(vid);
  } else {
    g.fila.consultas++;
    g.fila.consultasPorDia[dia] = (g.fila.consultasPorDia[dia] ?? 0) + 1;
  }
}

function cerrar(grupos: Map<string, Acumulado>): FilaUtm[] {
  return Array.from(grupos.values())
    .map(({ fila, vids, formas }) => {
      const [forma] = Array.from(formas.entries()).sort((a, b) => b[1] - a[1])[0];
      const [source, medium, campaign] = JSON.parse(forma) as (string | null)[];
      return { ...fila, source, medium, campaign, visitantes: vids.size };
    })
    .sort((a, b) => b.visitas - a.visitas || b.consultas - a.consultas);
}

/**
 * `dias` = 7, 30, 90… o `null` para todo lo que hay guardado. Sin chequeo de
 * sesión: lo hace `getAnaliticaUtm` en src/actions/analitica-utm.actions.ts.
 */
export async function calcularAnaliticaUtm(dias: number | null): Promise<AnaliticaUtm> {
  // Desde las 00:00 de Montevideo de hace `dias - 1` días: "7 días" es hoy y
  // los seis anteriores completos.
  const hoy = Date.parse(`${diaMvd(new Date())}T00:00:00Z`) + OFFSET_MVD_MS;
  const desde = dias ? new Date(hoy - (dias - 1) * DIA_MS) : null;
  const creado = desde ? { createdAt: { gte: desde } } : {};
  const leadSelect = { atribFirst: true, atribLast: true, createdAt: true } as const;

  const [vistas, paginasVistas, primera, ...leads] = await Promise.all([
    prisma.paginaVista.findMany({
      where: { ...creado, url: { contains: "utm_" } },
      select: { visitanteId: true, url: true, createdAt: true },
    }),
    prisma.paginaVista.count({ where: creado }),
    prisma.paginaVista.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.cotizacion.findMany({ where: creado, select: leadSelect }),
    prisma.cotizadorLead.findMany({ where: creado, select: leadSelect }),
    prisma.mensajeContacto.findMany({ where: creado, select: leadSelect }),
    prisma.contactoCorporativo.findMany({ where: creado, select: leadSelect }),
  ]);

  const grupos = {
    combinaciones: new Map<string, Acumulado>(),
    campanas: new Map<string, Acumulado>(),
    fuentes: new Map<string, Acumulado>(),
  } satisfies Record<AgrupacionUtm, Map<string, Acumulado>>;
  const agrupaciones = Object.keys(grupos) as AgrupacionUtm[];

  let visitas = 0;
  const visitantes = new Set<string>();
  for (const v of vistas) {
    const q = v.url.indexOf("?");
    const params = new URLSearchParams(q >= 0 ? v.url.slice(q + 1) : "");
    const u: Utm3 = {
      source: limpiar(params.get("utm_source")),
      medium: limpiar(params.get("utm_medium")),
      campaign: limpiar(params.get("utm_campaign")),
    };
    if (!u.source && !u.medium && !u.campaign) continue;
    visitas++;
    visitantes.add(v.visitanteId);
    const dia = diaMvd(v.createdAt);
    for (const a of agrupaciones) acumular(grupos[a], CLAVES[a](u), dia, "visita", v.visitanteId);
  }

  const touch = (j: unknown) => {
    const r = touchSchema.safeParse(j);
    return r.success ? r.data : null;
  };
  let consultas = 0;
  let consultasConUtm = 0;
  for (const l of leads.flat()) {
    consultas++;
    const utm = utmDePauta(touch(l.atribFirst), touch(l.atribLast));
    if (!utm) continue;
    const u: Utm3 = {
      source: limpiar(utm.source),
      medium: limpiar(utm.medium),
      campaign: limpiar(utm.campaign),
    };
    if (!u.source && !u.medium && !u.campaign) continue;
    consultasConUtm++;
    const dia = diaMvd(l.createdAt);
    for (const a of agrupaciones) acumular(grupos[a], CLAVES[a](u), dia, "consulta");
  }

  return {
    desde: desde ? diaMvd(desde) : primera ? diaMvd(primera.createdAt) : diaMvd(new Date()),
    datosDesde: primera ? diaMvd(primera.createdAt) : null,
    paginasVistas,
    visitas,
    visitantes: visitantes.size,
    consultas,
    consultasConUtm,
    filas: {
      combinaciones: cerrar(grupos.combinaciones),
      campanas: cerrar(grupos.campanas),
      fuentes: cerrar(grupos.fuentes),
    },
  };
}
