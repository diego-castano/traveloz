"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, MapPin, Calendar, ChevronDown, ChevronRight, Search, Star, Undo2, X, CheckCheck,
  AlertCircle, PenLine
} from "lucide-react";
import {
  MESES, MES_AB, fotoBg, clamp, parseISO, toISO, addDays, norm,
} from "./data";
import { useCatalogo } from "./contexto";

/* El recuadro de foto: si el paquete o el hotel tiene imagen cargada va la
   imagen recortada al mismo marco; si no, el gradiente por semilla de siempre. */
function Foto({ seed = 0, url = null, alt = "", w = 56, h = 42, r = 10, children, style }) {
  return (
    <div className="foto" style={{ width: w, height: h, borderRadius: r, background: fotoBg(seed), ...style }}>
      {url && (
        <img src={url} alt={alt} loading="lazy" decoding="async"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
      )}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,transparent 45%,rgba(0,0,0,.28))" }} />
      {children}
    </div>
  );
}

/* Iconos REALES del sistema — extraídos de src/components/ui/traveloz-icons.tsx */
const TzIcon = ({ vb, size = 14, children, style }) => (
  <svg viewBox={vb} width={size} height={size} fill="currentColor" aria-hidden style={style}>{children}</svg>
);
const IcoAvion = (p) => <TzIcon vb="0 0 57.1 57.36" {...p}><path d="M46.15,51.77l-3.63,3.63c-1.11.88-2.57.33-3.28-.8l-7.63-20.26c-3.02,3.02-6.12,5.98-9.27,8.87.31,2.71.57,5.43.8,8.15.04.63-.12,2.35-.87,2.33.07.09.16.22.11.28-.52.65-2.26,2.42-2.91,2.91l-.34-.05c.12.21.09.26-.08.37-.57.36-1.97.11-2.42-.42l-.98-.98-1.22-1.61-4.15-7.46-7.45-4.13-1.61-1.22-.98-.98c-.25-.77-.41-1.68.1-2.4.45-.65,2.06-2.22,2.7-2.75,1.02-.83,2.08-1.02,3.34-.99,2.41.06,5.05.64,7.48.77,2.96-3.32,6.29-6.33,9.25-9.65L2.55,17.57c-.9-.52-1.31-2.05-.79-2.93.36-.62,2.8-3.02,3.44-3.52.6-.46,1.42-.65,2.16-.7l27.37,2.64C39.36,9.22,44.98.38,51.5,0c3.25-.19,5.71,2.26,5.6,5.5-.19,5.38-6.45,10.29-10.01,13.73-.56.54-2.92,2.75-3.05,3.25.76,9.36,1.98,18.7,2.52,28.06l-.41,1.23Z" /></TzIcon>;
const IcoCama = (p) => <TzIcon vb="0 0 64.29 45.66" {...p}><path d="M.07,41.11c.05-4.79-.29-9.96.18-14.5.34-3.25,3.22-5.93,6.48-6.1h51.33c2.55.32,4.76,1.92,5.72,4.3l.5,1.57v14.72h-4.57s-54.9,0-54.9,0l-4.74.02Z" /><path d="M57.42,15.94h-6.86v-2.93c0-1.45-1.72-3.22-3.04-3.67-1.34-.46-6.98-.39-8.61-.26-1.89.15-4.36,1.89-4.36,3.93v2.93h-4.57v-2.93c0-1.45-1.72-3.22-3.04-3.67-1.34-.46-6.98-.39-8.61-.26-1.89.15-4.36,1.89-4.36,3.93v2.93h-6.86V1.72c0-.57.41-1.72,1.71-1.72l47.02.03c1.05,0,1.6,1.16,1.6,1.69v14.22Z" /><path d="M59.37,41.11h4.92v2.1c0,1.36-1.1,2.46-2.46,2.46h0c-1.36,0-2.46-1.1-2.46-2.46v-2.1h0Z" /><path d="M.07,41.11h4.92v2.1c0,1.36-1.1,2.46-2.46,2.46h0c-1.36,0-2.46-1.1-2.46-2.46v-2.1H.07Z" /></TzIcon>;
const IcoBus = (p) => <TzIcon vb="0 0 79.43 44.31" {...p}><path d="M75.85,39.8h-3.84c1.12-5.69-3.23-10.81-8.83-10.81s-9.98,5.12-8.85,10.82H21.47c1.12-5.63-3.14-10.72-8.64-10.82s-10.14,5.06-9.05,10.81C1.7,39.85,0,38.3,0,36.22V3.6C0,1.62,1.74,0,3.72,0h65.92c3.5,0,6.63,2.34,7.19,5.83l2.12,13.04c.32,1.99.47,3.91.46,5.92v11.44c0,1.93-1.6,3.55-3.57,3.56ZM18.05,18.13V3.7s-12.67,0-12.67,0c-1,.04-1.7.74-1.77,1.74v12.7s14.44-.01,14.44-.01ZM36.11,3.7h-14.44v14.44h14.44V3.7ZM54.15,3.7h-14.44v14.43h14.44V3.7ZM75.38,19.66l-2.07-12.81c-.24-1.73-1.66-3.14-3.48-3.14h-12.08s0,14.44,0,14.44l5.41,5.41h12.56s-.36-3.9-.36-3.9Z" /><circle cx="12.63" cy="38" r="6.31" /><circle cx="63.18" cy="38" r="6.31" /></TzIcon>;
const IcoAuto = (p) => <TzIcon vb="0 0 64.74 45.83" {...p}><path d="M64.74,14.82l-.04.87-.93,4.36c-.17.8-.85,1.34-1.68,1.35l-1.91.02c3.96,4.55,3.71,11.56-.74,15.7l-.02,6.28c0,1.34-1.09,2.34-2.39,2.42h-5.83c-1.46,0-2.55-1.11-2.56-2.55l-.02-2.48H16.09s-.02,2.48-.02,2.48c0,1.44-1.1,2.55-2.56,2.55h-5.69c-1.45-.02-2.53-1.11-2.53-2.55v-6.28c-4.42-4.02-4.69-11.07-.87-15.57l-1.8-.02c-.82,0-1.51-.55-1.68-1.35L.05,15.75c-.12-.58-.05-1.14.33-1.61.29-.35.82-.58,1.37-.58h6.2c1.38-3.38,2.79-6.99,5.54-9.41,2.99-1.97,6.82-2.99,10.4-3.52,5.65-.84,11.31-.84,16.95,0,3.58.53,7.41,1.56,10.4,3.52,2.74,2.41,4.17,6.03,5.53,9.41h6.2c.87,0,1.49.48,1.77,1.25ZM52.39,16.16c-.75-2.21-1.57-4.01-2.48-5.85-.47-.75-.93-1.4-1.49-2.08-2.52-1.58-5.64-2.35-8.62-2.77-4.96-.69-9.91-.69-14.87,0-2.98.42-6.1,1.19-8.62,2.77-.55.65-.99,1.28-1.45,2-.95,1.9-1.79,3.79-2.54,5.93h40.07ZM18.9,29.35c0-2.69-2.18-4.88-4.88-4.88s-4.88,2.18-4.88,4.88,2.18,4.88,4.88,4.88,4.88-2.18,4.88-4.88ZM55.65,29.34c0-2.69-2.18-4.88-4.88-4.88s-4.88,2.18-4.88,4.88,2.18,4.88,4.88,4.88,4.88-2.18,4.88-4.88Z" /></TzIcon>;
const IcoEscudo = (p) => <TzIcon vb="0 0 64.53 75.8" {...p}><path d="M33.01,75.8h-1.47c-12.7-4.07-23.04-11.81-27.93-24.63-1.4-3.67-2.26-7.35-2.8-11.26C.15,35.09-.08,30.35.02,25.48l.17-7.7c.26-4.2,3.68-7.3,7.8-7.53,7.9-.44,14.79-3.07,20.51-8.52,2.41-2.3,5.14-2.3,7.55,0,5.7,5.43,12.63,8.1,20.49,8.52,4.52.24,7.86,3.76,7.9,8.28l.09,9.91c.04,3.94-.27,7.7-.81,11.59-.64,4.58-1.74,8.92-3.61,13.13-2.93,6.58-7.53,12.07-13.5,16.12-4.21,2.86-8.8,5.04-13.59,6.53ZM51.14,37.9c0-10.42-8.45-18.87-18.87-18.87s-18.87,8.45-18.87,18.87,8.45,18.87,18.87,18.87,18.87-8.45,18.87-18.87Z" /><path d="M46.7,37.9c0,7.97-6.46,14.43-14.43,14.43s-14.43-6.46-14.43-14.43,6.46-14.43,14.43-14.43,14.43,6.46,14.43,14.43ZM23.45,41.62l3.8,3.81c.94.94,2.32,1.02,3.29.05l10.34-10.35c.9-.9.75-2.34-.09-3.14s-2.22-.81-3.11.08l-8.75,8.75-2.3-2.31c-.9-.91-2.26-.96-3.16-.13s-.97,2.29-.02,3.24Z" /></TzIcon>;
const IcoEstrella = (p) => <TzIcon vb="0 0 59.53 56.72" {...p}><path d="M29.78,48l-16,8.41c-.79.41-1.55.44-2.29-.06-.54-.36-1.05-1.12-.91-1.96l3.1-18.08L.75,23.71c-.63-.61-.91-1.32-.66-2.22.18-.65.78-1.33,1.67-1.46l18.07-2.62L27.98.88C28.3.23,29.14.01,29.71,0c.63-.01,1.51.19,1.85.89l8.14,16.51,17.86,2.59c.9.13,1.56.6,1.83,1.32.32.86.13,1.7-.53,2.34l-13,12.67,3.08,17.97c.15.85-.26,1.61-.82,2.02-.68.5-1.5.56-2.28.15l-16.06-8.45Z" /></TzIcon>;

