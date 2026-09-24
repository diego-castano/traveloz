import { prisma } from "@/lib/db";
import { touchSchema, type Touch } from "@/lib/atribucion";
import type { ConsultaUtm, DatosAnaliticaUtm, Dims, TipoConsulta } from "@/lib/analitica-utm-tipos";

// ---------------------------------------------------------------------------
// Analítica UTM: los datos crudos, compactos, para que la pantalla filtre y
// agrupe en el navegador sin volver al servidor.
//
// Visitas: filas de PaginaVista cuyo link traía utm_* en el query string (el
// beacon guarda la ruta con el query). Cada clic en un link con UTM es una;
// recargar la página también suma. Se agrupan por visitante, día y UTM.
//
// Consultas: los leads (cotizaciones, landings, contacto y corporativo) con
// la UTM de su primer y de su último contacto. La pantalla elige cuál manda;
// "primer contacto" es el criterio de la línea "Pauta" y de Bitrix
// (`utmDePauta`).
// ---------------------------------------------------------------------------

// Uruguay no tiene horario de verano desde 2015: UTC-3 fijo.
const OFFSET_MVD_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

function diaMvd(d: Date): number {
  return Math.floor((d.getTime() - OFFSET_MVD_MS) / DIA_MS);
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

/** La ruta de entrada sin barra final ("/destinos/" y "/destinos" son la misma). */
function limpiarRuta(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.split("?")[0].trim();
  return s.length > 1 ? s.replace(/\/+$/, "") : s || null;
}

/**
 * Diccionario de valores. Sin mayúsculas y con "+" igual a espacio: un "+"
 * sin codificar en el link llega como espacio, y "BR+Caribe" y "BR Caribe"
 * son la misma campaña. Se muestra la forma más usada.
 */
class Diccionario {
  private indice = new Map<string, number>();
  private formas: Map<string, number>[] = [new Map()];

  id(v: string | null): number {
    if (!v) return 0;
    const clave = v.toLowerCase().replace(/[+\s]+/g, " ");
    let i = this.indice.get(clave);
    if (i === undefined) {
      i = this.formas.length;
      this.indice.set(clave, i);
      this.formas.push(new Map());
    }
    const f = this.formas[i];
    f.set(v, (f.get(v) ?? 0) + 1);
    return i;
  }

  valores(): string[] {
    return this.formas.map((f, i) =>
      i === 0 ? "" : Array.from(f.entries()).sort((a, b) => b[1] - a[1])[0][0],
    );
  }
}

function dimsDeParams(dic: Diccionario, p: URLSearchParams, ruta: string | null): Dims | null {
  const src = limpiar(p.get("utm_source"));
  const med = limpiar(p.get("utm_medium"));
  const cmp = limpiar(p.get("utm_campaign"));
  if (!src && !med && !cmp) return null;
  return [
    dic.id(src),
    dic.id(med),
    dic.id(cmp),
    dic.id(limpiar(p.get("utm_content"))),
    dic.id(limpiar(p.get("utm_term"))),
    dic.id(limpiarRuta(ruta)),
  ];
}

/** Mismo corte que `utmDePauta`: sin source, medium ni campaign no es UTM. */
function dimsDeTouch(dic: Diccionario, t: Touch | null): Dims | null {
  if (!t) return null;
  const src = limpiar(t.src);
  const med = limpiar(t.med);
  const cmp = limpiar(t.cmp);
  if (!src && !med && !cmp) return null;
  return [
    dic.id(src),
    dic.id(med),
    dic.id(cmp),
    dic.id(limpiar(t.cnt)),
    dic.id(limpiar(t.trm)),
    dic.id(limpiarRuta(t.lp)),
  ];
}

/**
 * Todo lo guardado (las visitas se retienen 180 días). Sin chequeo de
 * sesión: lo hace `getAnaliticaUtm` en src/actions/analitica-utm.actions.ts.
 */
export async function calcularAnaliticaUtm(conNombres: boolean): Promise<DatosAnaliticaUtm> {
  const [vistas, porDia, cotizaciones, landings, mensajes, corporativos] = await Promise.all([
    prisma.paginaVista.findMany({
      where: { url: { contains: "utm_" } },
      select: { visitanteId: true, url: true, createdAt: true },
    }),
    prisma.$queryRaw<{ dia: number; n: number }[]>`
      select floor(extract(epoch from "createdAt" - interval '3 hours') / 86400)::int as dia,
             count(*)::int as n
      from "PaginaVista" group by 1 order by 1`,
    prisma.cotizacion.findMany({
      select: {
        atribFirst: true,
        atribLast: true,
        createdAt: true,
        nombre: true,
        email: true,
        paqueteId: true,
        paquete: { select: { titulo: true } },
      },
    }),
    prisma.cotizadorLead.findMany({
      select: { atribFirst: true, atribLast: true, createdAt: true, nombre: true, email: true, destino: true },
    }),
    prisma.mensajeContacto.findMany({
      select: { atribFirst: true, atribLast: true, createdAt: true, nombre: true, email: true },
    }),
    prisma.contactoCorporativo.findMany({
      select: { atribFirst: true, atribLast: true, createdAt: true, nombre: true, email: true, empresa: true },
    }),
  ]);

  const dic = new Diccionario();

  const vids = new Map<string, number>();
  const agrupadas = new Map<string, number[]>();
  for (const v of vistas) {
    const q = v.url.indexOf("?");
    if (q < 0) continue;
    const dims = dimsDeParams(dic, new URLSearchParams(v.url.slice(q + 1)), v.url.slice(0, q));
    if (!dims) continue;
    let vid = vids.get(v.visitanteId);
    if (vid === undefined) {
      vid = vids.size;
      vids.set(v.visitanteId, vid);
    }
    const dia = diaMvd(v.createdAt);
    const clave = `${dia}|${vid}|${dims.join(",")}`;
    const fila = agrupadas.get(clave);
    if (fila) fila[fila.length - 1]++;
    else agrupadas.set(clave, [dia, vid, ...dims, 1]);
  }

  const touch = (j: unknown) => {
    const r = touchSchema.safeParse(j);
    return r.success ? r.data : null;
  };
  const consultas: ConsultaUtm[] = [];
  const sumar = (
    l: { atribFirst: unknown; atribLast: unknown; createdAt: Date; nombre: string; email: string },
    tipo: TipoConsulta,
    detalle: string | null,
  ) => {
    const c: ConsultaUtm = {
      dia: diaMvd(l.createdAt),
      tipo,
      primer: dimsDeTouch(dic, touch(l.atribFirst)),
      ultimo: dimsDeTouch(dic, touch(l.atribLast)),
    };
    if (conNombres) {
      c.nombre = l.nombre;
      c.email = l.email;
      c.detalle = detalle;
    }
    consultas.push(c);
  };
  for (const l of cotizaciones) {
    sumar(l, l.paqueteId ? "paquete" : "cotizador", l.paquete?.titulo ?? null);
  }
  for (const l of landings) sumar(l, "landing", l.destino);
  for (const l of mensajes) sumar(l, "contacto", null);
  for (const l of corporativos) sumar(l, "corporativo", l.empresa);

  return {
    valores: dic.valores(),
    visitas: Array.from(agrupadas.values()),
    paginasPorDia: porDia.map((r) => [r.dia, r.n]),
    consultas,
    datosDesde: porDia.length ? porDia[0].dia : null,
    hoy: diaMvd(new Date()),
    conNombres,
  };
}
