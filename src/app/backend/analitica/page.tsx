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
import { Link2, MessageSquare, MousePointerClick, Search, Users } from "lucide-react";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { cn } from "@/components/lib/cn";
import { getAnaliticaUtm } from "@/actions/analitica-utm.actions";
import type { AgrupacionUtm, AnaliticaUtm, FilaUtm } from "@/lib/analitica-utm";

const PERIODOS: { dias: number | null; label: string }[] = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: null, label: "Todo" },
];

const AGRUPACIONES: { id: AgrupacionUtm; label: string }[] = [
  { id: "combinaciones", label: "Fuente + medio + campaña" },
  { id: "campanas", label: "Campaña" },
  { id: "fuentes", label: "Fuente" },
];

const COLOR_VISITAS = "#6D5BD0";
const COLOR_CONSULTAS = "#10B981";

const num = (n: number) => n.toLocaleString("es-UY");

function fechaCorta(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}

/** Todos los días entre `desde` y hoy, para que el gráfico no salte los días en cero. */
function diasDelPeriodo(desde: string): string[] {
  const out: string[] = [];
  const hoy = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (let t = Date.parse(`${desde}T00:00:00Z`); ; t += 24 * 60 * 60 * 1000) {
    const dia = new Date(t).toISOString().slice(0, 10);
    out.push(dia);
    if (dia >= hoy || out.length > 400) break;
  }
  return out;
}

function etiquetaFila(f: FilaUtm, agrupar: AgrupacionUtm): string {
  if (agrupar === "campanas") return f.campaign ?? "(sin campaña)";
  if (agrupar === "fuentes") return f.source ?? "(sin fuente)";
  return [f.source, f.medium, f.campaign].map((v) => v ?? "—").join(" / ");
}

function Valor({ v }: { v: string | null }) {
  if (!v) return <span className="italic text-neutral-400">sin dato</span>;
  return <span className="break-all">{v}</span>;
}

function Kpi({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[16px] border border-hairline bg-white p-5 shadow-[0_14px_30px_-24px_rgba(17,17,36,0.28)]">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600">
        {icon}
      </div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <p className="text-[30px] font-bold tracking-tight text-neutral-900">{value}</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-500">{helper}</p>
    </div>
  );
}

function Segmentos<T extends string | number | null>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { id: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-[12px] border border-hairline bg-white p-1">
      {opciones.map((o) => (
        <button
          key={String(o.id)}
          type="button"
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

export default function AnaliticaUtmPage() {
  const [dias, setDias] = useState<number | null>(30);
  const [data, setData] = useState<AnaliticaUtm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [agrupar, setAgrupar] = useState<AgrupacionUtm>("combinaciones");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    getAnaliticaUtm(dias)
      .then((d) => vivo && setData(d))
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : "No se pudo cargar."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [dias]);

  // La fila elegida es de una agrupación: al cambiar de agrupación se suelta.
  useEffect(() => setSeleccion(null), [agrupar]);

  const filas = useMemo(() => {
    const todas = data?.filas[agrupar] ?? [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return todas;
    return todas.filter((f) =>
      [f.source, f.medium, f.campaign].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, agrupar, busqueda]);

  const filaElegida = filas.find((f) => f.clave === seleccion) ?? null;

  const serie = useMemo(() => {
    if (!data) return [];
    const fuente = filaElegida ? [filaElegida] : data.filas.combinaciones;
    return diasDelPeriodo(data.desde).map((dia) => ({
      dia: fechaCorta(dia),
      Visitas: fuente.reduce((s, f) => s + (f.visitasPorDia[dia] ?? 0), 0),
      Consultas: fuente.reduce((s, f) => s + (f.consultasPorDia[dia] ?? 0), 0),
    }));
  }, [data, filaElegida]);

  if (cargando && !data) return <PageSkeleton variant="dashboard" />;

  return (
    <div className="space-y-6">
      <DataTablePageHeader
        title="Analítica UTM"
        subtitle="Visitas y consultas que llegaron al sitio con UTM en el link."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmentos
          opciones={PERIODOS.map((p) => ({ id: p.dias, label: p.label }))}
          valor={dias}
          onChange={setDias}
        />
        {cargando && <span className="text-[12.5px] text-neutral-400">Actualizando…</span>}
      </div>

      {error && (
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={<MousePointerClick className="h-5 w-5" />}
              label="Visitas con UTM"
              value={num(data.visitas)}
              helper={`De ${num(data.paginasVistas)} páginas vistas en el período. Cada clic en un link con UTM suma una.`}
            />
            <Kpi
              icon={<Users className="h-5 w-5" />}
              label="Visitantes únicos"
              value={num(data.visitantes)}
              helper="Personas distintas (por navegador) que entraron con UTM."
            />
            <Kpi
              icon={<MessageSquare className="h-5 w-5" />}
              label="Consultas con UTM"
              value={num(data.consultasConUtm)}
              helper={`De ${num(data.consultas)} consultas en el período (cotizaciones, landings, contacto y corporativo).`}
            />
            <Kpi
              icon={<Link2 className="h-5 w-5" />}
              label="UTM distintas"
              value={num(data.filas.combinaciones.length)}
              helper={`${num(data.filas.campanas.length)} campañas y ${num(data.filas.fuentes.length)} fuentes.`}
            />
          </div>

          <div className="rounded-[18px] border border-hairline bg-white p-5 shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-neutral-900">Por día</h3>
                <p className="mt-1 break-all text-[12.5px] leading-relaxed text-neutral-500">
                  {filaElegida ? etiquetaFila(filaElegida, agrupar) : "Todas las UTM. Tocá una fila de la tabla para ver solo esa."}
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

          <div className="rounded-[18px] border border-hairline bg-white shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-4">
              <Segmentos opciones={AGRUPACIONES} valor={agrupar} onChange={setAgrupar} />
              <label className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar (ej.: influencer)"
                  className="w-full rounded-[10px] border border-hairline bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-neutral-400"
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  <tr>
                    {agrupar !== "campanas" && <th className="px-4 py-3">Fuente</th>}
                    {agrupar === "combinaciones" && <th className="px-4 py-3">Medio</th>}
                    {agrupar !== "fuentes" && <th className="px-4 py-3">Campaña</th>}
                    <th className="px-4 py-3 text-right">Visitas</th>
                    <th className="px-4 py-3 text-right">Visitantes</th>
                    <th className="px-4 py-3 text-right">Consultas</th>
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
                      {agrupar !== "campanas" && (
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          <Valor v={f.source} />
                        </td>
                      )}
                      {agrupar === "combinaciones" && (
                        <td className="px-4 py-3">
                          <Valor v={f.medium} />
                        </td>
                      )}
                      {agrupar !== "fuentes" && (
                        <td className="px-4 py-3">
                          <Valor v={f.campaign} />
                        </td>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums">{num(f.visitas)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{num(f.visitantes)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{num(f.consultas)}</td>
                    </tr>
                  ))}
                  {!filas.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                        {busqueda ? "Ninguna UTM coincide con la búsqueda." : "No hay visitas con UTM en este período."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-neutral-500">
            Cada consulta se atribuye a la UTM con la que la persona entró por primera vez; si esa
            entrada no traía UTM, a la última. Es el mismo criterio de la línea &quot;Pauta&quot; y
            de los campos UTM de Bitrix. Una consulta puede caer en una UTM sin visitas en el
            período si la persona entró antes.
            {data.datosDesde && ` Hay datos de visitas desde el ${fechaCorta(data.datosDesde)}/${data.datosDesde.slice(0, 4)} y se guardan 180 días.`}
          </p>
        </>
      )}
    </div>
  );
}
