"use client";

import { useState, useMemo } from "react";
import {
  Sparkles, Check, ChevronDown, Send, Eye, X, CheckCheck, PenLine, Link2, Clock3, TrendingUp,
  Lock, Trash2, Smartphone, Monitor
} from "lucide-react";
import { VENDEDORES, semaforo, fmtHace, money, ESTADOS, uid } from "./data";
import { Btn, Pill } from "./ui";
import { SalidaPasajero } from "./telefono";
import { ModalCompartir } from "./compartir";

/* ═══════════════════════════════════════════════════════════════════════════
   v2D · D1 · FUNNEL DE LECTURA
   Las secciones tal como las ve el pasajero, en el mismo orden que la salida.
   ═══════════════════════════════════════════════════════════════════════════ */
const SECCIONES = ["Encabezado", "Hoteles", "Vuelos", "Servicios", "Formas de pago"];

/* la sección alcanzada manda: lo de antes lo leyó, lo de después no lo vio */
function indiceSeccion(hastaSec) {
  if (!hastaSec) return -1;
  const i = SECCIONES.findIndex((s) => s.toLowerCase() === String(hastaSec).toLowerCase());
  return i >= 0 ? i : SECCIONES.length - 1;      /* "Confirmó desde el link" = la leyó entera */
}

