"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Popover } from "radix-ui";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  Filter,
  Link2,
  MessageSquare,
  MousePointerClick,
  Search,
  Users,
  X,
} from "lucide-react";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import { cn } from "@/components/lib/cn";
import { normalizeSearchValue } from "@/lib/search";
import {
  DIMENSIONES,
  type ConsultaUtm,
  type DatosAnaliticaUtm,
  type Dimension,
  type Dims,
  type TipoConsulta,
} from "@/lib/analitica-utm-tipos";

// ---------------------------------------------------------------------------
// Todo el filtrado y la agrupación corren acá: el servidor manda los datos
// una sola vez (ver src/lib/analitica-utm.ts).
// ---------------------------------------------------------------------------

const DIA_MS = 24 * 60 * 60 * 1000;

const ETIQUETA: Record<Dimension, string> = {
  source: "Fuente",
  medium: "Medio",
  campaign: "Campaña",
  content: "Contenido",
  term: "Término",
  landing: "Página de entrada",
};

const TIPOS: { id: TipoConsulta; label: string }[] = [
  { id: "paquete", label: "Consulta de paquete" },
  { id: "cotizador", label: "Cotizador general" },
  { id: "landing", label: "Landing por marca" },
  { id: "contacto", label: "Contacto" },
  { id: "corporativo", label: "Corporativo" },
];
const ETIQUETA_TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t.label])) as Record<TipoConsulta, string>;

const PRESETS: { id: number | "todo"; label: string }[] = [
  { id: 7, label: "7 días" },
  { id: 30, label: "30 días" },
  { id: 90, label: "90 días" },
  { id: "todo", label: "Todo" },
];

type Modelo = "primer" | "ultimo";
type Columna = Dimension | "visitas" | "visitantes" | "consultas" | "conversion";
type Filtros = Record<Dimension, number[]>;

const SIN_FILTROS = Object.fromEntries(DIMENSIONES.map((d) => [d, []])) as unknown as Filtros;

const COLOR_VISITAS = "#6D5BD0";
const COLOR_CONSULTAS = "#10B981";

const num = (n: number) => n.toLocaleString("es-UY");
const pct = (n: number) => `${(n * 100).toLocaleString("es-UY", { maximumFractionDigits: 1 })} %`;
const diaAIso = (d: number) => new Date(d * DIA_MS).toISOString().slice(0, 10);
const isoADia = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / DIA_MS);
function fechaCorta(d: number): string {
  const [, m, dd] = diaAIso(d).split("-");
  return `${dd}/${m}`;
}
function fechaLarga(d: number): string {
  const [a, m, dd] = diaAIso(d).split("-");
  return `${dd}/${m}/${a}`;
}

/** Posición de cada dimensión dentro de una fila de visitas: [dia, vid, ...dims, n]. */
const COL_VISITA = (i: number) => 2 + i;

interface Fila {
  clave: string;
  /** Un índice a `valores` por dimensión agrupada. */
  dims: number[];
  visitas: number;
  visitantes: number;
  consultas: number;
  conversion: number | null;
  visitasPorDia: Map<number, number>;
  consultasPorDia: Map<number, number>;
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function Kpi({
  icon,
  label,
  value,
  helper,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  delta: number | null;
}) {
  return (
    <div className="rounded-[16px] border border-hairline bg-white p-5 shadow-[0_14px_30px_-24px_rgba(17,17,36,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600">
          {icon}
        </div>
        {delta !== null && (
          <span
            title="Contra el período anterior del mismo largo"
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
            )}
          >
            {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {pct(Math.abs(delta))}
          </span>
        )}
      </div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className="text-[30px] font-bold tracking-tight text-neutral-900">{value}</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-500">{helper}</p>
    </div>
  );
}

