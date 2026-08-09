"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Sparkles, MessageSquare, FileText, Copy, Trash2, Plus, Check, ChevronDown, ChevronRight, Search,
  Send, Eye, ArrowLeft, Command, Zap, X, Smartphone, LayoutGrid, Loader2, CheckCheck, AlertCircle,
  RefreshCw, Link2, TrendingUp, Ticket, Files, ListChecks, Sun, Moon
} from "lucide-react";
import {
  MESES, PAQUETES, VENDEDORES, HISTORIAL, semaforo, money, venta, limpiarPegado, detectarConsulta,
  ESTADOS, estadoEfectivo
} from "./data";
import { Foto, Btn, Pill, ChipIA, Vacio, Wordmark } from "./ui";
import { DrawerAnalytics } from "./drawer";

/* ═══════════════════════════════════════════════════════════════════════════
   v2 · ENTRADA — cómo arranca una cotización
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── A1 · modal "¿Cómo arrancamos?" — cinco caminos, teclas 1 a 5 ────── */
function ModalNueva({ plantillas, recientes, onClose, onBlanco, onPaquete, onPlantilla, onFila, onIA }) {
  const [paso, setPaso] = useState("menu");     // menu | paquete | plantilla | reciente
  const [busq, setBusq] = useState("");
  const inp = useRef(null);

  const CAMINOS = [
    { k:"ia",        n:1, Icon:MessageSquare, t:"Desde una consulta de WhatsApp",
      d:"Pegá lo que te escribió el pasajero y la IA arma el borrador" },
    { k:"blanco",    n:2, Icon:FileText,   t:"En blanco",             d:"Formulario vacío, listo para escribir" },
    { k:"paquete",   n:3, Icon:LayoutGrid, t:"Desde un paquete",      d:"Todo precargado: destinos, hoteles y precios" },
    { k:"plantilla", n:4, Icon:Files,      t:"Desde una plantilla",   d:"Lo repetitivo ya viene cargado" },
    { k:"reciente",  n:5, Icon:Copy,       t:"Duplicar una reciente", d:"Arrancá desde una cotización ya armada" },
  ];

  const elegir = useCallback((k) => {
    if (k === "ia") onIA();
    else if (k === "blanco") onBlanco();
    else { setPaso(k); setBusq(""); }
  }, [onIA, onBlanco]);

  const volver = useCallback(() => { setPaso("menu"); setBusq(""); }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (paso === "menu") {
        const i = ["1","2","3","4","5"].indexOf(e.key);
        if (i >= 0) { e.preventDefault(); elegir(CAMINOS[i].k); }
      } else if (e.key === "ArrowLeft") {
        const el = e.target;
        if (!(el && el.tagName === "INPUT" && el.value)) { e.preventDefault(); volver(); }
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [paso, elegir, volver, onClose]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (paso !== "menu") { const t = setTimeout(() => inp.current?.focus(), 80); return () => clearTimeout(t); } }, [paso]);

  /* ── segundo paso: elegir de qué exactamente ── */
  const b = busq.trim().toLowerCase();
  const paquetes  = PAQUETES.filter((p) => !b || `${p.nombre} ${p.resumen} ${p.destinos.map((d) => d.ciudad).join(" ")}`.toLowerCase().includes(b));
  const plantis   = plantillas.filter((t) => !b || `${t.nombre} ${t.destino} ${t.detalle || ""}`.toLowerCase().includes(b));
  const recis     = recientes.filter((r) => !b || `${r.num} ${r.cliente} ${r.destino}`.toLowerCase().includes(b));
  const CAB = { paquete:{ t:"Elegí el paquete", ph:`Buscá entre los ${PAQUETES.length} paquetes publicados…` },
                plantilla:{ t:"Elegí la plantilla", ph:"Buscá entre tus plantillas…" },
                reciente:{ t:"Elegí cuál duplicar", ph:"Buscá por cliente, destino o número…" } }[paso];

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(620px,100%)", padding:0, overflow:"hidden" }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          {paso !== "menu" && (
            <button className="btn btn-g btn-ico" title="Volver a los caminos (←)" onClick={volver}><ArrowLeft size={15} /></button>
          )}
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>
            {paso === "menu" ? "¿Cómo arrancamos?" : CAB.t}
          </div>
          {paso === "menu" && <span style={{ fontSize:11, color:"var(--n400)" }}>elegí con el mouse o con los números</span>}
          <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>
        </div>

        {paso === "menu" ? (
          <div style={{ padding:"15px 17px 17px" }}>
            {/* camino destacado */}
            {(() => { const C = CAMINOS[0]; return (
              <button className="cam cam-hero a-rise" onClick={() => elegir(C.k)} style={{ marginBottom:11 }}>
                <span className="kbd cam-n">{C.n}</span>
                <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                  <div className="cam-ico" style={{ marginBottom:0, width:36, height:36, borderRadius:12 }}><C.Icon size={17} /></div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span className="cam-t">{C.t}</span>
                      <ChipIA />
                    </div>
                    <div className="cam-d">{C.d}</div>
                  </div>
                </div>
              </button>
            ); })()}

            {/* los otros cuatro */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:10 }}>
              {CAMINOS.slice(1).map((C, i) => (
                <button key={C.k} className="cam a-rise" onClick={() => elegir(C.k)} style={{ animationDelay:`${(i + 1) * .04}s` }}>
                  <span className="kbd cam-n">{C.n}</span>
                  <div className="cam-ico"><C.Icon size={15} /></div>
                  <div className="cam-t">{C.t}</div>
                  <div className="cam-d">{C.d}</div>
                </button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:13, fontSize:11, color:"var(--n400)" }}>
              <span className="kbd">1</span>…<span className="kbd">5</span> para elegir
              <span style={{ opacity:.4 }}>·</span>
              <span className="kbd">esc</span> para cerrar
            </div>
          </div>
        ) : (
          <div style={{ padding:"14px 17px 17px" }}>
            <div style={{ position:"relative", marginBottom:11 }}>
              <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--n300)" }} />
              <input ref={inp} className="in" style={{ paddingLeft:34 }} value={busq}
                placeholder={CAB.ph} onChange={(e) => setBusq(e.target.value)} />
            </div>

            <div style={{ maxHeight:330, overflowY:"auto", margin:"0 -4px" }}>
              {paso === "paquete" && paquetes.map((p) => (
                <button key={p.id} className="lst-i" onClick={() => onPaquete(p)}>
                  <Foto seed={p.seed} w={46} h={34} r={9} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.nombre}</div>
                    <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {p.destinos.map((d) => `${d.ciudad} · ${d.noches}n`).join("   ·   ")}</div>
                  </div>
                  <Pill tone="violet" style={{ flexShrink:0 }}>{MESES[p.mes].slice(0,3)} {p.anio}</Pill>
                  <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                </button>
              ))}

              {paso === "plantilla" && plantis.map((t) => (
                <button key={t.id} className="lst-i" onClick={() => onPlantilla(t)}>
                  <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.1)", color:"var(--violet)" }}><Files size={14} /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{t.nombre}</div>
                    <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {t.destino} · {t.detalle}</div>
                  </div>
                  <Pill tone="teal" style={{ flexShrink:0 }}><Zap size={8} /> {t.usos ?? 0}</Pill>
                  <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                </button>
              ))}

              {paso === "reciente" && recis.map((r) => {
                const V = VENDEDORES.find((v) => v.id === r.vendedor);
                return (
                  <button key={r.num} className="lst-i" onClick={() => onFila(r)}>
                    <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:"grid", placeItems:"center",
                      background:"rgba(59,191,173,.12)", color:"var(--teal-3)" }}><Copy size={14} /></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.cliente}</div>
                      <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {r.destino}{V ? ` · ${V.nombre.split(" ")[0]}` : ""}</div>
                    </div>
                    <span className="mono" style={{ fontSize:10.5, color:"var(--n300)", flexShrink:0 }}>{r.num}</span>
                    <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                  </button>
                );
              })}

              {((paso === "paquete" && !paquetes.length) || (paso === "plantilla" && !plantis.length) || (paso === "reciente" && !recis.length)) && (
                <div style={{ padding:"22px 6px" }}>
                  <Vacio icon={Search} titulo={`Nada para “${busq.trim()}”`} accion="Probá con otra palabra, o arrancá en blanco" />
                </div>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11, color:"var(--n400)" }}>
              <span className="kbd">←</span> volver a los caminos
              <span style={{ opacity:.4 }}>·</span>
              <span className="kbd">esc</span> cerrar
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── A2 · modal "Pegá la consulta del pasajero" ──────────────────────── */
const EJEMPLOS_IA = [
  { l:"Familia a Brasil",   t:"Hola! somos 2 adultos y un nene de 8, queremos ir a Río en octubre, una semana mas o menos, algo con desayuno" },
  { l:"Pareja al Caribe",   t:"Buenas! con mi señora queremos escaparnos a Punta Cana en noviembre, all inclusive, 7 noches" },
  { l:"Grupo a Europa",     t:"Hola Agustina! te escribo por el viaje a Madrid y Barcelona de marzo que vi en la web, somos 4 adultos" },
];

