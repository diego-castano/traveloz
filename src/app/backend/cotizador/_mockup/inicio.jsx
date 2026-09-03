"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Sparkles, MessageSquare, FileText, Copy, Trash2, Plus, Check, ChevronDown, ChevronRight, Search,
  Send, Eye, ArrowLeft, Command, Zap, X, Smartphone, Loader2, CheckCheck,
  RefreshCw, PenLine, TrendingUp, Ticket, Files, ListChecks, Plane, Settings
} from "lucide-react";
import Link from "next/link";
import {
  MESES, semaforo, horasHabilesDesdeEnvio, bucketSemaforo,
  money, venta, limpiarPegado, detectarConsulta,
  ESTADOS, estadoEfectivo, norm
} from "./data";
import { useCtz, useCatalogo, buscarVendedor } from "./contexto";
import { Foto, Btn, Pill, ChipIA, Vacio, SelectBuscable } from "./ui";
import { MisLinks } from "./mis-links";
import { DrawerAnalytics } from "./drawer";
import { TabAnalytics as TabAnalyticsAdmin } from "./analytics";
import { fmtDuracion, fmtLectura } from "./adaptadores";
import { SECCIONES } from "@/lib/presupuesto/secciones";
import { partirDestinoPeriodo } from "@/lib/presupuesto/destino";
import {
  setEstadoManual, setNotasInternas, registrarConfirmacion, reactivarPresupuesto,
  extenderVigencia as extenderVigenciaAction, eliminarPresupuesto,
} from "@/actions/presupuesto.actions";

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS COMPARTIDOS — usados tanto en el tab Cotizar como en Seguimiento
   ═══════════════════════════════════════════════════════════════════════════ */

/* v2F · qué entra en la cola de hoy y por qué — misma regla en todos lados.
   El vencimiento sale de `expiraAt`, que es lo que guardó el server al marcar
   la cotización como enviada, y las horas se cuentan HÁBILES: el sábado y el
   domingo no corren ni para la vigencia ni para el "+24 h sin abrir". Sin eso
   la cola del lunes amanecía llena de recordatorios de un envío del viernes a
   la tarde que nadie tuvo tiempo de mirar. */
function calcularCola(base, hechos = {}) {
  return base.map((r) => {
    if (hechos[r.id]) return null;
    if (r.estado === "vencida") {
      /* cuánto hace que venció va en horas de calendario: "venció ayer" tiene
         que seguir diciendo ayer aunque ayer haya sido domingo */
      const t = r.expiraAt ? new Date(r.expiraAt).getTime() : NaN;
      const venc = Number.isFinite(t) ? (Date.now() - t) / 3600000 : null;
      const motivo = venc == null ? "El link ya no está vigente"
        : venc < 24 ? "El link venció hoy"
        : venc < 48 ? "El link venció ayer"
        : `El link venció hace ${Math.round(venc / 24)} días`;
      return { r, tipo:"vencida", c:"#F43E55", tone:"coral", motivo };
    }
    const habiles = horasHabilesDesdeEnvio(r);
    if (r.estado === "enviada" && r.aperturas === 0 && habiles != null && habiles >= 24) {
      const d = Math.max(1, Math.round(habiles / 24));
      return { r, tipo:"recordatorio", c:"#E8A13C", tone:"amber",
        motivo:`Hace ${d} ${d === 1 ? "día hábil" : "días hábiles"} que no la abre` };
    }
    if (r.estado === "abierta" && r.aperturas > 0) {
      return { r, tipo:"seguimiento", c:"#2A9E8E", tone:"teal",
        motivo:`La abrió ${r.aperturas === 1 ? "una vez" : `${r.aperturas} veces`} — buen momento para llamar` };
    }
    return null;
  }).filter(Boolean);
}