function Segmentos<T extends string | number>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { id: T; label: string; title?: string }[];
  valor: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-[12px] border border-hairline bg-white p-1">
      {opciones.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          title={o.title}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            o.id === valor ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Filtro de selección múltiple con buscador y cantidad por opción. */
function FiltroMultiple<T extends string | number>({
  label,
  opciones,
  valor,
  onChange,
  unidad,
}: {
  label: string;
  opciones: { id: T; label: string; n?: number }[];
  valor: T[];
  onChange: (v: T[]) => void;
  unidad?: string;
}) {
  const [q, setQ] = useState("");
  const visibles = useMemo(() => {
    const nq = normalizeSearchValue(q);
    return nq ? opciones.filter((o) => normalizeSearchValue(o.label).includes(nq)) : opciones;
  }, [opciones, q]);
  const toggle = (id: T) =>
    onChange(valor.includes(id) ? valor.filter((v) => v !== id) : [...valor, id]);

  return (
    <Popover.Root onOpenChange={(abierto) => !abierto && setQ("")}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-[13px] font-medium transition-colors",
            valor.length
              ? "border-violet-300 bg-violet-50 text-violet-800"
              : "border-hairline bg-white text-neutral-700 hover:bg-neutral-50",
          )}
        >
          {label}
          {valor.length > 0 && (
            <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold text-white">
              {valor.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[300px] max-w-[calc(100vw-32px)] rounded-[14px] border border-hairline bg-white p-2 shadow-[0_18px_40px_-18px_rgba(17,17,36,0.35)]"
        >
          {opciones.length > 6 && (
            <label className="relative mb-2 block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}`}
                className="w-full rounded-[9px] border border-hairline py-1.5 pl-8 pr-2 text-[13px] outline-none focus:border-neutral-400"
              />
            </label>
          )}
          <div className="max-h-72 overflow-y-auto">
            {visibles.map((o) => {
              const activo = valor.includes(o.id);
              return (
                <button
                  key={String(o.id)}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px] hover:bg-neutral-50"
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                      activo ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-300",
                    )}
                  >
                    {activo && <Check className="h-3 w-3" />}
                  </span>
                  <span className={cn("min-w-0 flex-1 break-all", !o.label && "italic text-neutral-400")}>
                    {o.label || "sin dato"}
                  </span>
                  {o.n !== undefined && (
                    <span className="shrink-0 tabular-nums text-[12px] text-neutral-400">{num(o.n)}</span>
                  )}
                </button>
              );
            })}
            {!visibles.length && (
              <p className="px-2 py-4 text-center text-[12.5px] text-neutral-400">Sin resultados.</p>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-hairline px-2 pt-2 text-[12px] text-neutral-400">
            <span>{unidad}</span>
            {valor.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="font-medium text-violet-700 hover:underline">
                Limpiar
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Valor({ v }: { v: string }) {
  if (!v) return <span className="italic text-neutral-400">sin dato</span>;
  return <span className="break-all">{v}</span>;
}

function descargarCsv(nombre: string, filas: (string | number)[][]) {
  const celda = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Punto y coma y BOM: así lo abre en columnas el Excel en español.
  const csv = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function AnaliticaUtmVista({ datos }: { datos: DatosAnaliticaUtm }) {
  const [preset, setPreset] = useState<number | "todo" | null>(30);
  const [custom, setCustom] = useState<{ desde: string; hasta: string } | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [tipos, setTipos] = useState<TipoConsulta[]>([]);
  const [modelo, setModelo] = useState<Modelo>("primer");
  const [agrupar, setAgrupar] = useState<Dimension[]>(["source", "medium", "campaign"]);
  const [orden, setOrden] = useState<{ col: Columna; dir: 1 | -1 }>({ col: "visitas", dir: -1 });
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // La fila elegida depende de la agrupación y de los filtros: si cambian, se suelta.
  useEffect(() => setSeleccion(null), [agrupar, filtros, preset, custom, tipos, modelo]);

  const valores = datos.valores;
  const idx = (d: Dimension) => DIMENSIONES.indexOf(d);

  const rango = useMemo(() => {
    if (custom) return { desde: isoADia(custom.desde), hasta: isoADia(custom.hasta) };
    const hasta = datos.hoy;
    if (preset === "todo" || preset === null) {
      const primeraConsulta = datos.consultas.reduce((m, c) => Math.min(m, c.dia), hasta);
      return { desde: datos.datosDesde ?? primeraConsulta, hasta };
    }
    return { desde: hasta - preset + 1, hasta };
  }, [datos, preset, custom]);

  const dimsConsulta = (c: ConsultaUtm): Dims | null =>
    modelo === "primer" ? c.primer ?? c.ultimo : c.ultimo ?? c.primer;

  const pasa = (valorDe: (i: number) => number, excepto?: Dimension) =>
    DIMENSIONES.every((d, i) => d === excepto || !filtros[d].length || filtros[d].includes(valorDe(i)));

  const calculo = useMemo(() => {
    const enRango = (dia: number, r = rango) => dia >= r.desde && dia <= r.hasta;
    const tipoOk = (c: ConsultaUtm) => !tipos.length || tipos.includes(c.tipo);

    const medir = (r: { desde: number; hasta: number }) => {
      const vs = datos.visitas.filter((v) => enRango(v[0], r) && pasa((i) => v[COL_VISITA(i)]));
      const cs = datos.consultas.filter((c) => {
        if (!enRango(c.dia, r) || !tipoOk(c)) return false;
        const d = dimsConsulta(c);
        return d !== null && pasa((i) => d[i]);
      });
      return {
        vs,
        cs,
        visitas: vs.reduce((s, v) => s + v[v.length - 1], 0),
        visitantes: new Set(vs.map((v) => v[1])).size,
      };
    };

    const actual = medir(rango);
    const largo = rango.hasta - rango.desde + 1;
    const previo =
      datos.datosDesde !== null && rango.desde - largo >= datos.datosDesde
        ? medir({ desde: rango.desde - largo, hasta: rango.desde - 1 })
        : null;

    const paginas = datos.paginasPorDia.reduce((s, [d, n]) => (enRango(d) ? s + n : s), 0);
    const consultasTotal = datos.consultas.filter((c) => enRango(c.dia) && tipoOk(c)).length;
    const combos = new Set([
      ...actual.vs.map((v) => `${v[2]},${v[3]},${v[4]}`),
      ...actual.cs.map((c) => dimsConsulta(c)!.slice(0, 3).join(",")),
    ]).size;

    // Opciones de cada filtro, con las visitas que tendría si se sumara (cuenta
    // con los demás filtros puestos, no con el propio).
    const facetas = {} as Record<Dimension, { id: number; label: string; n: number }[]>;
    for (const d of DIMENSIONES) {
      const i = idx(d);
      const n = new Map<number, number>();
      for (const v of datos.visitas) {
        if (!enRango(v[0]) || !pasa((k) => v[COL_VISITA(k)], d)) continue;
        n.set(v[COL_VISITA(i)], (n.get(v[COL_VISITA(i)]) ?? 0) + v[v.length - 1]);
      }
      for (const c of datos.consultas) {
        const dc = enRango(c.dia) && tipoOk(c) ? dimsConsulta(c) : null;
        if (dc && pasa((k) => dc[k], d) && !n.has(dc[i])) n.set(dc[i], 0);
      }
      for (const sel of filtros[d]) if (!n.has(sel)) n.set(sel, 0);
      facetas[d] = Array.from(n.entries())
        .map(([id, cant]) => ({ id, label: valores[id] ?? "", n: cant }))
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
    }

    // Agrupación.
    const pos = agrupar.map(idx);
    const grupos = new Map<string, Fila & { vids: Set<number> }>();
    const grupo = (dims: number[]) => {
      const clave = dims.join(",");
      let g = grupos.get(clave);
      if (!g) {
        g = {
          clave,
          dims,
          visitas: 0,
          visitantes: 0,
          consultas: 0,
          conversion: null,
          visitasPorDia: new Map(),
          consultasPorDia: new Map(),
          vids: new Set(),
        };
        grupos.set(clave, g);
      }
      return g;
    };
    for (const v of actual.vs) {
      const g = grupo(pos.map((p) => v[COL_VISITA(p)]));
      const n = v[v.length - 1];
      g.visitas += n;
      g.vids.add(v[1]);
      g.visitasPorDia.set(v[0], (g.visitasPorDia.get(v[0]) ?? 0) + n);
    }
    for (const c of actual.cs) {
      const d = dimsConsulta(c)!;
      const g = grupo(pos.map((p) => d[p]));
      g.consultas++;
      g.consultasPorDia.set(c.dia, (g.consultasPorDia.get(c.dia) ?? 0) + 1);
    }
    const filas: Fila[] = Array.from(grupos.values()).map(({ vids, ...g }) => ({
      ...g,
      visitantes: vids.size,
      conversion: vids.size ? g.consultas / vids.size : null,
    }));

    return {
      actual,
      previo,
      paginas,
      consultasTotal,
      combos,
      facetas,
      filas,
    };
    // `pasa` y `dimsConsulta` leen filtros y modelo, que ya están en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, rango, filtros, tipos, modelo, agrupar, valores]);

  const filas = useMemo(() => {
    if (!calculo) return [];
    const nq = normalizeSearchValue(busqueda);
    const lista = nq
      ? calculo.filas.filter((f) => f.dims.some((v) => normalizeSearchValue(valores[v] ?? "").includes(nq)))
      : calculo.filas;
    const { col, dir } = orden;
    const clave = (f: Fila): number | string => {
      if (col === "visitas" || col === "visitantes" || col === "consultas") return f[col];
      if (col === "conversion") return f.conversion ?? -1;
      const p = agrupar.indexOf(col);
      return p < 0 ? "" : (valores[f.dims[p]] ?? "").toLowerCase();
    };
    return [...lista].sort((a, b) => {
      const ka = clave(a);
      const kb = clave(b);
      const c = typeof ka === "number" ? ka - (kb as number) : ka.localeCompare(kb as string);
      return c * dir || b.visitas - a.visitas;
    });
  }, [calculo, busqueda, orden, agrupar, valores]);

  const filaElegida = filas.find((f) => f.clave === seleccion) ?? null;

  const serie = useMemo(() => {
    if (!calculo) return [];
    const v = new Map<number, number>();
    const c = new Map<number, number>();
    if (filaElegida) {
      filaElegida.visitasPorDia.forEach((n, d) => v.set(d, n));
      filaElegida.consultasPorDia.forEach((n, d) => c.set(d, n));
    } else {
      for (const x of calculo.actual.vs) v.set(x[0], (v.get(x[0]) ?? 0) + x[x.length - 1]);
      for (const x of calculo.actual.cs) c.set(x.dia, (c.get(x.dia) ?? 0) + 1);
    }
    const out = [];
    for (let d = rango.desde; d <= rango.hasta; d++) {
      out.push({ dia: fechaCorta(d), Visitas: v.get(d) ?? 0, Consultas: c.get(d) ?? 0 });
    }
    return out;
  }, [calculo, rango, filaElegida]);

  const consultasLista = useMemo(() => {
    if (!calculo || !datos.conNombres) return [];
    const pos = agrupar.map(idx);
    const lista = filaElegida
      ? calculo.actual.cs.filter((c) => {
          const d = dimsConsulta(c)!;
          return pos.every((p, k) => d[p] === filaElegida.dims[k]);
        })
      : calculo.actual.cs;
    return [...lista].sort((a, b) => b.dia - a.dia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculo, datos, filaElegida, agrupar, modelo]);


  const { actual, previo } = calculo;
  const delta = (a: number, b: number | undefined) => (b ? (a - b) / b : null);
  const hayFiltros = DIMENSIONES.some((d) => filtros[d].length) || tipos.length > 0;
  const etiquetaFila = (f: Fila) => f.dims.map((v) => valores[v] || "sin dato").join(" / ");

  const ponerFiltro = (d: Dimension, v: number[]) => setFiltros((f) => ({ ...f, [d]: v }));
  const filtrarPorFila = (f: Fila) =>
    setFiltros((prev) => {
      const next = { ...prev };
      agrupar.forEach((d, k) => (next[d] = [f.dims[k]]));
      return next;
    });
  const ordenarPor = (col: Columna) =>
    setOrden((o) => (o.col === col ? { col, dir: (o.dir * -1) as 1 | -1 } : { col, dir: col in ETIQUETA ? 1 : -1 }));

  const exportar = () =>
    descargarCsv(`analitica-utm-${diaAIso(rango.desde)}-a-${diaAIso(rango.hasta)}.csv`, [
      [...agrupar.map((d) => ETIQUETA[d]), "Visitas", "Visitantes", "Consultas", "Conversión"],
      ...filas.map((f) => [
        ...f.dims.map((v) => valores[v] ?? ""),
        f.visitas,
        f.visitantes,
        f.consultas,
        f.conversion === null ? "" : pct(f.conversion),
      ]),
    ]);

  const Th = ({ col, children, derecha }: { col: Columna; children: React.ReactNode; derecha?: boolean }) => (
    <th className={cn("px-4 py-3", derecha && "text-right")}>
      <button
        type="button"
        onClick={() => ordenarPor(col)}
        className={cn("inline-flex items-center gap-1 uppercase hover:text-neutral-700", orden.col === col && "text-neutral-800")}
      >
        {children}
        {orden.col === col && (orden.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <DataTablePageHeader
        title="Analítica UTM"
        subtitle="Visitas y consultas que llegaron al sitio con UTM en el link."
      />

      {/* ── Período y filtros ─────────────────────────────────────────── */}
      <div className="space-y-3 rounded-[18px] border border-hairline bg-white p-4 shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
        <div className="flex flex-wrap items-center gap-3">
          <Segmentos
            opciones={PRESETS}
            valor={custom ? null : preset}
            onChange={(p) => {
              setCustom(null);
              setPreset(p);
            }}
          />
          <div className="w-full sm:w-64">
            <PeriodPicker
              valueFrom={diaAIso(rango.desde)}
              valueTo={diaAIso(rango.hasta)}
              placeholder="Elegir fechas"
              onChange={(desde, hasta) => {
                if (desde && hasta) setCustom({ desde, hasta });
                else setCustom(null);
              }}
            />
          </div>
          <span className="text-[12.5px] text-neutral-500">
            {fechaLarga(rango.desde)} al {fechaLarga(rango.hasta)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          {DIMENSIONES.map((d) => (
            <FiltroMultiple
              key={d}
              label={ETIQUETA[d]}
              opciones={calculo.facetas[d]}
              valor={filtros[d]}
              onChange={(v) => ponerFiltro(d, v)}
              unidad="visitas en el período"
            />
          ))}
          <FiltroMultiple label="Tipo de consulta" opciones={TIPOS} valor={tipos} onChange={setTipos} />
        </div>

        {hayFiltros && (
          <div className="flex flex-wrap items-center gap-2">
            {DIMENSIONES.flatMap((d) =>
              filtros[d].map((v) => (
                <span
                  key={`${d}-${v}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-50 py-1 pl-3 pr-1.5 text-[12.5px] text-violet-800"
                >
                  <span className="shrink-0 font-semibold">{ETIQUETA[d]}:</span>
                  <span className="min-w-0 truncate">{valores[v] || "sin dato"}</span>
                  <button
                    type="button"
                    aria-label="Quitar filtro"
                    onClick={() => ponerFiltro(d, filtros[d].filter((x) => x !== v))}
                    className="rounded-full p-0.5 hover:bg-violet-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )),
            )}
            {tipos.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1.5 text-[12.5px] text-emerald-800"
              >
                {ETIQUETA_TIPO[t]}
                <button
                  type="button"
                  aria-label="Quitar filtro"
                  onClick={() => setTipos(tipos.filter((x) => x !== t))}
                  className="rounded-full p-0.5 hover:bg-emerald-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setFiltros(SIN_FILTROS);
                setTipos([]);
              }}
              className="text-[12.5px] font-medium text-neutral-500 hover:text-neutral-800 hover:underline"
            >
              Limpiar todo
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
          <span className="text-[12.5px] font-medium text-neutral-500">Consultas por:</span>
          <Segmentos
            opciones={[
              { id: "primer" as Modelo, label: "Primer contacto", title: "La UTM con la que la persona entró por primera vez. Es el criterio de Bitrix." },
              { id: "ultimo" as Modelo, label: "Último contacto", title: "La UTM de la última vez que entró con UTM antes de consultar." },
            ]}
            valor={modelo}
            onChange={setModelo}
          />
        </div>
      </div>

      {/* ── Números ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<MousePointerClick className="h-5 w-5" />}
          label="Visitas con UTM"
          value={num(actual.visitas)}
          helper={`De ${num(calculo.paginas)} páginas vistas en el período. Cada clic en un link con UTM suma una.`}
          delta={delta(actual.visitas, previo?.visitas)}
        />
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Visitantes únicos"
          value={num(actual.visitantes)}
          helper="Personas distintas (por navegador) que entraron con UTM."
          delta={delta(actual.visitantes, previo?.visitantes)}
        />
        <Kpi
          icon={<MessageSquare className="h-5 w-5" />}
          label="Consultas con UTM"
          value={num(actual.cs.length)}
          helper={`De ${num(calculo.consultasTotal)} consultas en el período${actual.visitantes ? ` · ${pct(actual.cs.length / actual.visitantes)} de los visitantes` : ""}.`}
          delta={delta(actual.cs.length, previo?.cs.length)}
        />
        <Kpi
          icon={<Link2 className="h-5 w-5" />}
          label="UTM distintas"
          value={num(calculo.combos)}
          helper="Combinaciones distintas de fuente, medio y campaña."
          delta={null}
        />
      </div>

      {/* ── Por día ───────────────────────────────────────────────────── */}
      <div className="rounded-[18px] border border-hairline bg-white p-5 shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-neutral-900">Por día</h3>
            <p className="mt-1 break-all text-[12.5px] leading-relaxed text-neutral-500">
              {filaElegida ? etiquetaFila(filaElegida) : "Con los filtros de arriba. Tocá una fila de la tabla para ver solo esa."}
            </p>
          </div>
          {filaElegida && (
            <button
              type="button"
              onClick={() => setSeleccion(null)}
              className="rounded-[9px] border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Ver todas
            </button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={serie} margin={{ left: -18, right: 4 }}>
            <CartesianGrid stroke="rgba(17,17,36,0.06)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#8A8FA3" }} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8A8FA3" }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(17,17,36,0.04)" }} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="Visitas" fill={COLOR_VISITAS} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Consultas" fill={COLOR_CONSULTAS} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tabla ─────────────────────────────────────────────────────── */}
      <div className="rounded-[18px] border border-hairline bg-white shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
        <div className="space-y-3 border-b border-hairline p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium text-neutral-500">Agrupar por:</span>
            {DIMENSIONES.map((d) => {
              const activo = agrupar.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setAgrupar((a) =>
                      activo ? (a.length > 1 ? a.filter((x) => x !== d) : a) : DIMENSIONES.filter((x) => x === d || a.includes(x)),
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                    activo
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-hairline bg-white text-neutral-600 hover:bg-neutral-50",
                  )}
                >
                  {ETIQUETA[d]}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en la tabla"
                className="w-full rounded-[10px] border border-hairline bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-neutral-400"
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-neutral-500">{num(filas.length)} filas</span>
              <button
                type="button"
                onClick={exportar}
                disabled={!filas.length}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-hairline px-3 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-[11px] font-semibold tracking-[0.1em] text-neutral-400">
              <tr>
                {agrupar.map((d) => (
                  <Th key={d} col={d}>
                    {ETIQUETA[d]}
                  </Th>
                ))}
                <Th col="visitas" derecha>Visitas</Th>
                <Th col="visitantes" derecha>Visitantes</Th>
                <Th col="consultas" derecha>Consultas</Th>
                <Th col="conversion" derecha>Conversión</Th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.clave}
                  onClick={() => setSeleccion(f.clave === seleccion ? null : f.clave)}
                  className={cn(
                    "cursor-pointer border-t border-hairline align-top text-neutral-700",
                    f.clave === seleccion ? "bg-violet-50" : "hover:bg-neutral-50",
                  )}
                >
                  {f.dims.map((v, k) => (
                    <td key={agrupar[k]} className={cn("px-4 py-3", k === 0 && "font-medium text-neutral-900")}>
                      <Valor v={valores[v] ?? ""} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums">{num(f.visitas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{num(f.visitantes)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{num(f.consultas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                    {f.conversion === null ? "—" : pct(f.conversion)}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      title="Filtrar por esta fila"
                      onClick={(e) => {
                        e.stopPropagation();
                        filtrarPorFila(f);
                      }}
                      className="rounded-[8px] p-1.5 text-neutral-400 hover:bg-violet-100 hover:text-violet-700"
                    >
                      <Filter className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filas.length && (
                <tr>
                  <td colSpan={agrupar.length + 5} className="px-4 py-10 text-center text-neutral-400">
                    {busqueda || hayFiltros ? "Nada coincide con los filtros." : "No hay visitas con UTM en este período."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Consultas (solo quien ve Contactos) ───────────────────────── */}
      {datos.conNombres && (
        <div className="rounded-[18px] border border-hairline bg-white shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
          <div className="border-b border-hairline p-4">
            <h3 className="text-[16px] font-semibold text-neutral-900">Consultas</h3>
            <p className="mt-1 break-all text-[12.5px] leading-relaxed text-neutral-500">
              {num(consultasLista.length)} consultas con UTM
              {filaElegida ? ` de ${etiquetaFila(filaElegida)}` : " con los filtros de arriba"}.
            </p>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="sticky top-0 bg-white text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">UTM</th>
                </tr>
              </thead>
              <tbody>
                {consultasLista.slice(0, 300).map((c, i) => {
                  const d = dimsConsulta(c)!;
                  return (
                    <tr key={i} className="border-t border-hairline align-top text-neutral-700">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{fechaLarga(c.dia)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-neutral-900">{c.nombre}</p>
                        {c.email && <p className="break-all text-[12px] text-neutral-500">{c.email}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">{ETIQUETA_TIPO[c.tipo]}</td>
                      <td className="px-4 py-2.5">{c.detalle ?? "—"}</td>
                      <td className="break-all px-4 py-2.5 text-neutral-500">
                        {[d[0], d[1], d[2]].map((v) => valores[v] || "—").join(" / ")}
                      </td>
                    </tr>
                  );
                })}
                {!consultasLista.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                      Sin consultas con UTM para esta selección.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {consultasLista.length > 300 && (
              <p className="border-t border-hairline px-4 py-3 text-[12.5px] text-neutral-500">
                Se muestran las 300 más recientes. Filtrá para ver otras.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-[12.5px] leading-relaxed text-neutral-500">
        Visitas: cada vez que alguien abrió una página con UTM en el link (recargar también suma). Consultas: por
        defecto se atribuyen a la UTM con la que la persona entró por primera vez; si esa entrada no traía UTM, a la
        última. Es el mismo criterio de la línea &quot;Pauta&quot; y de los campos UTM de Bitrix. Por eso una consulta
        puede caer en una UTM sin visitas en el período, si la persona entró antes. La conversión es consultas sobre
        visitantes.
        {datos.datosDesde !== null && ` Hay datos de visitas desde el ${fechaLarga(datos.datosDesde)} y se guardan 180 días.`}
      </p>
    </div>
  );
}
