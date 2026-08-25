"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   TAB ANALYTICS — el tablero del admin

   A diferencia del Analytics viejo (que calculaba sobre las filas que ya
   estaban en pantalla), este pide los números al server: el rango puede ser
   más largo que el listado y las medianas de lectura salen de las aperturas
   reales, que nunca viajaron a la grilla.

   Todo lo que se dibuja viene de `analyticsCotizador`. Si un número no está,
   va "—": acá no se inventa nada.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TrendingUp, Loader2, Download, ChevronUp, ChevronDown, AlertCircle, RefreshCw,
} from "lucide-react";
import { money } from "./data";
import { useCtz } from "./contexto";
import { Btn, Vacio, SelectBuscable } from "./ui";
import { analyticsCotizador } from "@/actions/presupuesto-analytics.actions";

/* Los cuatro rangos del filtro. `dias:null` = desde el 1º de enero. */
const RANGOS = [
  { id: "30", l: "30 días", dias: 30 },
  { id: "90", l: "90 días", dias: 90 },
  { id: "180", l: "180 días", dias: 180 },
  { id: "anio", l: "Este año", dias: null },
];

const VIOLETA = "#785AE5";
const TEAL = "#2A9E8E";
const TEAL_CLARO = "#45D4C0";

/* ── formatos ───────────────────────────────────────────────────────────── */

/* Las tasas vienen como fracción 0..1 desde el server. */
function pct(x) {
  return x == null ? "—" : `${Math.round(x * 100)}%`;
}

/* 3.33 h → "3 h 20 m". Arriba de dos días la hora fina no le importa a nadie. */
function horas(h) {
  if (h == null || !Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} m`;
  if (h >= 48) return `${Math.round(h / 24)} d`;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh} h ${mm} m` : `${hh} h`;
}