const CATS = [
  { id:"aereo",       label:"Aéreo",       Icon:IcoAvion },
  { id:"traslado",    label:"Traslado",    Icon:IcoBus },
  { id:"alojamiento", label:"Alojamiento", Icon:IcoCama },
  { id:"vehiculo",    label:"Vehículo",    Icon:IcoAuto },
  { id:"seguro",      label:"Seguro",      Icon:IcoEscudo },
  { id:"opcionales",  label:"Opcionales",  Icon:IcoEstrella },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVAS DE UI
   ═══════════════════════════════════════════════════════════════════════════ */

function Btn({ variant = "s", size, className = "", children, ...p }) {
  /* tv/tt/ta: tintados suaves (violeta, teal, ámbar) para que cada acción tenga su color */
  const v = { p:"btn-p", v:"btn-v", s:"btn-s", g:"btn-g", tv:"btn-tv", tt:"btn-tt", ta:"btn-ta" }[variant] || "btn-s";
  const s = size === "sm" ? "btn-sm" : size === "xs" ? "btn-xs" : "";
  return <button className={`btn ${v} ${s} ${className}`} {...p}>{children}</button>;
}

function Label({ children, hint }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
      <span className="lbl">{children}</span>
      {hint && <span style={{ fontSize:11, color:"var(--n300)" }}>{hint}</span>}
    </div>
  );
}