/* "hace 2 d" para las fechas que vuelven del server (último uso de una plantilla). */
function fechaCorta(fecha) {
  if (!fecha) return "";
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return "";
  const h = Math.floor((Date.now() - t) / 3600000);
  if (h < 1) return "recién";
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

/* Un paquete sin período de viaje ni validez no tiene mes: se muestra el año solo. */
function etiquetaMes(p) {
  return p.mes != null ? `${MESES[p.mes].slice(0, 3)} ${p.anio}` : String(p.anio || "");
}

/* v2F · filtros de la tabla — "r.destino" llega como "Punta Cana, Noviembre 2026".
   El corte va por la última coma: los combinados traen comas en el destino
   ("Roma, Florencia y Venecia, Marzo 2027"). */
function destinoBase(s) { return partirDestinoPeriodo(s).destino; }
function mesDeDestino(s) { return partirDestinoPeriodo(s).periodo.split(" ")[0] || ""; }

/* ═══════════════════════════════════════════════════════════════════════════
   v2 · ENTRADA — cómo arranca una cotización
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── A1 · modal "¿Cómo arrancamos?" — cuatro caminos, teclas 1 a 4 ────── */
function ModalNueva({ plantillas, onClose, onBlanco, onPaquete, onPlantilla, onIA, onVuelos }) {
  const catalogo = useCatalogo();
  const [paso, setPaso] = useState("menu");     // menu | plantilla
  const [busq, setBusq] = useState("");
  const inp = useRef(null);

  const CAMINOS = [
    { k:"ia",        n:1, Icon:MessageSquare, t:"Desde una consulta de WhatsApp",
      d:"Pegá lo que te escribió el pasajero y te arma el borrador en blanco con lo que entendió" },
    { k:"blanco",    n:2, Icon:FileText,   t:"En blanco",             d:"Formulario vacío, listo para escribir" },
    { k:"plantilla", n:3, Icon:Files,      t:"Desde un paquete o plantilla", d:"Los paquetes de la web y tus plantillas, en un solo lugar" },
    { k:"vuelos",    n:4, Icon:Plane,      t:"Solo vuelos",           d:"Itinerario, equipaje y precio — sin hoteles ni servicios" },
  ];

  const elegir = useCallback((k) => {
    if (k === "ia") onIA();
    else if (k === "blanco") onBlanco();
    else if (k === "vuelos") onVuelos();
    else { setPaso(k); setBusq(""); }
  }, [onIA, onBlanco, onVuelos]);

  const volver = useCallback(() => { setPaso("menu"); setBusq(""); }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (paso === "menu") {
        const i = ["1","2","3","4"].indexOf(e.key);
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

  /* ── segundo paso: paquetes de la web + plantillas propias, una sola lista buscable ── */
  /* norm y no toLowerCase: nadie escribe las tildes en un buscador, así que
     "buzios" tiene que traer "Búzios" igual que en la web. (Gero, 02/09.) */
  const b = norm(busq.trim());
  const paquetes  = catalogo.paquetes.filter((p) => !b || norm(`${p.nombre} ${p.resumen} ${p.destinos.map((d) => d.ciudad).join(" ")}`).includes(b));
  const plantis   = plantillas.filter((t) => !b || norm(`${t.nombre} ${t.destino || ""} ${t.detalle || ""}`).includes(b));
  const CAB = { plantilla:{ t:"Desde un paquete o plantilla", ph:"Buscá entre paquetes de la web y tus plantillas…" } }[paso];

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

            {/* los otros dos */}
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
              <span className="kbd">1</span>…<span className="kbd">4</span> para elegir
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
              {catalogo.cargando && paquetes.length === 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"18px 8px",
                  fontSize:12.5, color:"var(--n400)" }}>
                  <Loader2 size={14} className="spin" /> Cargando catálogo…
                  {catalogo.progreso ? ` ${catalogo.progreso}` : ""}
                </div>
              )}
              {paquetes.length > 0 && (
                <>
                  <div className="lbl" style={{ padding:"6px 8px 4px" }}>Paquetes de la web</div>
                  {paquetes.map((p) => (
                    <button key={p.id} className="lst-i" onClick={() => onPaquete(p)}>
                      <Foto seed={p.seed} url={p.foto} alt={p.nombre} w={46} h={34} r={9} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.nombre}</div>
                        <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {p.destinos.map((d) => `${d.ciudad} · ${d.noches}n`).join("   ·   ")}</div>
                      </div>
                      <Pill tone="violet" style={{ flexShrink:0 }}>{etiquetaMes(p)}</Pill>
                      <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                    </button>
                  ))}
                </>
              )}

              {plantis.length > 0 && (
                <>
                  <div className="lbl" style={{ padding:"10px 8px 4px" }}>Tus plantillas</div>
                  {plantis.map((t) => (
                    <button key={t.id} className="lst-i" onClick={() => onPlantilla(t)}>
                      <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:"grid", placeItems:"center",
                        background:"rgba(120,90,229,.1)", color:"var(--violet)" }}><Files size={14} /></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{t.nombre}</div>
                        <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {[t.destino, t.detalle].filter(Boolean).join(" · ") || "Sin detalle"}</div>
                      </div>
                      <Pill tone="teal" style={{ flexShrink:0 }}><Zap size={8} /> {t.usos ?? 0}</Pill>
                      <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                    </button>
                  ))}
                </>
              )}

              {!catalogo.cargando && !paquetes.length && !plantis.length && (
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
  { l:"Brasil, a elegir",   t:"Hola! queremos ir a Brasil en enero con los chicos, somos 2 adultos y 2 nenas, mi número es 091 555 010" },
];

function ModalIA({ onClose, onArmar }) {
  const catalogo = useCatalogo();
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

  /* v2G · la IA arma SIEMPRE en blanco: nunca ofrece paquetes ni precarga uno —
     pedido explícito de Gero, quien ya sabe que no hay un paquete en la web cuando pega la consulta */
  const pasos = [
    { l:"Leyendo tu consulta…" },
    { l:"Detectando destino, mes, noches y pasajeros…" },
    { l:"Armando el borrador en blanco con lo que entendí…" },
  ];

  const armar = () => { if (!texto.trim()) return; setDet(detectarConsulta(texto, catalogo)); setPaso(0); setFase("corriendo"); };

  useEffect(() => {
    if (fase !== "corriendo" || !det) return;
    const durs = [600, 800, 640];
    const ts = []; let acum = 0;
    for (let i = 1; i <= durs.length; i++) { acum += durs[i - 1]; ts.push(setTimeout(() => setPaso(i), acum)); }
    ts.push(setTimeout(() => armarRef.current({ ...det, paquete:null }), acum + 220));
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
          {fase !== "corriendo" && <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>}
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
              Lee destino, mes, cuántos viajan y cuántas noches, y arma la cotización en blanco
              con eso. Si el pedido ya existe como paquete en la web, arrancá desde “Desde un
              paquete o plantilla”.
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

function Inicio({
  onPaquete, onBlanco, onPlantilla, onIA, onDuplicarFila, onEditarFila, toast, tab, setTab,
  plantillas, onCrearPlantilla, onBorrarPlantilla, onDuplicarPlantilla, onSoloVuelos,
  filas, cargandoFilas, recargar, verComo, setVerComo, abrirId, onAbierta,
}) {
  const { esAdmin } = useCtz();
  const catalogo = useCatalogo();
  const G = ["#F43E55","#785AE5"];
  const [busq, setBusq] = useState("");
  const [creando, setCreando] = useState(false);
  const [nomPl, setNomPl] = useState("");
  const [destPl, setDestPl] = useState("");
  /* v2 · caminos de entrada */
  const [modalNueva, setModalNueva] = useState(false);
  const [modalIA, setModalIA] = useState(false);

  const resultados = useMemo(() => {
    const t = norm(busq.trim());
    if (!t) return catalogo.paquetes.slice(0, 4);
    return catalogo.paquetes.filter((p) =>
      norm(p.nombre).includes(t) ||
      p.destinos.some((d) => norm(d.ciudad).includes(t)) ||
      norm(p.resumen).includes(t)
    ).slice(0, 8);
  }, [busq, catalogo.paquetes]);
  const buscando = busq.trim().length > 0;

  /* las filas con el estado ya resuelto: lo comparten los cuatro tabs */
  const base = useMemo(
    () => filas.map((r) => ({ ...r, estado: estadoEfectivo(r) })),
    [filas],
  );

  /* badges: todo sale de las filas reales, nada de números fijos */
  const badgeSeguimiento = useMemo(() => calcularCola(base).length, [base]);
  const tasaConfirmacion = useMemo(() => {
    const enviadas = base.filter((r) => r.hEnvio != null).length;
    if (!enviadas) return "—";
    const conf = base.filter((r) => r.estado === "confirmada").length;
    return `${Math.round((conf / enviadas) * 100)}%`;
  }, [base]);

  const TABS = [
    { id:"cotizar",     l:"Cotizar",     Icon:Ticket,      badge:base.length },
    { id:"seguimiento", l:"Seguimiento", Icon:ListChecks,  badge:badgeSeguimiento },
    { id:"plantillas",  l:"Plantillas",  Icon:Files,       badge:plantillas.length },
    /* Analytics por vendedor: solo lo ve el administrador (pedido de Gero). */
    ...(esAdmin ? [{ id:"analytics", l:"Analytics", Icon:TrendingUp, badge:tasaConfirmacion }] : []),
  ];

  return (
    <div className="home-wrap" style={{ maxWidth:1080, margin:"0 auto", padding:"28px 22px 60px" }}>

      {/* ── barra superior: vuelta al panel + acción primaria. La marca y el
             tema los pone el shell del backend, acá no se repiten. ── */}
      <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:13, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:180 }}>
          <Link href="/backend/dashboard" className="ctz-volver">
            <ArrowLeft size={13} /> Panel
          </Link>
          <div className="disp" style={{ fontSize:24, fontWeight:600, letterSpacing:"-.025em", lineHeight:1.1, marginTop:4 }}>Cotizador</div>
          <div style={{ fontSize:12, color:"var(--n400)" }}>Cotizaciones a medida para mandar por WhatsApp</div>
        </div>
        {/* Pedido del cliente: el link de datos del pasajero, arriba y a mano.
            Si el admin está mirando a un vendedor puntual, los links son de él. */}
        <MisLinks vendedorId={esAdmin && verComo !== "todos" ? verComo : null} toast={toast} />

        {/* ajustes del cotizador — solo el admin, en su propia página */}
        {esAdmin && (
          <Link href="/backend/cotizador/ajustes" className="btn btn-s btn-ico"
            style={{ width:40, height:40, borderRadius:12 }}
            title="Ajustes del cotizador" aria-label="Ajustes del cotizador">
            <Settings size={16} />
          </Link>
        )}
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
                  placeholder={catalogo.cargando && !catalogo.paquetes.length
                    ? "Cargando catálogo…"
                    : `Buscá entre los ${catalogo.paquetes.length} paquetes publicados… Río, Cancún, Madrid`}
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
                <span className="lbl">{buscando ? `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}` : "Plantillas de la web · últimos publicados"}</span>
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
                    <Foto seed={p.seed} url={p.foto} alt={p.nombre} w="100%" h={96} r={0}>
                      <div style={{ position:"absolute", left:12, bottom:9, right:12, color:"#fff" }}>
                        <div style={{ fontSize:13.5, fontWeight:700, letterSpacing:"-.015em", textShadow:"0 1px 8px rgba(0,0,0,.45)" }}>{p.nombre}</div>
                      </div>
                      <div style={{ position:"absolute", right:9, top:9 }}>
                        {/* va sobre la foto: queda claro siempre, en los dos temas */}
                        <Pill style={{ background:"rgba(255,255,255,.93)", color:"#1A1A2E" }}>{etiquetaMes(p)}</Pill>
                      </div>
                    </Foto>
                    <div style={{ padding:"10px 12px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginBottom:9 }}>
                        {p.destinos.map((d, di) => (
                          <span key={`${d.ciudad}-${di}`} className="pill" data-tone="violet">
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
                {catalogo.cargando && resultados.length === 0 && (
                  <div className="a-fade" style={{ gridColumn:"1/-1", display:"flex", alignItems:"center",
                    justifyContent:"center", gap:9, padding:"30px 0", fontSize:13, color:"var(--n400)" }}>
                    <Loader2 size={15} className="spin" /> Cargando catálogo…
                    {catalogo.progreso ? <span className="mono" style={{ fontSize:11 }}>{catalogo.progreso}</span> : null}
                  </div>
                )}
                {!catalogo.cargando && buscando && resultados.length === 0 && (
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
              <ListadoContenido base={base} cargando={cargandoFilas} recargar={recargar}
                verComo={verComo} setVerComo={setVerComo} toast={toast}
                onDuplicar={onDuplicarFila} onEditar={onEditarFila}
                abrirId={abrirId} onAbierta={onAbierta} />
            </div>
          )}

          {/* ══ TAB SEGUIMIENTO — lo que antes vivía arriba, ahora escondido acá ══ */}
          {tab === "seguimiento" && (
            <TabSeguimiento base={base} recargar={recargar} toast={toast}
              onEditar={onEditarFila} onDuplicar={onDuplicarFila} />
          )}

          {/* ══ TAB ANALYTICS ══ */}
          {tab === "analytics" && esAdmin && <TabAnalyticsAdmin toast={toast} />}

          {/* ══ TAB PLANTILLAS ══ */}
          {tab === "plantillas" && (
            <div className="a-fade">
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                <p style={{ fontSize:12.5, color:"var(--n400)", margin:0, flex:1 }}>
                  Lo repetitivo ya viene cargado. También podés guardar cualquier cotización como plantilla desde el editor.
                  Los paquetes de la web ya aparecen solos como plantillas al crear una cotización.
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
                        {[t.destino, t.detalle].filter(Boolean).join(" · ") || "Sin detalle"}</div>
                      <div style={{ display:"flex", gap:6, marginTop:5 }}>
                        <span className="pill" data-tone="teal"><Zap size={8} /> usada {t.usos ?? 0} veces</span>
                        <span className="pill" data-tone="n">{fechaCorta(t.ultimoUsoAt) || "sin usar"}</span>
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
          plantillas={plantillas}
          onClose={() => setModalNueva(false)}
          onBlanco={() => { setModalNueva(false); onBlanco(); }}
          onPaquete={(p) => { setModalNueva(false); onPaquete(p); }}
          onPlantilla={(t) => { setModalNueva(false); onPlantilla(t); }}
          onIA={() => { setModalNueva(false); setModalIA(true); }}
          onVuelos={() => { setModalNueva(false); onSoloVuelos(); }} />
      )}
      {modalIA && (
        <ModalIA onClose={() => setModalIA(false)}
          onArmar={(det) => { setModalIA(false); onIA(det); }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACCIONES SOBRE UNA FILA

   Las comparten el listado del tab Cotizar y el tab Seguimiento: los dos
   muestran el mismo drawer y los mismos botones. Cada una llama al server y
   después refresca la grilla — el estado optimista se queda solo con lo que se
   ve mientras vuelve la respuesta.
   ═══════════════════════════════════════════════════════════════════════════ */

function useAccionesFila({ recargar, toast, cerrarDrawer }) {
  /* pisadas locales por id: lo que ya cambió en pantalla y todavía no volvió
     del server. Se limpian solas en el próximo refresco. */
  const [ov, setOv] = useState({});
  const pisar = useCallback((id, cambio) => setOv((o) => ({ ...o, [id]: { ...(o[id] || {}), ...cambio } })), []);
  const despisar = useCallback((id) => setOv((o) => { const c = { ...o }; delete c[id]; return c; }), []);

  const refrescar = useCallback(async () => { await recargar?.(); setOv({}); }, [recargar]);

  const fallo = useCallback((id, msg) => { despisar(id); toast?.({ msg, tone:"warn" }); }, [despisar, toast]);

  const reactivar = useCallback(async (r) => {
    pisar(r.id, { estado:"enviada", estadoManual:null, aperturas:0 });
    const res = await reactivarPresupuesto(r.id);
    if (!res.ok) return fallo(r.id, res.error);
    toast?.({ msg:`Reactivada por ${r.vigencia || 96} h ✓`, tone:"ok" });
    await refrescar();
  }, [pisar, fallo, toast, refrescar]);

  const extender = useCallback(async (r) => {
    const res = await extenderVigenciaAction(r.id, 48);
    if (!res.ok) return fallo(r.id, res.error);
    pisar(r.id, { expiraAt: res.data.expiraAt, estadoManual: null });
    toast?.({ msg:"Vigencia extendida — el link vuelve a estar activo 48 h", tone:"ok" });
    await refrescar();
  }, [pisar, fallo, toast, refrescar]);

  const cambiarEstado = useCallback(async (r, estadoUi) => {
    pisar(r.id, { estadoManual: estadoUi });
    const res = await setEstadoManual(r.id, estadoUi);
    if (!res.ok) return fallo(r.id, res.error);
    await refrescar();
  }, [pisar, fallo, refrescar]);

  const guardarNotas = useCallback(async (r, texto) => {
    pisar(r.id, { bitacora: texto });
    const res = await setNotasInternas(r.id, texto);
    if (!res.ok) return fallo(r.id, res.error);
  }, [pisar, fallo]);

  const confirmar = useCallback(async (r, opcion, via) => {
    pisar(r.id, { estado:"confirmada", estadoManual:null, confOpcion:opcion, confVia:via });
    const res = await registrarConfirmacion(r.id, { opcion, via });
    if (!res.ok) return fallo(r.id, res.error);
    toast?.({ msg:`${r.num} confirmada · ${opcion}`, tone:"ok" });
    await refrescar();
  }, [pisar, fallo, toast, refrescar]);

  const eliminar = useCallback(async (r) => {
    const res = await eliminarPresupuesto(r.id);
    if (!res.ok) return fallo(r.id, res.error);
    cerrarDrawer?.();
    toast?.({ msg:`${r.num} eliminada`, tone:"warn" });
    await refrescar();
  }, [fallo, toast, refrescar, cerrarDrawer]);

  /* el envío marcado desde el modal ya escribió en la base: solo refrescamos */
  const marcada = useCallback(async () => { await refrescar(); }, [refrescar]);

  return { ov, reactivar, extender, cambiarEstado, guardarNotas, confirmar, eliminar, marcada, refrescar };
}

/** Aplica las pisadas locales y recalcula el estado efectivo de cada fila. */
function conPisadas(base, ov) {
  if (!Object.keys(ov).length) return base;
  return base.map((r) => {
    const p = ov[r.id];
    if (!p) return r;
    const mezcla = { ...r, ...p };
    return { ...mezcla, estado: estadoEfectivo(mezcla) };
  });
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

/* ── v2F · tab Seguimiento — la cola del día y los reportes por vendedor.
   Estado propio y aparte del de la tabla: son dos pantallas distintas y no
   vale la pena atarlas con un hook compartido. ── */
function TabSeguimiento({ base, recargar, toast, onEditar, onDuplicar }) {
  const { vendedores } = useCtz();
  const [selId, setSelId] = useState(null);
  const [hechos, setHechos] = useState({});
  const acc = useAccionesFila({ recargar, toast, cerrarDrawer: () => setSelId(null) });

  const filas = useMemo(() => conPisadas(base, acc.ov), [base, acc.ov]);
  const sel = filas.find((r) => r.id === selId) || null;

  const marcarHecho = useCallback((r, motivo, msg) => {
    setHechos((h) => ({ ...h, [r.id]: motivo }));
    toast?.({ msg, tone:"ok", undo:() => setHechos((h) => { const c = { ...h }; delete c[r.id]; return c; }) });
  }, [toast]);
  const recordatorio = useCallback((r) => marcarHecho(r, "recordatorio", `Anotado — mandale el recordatorio a ${String(r.cliente).split(" ")[0]}`), [marcarHecho]);
  const seguimiento  = useCallback((r) => marcarHecho(r, "seguimiento", `Seguimiento anotado — llamá a ${String(r.cliente).split(" ")[0]} hoy ✓`), [marcarHecho]);

  /* ── v2 · A3 · qué entra en la cola de hoy y por qué ── */
  const cola = useMemo(() => calcularCola(filas, hechos), [filas, hechos]);

  /* Reporte por vendedor: todo sale de las filas que están en pantalla. */
  const porVendedor = useMemo(() => vendedores.map((v) => {
    const suyas = filas.filter((x) => x.vendedor === v.id);
    return { ...v, n:suyas.length,
      monto: suyas.filter((x) => x.estado === "confirmada").reduce((a, x) => a + (x.monto || 0), 0),
      abiertas: suyas.filter((x) => x.aperturas > 0).length,
      confirmadas: suyas.filter((x) => x.estado === "confirmada").length };
  }).filter((v) => v.n > 0), [filas, vendedores]);

  useEffect(() => {
    if (!sel) return;
    const k = (e) => e.key === "Escape" && setSelId(null);
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [sel]);

  return (
    <div className="a-fade">

      {/* v2 · A3 · la cola del día, antes que cualquier número */}
      <ColaParaHoy items={cola} onReactivar={acc.reactivar} onRecordatorio={recordatorio}
        onSeguimiento={seguimiento} onAbrir={(r) => setSelId(r.id)} />

      {/* reportes por vendedor */}
      <div className="vend-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:10, marginBottom:6 }}>
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
            <div style={{ display:"flex", alignItems:"baseline", gap:7, flexWrap:"wrap" }}>
              <span className="mono" style={{ fontSize:14.5, fontWeight:600 }}>{money(v.monto)}</span>
              <span style={{ fontSize:10.5, color:"var(--n400)" }}>confirmado</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10.5, color:"var(--teal-3)" }}>
                <TrendingUp size={10} /> {v.confirmadas} cerradas</span>
            </div>
          </div>
        ))}
        {!porVendedor.length && (
          <div style={{ gridColumn:"1/-1" }}>
            <Vacio icon={ListChecks} titulo="Todavía no hay cotizaciones" accion="Armá la primera desde el tab Cotizar" />
          </div>
        )}
      </div>

      {/* leyenda del semáforo — la misma que usa la cola de arriba */}
      <div style={{ fontSize:11, color:"var(--n400)", margin:"9px 0 4px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Eye size={11} /> Clic en una cotización de la cola para ver su detalle</span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
          <span className="sem-dot" style={{ background:"#2A9E8E", width:8, height:8 }} /> abierta
          <span className="sem-dot" style={{ background:"#45D4C0", width:8, height:8, marginLeft:7 }} /> en ventana
          <span className="sem-dot" style={{ background:"#E8A13C", width:8, height:8, marginLeft:7 }} /> +24 h hábiles sin abrir
          <span className="sem-dot" style={{ background:"#F43E55", width:8, height:8, marginLeft:7 }} /> link vencido
        </span>
      </div>

      {sel && <DrawerAnalytics r={sel} onClose={() => setSelId(null)} toast={toast}
        onEditar={onEditar ? (r) => { setSelId(null); onEditar(r); } : undefined}
        onDuplicar={onDuplicar ? (r) => { setSelId(null); onDuplicar(r); } : undefined}
        onBitacora={acc.guardarNotas}
        onConfirmar={acc.confirmar}
        onEstado={acc.cambiarEstado}
        onEliminar={acc.eliminar}
        onExtender={acc.extender} onRecordatorio={acc.marcada} />}
    </div>
  );
}

function ListadoContenido({
  base, cargando, recargar, verComo, setVerComo, toast, onDuplicar, onEditar,
  abrirId, onAbierta,
}) {
  const { vendedores, esAdmin } = useCtz();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [semFiltro, setSemFiltro] = useState("todas");     // chip del semáforo
  const [destFiltro, setDestFiltro] = useState("todos");  // v2F · filtro por destino
  const [mesFiltro, setMesFiltro] = useState("todos");    // v2F · filtro por mes de salida
  const [selId, setSelId] = useState(null);               // fila abierta en el drawer
  const acc = useAccionesFila({ recargar, toast, cerrarDrawer: () => setSelId(null) });

  const conOv = useMemo(() => conPisadas(base, acc.ov), [base, acc.ov]);
  const sel = conOv.find((r) => r.id === selId) || null;

  /* v2F · destinos y meses presentes hoy, para armar los filtros de arriba */
  const destinosUnicos = useMemo(() => Array.from(new Set(conOv.map((r) => destinoBase(r.destino)))).filter(Boolean).sort(), [conOv]);
  const mesesUnicos = useMemo(() => {
    const presentes = new Set(conOv.map((r) => mesDeDestino(r.destino)));
    return MESES.filter((m) => presentes.has(m));
  }, [conOv]);

  /* búsqueda instantánea por CUALQUIER campo + filtros de destino y mes de salida */
  const filas = useMemo(() => {
    return conOv.filter((r) => {
      if (filtro !== "todas" && r.estado !== filtro) return false;
      if (semFiltro !== "todas" && bucketSemaforo(r) !== semFiltro) return false;
      if (destFiltro !== "todos" && destinoBase(r.destino) !== destFiltro) return false;
      if (mesFiltro !== "todos" && mesDeDestino(r.destino) !== mesFiltro) return false;
      if (!q.trim()) return true;
      const V = buscarVendedor(vendedores, r.vendedor);
      const pajar = norm([r.num, r.cliente, r.destino, V.nombre, ESTADOS[r.estado]?.l, String(r.monto), semaforo(r).l]
        .filter(Boolean).join(" "));
      return norm(q).split(/\s+/).every((t) => pajar.includes(t));
    });
  }, [q, filtro, semFiltro, destFiltro, mesFiltro, conOv, vendedores]);

  /* Resumen del semáforo: los cuatro números que el vendedor mira antes que
     la tabla. Salen de las MISMAS filas que están en pantalla (con el filtro
     de vendedor del admin ya aplicado), así el chip nunca promete una fila que
     la grilla no puede mostrar. El reparto lo decide `bucketSemaforo()`, el
     mismo que usa `resumenSemaforo()` en el server para el badge del shell. */
  const resumenSem = useMemo(() => {
    const c = { roja:0, amarilla:0, verde:0, borrador:0 };
    for (const r of conOv) { const b = bucketSemaforo(r); if (b) c[b] += 1; }
    return c;
  }, [conOv]);

  const CHIPS_SEM = [
    { k:"roja",     c:"#F43E55", l:"Vencidas sin abrir",       n:resumenSem.roja,
      tip:"El link venció y el pasajero nunca lo abrió. Reactivá y reenviá." },
    { k:"amarilla", c:"#E8A13C", l:"+24 h hábiles sin abrir",  n:resumenSem.amarilla,
      tip:"Más de 24 h hábiles sin apertura (el fin de semana no cuenta). Va un recordatorio." },
    { k:"verde",    c:"#2A9E8E", l:"Abiertas o confirmadas",   n:resumenSem.verde,
      tip:"El pasajero la abrió, o ya confirmó. Buen momento para el seguimiento." },
    { k:"borrador", c:"#B0B4CD", l:"Borradores",               n:resumenSem.borrador,
      tip:"Todavía no salieron. El semáforo arranca cuando las compartas." },
  ];

  useEffect(() => {
    if (!sel) return;
    const k = (e) => e.key === "Escape" && setSelId(null);
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [sel]);

  /* ?abrir=<id>: se espera a que la grilla llegue del server. Si el id no está
     entre las filas que este usuario puede ver, se ignora sin ruido. */
  useEffect(() => {
    if (!abrirId || cargando) return;
    if (conOv.some((r) => r.id === abrirId)) setSelId(abrirId);
    onAbierta?.();
  }, [abrirId, cargando, conOv, onAbierta]);

  return (
    <div className="a-fade">

      {/* buscador total + filtros */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12, alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 240px" }}>
          <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
            color: q ? "var(--violet)" : "var(--n300)" }} />
          <input className={`in ${q ? "a-glow" : ""}`} style={{ paddingLeft:32 }} value={q}
            placeholder="Buscar por cliente, destino, vendedor, número, estado o monto…"
            onChange={(e) => setQ(e.target.value)} />
        </div>
        {["todas", ...Object.keys(ESTADOS)].map((k) => (
          <button key={k} className={`chip ${filtro === k ? "chip-on" : ""}`} onClick={() => setFiltro(k)}>
            {k === "todas" ? "Todas" : ESTADOS[k].l}
          </button>
        ))}
        <SelectBuscable valor={destFiltro} opciones={destinosUnicos} ancho={150}
          vacio={{ value:"todos", label:"Todos los destinos" }}
          buscarPlaceholder="Buscar destino…" onChange={setDestFiltro} />
        <SelectBuscable valor={mesFiltro} opciones={mesesUnicos} ancho={150}
          vacio={{ value:"todos", label:"Todos los meses" }}
          buscarPlaceholder="Buscar mes…" onChange={setMesFiltro} />
        {esAdmin && (
          <>
            {/* el filtro por vendedor lo aplica el server: vuelve a pedir la lista */}
            <span className="lbl" style={{ flexShrink:0, marginLeft:2 }}>Ver como</span>
            <SelectBuscable valor={verComo} ancho={190}
              opciones={vendedores.map((v) => ({ value:v.id, label:v.nombre, sub:v.cargo }))}
              vacio={{ value:"todos", label:"Todos los vendedores" }}
              buscarPlaceholder="Buscar vendedor…" onChange={setVerComo} />
            <span className="sem" style={{ flexShrink:0, cursor:"help" }}>
              <Eye size={13} style={{ color:"var(--n300)" }} />
              <div className="tip">Cada vendedor ve solo sus cotizaciones; el admin las ve todas.</div>
            </span>
          </>
        )}
      </div>

      {/* semáforo del listado: cuatro chips que filtran la grilla de abajo.
          Tocar el que ya está activo lo apaga y vuelven todas. */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
        {CHIPS_SEM.map((ch) => (
          <button key={ch.k} className={`chip ${semFiltro === ch.k ? "chip-on" : ""}`}
            title={ch.tip} disabled={!ch.n && semFiltro !== ch.k}
            onClick={() => setSemFiltro((v) => (v === ch.k ? "todas" : ch.k))}
            style={{ opacity: ch.n || semFiltro === ch.k ? 1 : .45 }}>
            <span className="sem-dot" style={{ background:ch.c, width:8, height:8 }} />
            {ch.l}
            <span className="mono" style={{ fontWeight:700, marginLeft:2 }}>{ch.n}</span>
          </button>
        ))}
        {semFiltro !== "todas" && (
          <button className="chip" onClick={() => setSemFiltro("todas")}>
            <X size={11} /> Ver todas
          </button>
        )}
        <span className="hint-desk" style={{ fontSize:10.5, color:"var(--n300)", marginLeft:"auto" }}>
          la vigencia y el “+24 h” se cuentan en horas hábiles
        </span>
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
              Verde: abierta o confirmada. Teal: enviada hace menos de 24 h hábiles. Ámbar: +24 h hábiles sin abrir. Rojo: la vigencia se cumplió sin apertura. Las horas hábiles no cuentan sábados ni domingos.</div>
          </span>
          <span className="lbl" style={{ width:52, flexShrink:0, textAlign:"right" }}>Creada</span>
          <span style={{ width:13, flexShrink:0 }} />
        </div>
        {filas.map((r, i) => {
          const E = ESTADOS[r.estado]; const V = buscarVendedor(vendedores, r.vendedor);
          const S = semaforo(r);
          return (
            <div key={r.id} role="button" tabIndex={0} onClick={() => setSelId(r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelId(r.id); } }}
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
                  display:"grid", placeItems:"center", fontSize:9.5, fontWeight:700, flexShrink:0 }}>{V.inicial}</div>
                <span style={{ fontSize:11.5, color:"var(--n500)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {V.nombre.split(" ")[0]}</span>
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
                  <Btn size="xs" title="Generar un link nuevo y volver a dejarla vigente"
                    style={{ color:"var(--teal-3)", background:"rgba(59,191,173,.09)",
                      borderColor:"rgba(59,191,173,.4)", fontWeight:700 }}
                    onClick={(e) => { e.stopPropagation(); acc.reactivar(r); }}>
                    <RefreshCw size={11} /> Reactivar
                  </Btn>
                )}
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Abrir en el editor"
                  onClick={(e) => { e.stopPropagation(); onEditar?.(r); }}><PenLine size={12} /></button>
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Duplicar"
                  onClick={(e) => { e.stopPropagation(); onDuplicar?.(r); }}><Files size={12} /></button>
              </div>
            </div>
          );
        })}
        {!filas.length && (
          <div style={{ padding:30, textAlign:"center", color:"var(--n400)", fontSize:13,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {cargando
              ? <><Loader2 size={14} className="spin" /> Cargando cotizaciones…</>
              : "No hay cotizaciones con esos filtros."}
          </div>
        )}
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:9, display:"flex", alignItems:"center", gap:5 }}>
        <Eye size={11} /> Clic en una fila para ver su detalle
      </div>

      {sel && <DrawerAnalytics r={sel} onClose={() => setSelId(null)} toast={toast}
        onEditar={onEditar ? (r) => { setSelId(null); onEditar(r); } : undefined}
        onDuplicar={onDuplicar ? (r) => { setSelId(null); onDuplicar(r); } : undefined}
        onBitacora={acc.guardarNotas}
        onConfirmar={acc.confirmar}
        onEstado={acc.cambiarEstado}
        onEliminar={acc.eliminar}
        onExtender={acc.extender} onRecordatorio={acc.marcada} />}
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

/* Analytics del flujo comercial. Todo se calcula en el cliente con las filas
   que ya están en pantalla: mismo universo que el listado, así los números
   coinciden con lo que el vendedor ve arriba. Las métricas de lectura —tiempo
   hasta la primera apertura, cuánto la leyó— dependen del link público y hoy
   van en "—". */
function TabAnalytics({ base = [] }) {
  const { vendedores } = useCtz();

  const m = useMemo(() => {
    const creadas = base.length;
    const enviadas = base.filter((r) => r.hEnvio != null).length;
    const abiertas = base.filter((r) => r.aperturas > 0).length;
    const confirmadas = base.filter((r) => r.estado === "confirmada");
    const montoConfirmado = confirmadas.reduce((a, r) => a + (r.monto || 0), 0);
    const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

    const porVendedor = vendedores.map((v) => {
      const suyas = base.filter((r) => r.vendedor === v.id);
      const env = suyas.filter((r) => r.hEnvio != null).length;
      const conf = suyas.filter((r) => r.estado === "confirmada");
      return { id:v.id, n:v.nombre, total:suyas.length, env,
        conf: conf.length, tasa: pct(conf.length, env),
        monto: conf.reduce((a, r) => a + (r.monto || 0), 0) };
    }).filter((v) => v.total > 0).sort((a, b) => b.monto - a.monto);

    /* por mes de creación, los últimos seis con actividad */
    const meses = new Map();
    for (const r of base) {
      if (!r.createdAt) continue;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const fila = meses.get(k) || { k, l:`${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`, n:0, conf:0 };
      fila.n += 1;
      if (r.estado === "confirmada") fila.conf += 1;
      meses.set(k, fila);
    }
    const porMes = [...meses.values()].sort((a, b) => a.k.localeCompare(b.k)).slice(-6);

    /* destinos con más cotizaciones */
    const dests = new Map();
    for (const r of base) {
      const l = destinoBase(r.destino);
      if (!l || l === "Sin destino") continue;
      const fila = dests.get(l) || { l, env:0, conf:0 };
      fila.env += 1;
      if (r.estado === "confirmada") fila.conf += 1;
      dests.set(l, fila);
    }
    const porDestino = [...dests.values()].sort((a, b) => b.env - a.env).slice(0, 6);

    /* ── lectura del pasajero ────────────────────────────────────────────
       Mediana y no promedio: una cotización que alguien dejó abierta toda la
       noche corre el promedio media hora y deja de describir a nadie. */
    const mediana = (nums) => {
      const l = nums.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
      if (!l.length) return null;
      const m = Math.floor(l.length / 2);
      return l.length % 2 ? l[m] : Math.round((l[m - 1] + l[m]) / 2);
    };
    const medApertura = mediana(base.map((r) => r.hastaMs));
    const medLectura = mediana(base.map((r) => r.lecturaSeg));

    /* la sección más lejos a la que llegó la mayoría, y el dispositivo que
       más se repite: los dos salen del mismo conteo simple */
    const masFrecuente = (valores) => {
      const cuenta = new Map();
      for (const v of valores) {
        if (v == null || v === "" || v === "—") continue;
        cuenta.set(v, (cuenta.get(v) || 0) + 1);
      }
      let mejor = null, tope = 0;
      for (const [v, n] of cuenta) if (n > tope) { mejor = v; tope = n; }
      return mejor;
    };
    const seccionTipica = masFrecuente(
      base.filter((r) => r.hastaSecIdx >= 0).map((r) => SECCIONES[r.hastaSecIdx]?.label),
    );
    const dispositivoTipico = masFrecuente(base.map((r) => r.dispositivo));

    return { creadas, enviadas, abiertas, confirmadas: confirmadas.length, montoConfirmado,
      tasaApertura: pct(abiertas, enviadas), tasaConfirmacion: pct(confirmadas.length, enviadas),
      porVendedor, porMes, porDestino, pct,
      medApertura, medLectura, seccionTipica, dispositivoTipico,
      conLectura: base.filter((r) => r.hastaSecIdx >= 0).length };
  }, [base, vendedores]);

  if (!base.length) {
    return (
      <div className="a-fade" style={{ padding:"20px 0" }}>
        <Vacio icon={TrendingUp} titulo="Todavía no hay datos"
          accion="Los números aparecen solos a medida que armás y mandás cotizaciones" />
      </div>
    );
  }

  const KPIS = [
    { l:"Cotizaciones", v:String(m.creadas), d:`${m.enviadas} enviadas` },
    { l:"Tasa de apertura", v: m.enviadas ? `${m.tasaApertura}%` : "—", d:`${m.abiertas} de ${m.enviadas} abiertas` },
    { l:"Tasa de confirmación", v: m.enviadas ? `${m.tasaConfirmacion}%` : "—", d:`${m.confirmadas} confirmadas` },
    { l:"Monto confirmado", v: money(m.montoConfirmado), d:"opción principal de cada una" },
    { l:"1ª apertura (mediana)",
      v: m.medApertura != null ? fmtDuracion(m.medApertura) : "—",
      d: m.medApertura != null ? "desde que sale hasta que la abren" : "sin aperturas todavía" },
  ];
  const FUNNEL = [
    { l:"Creadas", n:m.creadas, c:"#B0B4CD" },
    { l:"Enviadas", n:m.enviadas, c:"#785AE5" },
    { l:"Abiertas", n:m.abiertas, c:"#45D4C0" },
    { l:"Confirmadas", n:m.confirmadas, c:"#2A9E8E" },
  ];
  const topMes = Math.max(1, ...m.porMes.map((x) => x.n));
  const topDest = Math.max(1, ...m.porDestino.map((x) => x.env));

  return (
    <div className="a-fade">
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(168px,1fr))", gap:10, marginBottom:16 }}>
        {KPIS.map((k, i) => (
          <div key={k.l} className="card a-rise" style={{ padding:"12px 13px", animationDelay:`${i * .04}s` }}>
            <div className="lbl" style={{ marginBottom:5 }}>{k.l}</div>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-.025em", lineHeight:1.1 }}>{k.v}</div>
            <div style={{ fontSize:10.5, marginTop:3, color:"var(--n400)" }}>{k.d}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12 }}>
        {/* embudo */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Embudo</div>
          {FUNNEL.map((f) => (
            <BarraH key={f.l} label={f.l} right={`${f.n} · ${m.pct(f.n, m.creadas)}%`}
              pct={m.pct(f.n, m.creadas)} color={f.c} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4, lineHeight:1.5 }}>
            Abiertas se cuenta con las aperturas reales del pasajero sobre su link. La vista previa del vendedor no suma.
          </div>
        </div>

        {/* por vendedor */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Confirmación por vendedor</div>
          {m.porVendedor.map((v) => (
            <BarraH key={v.id} label={v.n}
              right={`${v.env ? `${v.tasa}%` : "—"} · ${v.total} cot · ${money(v.monto)}`}
              pct={v.tasa}
              color={v.tasa >= 25 ? "linear-gradient(90deg,#45D4C0,#2A9E8E)" : v.tasa >= 12 ? "#E8A13C" : "#F43E55"} />
          ))}
          {!m.porVendedor.length && <div style={{ fontSize:12, color:"var(--n400)" }}>Sin datos todavía.</div>}
        </div>

        {/* por mes */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Cotizaciones por mes</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:84 }}>
            {m.porMes.map((x) => (
              <div key={x.k} className="sem" style={{ flex:1, height:"100%", alignItems:"flex-end" }}>
                <div style={{ width:"100%", height:`${(x.n / topMes) * 100}%`, minHeight:3, borderRadius:"5px 5px 0 0",
                  background:"linear-gradient(180deg,#A05ED3,#785AE5)", transition:"height .5s" }} />
                <div className="tip"><b>{x.l}</b>{x.n} cotizaciones · {x.conf} confirmadas</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9.5, color:"var(--n300)", marginTop:6 }}>
            {m.porMes.map((x) => <span key={x.k}>{x.l}</span>)}
          </div>
        </div>

        {/* destinos */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Destinos: cotizado vs confirmado</div>
          {m.porDestino.map((d) => (
            <BarraH key={d.l} label={d.l}
              right={`${d.env} cot · ${d.conf} conf (${m.pct(d.conf, d.env)}%)`}
              pct={(d.env / topDest) * 100}
              color={m.pct(d.conf, d.env) >= 28 ? "linear-gradient(90deg,#45D4C0,#2A9E8E)" : "linear-gradient(90deg,#A05ED3,#785AE5)"} />
          ))}
          {!m.porDestino.length && <div style={{ fontSize:12, color:"var(--n400)" }}>Sin destinos cargados todavía.</div>}
        </div>

        {/* lo que falta */}
        <div className="card" style={{ padding:16, background:"linear-gradient(160deg,var(--card),var(--card-2))" }}>
          <div className="lbl" style={{ marginBottom:10 }}>Métricas de lectura</div>
          {[
            ["Tiempo hasta la primera apertura", m.medApertura != null ? fmtDuracion(m.medApertura) : null],
            ["Cuánto tiempo la leyó", m.medLectura != null ? fmtLectura(m.medLectura) : null],
            ["Hasta qué sección llegó", m.seccionTipica],
            ["Dispositivo más común", m.dispositivoTipico],
          ].map(([t, v]) => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9 }}>
              <span style={{ fontSize:12, color:"var(--n600)", flex:1 }}>{t}</span>
              <span className="mono" style={{ fontSize:12, color: v ? "var(--n600)" : "var(--n300)" }}>{v || "—"}</span>
            </div>
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4, lineHeight:1.5 }}>
            {m.conLectura
              ? `Medianas sobre ${m.conLectura} ${m.conLectura === 1 ? "cotización leída" : "cotizaciones leídas"}.`
              : "Se llenan solas en cuanto un pasajero abra su link."}
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  ModalNueva, EJEMPLOS_IA, ModalIA, Inicio, ColaParaHoy, TabSeguimiento, ListadoContenido, BarraH, TabAnalytics,
};