function ModalIA({ onClose, onArmar }) {
  const [texto, setTexto] = useState("");
  const [fase, setFase] = useState("edit");     // edit | corriendo
  const [paso, setPaso] = useState(0);
  const [det, setDet] = useState(null);
  const ta = useRef(null);
  const armarRef = useRef(onArmar);
  useEffect(() => { armarRef.current = onArmar; });

  useEffect(() => { const t = setTimeout(() => ta.current?.focus(), 90); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && fase === "edit") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose, fase]);

  /* si la consulta no trae mes, mandan las fechas del paquete */
  const salidaMes = det?.paquete ? (det.mes != null ? det.mes : det.paquete.mes) : det?.mes;
  const salidaAnio = det?.paquete ? (det.mes != null ? det.anio : det.paquete.anio) : det?.anio;
  const pasos = det ? [
    { l:"Leyendo tu consulta…" },
    { l:`Buscando entre tus ${PAQUETES.length} paquetes publicados…` },
    det.paquete
      ? { l:`Encontré: ${det.paquete.nombre} · ${MESES[salidaMes].slice(0,3)} ${salidaAnio}` }
      : { l:"No encontré un paquete que coincida — la armo en blanco" },
    { l:"Armando el borrador…" },
  ] : [];

  const armar = () => { if (!texto.trim()) return; setDet(detectarConsulta(texto)); setPaso(0); setFase("corriendo"); };

  useEffect(() => {
    if (fase !== "corriendo" || !det) return;
    const durs = [600, 800, 620, 640];
    const ts = []; let acum = 0;
    for (let i = 1; i <= durs.length; i++) { acum += durs[i - 1]; ts.push(setTimeout(() => setPaso(i), acum)); }
    ts.push(setTimeout(() => armarRef.current(det), acum + 220));
    return () => ts.forEach(clearTimeout);
  }, [fase, det]);

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && fase === "edit" && onClose()}>
      <div className="a-zoom card" style={{ width:"min(560px,100%)", padding:0, overflow:"hidden" }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          <ChipIA />
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>
            Pegá la consulta del pasajero
          </div>
          {fase === "edit" && <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>}
        </div>

        {fase === "edit" ? (
          <div style={{ padding:"14px 17px 17px" }}>
            <textarea ref={ta} className="in" rows={6} value={texto}
              placeholder={"Pegá acá el mensaje tal cual te llegó. Por ejemplo:\n“Hola! somos 2 adultos y un nene de 8, queremos ir a Río en octubre, una semana mas o menos, algo con desayuno”"}
              onChange={(e) => setTexto(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const el = e.target;
                const t = limpiarPegado(e.clipboardData.getData("text/plain"));
                const a = el.selectionStart ?? texto.length, b = el.selectionEnd ?? texto.length;
                setTexto(texto.slice(0, a) + t + texto.slice(b));
              }} />

            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginTop:11 }}>
              <span className="lbl">Probá con un ejemplo</span>
              {EJEMPLOS_IA.map((x) => (
                <button key={x.l} className="chip" style={{ height:27, fontSize:11.5 }}
                  onClick={() => { setTexto(x.t); ta.current?.focus(); }}>
                  <MessageSquare size={11} style={{ color:"var(--violet)" }} /> {x.l}
                </button>
              ))}
            </div>

            <button className="btn btn-hero" style={{ width:"100%", height:44, borderRadius:12, fontSize:14, marginTop:14 }}
              onClick={armar} disabled={!texto.trim()}>
              <Sparkles size={16} /> Armar borrador
            </button>
            <div style={{ fontSize:11, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
              Lee el destino, el mes, cuántos viajan y cuántas noches. Después lo revisás y ajustás vos.
            </div>
          </div>
        ) : (
          <div style={{ padding:"16px 17px 18px" }}>
            {pasos.map((p, i) => (
              <div key={i} className="ia-paso" data-on={paso === i ? "1" : paso > i ? "2" : "0"}>
                <span className="ia-dot">
                  {paso > i ? <Check size={12} /> : paso === i ? <Loader2 size={12} className="spin" /> : <span style={{ width:5, height:5, borderRadius:99, background:"currentColor" }} />}
                </span>
                <span style={{ flex:1 }}>{p.l}</span>
              </div>
            ))}

            {/* mini-card del paquete encontrado */}
            {det?.paquete && paso >= 2 && (
              <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, padding:"9px 10px",
                borderRadius:13, background:"rgba(59,191,173,.06)", border:"1px solid rgba(59,191,173,.22)" }}>
                <Foto seed={det.paquete.seed} w={54} h={40} r={9} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{det.paquete.nombre}</div>
                  <div style={{ fontSize:11, color:"var(--n400)" }}>{det.paquete.resumen}</div>
                </div>
                <CheckCheck size={16} style={{ color:"var(--teal-2)", flexShrink:0 }} />
              </div>
            )}
            {det && !det.paquete && paso >= 2 && (
              <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:9, marginTop:8, padding:"9px 11px",
                borderRadius:12, background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.32)" }}>
                <AlertCircle size={14} style={{ color:"var(--ink-amber)", flexShrink:0 }} />
                <span style={{ fontSize:11.5, color:"var(--ink-amber)" }}>La armo en blanco con lo que entendí — vos la completás.</span>
              </div>
            )}

            {det?.chips?.length > 0 && (
              <div className="a-rise" style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:11 }}>
                {det.chips.map((c) => (
                  <span key={c} className="pill" data-tone="violet">{c}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PANTALLA DE INICIO
   ═══════════════════════════════════════════════════════════════════════════ */

function Inicio({ onPaquete, onBlanco, onPlantilla, onIA, onFila, toast, tab, setTab, plantillas, onCrearPlantilla, onBorrarPlantilla, onDuplicarPlantilla, actual, oscuro, onTema }) {
  const G = ["#F43E55","#785AE5"];
  const [busq, setBusq] = useState("");
  const [creando, setCreando] = useState(false);
  const [nomPl, setNomPl] = useState("");
  const [destPl, setDestPl] = useState("");
  /* v2 · caminos de entrada */
  const [modalNueva, setModalNueva] = useState(false);
  const [modalIA, setModalIA] = useState(false);
  const recientes = useMemo(() => (actual ? [actual, ...HISTORIAL] : HISTORIAL).slice(0, 5), [actual]);

  const resultados = useMemo(() => {
    const t = busq.trim().toLowerCase();
    if (!t) return PAQUETES.slice(0, 4);
    return PAQUETES.filter((p) =>
      p.nombre.toLowerCase().includes(t) ||
      p.destinos.some((d) => d.ciudad.toLowerCase().includes(t)) ||
      p.resumen.toLowerCase().includes(t)
    ).slice(0, 8);
  }, [busq]);
  const buscando = busq.trim().length > 0;

  const TABS = [
    { id:"cotizar",    l:"Cotizar y seguimiento", Icon:Ticket,      badge:148 },
    { id:"plantillas", l:"Plantillas",            Icon:Files,       badge:plantillas.length },
    { id:"analytics",  l:"Analytics",             Icon:TrendingUp,  badge:"71%" },
  ];

  return (
    <div className="home-wrap" style={{ maxWidth:1080, margin:"0 auto", padding:"28px 22px 60px" }}>

      {/* ── barra superior: identidad + acción primaria ── */}
      <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:13, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ width:40, height:40, borderRadius:13, background:`linear-gradient(87deg,${G[0]},${G[1]})`,
          display:"grid", placeItems:"center", color:"#fff", boxShadow:`0 10px 26px -8px ${G[1]}77` }}>
          <Ticket size={20} />
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:9 }}>
            <div className="disp" style={{ fontSize:24, fontWeight:600, letterSpacing:"-.025em", lineHeight:1.1 }}>Cotizador</div>
            <Wordmark size={15} />
          </div>
          <div style={{ fontSize:12, color:"var(--n400)" }}>Módulo del backend · mismo login, mismo sistema</div>
        </div>
        {/* v2D · D5 · claro / oscuro — el mismo estado en el inicio y en el editor */}
        <button className="btn btn-s btn-ico" style={{ width:40, height:40, borderRadius:12 }}
          onClick={onTema} title={oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro"}
          aria-label={oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro"}>
          {oscuro ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="btn btn-hero home-cta" onClick={() => setModalNueva(true)}
          style={{ height:46, paddingInline:22, fontSize:14, borderRadius:13 }}>
          <Plus size={17} /> Nueva cotización
        </button>
      </div>

      {/* ── card única con tabs ── */}
      <div className="card a-rise" style={{ padding:0, overflow:"visible", animationDelay:".05s" }}>

        <div className="home-tabs" style={{ display:"flex", gap:2, padding:"10px 12px 0", borderBottom:"1px solid var(--hair-soft)" }}>
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"10px 16px 12px",
                  fontSize:13, fontWeight:700, color: on ? "var(--ink)" : "var(--n400)",
                  borderBottom: on ? "2.5px solid var(--violet)" : "2.5px solid transparent",
                  marginBottom:-1, transition:"color .18s, border-color .18s" }}>
                <t.Icon size={14} style={{ color: on ? "var(--violet)" : "var(--n300)" }} />
                {t.l}
                <span className="mono" style={{ fontSize:10, padding:"2px 7px", borderRadius:99,
                  background: on ? "rgba(120,90,229,.14)" : "var(--sunk)",
                  color: on ? "var(--violet-ink)" : "var(--n400)" }}>{t.badge}</span>
              </button>
            );
          })}
        </div>

        <div className="home-pad" style={{ padding:"18px 20px 20px" }}>

          {/* ══ TAB PAQUETES ══ */}
          {tab === "cotizar" && (
            <div className="a-fade">
              <div style={{ position:"relative", marginBottom:15 }}>
                <Search size={17} style={{ position:"absolute", left:15, top:"50%", transform:"translateY(-50%)",
                  color: buscando ? "var(--violet)" : "var(--n300)", transition:"color .2s" }} />
                <input className={`in ${buscando ? "a-glow" : ""}`} value={busq}
                  style={{ height:50, paddingLeft:44, paddingRight:110, fontSize:15, borderRadius:14, fontWeight:500 }}
                  placeholder={`Buscá entre los ${PAQUETES.length} paquetes publicados… Río, Cancún, Madrid`}
                  onChange={(e) => setBusq(e.target.value)} />
                {buscando ? (
                  <button onClick={() => setBusq("")} style={{ position:"absolute", right:12, top:"50%",
                    transform:"translateY(-50%)", display:"inline-flex", alignItems:"center", gap:5,
                    padding:"5px 11px", borderRadius:9, background:"var(--sunk)", fontSize:11.5,
                    fontWeight:600, color:"var(--n500)" }}><X size={11} /> Limpiar</button>
                ) : (
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                    fontSize:11, color:"var(--n300)", display:"inline-flex", gap:5, alignItems:"center" }}>
                    instantánea <Sparkles size={11} style={{ color:"var(--violet)" }} /></span>
                )}
              </div>

              {/* ── v2 · A2 · entrada por consulta de WhatsApp ── */}
              <button className="ia-bar a-rise" style={{ marginBottom:14, animationDelay:".06s" }}
                onClick={() => setModalIA(true)}>
                <ChipIA />
                <span className="ia-bar-t">¿Te escribieron por WhatsApp? Pegá la consulta y te armo el borrador</span>
                <span className="ia-bar-b">Pegar consulta <ChevronRight size={13} /></span>
              </button>

              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
                <span className="lbl">{buscando ? `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}` : "Últimos publicados"}</span>
                <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
                <span className="hint-desk" style={{ fontSize:11, color:"var(--n300)", display:"inline-flex", alignItems:"center", gap:5 }}>
                  <Zap size={10} style={{ color:"var(--teal-2)" }} /> precarga todo: destinos, servicios, opciones, fotos</span>
              </div>

              <div key={busq} className="pq-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(226px,1fr))", gap:12 }}>
                {resultados.map((p, i) => {
                  const desde = p.opciones.length ? Math.min(...p.opciones.map((o) => venta(o.neto, o.factor))) : null;
                  return (
                  <button key={p.id} onClick={() => onPaquete(p)} className="a-pop"
                    style={{ padding:0, overflow:"hidden", textAlign:"left", animationDelay:`${i * .05}s`,
                      background:"var(--card)", border:"1px solid var(--hair-soft)", borderRadius:16,
                      boxShadow:"0 1px 2px rgba(26,26,46,.04)",
                      transition:"transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px) scale(1.008)";
                      e.currentTarget.style.boxShadow = "0 20px 44px -18px rgba(26,26,46,.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 2px rgba(26,26,46,.04)"; }}>
                    <Foto seed={p.seed} w="100%" h={96} r={0}>
                      <div style={{ position:"absolute", left:12, bottom:9, right:12, color:"#fff" }}>
                        <div style={{ fontSize:13.5, fontWeight:700, letterSpacing:"-.015em", textShadow:"0 1px 8px rgba(0,0,0,.45)" }}>{p.nombre}</div>
                      </div>
                      <div style={{ position:"absolute", right:9, top:9 }}>
                        {/* va sobre la foto: queda claro siempre, en los dos temas */}
                        <Pill style={{ background:"rgba(255,255,255,.93)", color:"#1A1A2E" }}>{MESES[p.mes].slice(0,3)} {p.anio}</Pill>
                      </div>
                    </Foto>
                    <div style={{ padding:"10px 12px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginBottom:9 }}>
                        {p.destinos.map((d) => (
                          <span key={d.ciudad} className="pill" data-tone="violet">
                            {d.ciudad} · {d.noches}n</span>
                        ))}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--teal-3)", display:"inline-flex",
                          alignItems:"center", gap:5 }}>Armar cotización <ChevronRight size={13} /></span>
                        {desde && <span className="mono" style={{ marginLeft:"auto", fontSize:10.5, color:"var(--n400)" }}>
                          desde {money(desde)}</span>}
                      </div>
                    </div>
                  </button>
                  );
                })}
                {buscando && resultados.length === 0 && (
                  <div className="a-fade pq-vacio" style={{ gridColumn:"1/-1", textAlign:"center", padding:"26px 0" }}>
                    <Search size={20} style={{ color:"var(--n300)", marginBottom:8 }} />
                    <div style={{ fontSize:13.5, fontWeight:600, color:"var(--n600)" }}>No hay paquetes para “{busq.trim()}”</div>
                    <div style={{ fontSize:12, color:"var(--n400)", margin:"4px 0 12px" }}>Se puede cotizar igual, arrancando de cero.</div>
                    <Btn variant="p" size="sm" onClick={onBlanco}><Plus size={12} /> Cotizar “{busq.trim()}” en blanco</Btn>
                  </div>
                )}
              </div>

              {/* ── seguimiento debajo, sin espacio muerto ── */}
              <div style={{ display:"flex", alignItems:"center", gap:9, margin:"22px 0 12px" }}>
                <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.11)", color:"var(--violet)" }}><ListChecks size={13} /></div>
                <span style={{ fontSize:13, fontWeight:800, letterSpacing:"-.01em" }}>Seguimiento de cotizaciones</span>
                <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
                <span className="hint-desk" style={{ fontSize:11, color:"var(--n300)" }}>búsqueda instantánea por cualquier campo</span>
              </div>
              <ListadoContenido actual={actual} toast={toast} onDuplicar={onFila} />
            </div>
          )}

          {/* ══ TAB ANALYTICS ══ */}
          {tab === "analytics" && <TabAnalytics />}

          {/* ══ TAB PLANTILLAS ══ */}
          {tab === "plantillas" && (
            <div className="a-fade">
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                <p style={{ fontSize:12.5, color:"var(--n400)", margin:0, flex:1 }}>
                  Lo repetitivo ya viene cargado. También podés guardar cualquier cotización como plantilla desde el editor.
                </p>
                <Btn variant="p" size="sm" onClick={() => setCreando((v) => !v)}>
                  {creando ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Nueva plantilla</>}
                </Btn>
              </div>

              {creando && (
                <div className="a-slide" style={{ display:"flex", gap:7, marginBottom:12, padding:"11px",
                  background:"rgba(120,90,229,.05)", border:"1px solid rgba(120,90,229,.16)", borderRadius:12 }}>
                  <input className="in" style={{ flex:"1.4 1 0" }} value={nomPl} placeholder="Nombre de la plantilla…" autoFocus
                    onChange={(e) => setNomPl(e.target.value)} />
                  <input className="in" style={{ flex:"1 1 0" }} value={destPl} placeholder="Destino…"
                    onChange={(e) => setDestPl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && nomPl.trim()) {
                      onCrearPlantilla(nomPl.trim(), destPl.trim() || "General"); setNomPl(""); setDestPl(""); setCreando(false); } }} />
                  <Btn variant="p" disabled={!nomPl.trim()}
                    onClick={() => { onCrearPlantilla(nomPl.trim(), destPl.trim() || "General"); setNomPl(""); setDestPl(""); setCreando(false); }}>
                    <Check size={14} /> Crear</Btn>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:9 }}>
                {plantillas.map((t, i) => (
                  <div key={t.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 12px",
                    borderRadius:13, border:"1px solid var(--hair-soft)", background:"var(--card-3)",
                    animationDelay:`${i * .04}s`, transition:"border-color .16s, box-shadow .16s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(120,90,229,.3)";
                      e.currentTarget.style.boxShadow = "0 8px 20px -10px rgba(26,26,46,.14)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ width:34, height:34, borderRadius:11, display:"grid", placeItems:"center", flexShrink:0,
                      background:"rgba(120,90,229,.1)", color:"var(--violet)" }}><Files size={15} /></div>
                    <button onClick={() => onPlantilla(t)} style={{ flex:1, minWidth:0, textAlign:"left" }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{t.nombre}</div>
                      <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {t.destino} · {t.detalle}</div>
                      <div style={{ display:"flex", gap:6, marginTop:5 }}>
                        <span className="pill" data-tone="teal"><Zap size={8} /> usada {t.usos ?? 0} veces</span>
                        <span className="pill" data-tone="n">{t.ultimo || "sin usar"}</span>
                      </div>
                    </button>
                    <Btn variant="p" size="xs" onClick={() => onPlantilla(t)}>Usar</Btn>
                    <button className="btn btn-g btn-ico" style={{ width:27, height:27, flexShrink:0 }} title="Duplicar plantilla"
                      onClick={() => onDuplicarPlantilla(t)}><Copy size={12} /></button>
                    <button className="btn btn-g btn-ico" style={{ width:27, height:27, flexShrink:0 }} title="Eliminar"
                      onClick={() => onBorrarPlantilla(t)}><Trash2 size={13} /></button>
                  </div>
                ))}
                {plantillas.length === 0 && (
                  <div style={{ gridColumn:"1/-1" }}>
                    <Vacio icon={Files} titulo="Sin plantillas todavía" accion="Creá la primera, o guardá una cotización como plantilla desde el editor" />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="a-rise" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:22,
        fontSize:11.5, color:"var(--n400)", animationDelay:".15s" }}>
        <Command size={12} /> <span className="kbd">⌘</span><span className="kbd">K</span> paleta de comandos
        <span style={{ opacity:.4 }}>·</span>
        <span className="kbd">⌘</span><span className="kbd">↵</span> compartir desde el editor
      </div>

      {/* ── v2 · A1 y A2 · de dónde sale una cotización nueva ── */}
      {modalNueva && (
        <ModalNueva
          plantillas={plantillas} recientes={recientes}
          onClose={() => setModalNueva(false)}
          onBlanco={() => { setModalNueva(false); onBlanco(); }}
          onPaquete={(p) => { setModalNueva(false); onPaquete(p); }}
          onPlantilla={(t) => { setModalNueva(false); onPlantilla(t); }}
          onFila={(r) => { setModalNueva(false); onFila(r); }}
          onIA={() => { setModalNueva(false); setModalIA(true); }} />
      )}
      {modalIA && (
        <ModalIA onClose={() => setModalIA(false)}
          onArmar={(det) => { setModalIA(false); onIA(det); }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LISTADO
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── v2 · A3 · cola de trabajo del día ───────────────────────────────── */
function ColaParaHoy({ items, onReactivar, onRecordatorio, onSeguimiento, onAbrir }) {
  const [abierta, setAbierta] = useState(true);
  const hay = items.length > 0;
  return (
    <div style={{ marginBottom:15 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom: abierta ? 10 : 0 }}>
        <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
          background: hay ? "rgba(244,62,85,.1)" : "rgba(59,191,173,.13)",
          color: hay ? "var(--coral)" : "var(--teal-3)" }}><ListChecks size={13} /></div>
        <span style={{ fontSize:13, fontWeight:800, letterSpacing:"-.01em" }}>Para hoy</span>
        <Pill tone={hay ? "coral" : "teal"}>{items.length}</Pill>
        <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
        <span className="hint-desk" style={{ fontSize:11, color:"var(--n300)" }}>lo que conviene mover antes de que se enfríe</span>
        <button className="btn btn-g btn-ico" style={{ width:27, height:27 }}
          title={abierta ? "Ocultar la lista" : "Mostrar la lista"} onClick={() => setAbierta((v) => !v)}>
          <ChevronDown size={14} style={{ transform: abierta ? "none" : "rotate(-90deg)", transition:"transform .2s" }} />
        </button>
      </div>

      {abierta && (hay ? (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {items.map((it, i) => (
            <div key={it.r.num} className="cola-i a-rise" style={{ animationDelay:`${i * .04}s` }}>
              <span className="sem-dot" style={{ background:it.c, flexShrink:0 }} />
              <button onClick={() => onAbrir(it.r)} title="Ver el detalle de esta cotización"
                style={{ flex:1, minWidth:0, textAlign:"left", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:12.5, fontWeight:700 }}>{it.r.cliente}</span>
                <span style={{ fontSize:11.5, color:"var(--n400)" }}>{it.r.destino}</span>
                <Pill tone={it.tone}>{it.motivo}</Pill>
              </button>

              {it.tipo === "vencida" && (
                <Btn size="xs" className="cola-acc" style={{ flexShrink:0, color:"var(--teal-3)", background:"rgba(59,191,173,.09)",
                  borderColor:"rgba(59,191,173,.4)", fontWeight:700 }}
                  onClick={() => onReactivar(it.r)}><RefreshCw size={11} /> Reactivar</Btn>
              )}
              {it.tipo === "recordatorio" && (
                <Btn size="xs" className="cola-acc" style={{ flexShrink:0 }} onClick={() => onRecordatorio(it.r)}>
                  <Send size={11} /> Mandar recordatorio</Btn>
              )}
              {it.tipo === "seguimiento" && (
                <Btn size="xs" className="cola-acc" style={{ flexShrink:0 }} onClick={() => onSeguimiento(it.r)}>
                  <Smartphone size={11} /> Hacer seguimiento</Btn>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="a-fade" style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 13px", borderRadius:13,
          background:"rgba(59,191,173,.07)", border:"1px solid rgba(59,191,173,.22)" }}>
          <CheckCheck size={16} style={{ color:"var(--teal-2)", flexShrink:0 }} />
          <span style={{ fontSize:12.5, fontWeight:700, color:"var(--teal-3)" }}>Nada urgente por hoy ✓</span>
          <span style={{ fontSize:11.5, color:"var(--n400)" }}>Todas las cotizaciones están al día.</span>
        </div>
      ))}
    </div>
  );
}

function ListadoContenido({ actual, toast, onDuplicar }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [vendedor, setVendedor] = useState("todos");
  const [selNum, setSelNum] = useState(null);  // fila abierta en el drawer
  const [ov, setOv] = useState({});            // confirmaciones hechas en esta sesión
  const [ovEst, setOvEst] = useState({});      // estados pisados a mano por el vendedor
  const [ovReact, setOvReact] = useState({});  // v2 · reactivadas: link nuevo por 48 h
  const [hechos, setHechos] = useState({});    // v2 · lo ya resuelto en la cola de hoy
  const [ovHist, setOvHist] = useState({});    // v2D · lo hecho desde el drawer, anotado en la historia

  const base = useMemo(() => (actual ? [actual, ...HISTORIAL] : HISTORIAL)
    .map((r) => ov[r.num] ? { ...r, estado:"confirmada", confOpcion:ov[r.num].op, confVia:ov[r.num].via } : r)
    .map((r) => ovReact[r.num] ? { ...r, ...ovReact[r.num] } : r)
    .map((r) => ovHist[r.num] ? { ...r, hist:ovHist[r.num] } : r)
    .map((r) => ({ ...r, estadoManual: ovEst[r.num] || null, estado: estadoEfectivo({ ...r, estadoManual: ovEst[r.num] || null }) })),
    [actual, ov, ovEst, ovReact, ovHist]);
  const sel = base.find((r) => r.num === selNum) || null;

  /* ── v2 · A5 · reactivar: link nuevo por 48 h, semáforo de vuelta en verde ── */
  const reactivar = useCallback((r) => {
    const antes = ovEst[r.num] || null;
    setOvReact((o) => ({ ...o, [r.num]:{ estado:"enviada", hEnvio:0, aperturas:0, apDet:[], hasta:null, lectura:null, hastaSec:null } }));
    setOvEst((o) => ({ ...o, [r.num]:null }));
    toast?.({ msg:"Reactivada con link nuevo por 48 h ✓", tone:"ok",
      undo:() => { setOvReact((o) => { const c = { ...o }; delete c[r.num]; return c; });
                   setOvEst((o) => ({ ...o, [r.num]:antes })); } });
  }, [ovEst, toast]);

  /* ── v2D · D3 · anotar en la historia de la fila lo que se hace desde el drawer ── */
  const anotar = useCallback((num, ev) => {
    setOvHist((h) => ({ ...h, [num]:[...(h[num] || []), ev] }));
  }, []);

  /* +48 h: el link vuelve a arrancar (hEnvio a 0) y deja de estar vencido */
  const extenderVigencia = useCallback((r) => {
    const antesReact = ovReact[r.num];
    const antesEst = ovEst[r.num] || null;
    const ev = { c:"#785AE5", t:"Vigencia extendida 48 h", s:"recién · el link vuelve a estar activo" };
    setOvReact((o) => ({ ...o, [r.num]:{ ...(o[r.num] || {}), hEnvio:0 } }));
    if (antesEst === "vencida") setOvEst((o) => ({ ...o, [r.num]:null }));
    anotar(r.num, ev);
    toast?.({ msg:"Vigencia extendida — el link vuelve a estar activo 48 h", tone:"ok",
      undo:() => {
        setOvReact((o) => { const c = { ...o }; if (antesReact) c[r.num] = antesReact; else delete c[r.num]; return c; });
        setOvEst((o) => ({ ...o, [r.num]:antesEst }));
        setOvHist((h) => ({ ...h, [r.num]:(h[r.num] || []).filter((x) => x !== ev) }));
      } });
  }, [ovReact, ovEst, anotar, toast]);

  /* el recordatorio sale por el mismo modal de Compartir: acá solo queda el rastro */
  const recordatorioDrawer = useCallback((r) => {
    anotar(r.num, { c:"#785AE5", t:"Recordatorio enviado", s:"recién · WhatsApp" });
  }, [anotar]);

  const marcarHecho = useCallback((r, motivo, msg) => {
    setHechos((h) => ({ ...h, [r.num]:motivo }));
    toast?.({ msg, tone:"ok",
      undo:() => setHechos((h) => { const c = { ...h }; delete c[r.num]; return c; }) });
  }, [toast]);

  const recordatorio = useCallback((r) => marcarHecho(r, "recordatorio", "Recordatorio listo en WhatsApp ✓"), [marcarHecho]);
  const seguimiento  = useCallback((r) => marcarHecho(r, "seguimiento", `Seguimiento anotado — llamá a ${String(r.cliente).split(" ")[0]} hoy ✓`), [marcarHecho]);
  const copiarLink   = useCallback(() => toast?.({ msg:"Link copiado ✓", tone:"ok" }), [toast]);
  const porWhatsapp  = useCallback((r) => toast?.({ msg:`Mensaje listo en WhatsApp para ${String(r.cliente).split(" ")[0]} ✓`, tone:"ok" }), [toast]);

  /* ── v2 · A3 · qué entra en la cola de hoy y por qué ── */
  const cola = useMemo(() => base.map((r) => {
    if (hechos[r.num]) return null;
    if (r.estado === "vencida") {
      const venc = r.hEnvio != null ? r.hEnvio - 48 : null;
      const motivo = venc == null ? "El link ya no está vigente"
        : venc < 24 ? "El link venció hoy"
        : venc < 48 ? "El link venció ayer"
        : `El link venció hace ${Math.round(venc / 24)} días`;
      return { r, tipo:"vencida", c:"#F43E55", tone:"coral", motivo };
    }
    if (r.estado === "enviada" && r.aperturas === 0 && r.hEnvio != null && r.hEnvio >= 24) {
      const d = Math.max(1, Math.round(r.hEnvio / 24));
      return { r, tipo:"recordatorio", c:"#E8A13C", tone:"amber",
        motivo:`Hace ${d} ${d === 1 ? "día" : "días"} que no la abre` };
    }
    if (r.estado === "abierta" && r.aperturas > 0) {
      return { r, tipo:"seguimiento", c:"#2A9E8E", tone:"teal",
        motivo:`La abrió ${r.aperturas === 1 ? "una vez" : `${r.aperturas} veces`} — buen momento para llamar` };
    }
    return null;
  }).filter(Boolean), [base, hechos]);

  /* búsqueda instantánea por CUALQUIER campo */
  const filas = useMemo(() => {
    return base.filter((r) => {
      if (filtro !== "todas" && r.estado !== filtro) return false;
      if (vendedor !== "todos" && r.vendedor !== vendedor) return false;
      if (!q.trim()) return true;
      const V = VENDEDORES.find((v) => v.id === r.vendedor);
      const pajar = [r.num, r.cliente, r.destino, V?.nombre, ESTADOS[r.estado]?.l, String(r.monto), semaforo(r).l]
        .filter(Boolean).join(" ").toLowerCase();
      return q.toLowerCase().split(/\s+/).every((t) => pajar.includes(t));
    });
  }, [q, filtro, vendedor, base]);

  const porVendedor = useMemo(() => VENDEDORES.map((v) => {
    const r = base.filter((x) => x.vendedor === v.id);
    return { ...v, n:r.length, monto:r.reduce((a, x) => a + x.monto, 0),
      abiertas:r.filter((x) => x.aperturas > 0).length };
  }).filter((v) => v.n > 0), [base]);

  useEffect(() => {
    if (!sel) return;
    const k = (e) => e.key === "Escape" && setSelNum(null);
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [sel]);

  return (
    <div className="a-fade">

      {/* v2 · A3 · la cola del día, antes que cualquier número */}
      <ColaParaHoy items={cola} onReactivar={reactivar} onRecordatorio={recordatorio}
        onSeguimiento={seguimiento} onAbrir={(r) => setSelNum(r.num)} />

      {/* reportes por vendedor */}
      <div className="vend-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:10, marginBottom:14 }}>
        {porVendedor.map((v, i) => (
          <div key={v.id} className="card a-rise" style={{ padding:12, animationDelay:`${i * .04}s` }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(145deg,#A05ED3,#785AE5)",
                color:"#fff", display:"grid", placeItems:"center", fontSize:10.5, fontWeight:700 }}>{v.inicial}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.nombre}</div>
                <div style={{ fontSize:10.5, color:"var(--n400)" }}>{v.n} cotizaciones</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:7 }}>
              <span className="mono" style={{ fontSize:14.5, fontWeight:600 }}>{money(v.monto)}</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10.5, color:"var(--teal-3)" }}>
                <TrendingUp size={10} /> {v.abiertas} abiertas</span>
            </div>
          </div>
        ))}
      </div>

      {/* buscador total + filtros */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12, alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 240px" }}>
          <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
            color: q ? "var(--violet)" : "var(--n300)" }} />
          <input className={`in ${q ? "a-glow" : ""}`} style={{ paddingLeft:32 }} value={q}
            placeholder="Buscar por cualquier campo: cliente, destino, vendedor, número, estado, monto…"
            onChange={(e) => setQ(e.target.value)} />
        </div>
        {["todas", ...Object.keys(ESTADOS)].map((k) => (
          <button key={k} className={`chip ${filtro === k ? "chip-on" : ""}`} onClick={() => setFiltro(k)}>
            {k === "todas" ? "Todas" : ESTADOS[k].l}
          </button>
        ))}
        <select className="in" style={{ width:160 }} value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
          <option value="todos">Todos los vendedores</option>
          {VENDEDORES.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </div>

      {/* tabla — la fila entera abre el drawer */}
      <div className="card" style={{ overflow:"visible" }}>
        <div className="tabla-head" style={{ display:"flex", alignItems:"center", gap:11, padding:"9px 14px",
          borderBottom:"1px solid var(--hair-soft)", background:"var(--card-2)", borderRadius:"16px 16px 0 0" }}>
          <span className="lbl" style={{ width:110, flexShrink:0 }}>Nº</span>
          <span className="lbl" style={{ flex:"1 1 150px" }}>Cliente y destino</span>
          <span className="lbl" style={{ width:110, flexShrink:0 }}>Vendedor</span>
          <span className="lbl" style={{ width:92, flexShrink:0, textAlign:"right" }}>Monto</span>
          <span className="lbl" style={{ width:128, flexShrink:0, textAlign:"right" }}>Estado</span>
          <span className="sem lbl" style={{ width:26, flexShrink:0, justifyContent:"center", cursor:"help" }}>
            Seg.
            <div className="tip"><b>Semáforo de seguimiento</b>
              Verde: abierta o confirmada. Teal: enviada hace menos de 24 h. Ámbar: +24 h sin abrir. Rojo: +48 h sin abrir — el link venció.</div>
          </span>
          <span className="lbl" style={{ width:52, flexShrink:0, textAlign:"right" }}>Creada</span>
          <span style={{ width:13, flexShrink:0 }} />
        </div>
        {filas.map((r, i) => {
          const E = ESTADOS[r.estado]; const V = VENDEDORES.find((v) => v.id === r.vendedor);
          const S = semaforo(r);
          return (
            <div key={r.num + q} role="button" tabIndex={0} onClick={() => setSelNum(r.num)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelNum(r.num); } }}
              className="a-rise fila-seg"
              style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 14px", width:"100%", textAlign:"left",
                borderBottom: i < filas.length - 1 ? "1px solid var(--hair-soft)" : "none",
                animationDelay:`${i * .03}s`, transition:"background .14s", borderRadius: i === 0 ? "16px 16px 0 0" : 0 }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(120,90,229,.035)"}
              onMouseLeave={(e) => e.currentTarget.style.background = ""}>
              <div className="mono fs-num" style={{ fontSize:11, color:"var(--n400)", width:110, flexShrink:0 }}>{r.num}</div>
              <div className="fs-cli" style={{ flex:"1 1 150px", minWidth:0 }}>
                <div className="fs-cli-n" style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.cliente}</div>
                <div className="fs-cli-d" style={{ fontSize:11.5, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.destino}</div>
              </div>
              <div className="fs-vend" style={{ display:"flex", alignItems:"center", gap:6, width:110, flexShrink:0 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(120,90,229,.16)", color:"var(--violet-ink)",
                  display:"grid", placeItems:"center", fontSize:9.5, fontWeight:700, flexShrink:0 }}>{V?.inicial}</div>
                <span style={{ fontSize:11.5, color:"var(--n500)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {V?.nombre.split(" ")[0]}</span>
              </div>
              <div style={{ width:92, flexShrink:0, textAlign:"right" }} className="mono fs-monto">
                {r.monto ? money(r.monto) : <span style={{ color:"var(--n300)" }}>—</span>}
              </div>
              <div className="fs-estado" style={{ width:128, flexShrink:0, display:"flex", justifyContent:"flex-end" }}>
                <Pill tone={E.tone} style={{ flexShrink:0 }}><E.Icon size={9} /> {E.l}
                  {r.aperturas > 0 && <span className="mono" style={{ opacity:.7 }}>·{r.aperturas}</span>}
                </Pill>
              </div>
              {/* semáforo con tooltip — en mobile el tooltip no sirve, así que se ve el texto */}
              <div className="sem fs-sem" style={{ width:26, flexShrink:0, justifyContent:"center" }}
                onClick={(e) => e.stopPropagation()}>
                <span className="sem-dot" style={{ background:S.c }} />
                <span className="sem-txt">{S.l}</span>
                <div className="tip"><b style={{ color:S.c }}>{S.l}</b>{S.d}</div>
              </div>
              <div className="fs-dias" style={{ width:52, flexShrink:0, fontSize:11, color:"var(--n300)", textAlign:"right" }}>
                {r.dias === 0 ? "hoy" : `hace ${r.dias}d`}
              </div>
              <ChevronRight className="fs-chev" size={13} style={{ color:"var(--n300)", flexShrink:0 }} />

              {/* v2 · A4 y A5 · lo más usado, sin abrir la cotización */}
              <div className="fila-acc" onClick={(e) => e.stopPropagation()}>
                {r.estado === "vencida" && (
                  <Btn size="xs" title="Generar un link nuevo y volver a dejarla vigente 48 h"
                    style={{ color:"var(--teal-3)", background:"rgba(59,191,173,.09)",
                      borderColor:"rgba(59,191,173,.4)", fontWeight:700 }}
                    onClick={(e) => { e.stopPropagation(); reactivar(r); }}>
                    <RefreshCw size={11} /> Reactivar
                  </Btn>
                )}
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Copiar link"
                  onClick={(e) => { e.stopPropagation(); copiarLink(r); }}><Link2 size={12} /></button>
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Mandar por WhatsApp"
                  onClick={(e) => { e.stopPropagation(); porWhatsapp(r); }}><Send size={12} /></button>
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Duplicar"
                  onClick={(e) => { e.stopPropagation(); onDuplicar?.(r); }}><Files size={12} /></button>
              </div>
            </div>
          );
        })}
        {!filas.length && <div style={{ padding:30, textAlign:"center", color:"var(--n400)", fontSize:13 }}>
          No hay cotizaciones con esos filtros.</div>}
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:9, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Eye size={11} /> Clic en una fila para ver sus analytics</span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
          <span className="sem-dot" style={{ background:"#2A9E8E", width:8, height:8 }} /> abierta
          <span className="sem-dot" style={{ background:"#45D4C0", width:8, height:8, marginLeft:7 }} /> en ventana
          <span className="sem-dot" style={{ background:"#E8A13C", width:8, height:8, marginLeft:7 }} /> +24 h sin abrir
          <span className="sem-dot" style={{ background:"#F43E55", width:8, height:8, marginLeft:7 }} /> +48 h sin abrir
        </span>
      </div>

      {sel && <DrawerAnalytics r={sel} onClose={() => setSelNum(null)} toast={toast}
        onConfirmar={(num, op, via) => setOv((o) => ({ ...o, [num]:{ op, via } }))}
        onEstado={(num, est) => setOvEst((o) => ({ ...o, [num]: est }))}
        onExtender={extenderVigencia} onRecordatorio={recordatorioDrawer} />}
    </div>
  );
}