/* v2D · el tono vive en el CSS (.pill[data-tone]) para que el modo oscuro lo ajuste */
function Pill({ tone = "n", children, style }) {
  return <span className="pill" data-tone={tone} style={style}>{children}</span>;
}

/* Identificador de todo lo que arma la IA — mismo chip en el modal y en el editor */
function ChipIA({ texto = "IA", style }) {
  return (
    <span className="chip-ia" style={style}><Sparkles size={11} /> {texto}</span>
  );
}

function Estrellas({ n = 0, size = 11 }) {
  return (
    <span style={{ display:"inline-flex", gap:1 }}>
      {Array.from({ length:n }).map((_, i) => (
        <Star key={i} size={size} style={{ fill:"#F7B267", color:"#F7B267" }} />
      ))}
    </span>
  );
}

function Block({ id, icon:Icon, title, count, right, children, forwardRef }) {
  return (
    <section id={id} ref={forwardRef} className="blk a-rise">
      <div className="blk-h">
        <div className="blk-ico"><Icon size={15} /></div>
        <div className="blk-t">{title}</div>
        {count != null && <Pill tone="n">{count}</Pill>}
        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>{right}</div>
      </div>
      <div className="blk-b">{children}</div>
    </section>
  );
}

function Vacio({ icon:Icon, titulo, accion }) {
  return (
    <div style={{ border:"1px dashed var(--hair)", borderRadius:13, padding:"22px 18px",
      textAlign:"center", background:"var(--wash)" }}>
      <Icon size={19} style={{ color:"var(--n300)", marginBottom:8 }} />
      <div style={{ fontSize:13, fontWeight:600, color:"var(--n600)", marginBottom:3 }}>{titulo}</div>
      {accion && <div style={{ fontSize:12, color:"var(--n400)" }}>{accion}</div>}
    </div>
  );
}