function segundos(s) {
  if (s == null || !Number.isFinite(s)) return "—";
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m} m ${r} s` : `${m} m`;
}

function fechaCorta(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
}

/* "2026-W35" → "W35": el eje del gráfico no tiene lugar para el año. */
function etiquetaSemana(clave) {
  return String(clave).split("-")[1] || clave;
}

/* "Sofía Rodríguez" → "Sofía R." para que entre en el eje del gráfico. */
function nombreCorto(n) {
  const p = String(n || "").trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0] || "—";
}

/* ── piezas chicas ──────────────────────────────────────────────────────── */

function Kpi({ l, v, d, i = 0 }) {
  return (
    <div className="card a-rise" style={{ padding: "12px 13px", animationDelay: `${i * 0.04}s` }}>
      <div className="lbl" style={{ marginBottom: 5 }}>{l}</div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.025em", lineHeight: 1.1,
        fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ fontSize: 10.5, marginTop: 3, color: "var(--n400)" }}>{d}</div>
    </div>
  );
}

/* Barra del embudo. Sin librería: son ocho divs con un width en %. */
function BarraEmbudo({ label, n, pctv }) {
  const w = pctv == null ? 0 : Math.round(pctv * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--n500)" }}>{n} · {pct(pctv)}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "var(--sunk)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, borderRadius: 99,
          background: `linear-gradient(90deg,${TEAL_CLARO},${TEAL})`,
          transition: "width .7s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
    </div>
  );
}

/* Lista compacta clave → número, con barrita de fondo proporcional. */
function ListaSimple({ items, vacio }) {
  const tope = Math.max(1, ...items.map((x) => x.n));
  if (!items.length) return <div style={{ fontSize: 12, color: "var(--n400)" }}>{vacio}</div>;
  return (
    <div>
      {items.map((x) => (
        <div key={x.l} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8,
          padding: "6px 8px", borderRadius: 8, marginBottom: 3, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, width: `${(x.n / tope) * 100}%`,
            background: "rgba(120,90,229,.08)", borderRadius: 8 }} />
          <span style={{ position: "relative", fontSize: 12, flex: 1, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.l}</span>
          <span className="mono" style={{ position: "relative", fontSize: 11.5, color: "var(--n500)" }}>{x.d}</span>
        </div>
      ))}
    </div>
  );
}

/* Caja de los dos gráficos: mismo alto y mismo tooltip en los dos. */
function TooltipCtz({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "8px 10px", fontSize: 12, boxShadow: "0 12px 30px -10px rgba(17,17,36,.35)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="mono" style={{ color: p.color, fontSize: 11.5 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ── columnas de la tabla por vendedor ──────────────────────────────────── */

const COLS = [
  { k: "nombre", l: "Vendedor", txt: true, val: (v) => v.nombre, ver: (v) => v.nombre },
  { k: "creadas", l: "Creadas", val: (v) => v.creadas, ver: (v) => v.creadas },
  { k: "enviadas", l: "Enviadas", val: (v) => v.enviadas, ver: (v) => v.enviadas },
  { k: "abiertas", l: "Abiertas", val: (v) => v.abiertas, ver: (v) => v.abiertas },
  { k: "confirmadas", l: "Confirm.", val: (v) => v.confirmadas, ver: (v) => v.confirmadas },
  { k: "tasaApertura", l: "T. apertura", val: (v) => v.tasaApertura, ver: (v) => pct(v.tasaApertura) },
  { k: "tasaConfirmacion", l: "T. confirm.", val: (v) => v.tasaConfirmacion, ver: (v) => pct(v.tasaConfirmacion) },
  { k: "montoConfirmado", l: "Confirmado", val: (v) => v.montoConfirmado, ver: (v) => money(v.montoConfirmado) },
  { k: "medianaHorasHastaApertura", l: "1ª apertura", val: (v) => v.medianaHorasHastaApertura, ver: (v) => horas(v.medianaHorasHastaApertura) },
  { k: "ultimaActividadAt", l: "Últ. actividad", val: (v) => (v.ultimaActividadAt ? new Date(v.ultimaActividadAt).getTime() : null), ver: (v) => fechaCorta(v.ultimaActividadAt) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   EL TAB
   ═══════════════════════════════════════════════════════════════════════════ */

export function TabAnalytics({ toast }) {
  const ctx = useCtz();
  const { vendedores, esAdmin } = ctx;
  /* El toast por ref y no por dep: si el padre lo pasa inline, meterlo en las
     deps de `carga` dispara una consulta por render. */
  const avisar = useRef(null);
  avisar.current = toast || ctx.toast || null;

  const [rango, setRango] = useState("90");
  const [vendedor, setVendedor] = useState("todos");
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState({ col: "confirmadas", dir: "desc" });

  /* El rango se resuelve en el cliente y viaja en ISO: el server no adivina
     zonas horarias ni "este año" según dónde corra. */
  const carga = useCallback(async () => {
    setCargando(true);
    setError(null);
    const hasta = new Date();
    const r = RANGOS.find((x) => x.id === rango) || RANGOS[1];
    const desde = r.dias == null
      ? new Date(Date.UTC(hasta.getUTCFullYear(), 0, 1))
      : new Date(hasta.getTime() - r.dias * 86400000);
    try {
      const res = await analyticsCotizador({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        ...(vendedor !== "todos" ? { vendedorId: vendedor } : {}),
      });
      if (res?.ok) setData(res.data);
      else {
        setData(null);
        setError(res?.error || "No pudimos traer las métricas.");
        avisar.current?.({ msg: res?.error || "No pudimos traer las métricas.", tone: "warn" });
      }
    } catch {
      setData(null);
      setError("No pudimos traer las métricas.");
      avisar.current?.({ msg: "No pudimos traer las métricas.", tone: "warn" });
    } finally {
      setCargando(false);
    }
  }, [rango, vendedor]);

  useEffect(() => { carga(); }, [carga]);

  const filas = useMemo(() => {
    const lista = [...(data?.porVendedor || [])];
    const col = COLS.find((c) => c.k === orden.col) || COLS[4];
    const signo = orden.dir === "asc" ? 1 : -1;
    return lista.sort((a, b) => {
      const va = col.val(a);
      const vb = col.val(b);
      if (col.txt) return signo * String(va).localeCompare(String(vb), "es");
      // Los null van siempre al fondo: un vendedor sin dato no encabeza nada.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return signo * (va - vb);
    });
  }, [data, orden]);

  const datosBarras = useMemo(
    () => (data?.porVendedor || []).slice(0, 10).map((v) => ({
      nombre: nombreCorto(v.nombre), enviadas: v.enviadas, confirmadas: v.confirmadas,
    })),
    [data],
  );
  const datosLinea = useMemo(
    () => (data?.porSemana || []).map((s) => ({
      semana: etiquetaSemana(s.semana), creadas: s.creadas, enviadas: s.enviadas, confirmadas: s.confirmadas,
    })),
    [data],
  );

  const clicCol = (k) => setOrden((o) =>
    o.col === k ? { col: k, dir: o.dir === "desc" ? "asc" : "desc" } : { col: k, dir: "desc" });

  /* CSV armado en el cliente: son diez columnas, no vale la pena un endpoint.
     Separador ";" y BOM porque el Excel en es-UY abre así sin pelear. */
  const exportarCSV = () => {
    if (!filas.length) return;
    const cab = ["Vendedor", "Creadas", "Enviadas", "Abiertas", "Confirmadas",
      "Tasa apertura", "Tasa confirmacion", "Monto confirmado USD",
      "Mediana hasta apertura (h)", "Ultima actividad"];
    const limpio = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const cuerpo = filas.map((v) => [
      v.nombre, v.creadas, v.enviadas, v.abiertas, v.confirmadas,
      v.tasaApertura == null ? "" : Math.round(v.tasaApertura * 100),
      v.tasaConfirmacion == null ? "" : Math.round(v.tasaConfirmacion * 100),
      v.montoConfirmado,
      v.medianaHorasHastaApertura ?? "",
      v.ultimaActividadAt ? new Date(v.ultimaActividadAt).toISOString().slice(0, 10) : "",
    ].map(limpio).join(";"));
    const csv = `﻿${[cab.map(limpio).join(";"), ...cuerpo].join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotizador-vendedores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    avisar.current?.({ msg: "CSV descargado", tone: "ok" });
  };

  if (!esAdmin) {
    return (
      <div className="a-fade" style={{ padding: "20px 0" }}>
        <Vacio icon={TrendingUp} titulo="Analytics del equipo"
          accion="Estos números los ve el administrador del panel" />
      </div>
    );
  }

  const r = data?.resumen;
  const sinDatos = !cargando && !error && (!r || r.creadas === 0);

  return (
    <div className="a-fade">

      {/* ── filtros ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RANGOS.map((x) => (
            <button key={x.id} className={`chip chip-mini ${rango === x.id ? "chip-on" : ""}`}
              onClick={() => setRango(x.id)}>{x.l}</button>
          ))}
        </div>
        <SelectBuscable valor={vendedor} ancho={190}
          opciones={vendedores.map((v) => ({ value: v.id, label: v.nombre, sub: v.cargo }))}
          vacio={{ value: "todos", label: "Todos los vendedores" }}
          buscarPlaceholder="Buscar vendedor…" onChange={setVendedor} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {cargando && <Loader2 size={14} className="spin" style={{ color: "var(--n300)" }} />}
          <Btn size="sm" onClick={carga} title="Volver a calcular"><RefreshCw size={12} /> Actualizar</Btn>
          <Btn size="sm" variant="tv" onClick={exportarCSV} disabled={!filas.length}>
            <Download size={12} /> Exportar CSV
          </Btn>
        </div>
      </div>

      {data?.truncado && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--ink-amber)",
          background: "rgba(232,161,60,.10)", border: "1px solid rgba(232,161,60,.3)",
          borderRadius: 10, padding: "7px 10px", marginBottom: 12 }}>
          {/* el tope lo puede pegar cualquiera de las dos queries: 5.000
              cotizaciones o 20.000 aperturas. El aviso no promete cuál */}
          <AlertCircle size={13} /> El rango supera el tope de cotizaciones o aperturas por consulta:
          los totales son un piso, no el número final.
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-coral)",
          background: "rgba(244,62,85,.08)", border: "1px solid rgba(244,62,85,.28)",
          borderRadius: 10, padding: "9px 11px", marginBottom: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {cargando && !data && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--n400)", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={14} className="spin" /> Calculando métricas…
        </div>
      )}

      {sinDatos && (
        <div style={{ padding: "20px 0" }}>
          <Vacio icon={TrendingUp} titulo="Sin datos en este rango"
            accion="Probá un rango más largo o sacá el filtro por vendedor" />
        </div>
      )}

      {!sinDatos && r && (
        <>
          {/* ── KPIs ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))",
            gap: 10, marginBottom: 14 }}>
            <Kpi i={0} l="Creadas" v={String(r.creadas)} d={`${r.vencidas} vencidas`} />
            <Kpi i={1} l="Enviadas" v={String(r.enviadas)} d={`${r.abiertas} abiertas`} />
            <Kpi i={2} l="Tasa de apertura" v={pct(r.tasaApertura)} d={`${r.abiertas} de ${r.enviadas} enviadas`} />
            <Kpi i={3} l="Tasa de confirmación" v={pct(r.tasaConfirmacion)} d={`${r.confirmadas} confirmadas`} />
            <Kpi i={4} l="Monto confirmado" v={money(r.montoConfirmado)}
              d={r.ticketPromedio != null ? `ticket ${money(r.ticketPromedio)}` : "sin confirmadas"} />
            <Kpi i={5} l="1ª apertura (mediana)" v={horas(r.medianaHorasHastaApertura)}
              d="desde que sale hasta que la abren" />
          </div>

          {/* ── gráficos ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))",
            gap: 12, marginBottom: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Enviadas vs confirmadas por vendedor</div>
              {datosBarras.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosBarras} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap={10}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--hair-soft)" />
                      <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "var(--n400)" }}
                        axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={46} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--n400)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<TooltipCtz />} cursor={{ fill: "rgba(120,90,229,.06)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="enviadas" name="Enviadas" fill={VIOLETA} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="confirmadas" name="Confirmadas" fill={TEAL} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ fontSize: 12, color: "var(--n400)" }}>Sin datos en este rango.</div>}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Semana a semana</div>
              {datosLinea.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosLinea} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--hair-soft)" />
                      <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "var(--n400)" }}
                        axisLine={false} tickLine={false} minTickGap={12} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--n400)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<TooltipCtz />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="creadas" name="Creadas" stroke="#B0B4CD" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="enviadas" name="Enviadas" stroke={VIOLETA} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="confirmadas" name="Confirmadas" stroke={TEAL} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ fontSize: 12, color: "var(--n400)" }}>Sin datos en este rango.</div>}
              {data?.porSemanaRecortada && (
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--n400)" }}>
                  El rango es más largo: mostrando las últimas {datosLinea.length} semanas.
                </div>
              )}
            </div>
          </div>

          {/* ── tabla por vendedor ── */}
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>Detalle por vendedor</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 }}>
                <thead>
                  <tr>
                    {COLS.map((c) => {
                      const on = orden.col === c.k;
                      return (
                        <th key={c.k} onClick={() => clicCol(c.k)}
                          style={{ textAlign: c.txt ? "left" : "right", padding: "6px 8px", cursor: "pointer",
                            whiteSpace: "nowrap", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
                            fontWeight: 700, color: on ? "var(--violet-ink)" : "var(--n400)",
                            borderBottom: "1px solid var(--hair-soft)" }}>
                          {c.l}
                          {on && (orden.dir === "desc"
                            ? <ChevronDown size={11} style={{ verticalAlign: "-1px", marginLeft: 2 }} />
                            : <ChevronUp size={11} style={{ verticalAlign: "-1px", marginLeft: 2 }} />)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((v) => (
                    <tr key={v.vendedorId}>
                      {COLS.map((c) => (
                        <td key={c.k} className={c.txt ? "" : "mono"}
                          style={{ textAlign: c.txt ? "left" : "right", padding: "7px 8px",
                            whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                            borderBottom: "1px solid var(--hair-soft)",
                            fontWeight: c.txt ? 600 : 400 }}>
                          {c.ver(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filas.length && (
              <div style={{ fontSize: 12, color: "var(--n400)", paddingTop: 8 }}>Sin datos en este rango.</div>
            )}
          </div>

          {/* ── embudo + listas ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Hasta dónde leen</div>
              {data.embudo.conSeccion ? (
                <>
                  {data.embudo.pasos.map((p) => (
                    <BarraEmbudo key={p.clave} label={p.label} n={p.aperturas} pctv={p.pct} />
                  ))}
                  <div style={{ fontSize: 11, color: "var(--n400)", marginTop: 4, lineHeight: 1.5 }}>
                    Sobre {data.embudo.conSeccion} de {data.embudo.totalAperturas} aperturas con sección registrada.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--n400)" }}>Sin datos en este rango.</div>
              )}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Destinos más cotizados</div>
              <ListaSimple vacio="Sin datos en este rango."
                items={(data.topDestinos || []).map((d) => ({
                  l: d.destino, n: d.creadas, d: `${d.creadas} cot · ${d.confirmadas} conf`,
                }))} />
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="lbl" style={{ marginBottom: 10 }}>Dispositivos y lectura</div>
              <ListaSimple vacio="Sin aperturas en este rango."
                items={(data.dispositivos || []).map((x) => ({
                  l: x.dispositivo, n: x.aperturas, d: `${x.aperturas}`,
                }))} />
              <div style={{ borderTop: "1px solid var(--hair-soft)", marginTop: 10, paddingTop: 10 }}>
                {[
                  ["Tiempo de lectura (promedio)", segundos(r.promedioSegundosLectura)],
                  ["Hasta confirmar (mediana)", horas(r.medianaHorasHastaConfirmacion)],
                  ["Armado de la cotización (mediana)", segundos(r.tiempoArmadoMedianoSeg)],
                ].map(([t, v]) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                    <span style={{ fontSize: 12, color: "var(--n600)", flex: 1 }}>{t}</span>
                    <span className="mono" style={{ fontSize: 12,
                      color: v === "—" ? "var(--n300)" : "var(--n600)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