/* ── Tab Analytics — métricas del flujo comercial ──────────────────────── */
function BarraH({ label, pct, right, color = "linear-gradient(90deg,#45D4C0,#2A9E8E)" }) {
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>
        <span className="mono" style={{ fontSize:11, color:"var(--n500)" }}>{right}</span>
      </div>
      <div style={{ height:7, borderRadius:99, background:"var(--sunk)", overflow:"hidden" }}>
        <div className="a-fade" style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:color, transition:"width .7s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
    </div>
  );
}

function TabAnalytics() {
  const KPIS = [
    { l:"Enviadas este mes", v:"126", d:"+18% vs julio", up:true },
    { l:"Tasa de apertura", v:"71%", d:"89 de 126 abiertas", up:true },
    { l:"Tasa de confirmación", v:"24%", d:"30 confirmadas", up:true },
    { l:"1ª apertura (mediana)", v:"3 h 40 m", d:"desde el envío", up:null },
    { l:"Armado promedio", v:"3 m 05 s", d:"por cotización", up:null },
  ];
  const FUNNEL = [
    { l:"Creadas", n:148, c:"#B0B4CD" }, { l:"Enviadas", n:126, c:"#785AE5" },
    { l:"Abiertas", n:89, c:"#45D4C0" }, { l:"Confirmadas", n:30, c:"#2A9E8E" },
  ];
  const VEND = [
    { n:"Agustina Vera", env:41, ap:78, conf:29, monto:71200 },
    { n:"Amparo Núñez", env:35, ap:74, conf:26, monto:58900 },
    { n:"Federico Vila", env:31, ap:68, conf:22, monto:49800 },
    { n:"Gerónimo Silva", env:19, ap:58, conf:16, monto:34400 },
  ];
  const HORAS = [2,3,4,6,9,11,10,8,7,9,12,16,22,26,31,24,14,6];  // 8..23 hs aprox
  const maxH = Math.max(...HORAS);
  const DEST = [
    { l:"Punta Cana", env:31, conf:9 }, { l:"Río de Janeiro", env:27, conf:8 },
    { l:"Madrid", env:19, conf:4 }, { l:"Florianópolis", env:16, conf:5 }, { l:"Cancún", env:12, conf:2 },
  ];
  return (
    <div className="a-fade">
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(168px,1fr))", gap:10, marginBottom:16 }}>
        {KPIS.map((k, i) => (
          <div key={k.l} className="card a-rise" style={{ padding:"12px 13px", animationDelay:`${i * .04}s` }}>
            <div className="lbl" style={{ marginBottom:5 }}>{k.l}</div>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-.025em", lineHeight:1.1 }}>{k.v}</div>
            <div style={{ fontSize:10.5, marginTop:3, color: k.up ? "var(--teal-3)" : "var(--n400)",
              display:"flex", alignItems:"center", gap:4 }}>
              {k.up && <TrendingUp size={10} />}{k.d}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12 }}>
        {/* embudo */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Embudo del mes</div>
          {FUNNEL.map((f) => (
            <BarraH key={f.l} label={f.l} right={`${f.n} · ${Math.round((f.n / FUNNEL[0].n) * 100)}%`}
              pct={(f.n / FUNNEL[0].n) * 100} color={f.c} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4, lineHeight:1.5 }}>
            De cada 5 cotizaciones enviadas, 3,5 se abren y 1,2 se confirma.
          </div>
        </div>

        {/* por vendedor */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Apertura por vendedor</div>
          {VEND.map((v) => (
            <BarraH key={v.n} label={v.n} right={`${v.ap}% · ${v.env} env · ${money(v.monto)}`}
              pct={v.ap} color={v.ap >= 70 ? "linear-gradient(90deg,#45D4C0,#2A9E8E)" : v.ap >= 60 ? "#E8A13C" : "#F43E55"} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4 }}>
            Ámbar por debajo de 70%: revisar el mensaje de envío con ese vendedor.
          </div>
        </div>

        {/* mejor hora */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Aperturas por hora de envío</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:74 }}>
            {HORAS.map((h, i) => {
              const pico = h >= 22;
              return (
                <div key={i} className="sem" style={{ flex:1, height:"100%", alignItems:"flex-end" }}>
                  <div style={{ width:"100%", height:`${(h / maxH) * 100}%`, borderRadius:"4px 4px 0 0",
                    background: pico ? "linear-gradient(180deg,#A05ED3,#785AE5)" : "var(--sunk-2)",
                    transition:"height .5s" }} />
                  <div className="tip"><b>{6 + i}:00 h</b>{h} aperturas atribuidas a envíos de esta hora.</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9.5, color:"var(--n300)", marginTop:4 }}>
            <span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span>
          </div>
          <div style={{ fontSize:11, color:"var(--violet)", marginTop:8, fontWeight:600, display:"flex", gap:5, alignItems:"center" }}>
            <Sparkles size={11} /> Los envíos de 19 a 21 h se abren el doble: agendar los pendientes para esa franja.
          </div>
        </div>

        {/* destinos */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Destinos: cotizado vs confirmado</div>
          {DEST.map((d) => (
            <BarraH key={d.l} label={d.l} right={`${d.env} cot · ${d.conf} conf (${Math.round((d.conf / d.env) * 100)}%)`}
              pct={(d.env / DEST[0].env) * 100}
              color={d.conf / d.env >= 0.28 ? "linear-gradient(90deg,#45D4C0,#2A9E8E)" : "linear-gradient(90deg,#A05ED3,#785AE5)"} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4, lineHeight:1.5 }}>
            Madrid y Cancún cierran por debajo del promedio: revisar precios de las opciones o la vigencia del link.
          </div>
        </div>

        {/* canal y dispositivo */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Cómo la reciben y la leen</div>
          <BarraH label="WhatsApp" right="82%" pct={82} color="linear-gradient(90deg,#45D4C0,#2A9E8E)" />
          <BarraH label="Email" right="18%" pct={18} color="var(--sunk-2)" />
          <div className="hairline" style={{ margin:"10px 0" }} />
          <BarraH label="iPhone" right="54%" pct={54} color="linear-gradient(90deg,#A05ED3,#785AE5)" />
          <BarraH label="Android" right="31%" pct={31} color="linear-gradient(90deg,#A05ED3,#785AE5)" />
          <BarraH label="Computadora" right="15%" pct={15} color="var(--sunk-2)" />
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4 }}>
            85% se lee en celular: la salida mobile-first no es opcional.
          </div>
        </div>

        {/* insights accionables */}
        <div className="card" style={{ padding:16, background:"linear-gradient(160deg,var(--card),var(--card-2))" }}>
          <div className="lbl" style={{ marginBottom:10 }}>Para accionar esta semana</div>
          {["7 cotizaciones en rojo (+48 h sin abrir): mandar recordatorio hoy — el drawer lo hace en dos clics.",
            "Gerónimo tiene 58% de apertura vs 74% del equipo: comparar el texto del mensaje de WhatsApp.",
            "Las que incluyen fotos de hotel se abren 1,4× más que las de texto libre: priorizar hoteles del catálogo."].map((t, i) => (
            <div key={i} style={{ display:"flex", gap:9, marginBottom:9, alignItems:"flex-start" }}>
              <span style={{ width:18, height:18, borderRadius:6, flexShrink:0, display:"grid", placeItems:"center",
                background:"rgba(120,90,229,.12)", color:"var(--violet)", fontSize:10, fontWeight:800 }}>{i + 1}</span>
              <span style={{ fontSize:12, lineHeight:1.55, color:"var(--n600)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export {
  ModalNueva, EJEMPLOS_IA, ModalIA, Inicio, ColaParaHoy, ListadoContenido, BarraH, TabAnalytics,
};