/* Toasts con deshacer */
function Toasts({ items, onUndo, onClose }) {
  return (
    <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:120,
      display:"flex", flexDirection:"column", gap:8, alignItems:"center", pointerEvents:"none" }}>
      {items.map((t) => (
        <div key={t.id} className={`a-pop ${t.tone === "vivo" ? "ts-vivo" : ""}`}
          style={{ pointerEvents:"auto", display:"flex", alignItems:"center", gap:11,
          background:"rgba(26,26,46,.96)", color:"#fff", padding:"10px 12px 10px 15px", borderRadius:13,
          border:"1px solid rgba(255,255,255,.09)",
          boxShadow:"0 18px 44px -12px rgba(17,17,36,.5)", fontSize:13, fontWeight:500, backdropFilter:"blur(10px)" }}>
          {t.tone === "ok" && <CheckCheck size={15} style={{ color:"#45D4C0" }} />}
          {t.tone === "warn" && <AlertCircle size={15} style={{ color:"#F7B267" }} />}
          {/* v2C · "lo están mirando ahora": punto verde latiendo */}
          {t.tone === "vivo" && <span className="ts-live" />}
          <span>{t.msg}</span>
          {t.undo && (
            <button onClick={() => onUndo(t)} style={{ display:"inline-flex", alignItems:"center", gap:5,
              background:"rgba(255,255,255,.14)", padding:"5px 10px", borderRadius:8, fontSize:12, fontWeight:700, color:"#fff" }}>
              <Undo2 size={12} /> Deshacer
            </button>
          )}
          <button onClick={() => onClose(t.id)} style={{ color:"rgba(255,255,255,.45)", display:"grid", placeItems:"center" }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Wordmark TravelOz — replica del logo del repo ─────────────────────── */
function Wordmark({ size = 20, dark = false }) {
  return (
    <span className={`wordmark ${dark ? "on-dark" : ""}`} style={{ fontSize:size }}>
      <span className="t">Travel</span><span className="oz">oz</span>
    </span>
  );
}

/* ── Calendario — date picker propio, nada de input nativo ─────────────── */
const DSEM = ["L","M","X","J","V","S","D"];
const DOW = ["dom","lun","mar","mié","jue","vie","sáb"];
function fmtBtn(iso) { const d = parseISO(iso); return d ? `${DOW[d.getDay()]} ${d.getDate()} ${MES_AB[d.getMonth()]} ${d.getFullYear()}` : null; }

function diffDias(iso) {
  const d = parseISO(iso); if (!d) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((d - hoy) / 86400000);
}

function Calendario({ value, onChange, placeholder = "Elegir fecha", grande = false, nota, mesPreferido = null, anioPreferido = null }) {
  const [open, setOpen] = useState(false);
  const [vista, setVista] = useState("dias");            // dias | meses
  const sel = value ? parseISO(value) : null;
  /* sin fecha elegida, el calendario abre en el mes del encabezado (si hay) */
  const preferida = mesPreferido != null
    ? new Date(anioPreferido || new Date().getFullYear(), mesPreferido, 1) : null;
  const [vm, setVm] = useState(() => sel || preferida || new Date());
  const box = useRef(null);
  useEffect(() => { if (sel) setVm(new Date(sel.getFullYear(), sel.getMonth(), 1)); }, [value]);
  useEffect(() => {
    if (!sel && mesPreferido != null)
      setVm(new Date(anioPreferido || new Date().getFullYear(), mesPreferido, 1));
  }, [mesPreferido, anioPreferido]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) { setOpen(false); setVista("dias"); } };
    const k = (e) => { if (e.key === "Escape") { setOpen(false); setVista("dias"); } };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, []);

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const hoyISO = toISO(hoy);
  const y = vm.getFullYear(), m = vm.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7;
  const nd = new Date(y, m + 1, 0).getDate();
  const ndPrev = new Date(y, m, 0).getDate();
  const dias = diffDias(value);

  /* strip: los próximos 9 meses desde hoy, para saltar de un toque */
  const strip = Array.from({ length: 9 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth() + i, 1));

  const pick = (d) => { onChange(toISO(new Date(y, m, d))); setOpen(false); setVista("dias"); };
  const esVM = (d) => d.getFullYear() === y && d.getMonth() === m;

  /* celdas: relleno del mes anterior + mes + relleno siguiente (6 filas fijas) */
  const celdas = [];
  for (let i = start - 1; i >= 0; i--) celdas.push({ d: ndPrev - i, out: -1 });
  for (let i = 1; i <= nd; i++) celdas.push({ d: i, out: 0 });
  while (celdas.length % 7 !== 0 || celdas.length < 42) celdas.push({ d: celdas.length - (start + nd) + 1, out: 1 });

  return (
    <div ref={box} style={{ position:"relative" }}>
      <button className={`in cal-btn ${grande ? "in-lg" : ""}`} onClick={() => setOpen((v) => !v)}
        style={{ height: grande ? 44 : 38 }}>
        <Calendar size={grande ? 16 : 14} style={{ color: value ? "var(--teal-2)" : "var(--n300)", flexShrink:0 }} />
        <span style={{ flex:1, fontWeight: value ? 600 : 400, color: value ? "var(--ink)" : "var(--n300)",
          fontSize: grande ? 14.5 : 13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {fmtBtn(value) || placeholder}
          {value && dias != null && dias >= 0 && (
            <span style={{ fontWeight:500, color:"var(--n400)", fontSize: grande ? 11.5 : 10.5 }}>
              {"  ·  "}{dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}</span>
          )}
        </span>
        <ChevronDown size={13} style={{ color:"var(--n300)", transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
      </button>

      {open && (
        <div className="cal-pop a-slide" style={{ width:288 }}>

          {/* strip de meses próximos — un toque y estás ahí */}
          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:8, marginBottom:8,
            borderBottom:"1px solid var(--hair-soft)" }}>
            {strip.map((d) => {
              const on = esVM(d);
              return (
                <button key={d.getFullYear() + "-" + d.getMonth()}
                  onClick={() => setVm(new Date(d.getFullYear(), d.getMonth(), 1))}
                  style={{ flexShrink:0, padding:"5px 10px", borderRadius:9, fontSize:11, fontWeight:700,
                    background: on ? "linear-gradient(145deg,#A05ED3,#785AE5)" : "var(--sunk)",
                    color: on ? "#fff" : "var(--n500)", transition:"all .15s" }}>
                  {MES_AB[d.getMonth()]}
                  {d.getMonth() === 0 || on ? <span style={{ opacity:.7, marginLeft:3 }}>{String(d.getFullYear()).slice(2)}</span> : null}
                </button>
              );
            })}
          </div>

          {/* header: mes año clickeable → vista meses */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <button className="cal-nav" onClick={() => vista === "dias" ? setVm(new Date(y, m - 1, 1)) : setVm(new Date(y - 1, m, 1))}>
              <ChevronRight size={14} style={{ transform:"rotate(180deg)" }} /></button>
            <button onClick={() => setVista(vista === "dias" ? "meses" : "dias")}
              style={{ flex:1, textAlign:"center", fontSize:13.5, fontWeight:700, letterSpacing:"-.01em",
                padding:"5px 0", borderRadius:9, transition:"background .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(120,90,229,.07)"}
              onMouseLeave={(e) => e.currentTarget.style.background = ""}>
              {vista === "dias" ? <>{MESES[m]} <span style={{ color:"var(--violet)", fontWeight:600 }}>{y}</span></> : y}
              <ChevronDown size={11} style={{ marginLeft:5, color:"var(--n300)",
                transform: vista === "meses" ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
            </button>
            <button className="cal-nav" onClick={() => vista === "dias" ? setVm(new Date(y, m + 1, 1)) : setVm(new Date(y + 1, m, 1))}>
              <ChevronRight size={14} /></button>
          </div>

          {vista === "meses" ? (
            <div className="a-fade" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:5, marginBottom:4 }}>
              {MESES.map((mn, i) => {
                const pasado = new Date(y, i + 1, 0) < hoy;
                const on = sel && sel.getFullYear() === y && sel.getMonth() === i;
                return (
                  <button key={mn} disabled={pasado}
                    onClick={() => { setVm(new Date(y, i, 1)); setVista("dias"); }}
                    style={{ padding:"10px 4px", borderRadius:10, fontSize:12.5, fontWeight:600,
                      background: on ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : i === m ? "rgba(120,90,229,.14)" : "var(--wash)",
                      color: on ? "#fff" : pasado ? "var(--n300)" : "var(--n600)",
                      opacity: pasado ? .45 : 1, transition:"all .14s" }}>{mn.slice(0, 3)}</button>
                );
              })}
            </div>
          ) : (
            <div className="cal-grid a-fade">
              {DSEM.map((d, i) => <div key={i} className="cal-dw">{d}</div>)}
              {celdas.map((c, i) => {
                if (c.out !== 0) return <div key={i} className="cal-d" data-out="1" style={{ opacity:.35 }}>{c.d}</div>;
                const iso = toISO(new Date(y, m, c.d));
                const pasada = iso < hoyISO;
                return (
                  <button key={i} className="cal-d" data-sel={value === iso ? "1" : "0"}
                    data-hoy={iso === hoyISO ? "1" : "0"}
                    style={pasada ? { color:"var(--n300)", opacity:.6 } : undefined}
                    onClick={() => pick(c.d)}>{c.d}</button>
                );
              })}
            </div>
          )}

          <div style={{ display:"flex", gap:5, marginTop:9, alignItems:"center", flexWrap:"wrap" }}>
            {[["Hoy", () => { onChange(hoyISO); setOpen(false); }],
              ["+7", () => onChange(addDays(value || hoyISO, 7))],
              ["+15", () => onChange(addDays(value || hoyISO, 15))],
              ["+30", () => onChange(addDays(value || hoyISO, 30))]].map(([l, fn]) => (
              <button key={l} className="chip" style={{ height:27, fontSize:11.5 }} onClick={fn}>{l}</button>
            ))}
            {value && <button className="chip" style={{ height:27, fontSize:11.5, marginLeft:"auto", color:"var(--coral)" }}
              onClick={() => { onChange(""); setOpen(false); }}><X size={10} /> Quitar</button>}
          </div>
          {nota && <div style={{ fontSize:10.5, color:"var(--n400)", marginTop:8, lineHeight:1.45 }}>{nota}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Autocomplete de ciudades — flechas + Enter, texto libre siempre ───── */
function AutoCiudad({ value, onChange, onPick, placeholder, excluir = [], grande = false, inputRef }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const box = useRef(null);
  const { ciudades: CIUDADES } = useCatalogo();
  const res = useMemo(() => {
    const pool = CIUDADES.filter((c) => !excluir.includes(c));
    /* sin tildes: "mexico" encuentra "México" y "buzios" encuentra "Búzios" */
    const q = norm((value || "").trim());
    const hit = q ? pool.filter((c) => norm(c).includes(q)) : pool;
    return hit.slice(0, 6);
  }, [value, excluir, CIUDADES]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const marcar = (c) => {
    const q = (value || "").trim();
    if (!q) return c;
    /* norm conserva el largo carácter a carácter, así que el índice sirve para recortar el original */
    const i = norm(c).indexOf(norm(q));
    if (i < 0) return c;
    return <>{c.slice(0, i)}<b>{c.slice(i, i + q.length)}</b>{c.slice(i + q.length)}</>;
  };
  const elegir = (c) => { onPick(c); setOpen(false); setIdx(0); };
  return (
    <div ref={box} style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <MapPin size={grande ? 15 : 13} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          color: value ? "var(--violet)" : "var(--n300)" }} />
        <input ref={inputRef} className={`in ${grande ? "in-lg" : ""}`} style={{ paddingLeft:34 }}
          value={value} placeholder={placeholder}
          onFocus={() => { setOpen(true); setIdx(0); }}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setIdx((i) => clamp(i + 1, 0, res.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => clamp(i - 1, 0, res.length - 1)); }
            else if (e.key === "Enter") { e.preventDefault();
              if (open && res[idx]) elegir(res[idx]); else if ((value || "").trim()) elegir(value.trim()); }
            else if (e.key === "Escape") setOpen(false);
          }} />
      </div>
      {open && res.length > 0 && (
        <div className="ac-pop a-slide">
          {res.map((c, i) => (
            <button key={c} className="ac-i" data-on={i === idx ? "1" : "0"}
              onMouseEnter={() => setIdx(i)} onClick={() => elegir(c)}>
              <MapPin size={12} style={{ color:"var(--n300)", flexShrink:0 }} />
              <span>{marcar(c)}</span>
            </button>
          ))}
          {(value || "").trim() && !res.some((c) => c.toLowerCase() === value.trim().toLowerCase()) && (
            <button className="ac-i" data-on="0" style={{ borderTop:"1px solid var(--hair-soft)", color:"var(--n500)" }}
              onClick={() => elegir(value.trim())}>
              <PenLine size={12} style={{ flexShrink:0 }} />
              <span>Usar “{value.trim()}”</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* Buscador con foto + escape a texto libre */
function BuscadorHotel({ ciudad, valor, onPick, onLibre, autoFocus }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);   // fuerza reordenar cuando se togglea un favorito
  const box = useRef(null);
  const { hoteles, esFavorito, toggleFavorito, cargando, progreso } = useCatalogo();
  const res = useMemo(() => {
    const todos = hoteles;
    const base = todos.filter((h) => !ciudad || h.ciudad === ciudad);
    const pool = base.length ? base : todos;
    const filtrados = !q.trim() ? pool
      : pool.filter((h) => {
          const s = q.toLowerCase();
          return h.nombre.toLowerCase().includes(s) || h.ciudad.toLowerCase().includes(s);
        });
    /* favoritos primero — cada vendedor tiene sus caballitos de batalla; ordenamiento estable */
    const ordenados = filtrados
      .map((h, i) => ({ h, i, fav: esFavorito(h.id) }))
      .sort((a, b) => (b.fav - a.fav) || (a.i - b.i))
      .map((x) => x.h);
    return ordenados.slice(0, 6);
    /* `tick` y `esFavorito` cambian juntos al marcar un favorito */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ciudad, tick, hoteles, esFavorito]);

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const key = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => clamp(i + 1, 0, res.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => clamp(i - 1, 0, res.length)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (idx < res.length) { onPick(res[idx]); } else if (q.trim()) { onLibre(q.trim()); }
      setQ(""); setOpen(false);
    } else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={box} style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--n300)" }} />
        <input className="in" style={{ paddingLeft:32 }} autoFocus={autoFocus}
          value={open ? q : (valor || "")} placeholder={ciudad ? `Buscar hotel en ${ciudad}…` : "Buscar hotel…"}
          onFocus={() => { setOpen(true); setQ(""); setIdx(0); }}
          onChange={(e) => { setQ(e.target.value); setIdx(0); setOpen(true); }}
          onKeyDown={key} />
      </div>
      {open && (
        <div className="a-slide" style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, zIndex:40,
          background:"var(--pop)", border:"1px solid var(--hair)", borderRadius:13, overflow:"hidden",
          boxShadow:"0 22px 50px -14px rgba(17,17,36,.28)" }}>
          {cargando && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px",
              fontSize:11.5, color:"var(--n400)", borderBottom:"1px solid var(--hair-soft)" }}>
              <span className="spin" style={{ width:11, height:11, borderRadius:99, border:"2px solid var(--n300)",
                borderTopColor:"transparent", display:"inline-block" }} />
              Cargando catálogo…{progreso ? ` ${progreso}` : ""}
            </div>
          )}
          {res.map((h, i) => {
            const fav = esFavorito(h.id);
            return (
            <div key={h.id} role="button" tabIndex={0} onMouseEnter={() => setIdx(i)}
              onClick={() => { onPick(h); setOpen(false); setQ(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(h); setOpen(false); setQ(""); } }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 10px", textAlign:"left", cursor:"pointer",
                background: i === idx ? "rgba(120,90,229,.07)" : "transparent" }}>
              <Foto seed={h.seed} url={h.foto} alt={h.nombre} w={40} h={30} r={7} />
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.nombre}</span>
                  {h.propio && <Pill tone="amber" style={{ flexShrink:0 }}>propio</Pill>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"var(--n400)" }}>
                  <MapPin size={10} />{h.ciudad}<Estrellas n={h.cat} size={9} />
                </div>
              </div>
              <button type="button" title="Marcar como favorito — aparece primero" style={{ flexShrink:0, display:"grid", placeItems:"center", width:24, height:24 }}
                onClick={(e) => { e.stopPropagation(); toggleFavorito(h.id); setTick((t) => t + 1); }}>
                <Star size={14} style={fav ? { fill:"#F7B267", color:"#E8A13C" } : { color:"var(--n300)" }} />
              </button>
            </div>
            );
          })}
          <button onMouseEnter={() => setIdx(res.length)}
            onClick={() => { if (q.trim()) { onLibre(q.trim()); setOpen(false); setQ(""); } }}
            style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"9px 10px", textAlign:"left",
              borderTop:"1px solid var(--hair-soft)",
              background: idx === res.length ? "rgba(120,90,229,.09)" : "var(--wash)" }}>
            <div style={{ width:40, height:30, borderRadius:7, display:"grid", placeItems:"center",
              background:"var(--sunk)", color:"var(--n400)" }}><PenLine size={13} /></div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:"var(--n600)" }}>
                {q.trim() ? `Usar “${q.trim()}” como texto libre` : "Escribí para usar texto libre"}
              </div>
              <div style={{ fontSize:11, color:"var(--n400)" }}>Para hoteles que no están en el catálogo</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export {
  Foto, TzIcon, IcoAvion, IcoCama, IcoBus, IcoAuto, IcoEscudo, IcoEstrella, CATS, Btn, Label, Pill,
  ChipIA, Estrellas, Block, Vacio, Toasts, Wordmark, DSEM, DOW, fmtBtn, diffDias, Calendario,
  AutoCiudad, BuscadorHotel,
};