function FunnelLectura({ hastaSec }) {
  const idx = indiceSeccion(hastaSec);
  return (
    <div style={{ marginTop:11 }}>
      {SECCIONES.map((s, i) => {
        const visto = i <= idx;
        return (
          <div key={s} className="fun-row" data-on={visto ? "1" : "0"} data-fin={i === idx ? "1" : "0"}>
            <span className="fun-l">{s}</span>
            <span className="fun-t">
              <span className="fun-b" style={{ width: visto ? `${100 - i * 13}%` : "14%" }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Insight de lectura: sale del número de cotización, así que es siempre el
   mismo para la misma fila (nada de random que cambie al reabrir el drawer). */
function insightLectura(num) {
  const n = Number(String(num).replace(/\D/g, "").slice(-2)) || 0;
  const op = 2 + (n % 2);
  const cuanto = ["el doble de tiempo", "un 70% más de tiempo", "casi el triple de tiempo"][n % 3];
  return `Miró la Opción ${op} ${cuanto} — mencionala en el seguimiento.`;
}

/* ── Drawer de analytics de una cotización ─────────────────────────────── */
function DrawerAnalytics({ r, onClose, onConfirmar, onEstado, onExtender, onRecordatorio, onEditar, onBitacora, toast }) {
  const V = VENDEDORES.find((v) => v.id === r.vendedor) || VENDEDORES[0];
  const S = semaforo(r);
  const E = ESTADOS[r.estado];
  const [copiado, setCopiado] = useState(false);
  const [comp, setComp] = useState(false);
  const [confOpen, setConfOpen] = useState(false);
  const [editEst, setEditEst] = useState(false);
  const [preview, setPreview] = useState(null);   // null | "cel" | "tab" | "desk"
  const [txtBit, setTxtBit] = useState("");
  /* cotización de muestra para la vista previa del drawer */
  const qPrev = useMemo(() => {
    const dest = r.destino.split(",")[0];
    return { numero:r.num, estado:r.estado,
      cliente:{ nombre:r.cliente.split(" ")[0], apellido:"", email:"", telefono:"" },
      titulo:{ destino:dest, mes:9, anio:2026 }, fechaSalida:"2026-10-15",
      mensaje:"", mensajeHtml:"", pnrRaw:"", vuelos:[], destinos:[],
      servicios:[
        { id:"s1", categoria:"aereo", texto:"Aéreo ida y vuelta con valija en bodega 23kg", ciudad:null, modalidad:null },
        { id:"s2", categoria:"traslado", texto:"Traslado llegada y salida", ciudad:dest, modalidad:"Regular" },
        { id:"s3", categoria:"alojamiento", texto:"Alojamiento en base doble", ciudad:null, modalidad:null },
      ],
      notas:[], notasCliente:[], vigencia:48,
      /* mismo modelo que el editor: habitaciones con sus tarifas */
      opciones:[{ id:"o1", nombre:"Opción 1", hoteles:[{ hotelId:"h8", libre:"" }],
        regimen:"All inclusive", factor:0.88,
        habitaciones:[{ id:"hb1", ocupacion:"Doble", tipo:"",
          tarifas:[{ id:"tf1", tipo:"Por adulto", tipoLibre:"", neto:Math.round((r.monto || 1500) * 0.88), venta:null }] }] }],
    };
  }, [r]);
  const [op, setOp] = useState("Opción 1");
  const [via, setVia] = useState("WhatsApp");
  const puedeConfirmar = r.estado === "enviada" || r.estado === "abierta";
  const apDet = r.apDet || [];
  const vigTotal = 48;
  const vigResta = r.hEnvio == null ? null : Math.max(0, vigTotal - r.hEnvio);
  const qLite = {
    numero:r.num, estado:r.estado,
    cliente:{ nombre:r.cliente.split(" ")[0], apellido:"", email:"pasajero@mail.com", telefono:"" },
    titulo:{ destino:r.destino.split(",")[0], mes:null, anio:"" },
    fechaSalida:"", mensaje:"", mensajeHtml:"", pnrRaw:"", vuelos:[], destinos:[],
    servicios:[], notas:[], notasCliente:[], opciones:[],
  };

  const eventos = [
    { c:"#B0B4CD", t:`Creada por ${V.nombre.split(" ")[0]}`, s:r.dias === 0 ? "hoy" : `hace ${r.dias} d` },
    ...(r.hEnvio != null ? [{ c:"#785AE5", t:"Enviada al pasajero", s:fmtHace(r.hEnvio) + " · WhatsApp" }] : []),
    ...apDet.map((a, i) => ({ c:"#2A9E8E", t: i === 0 ? "Primera apertura" : `Reabierta`, s:`${a.hace} · ${a.disp} · ${a.lugar}` })),
    ...(r.estado === "confirmada" ? [{ c:"#2A9E8E",
      t: r.confOpcion ? `Confirmada · ${r.confOpcion}` : "Confirmada desde el link",
      s: r.confVia ? `recién · vía ${r.confVia} · por ${V.nombre.split(" ")[0]}` : "hace 2 d" }] : []),
    /* v2D · D3 · lo que se hizo desde este drawer queda escrito en la historia */
    ...(r.hist || []),
  ];

  const stat = (l, v) => (
    <div style={{ padding:"9px 11px", borderRadius:11, background:"var(--tile)" }}>
      <div className="lbl" style={{ marginBottom:3 }}>{l}</div>
      <div style={{ fontSize:13, fontWeight:700 }}>{v ?? <span style={{ color:"var(--n300)", fontWeight:500 }}>—</span>}</div>
    </div>
  );

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer">
        {/* header */}
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)", position:"relative" }}>
          <span className="mono" style={{ fontSize:12, fontWeight:600 }}>{r.num}</span>
          <button onClick={() => setEditEst((v) => !v)} title="Cambiar estado a mano"
            style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
            <Pill tone={E.tone}><E.Icon size={9} /> {E.l}
              {r.estadoManual && <PenLine size={8} style={{ opacity:.7 }} />}
              <ChevronDown size={9} style={{ opacity:.6, transform: editEst ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
            </Pill>
          </button>
          {editEst && (
            <div className="a-slide" style={{ position:"absolute", top:"calc(100% - 6px)", left:100, zIndex:10,
              background:"var(--pop)", border:"1px solid var(--hair)", borderRadius:12, padding:6, width:190,
              boxShadow:"0 18px 44px -14px rgba(17,17,36,.3)" }}>
              {Object.entries(ESTADOS).map(([k, e]) => (
                <button key={k} onClick={() => { onEstado?.(r.num, k); setEditEst(false); }}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 9px", borderRadius:8,
                    fontSize:12.5, fontWeight:600, background: r.estado === k ? "rgba(120,90,229,.08)" : "transparent" }}>
                  <e.Icon size={12} style={{ color:"var(--n400)" }} /> {e.l}
                  {r.estado === k && <Check size={12} style={{ marginLeft:"auto", color:"var(--teal-2)" }} />}
                </button>
              ))}
              <div style={{ fontSize:10, color:"var(--n400)", padding:"6px 9px 3px", lineHeight:1.45,
                borderTop:"1px solid var(--hair-soft)", marginTop:4 }}>
                El estado se calcula solo (la vigencia lo pasa a Vencida), pero acá lo pisás a mano para el seguimiento.
              </div>
            </div>
          )}
          <button className="btn btn-g btn-ico drawer-x" style={{ marginLeft:"auto" }} onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 17px 20px" }}>
          {/* quién / qué / cuánto */}
          <div style={{ fontSize:16.5, fontWeight:700, letterSpacing:"-.015em" }}>{r.cliente}</div>
          <div style={{ fontSize:12.5, color:"var(--n400)", marginTop:2 }}>{r.destino}</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:8 }}>
            <span className="mono" style={{ fontSize:21, fontWeight:700, letterSpacing:"-.02em", color:"var(--teal-3)" }}>
              {r.monto ? money(r.monto) : "Sin precio"}</span>
            {r.monto > 0 && <span style={{ fontSize:10.5, color:"var(--n400)" }}>opción principal · por adulto</span>}
          </div>

          {/* semáforo explicado */}
          <div className="a-pop" style={{ display:"flex", gap:11, marginTop:14, padding:"12px 13px", borderRadius:13,
            background:`${S.c}12`, border:`1px solid ${S.c}44` }}>
            <span className="sem-dot" style={{ background:S.c, width:12, height:12, marginTop:2, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12.5, fontWeight:800, color:S.c }}>{S.l}</div>
              <div style={{ fontSize:11.5, color:"var(--n600)", lineHeight:1.55, marginTop:2 }}>{S.d}</div>
            </div>
          </div>

          {/* ficha */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Ficha</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ padding:"9px 11px", borderRadius:11, background:"var(--tile)" }}>
              <div className="lbl" style={{ marginBottom:3 }}>Creada por</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:20, height:20, borderRadius:99, background:"linear-gradient(145deg,#A05ED3,#785AE5)",
                  color:"#fff", display:"grid", placeItems:"center", fontSize:8.5, fontWeight:700 }}>{V.inicial}</span>
                <span style={{ fontSize:12.5, fontWeight:700 }}>{V.nombre.split(" ")[0]}</span>
              </div>
            </div>
            <div style={{ padding:"9px 11px", borderRadius:11, background:"var(--tile)" }}>
              <div className="lbl" style={{ marginBottom:3 }}>Canal de envío</div>
              <div style={{ fontSize:12.5, fontWeight:700 }}>{r.hEnvio != null ? "WhatsApp" : "—"}</div>
            </div>
          </div>
          {vigResta != null && (
            <div style={{ marginTop:8, padding:"10px 12px", borderRadius:11, background:"var(--tile)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span className="lbl">Vigencia del link</span>
                <span className="mono" style={{ marginLeft:"auto", fontSize:11, fontWeight:600,
                  color: vigResta === 0 ? "var(--coral)" : "var(--n600)" }}>
                  {vigResta === 0 ? "vencido" : `quedan ${vigResta} h de ${vigTotal}`}</span>
                {/* v2D · D3 · la vigencia se arregla acá mismo, sin volver a compartir */}
                <button className="btn btn-g btn-xs" style={{ marginRight:-4 }}
                  title="Dejar el link activo 48 h más desde ahora"
                  onClick={() => onExtender?.(r)}><Clock3 size={11} /> +48 h</button>
              </div>
              <div style={{ height:5, borderRadius:99, background:"var(--sunk-2)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(vigResta / vigTotal) * 100}%`, borderRadius:99,
                  background: vigResta === 0 ? "var(--coral)" : vigResta < 12 ? "#E8A13C" : "linear-gradient(90deg,#45D4C0,#2A9E8E)",
                  transition:"width .6s" }} />
              </div>
              {vigResta === 0 && <div style={{ fontSize:10.5, color:"var(--coral)", marginTop:5 }}>
                Con <strong>+48 h</strong> o con un recordatorio vuelve a estar activo.</div>}
            </div>
          )}

          {/* stats de lectura */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Lectura del pasajero</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {stat("Aperturas", r.aperturas > 0 ? `${r.aperturas}` : null)}
            {stat("Hasta la 1ª apertura", r.hasta)}
            {stat("Tiempo de lectura", r.lectura)}
            {stat("Llegó hasta", r.hastaSec)}
          </div>

          {/* v2D · D1 · hasta dónde llegó, sección por sección */}
          {r.aperturas > 0 && (
            <>
              <FunnelLectura hastaSec={r.hastaSec} />
              {r.aperturas > 1 && (
                <div className="ins ins-lee a-rise">
                  <Sparkles size={13} style={{ color:"var(--violet-ink)" }} />
                  <span>{insightLectura(r.num)}</span>
                </div>
              )}
            </>
          )}

          {/* timeline */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Historia</div>
          <div>
            {eventos.map((ev, i) => (
              <div key={i} className="tl-row a-rise" style={{ animationDelay:`${i * .05}s` }}>
                <div className="tl-rail">
                  <span className="tl-dot" style={{ background:ev.c }} />
                  {i < eventos.length - 1 && <span className="tl-line" />}
                </div>
                <div style={{ paddingBottom: i < eventos.length - 1 ? 13 : 0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700 }}>{ev.t}</div>
                  <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginTop:1 }}>{ev.s}</div>
                </div>
              </div>
            ))}
          </div>


          {/* ── bitácora interna: se maneja acá mismo, sin abrir la cotización ── */}
          <div style={{ display:"flex", alignItems:"center", gap:7, margin:"16px 0 8px" }}>
            <span className="lbl">Notas internas</span>
            <Pill tone="coral"><Lock size={9} /> No se comparte</Pill>
          </div>
          <textarea className="in" rows={2} value={txtBit}
            style={{ width:"100%", resize:"none", lineHeight:1.5, paddingTop:8, fontSize:12 }}
            placeholder="Anotá y Enter… (Shift+Enter, salto)"
            onChange={(e) => setTxtBit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = txtBit.trim(); if (!t) return;
                onBitacora?.(r.num, [{ id:uid("bt"), autor:r.vendedor, hace:"recién", texto:t }, ...(r.bitacora || [])]);
                setTxtBit("");
              }
            }} />
          {(r.bitacora || []).length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
              {(r.bitacora || []).map((b, i) => {
                const a = VENDEDORES.find((v) => v.id === b.autor) || VENDEDORES[0];
                return (
                  <div key={b.id} className="a-pop" style={{ display:"flex", gap:8, padding:"8px 10px", borderRadius:10,
                    background:"var(--card-3)", border:"1px solid var(--hair-soft)", borderLeft:"3px solid var(--violet)" }}>
                    <span style={{ width:20, height:20, borderRadius:99, flexShrink:0, display:"inline-flex",
                      alignItems:"center", justifyContent:"center", fontSize:8.5, fontWeight:800, color:"#fff",
                      background:"linear-gradient(135deg,var(--violet),var(--violet-2))" }}>{a.inicial}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                        <span style={{ fontSize:11, fontWeight:700 }}>{a.nombre.split(" ")[0]}</span>
                        <span className="mono" style={{ fontSize:9.5, color:"var(--n400)" }}>{b.hace}</span>
                      </div>
                      <div style={{ fontSize:12, lineHeight:1.5, whiteSpace:"pre-wrap", overflowWrap:"anywhere" }}>{b.texto}</div>
                    </div>
                    <button className="btn btn-g btn-ico" style={{ width:23, height:23, flexShrink:0 }} title="Borrar anotación"
                      onClick={() => {
                        const resto = (r.bitacora || []).filter((x) => x.id !== b.id);
                        onBitacora?.(r.num, resto);
                        toast?.({ msg:"Anotación borrada", tone:"warn",
                          undo:() => onBitacora?.(r.num, [...resto.slice(0, i), b, ...resto.slice(i)]) });
                      }}><Trash2 size={11} /></button>
                  </div>
                );
              })}
            </div>
          )}

          {r.estado === "confirmada" && (
            <div className="a-pop" style={{ marginTop:14, padding:"11px 13px", borderRadius:12,
              background:"rgba(120,90,229,.07)", border:"1px solid rgba(120,90,229,.22)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                <Sparkles size={13} style={{ color:"var(--violet)" }} />
                <span style={{ fontSize:12, fontWeight:800, color:"var(--violet)" }}>Siguiente paso — Confirmador (Fase 2)</span>
              </div>
              <div style={{ fontSize:11.5, color:"var(--n600)", lineHeight:1.55 }}>
                Acá arranca el flujo de confirmación: confirmación de reserva al pasajero y disparo a los
                departamentos que reservan vuelos, hoteles y traslados. Nace de esta cotización, con la opción elegida.
              </div>
            </div>
          )}

          {/* v2D · D2 · el dato del negocio, una sola línea y sin vender nada */}
          <div className="ins ins-neg">
            <TrendingUp size={13} style={{ color:"var(--teal-2)" }} />
            <span>
              {r.aperturas > 0
                ? <>Las cotizaciones abiertas 3+ veces confirman <b>2,4× más</b> — esta va {r.aperturas}.</>
                : <>Las que se mandan antes de las 48 h se abren el doble — <b>esta todavía está a tiempo</b>.</>}
            </span>
          </div>
        </div>

        {/* acciones — dos filas, cada botón con su color */}
        <div style={{ padding:"12px 17px 13px", borderTop:"1px solid var(--hair-soft)", display:"flex",
          flexDirection:"column", gap:8 }}>
          <div className="drawer-acc" style={{ display:"flex", gap:8 }}>
            <Btn variant="tv" style={{ flex:1, height:38 }} title="Ver la cotización como la ve el pasajero"
              onClick={() => setPreview("cel")}>
              <Eye size={14} /> Ver cotización
            </Btn>
            <Btn variant="v" style={{ flex:1, height:38 }} title="Abrirla en el formulario de creación para editarla entera"
              onClick={() => onEditar?.(r)}>
              <PenLine size={13} /> Edición total
            </Btn>
          </div>
          <div className="drawer-acc" style={{ display:"flex", gap:8 }}>
            <Btn variant="tt" style={{ flex:1, height:38 }}
              onClick={() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
              {copiado ? <><Check size={13} /> Copiado</> : <><Link2 size={13} /> Copiar link</>}
            </Btn>
            <Btn variant="p" style={{ flex:1, height:38 }} onClick={() => setComp(true)}>
              <Send size={13} /> Recordatorio
            </Btn>
            {puedeConfirmar && (
              <button className="btn btn-hero" style={{ flex:1.1, height:38, borderRadius:11, fontSize:13 }}
                onClick={() => setConfOpen(true)}>
                <CheckCheck size={14} /> Confirmar
              </button>
            )}
          </div>
        </div>

        {/* panel de confirmación */}
        {confOpen && (
          <div className="a-slide" style={{ position:"absolute", left:0, right:0, bottom:0, background:"var(--card)",
            borderTop:"1px solid var(--hair)", borderRadius:"18px 18px 0 0", padding:"16px 17px 18px",
            boxShadow:"0 -20px 50px -18px rgba(17,17,36,.3)", zIndex:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div className="disp" style={{ fontSize:16, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>Confirmar cotización</div>
              <button className="btn btn-g btn-ico" onClick={() => setConfOpen(false)}><X size={14} /></button>
            </div>
            <div className="lbl" style={{ marginBottom:7 }}>¿Qué opción eligió el pasajero?</div>
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {["Opción 1","Opción 2","Opción 3"].map((o) => (
                <button key={o} className={`chip ${op === o ? "chip-on" : ""}`} onClick={() => setOp(o)}>{o}</button>
              ))}
            </div>
            <div className="lbl" style={{ marginBottom:7 }}>¿Cómo confirmó?</div>
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {["WhatsApp","Desde el link","Llamada"].map((v) => (
                <button key={v} className={`chip ${via === v ? "chip-on" : ""}`} onClick={() => setVia(v)}>{v}</button>
              ))}
            </div>
            <button className="btn btn-hero" style={{ width:"100%", height:44, borderRadius:12, fontSize:14 }}
              onClick={() => { onConfirmar?.(r.num, op, via); setConfOpen(false); }}>
              <CheckCheck size={16} /> Confirmar {op}
            </button>
            <div style={{ fontSize:10.5, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
              La cotización pasa a Confirmada y queda lista para el flujo del Confirmador (Fase 2).
            </div>
          </div>
        )}
      </div>
      {comp && <ModalCompartir q={qLite} marca="traveloz" recordatorio toast={toast}
        onClose={() => setComp(false)} onEnviada={() => onRecordatorio?.(r)} />}
      {preview && (() => {
        const tramosPrev = [{ id:"t1", ciudad:qPrev.titulo.destino, noches:7, checkin:"2026-10-15", checkout:"2026-10-22", manual:false }];
        return (
        <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="a-zoom" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, maxWidth:"96vw" }}>

            {/* mismo selector de formato que la vista previa del editor */}
            <div style={{ display:"flex", gap:4, padding:4, borderRadius:13,
              background:"rgba(255,255,255,.12)", backdropFilter:"blur(8px)" }}>
              {[["cel","Celular",Smartphone],["tab","Tablet",null],["desk","Escritorio",Monitor]].map(([k, l, I]) => (
                <button key={k} onClick={() => setPreview(k)}
                  style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10,
                    fontSize:13, fontWeight:700, transition:"all .18s",
                    background: preview === k ? "#fff" : "transparent",
                    color: preview === k ? "#1A1A2E" : "rgba(255,255,255,.75)",
                    boxShadow: preview === k ? "0 4px 14px rgba(0,0,0,.25)" : "none" }}>
                  {I ? <I size={13} /> : <Smartphone size={15} style={{ transform:"rotate(90deg)" }} />}
                  {l}
                </button>
              ))}
            </div>

            {preview === "cel" && (
              <div className="phone a-zoom" key="cel">
                <div className="phone-scr">
                  <div className="notch" />
                  <SalidaPasajero q={qPrev} marca="traveloz" vendedor={r.vendedor} tramos={tramosPrev} />
                </div>
              </div>
            )}

            {preview === "tab" && (
              <div className="a-zoom" key="tab" style={{ width:"min(700px,94vw)", borderRadius:30, padding:12,
                background:"linear-gradient(160deg,#2A2A45,#14142A)",
                boxShadow:"0 34px 80px -24px rgba(17,17,36,.55), 0 0 0 1px rgba(255,255,255,.06) inset" }}>
                <div style={{ borderRadius:20, overflow:"hidden", background:"#fff", height:"min(540px,66vh)", overflowY:"auto" }}>
                  <SalidaPasajero q={qPrev} marca="traveloz" vendedor={r.vendedor} tramos={tramosPrev} modo="desk" />
                </div>
              </div>
            )}

            {preview === "desk" && (
              <div className="browser a-zoom" key="desk" style={{ width:"min(940px,96vw)" }}>
                <div className="browser-bar">
                  <span className="browser-dot" style={{ background:"#F25C54" }} />
                  <span className="browser-dot" style={{ background:"#F7B267" }} />
                  <span className="browser-dot" style={{ background:"#45D4C0" }} />
                  <div className="browser-url">
                    <Lock size={10} style={{ color:"var(--teal-2)" }} />
                    traveloz.com.uy/c/{r.num.toLowerCase()}
                  </div>
                </div>
                <div style={{ height:"min(560px,66vh)", overflowY:"auto" }}>
                  <SalidaPasajero q={qPrev} marca="traveloz" vendedor={r.vendedor} tramos={tramosPrev} modo="desk" />
                </div>
              </div>
            )}

            <Btn onClick={() => setPreview(null)}><X size={14} /> Cerrar vista previa</Btn>
          </div>
        </div>
        );
      })()}
    </>
  );
}

export { DrawerAnalytics };
