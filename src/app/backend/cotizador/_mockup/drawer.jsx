"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Sparkles, Check, ChevronDown, Send, Eye, X, CheckCheck, PenLine, Trash2, Clock3, Copy,
  Lock, Smartphone, Monitor, Loader2, Link2, Download, Users, CreditCard, ClipboardList,
  MailCheck, Clock3 as Reloj, ExternalLink, Inbox
} from "lucide-react";
import { semaforo, fmtHace, money, ESTADOS } from "./data";
import { useCtz, buscarVendedor } from "./contexto";
import { obtenerPresupuesto, emitirLink, datosDelPasajero } from "@/actions/presupuesto.actions";
import { SECCIONES } from "@/lib/presupuesto/secciones";
import { calcularTramos } from "./tramos";
import { Btn, Pill } from "./ui";
import { SalidaPasajero } from "./telefono";
import { ModalCompartir } from "./compartir";

/* El detalle de lectura del pasajero —cuántas veces la abrió, cuánto tardó en
   abrirla, hasta qué sección llegó y desde qué dispositivo— sale de las
   aperturas del link público. Una cotización que nunca se compartió no tiene
   nada de eso: ahí el drawer dice "Sin datos todavía" en vez de dibujar un
   embudo inventado. */
function SinDatos() {
  return <span style={{ color:"var(--n300)", fontWeight:500, fontSize:12 }}>Sin datos todavía</span>;
}

/* ── Drawer de analytics de una cotización ─────────────────────────────── */
function DrawerAnalytics({ r, onClose, onConfirmar, onEstado, onExtender, onRecordatorio, onEditar, onDuplicar, onBitacora, onEliminar, toast }) {
  const { vendedores } = useCtz();
  const V = buscarVendedor(vendedores, r.vendedor);
  const S = semaforo(r);
  const E = ESTADOS[r.estado];
  /* null | "recordatorio" | "datos": el modal de compartir abre en esa pestaña */
  const [comp, setComp] = useState(null);
  const [confOpen, setConfOpen] = useState(false);
  const [editEst, setEditEst] = useState(false);
  const [preview, setPreview] = useState(null);   // null | "cel" | "tab" | "desk"
  /* el contenido real de la cotización: se trae recién cuando hace falta
     (vista previa o recordatorio), no en cada apertura del drawer */
  const [contenido, setContenido] = useState(null);
  const [cargandoQ, setCargandoQ] = useState(false);
  const cargarContenido = async () => {
    if (contenido) return contenido;
    setCargandoQ(true);
    const res = await obtenerPresupuesto(r.id);
    setCargandoQ(false);
    if (!res.ok) { toast?.({ msg:res.error, tone:"warn" }); return null; }
    setContenido(res.data.contenido);
    return res.data.contenido;
  };
  /* los tramos salen del mismo helper que usa el editor y la página pública:
     una sola aritmética para las tres pantallas */
  const tramosPrev = useMemo(() => (contenido ? calcularTramos(contenido) : []), [contenido]);
  /* El link vivo llega con la fila. "Copiar link" en una cotización que nunca
     se compartió emite uno con canal manual — y eso, como cualquier emisión,
     sella el envío: desde que existe una URL viva el pasajero puede abrirla. */
  const [linkUrl, setLinkUrl] = useState(r.linkUrl || null);
  const [copiando, setCopiando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { setLinkUrl(r.linkUrl || null); }, [r.id, r.linkUrl]);

  const copiarLink = async () => {
    if (copiando) return;
    let url = linkUrl;
    if (!url) {
      setCopiando(true);
      const res = await emitirLink(r.id, { canal:"manual", vigenciaHoras: r.vigencia || 48 });
      setCopiando(false);
      if (!res.ok) { toast?.({ msg:res.error, tone:"warn" }); return; }
      url = res.data.url;
      setLinkUrl(url);
      onRecordatorio?.(r, res.data);
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
      toast?.({ msg:"Link copiado", tone:"ok" });
    } catch {
      toast?.({ msg:"El navegador no dejó copiar — seleccioná la URL a mano", tone:"warn" });
    }
  };

  /* El PDF lo genera el server contra el link público (`/api/cotizador/<id>/pdf`).
     Se abre en una pestaña: así el navegador maneja la descarga y muestra su
     propio error si el server contesta 503 (sin Chromium) o 504. */
  const bajarPdf = () => {
    window.open(`/api/cotizador/${r.id}/pdf`, "_blank", "noopener");
  };

  /* ── lo que llegó del pasajero para ESTA cotización ──────────────────────
     Solicitudes, envíos y tarjetas atados por el número (COT-…). Se pide al
     abrir el drawer: son tres consultas chicas y es lo primero que el vendedor
     mira cuando la cotización ya está confirmada. */
  const [datos, setDatos] = useState(null);
  const [errDatos, setErrDatos] = useState(null);
  const cargarDatos = useCallback(async () => {
    const res = await datosDelPasajero(r.id);
    if (!res.ok) { setErrDatos(res.error); return; }
    setErrDatos(null);
    setDatos(res.data);
  }, [r.id]);
  useEffect(() => { setDatos(null); void cargarDatos(); }, [cargarDatos]);

  const [op, setOp] = useState("Opción 1");
  const [via, setVia] = useState("WhatsApp");
  const [borrando, setBorrando] = useState(false);
  const [notas, setNotas] = useState(r.bitacora || "");
  /* también con el link vencido: el pasajero puede haber confirmado por
     teléfono un rato después, y el vendedor tiene que poder anotarlo */
  const puedeConfirmar = r.estado === "enviada" || r.estado === "abierta" || r.estado === "vencida";
  const apDet = r.apDet || [];
  /* la vigencia y el vencimiento son los que guardó el server al marcarla enviada */
  const vigTotal = r.vigencia || 48;
  const vigResta = useMemo(() => {
    if (!r.expiraAt) return null;
    const t = new Date(r.expiraAt).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.max(0, Math.round((t - Date.now()) / 3600000));
  }, [r.expiraAt]);

  /* Notas internas: se escriben acá y viajan al server 800 ms después de la
     última tecla. El texto local manda mientras se escribe, así el cursor no
     salta cuando vuelve la fila refrescada. */
  const notasRef = useRef(notas);
  notasRef.current = notas;
  const idNotas = useRef(r.id);
  useEffect(() => {
    if (idNotas.current !== r.id) { idNotas.current = r.id; setNotas(r.bitacora || ""); }
  }, [r.id, r.bitacora]);
  useEffect(() => {
    if ((r.bitacora || "") === notas) return;
    const t = setTimeout(() => onBitacora?.(r, notasRef.current), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas]);
  const eventos = [
    { c:"#B0B4CD", t:`Creada por ${V.nombre.split(" ")[0]}`, s:r.dias === 0 ? "hoy" : `hace ${r.dias} d` },
    ...(r.hEnvio != null ? [{ c:"#785AE5", t:"Enviada al pasajero", s:fmtHace(r.hEnvio) }] : []),
    ...apDet.map((a, i) => ({ c:"#2A9E8E", t: i === 0 ? "Primera apertura" : "Reabierta",
      s:`${a.hace} · ${a.disp}${a.seccion && a.seccion !== "—" ? ` · llegó a ${a.seccion}` : ""}` })),
    ...(r.estado === "confirmada" ? [{ c:"#2A9E8E",
      t: r.confOpcion ? `Confirmada · ${r.confOpcion}` : "Confirmada",
      s: r.confVia ? `vía ${r.confVia}` : "—" }] : []),
    /* lo que se hace desde este drawer queda escrito hasta el próximo refresco */
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
                <button key={k} onClick={() => { onEstado?.(r, k); setEditEst(false); }}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 9px", borderRadius:8,
                    fontSize:12.5, fontWeight:600, background: r.estado === k ? "rgba(120,90,229,.08)" : "transparent" }}>
                  <e.Icon size={12} style={{ color:"var(--n400)" }} /> {e.l}
                  {r.estado === k && <Check size={12} style={{ marginLeft:"auto", color:"var(--teal-2)" }} />}
                </button>
              ))}
              {r.estadoManual && (
                <button onClick={() => { onEstado?.(r, null); setEditEst(false); }}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 9px",
                    borderRadius:8, fontSize:12, fontWeight:600, color:"var(--n500)" }}>
                  <PenLine size={12} style={{ opacity:.6 }} /> Volver al automático
                </button>
              )}
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
              <div className="lbl" style={{ marginBottom:3 }}>Enviada</div>
              <div style={{ fontSize:12.5, fontWeight:700 }}>{fmtHace(r.hEnvio)}</div>
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
                  title="Correr el vencimiento 48 h hacia adelante"
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

          {/* la URL que tiene el pasajero, tal cual */}
          <div style={{ marginTop:8, padding:"10px 12px", borderRadius:11, background:"var(--tile)" }}>
            <div className="lbl" style={{ marginBottom:6 }}>Link del pasajero</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Link2 size={13} style={{ color: linkUrl ? "var(--violet)" : "var(--n300)", flexShrink:0 }} />
              <span className="mono" style={{ fontSize:11.5, flex:1, minWidth:0, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap",
                color: linkUrl ? "var(--n600)" : "var(--n300)" }}>
                {linkUrl || "Sin link todavía"}
              </span>
              <button className="btn btn-g btn-xs" onClick={copiarLink} disabled={copiando}
                title={linkUrl ? "Copiar la URL" : "Generar el link y copiarlo"}>
                {copiando ? <Loader2 size={11} className="spin" />
                  : copiado ? <><Check size={11} /> Copiado</>
                  : <><Copy size={11} /> {linkUrl ? "Copiar" : "Generar"}</>}
              </button>
              <button className="btn btn-g btn-xs" onClick={bajarPdf}
                title="Bajar el PDF con la misma hoja que ve el pasajero">
                <Download size={11} /> PDF
              </button>
            </div>
            {!linkUrl && (
              <div style={{ fontSize:10.5, color:"var(--n400)", marginTop:6, lineHeight:1.5 }}>
                Generarlo sella el envío: desde que existe la URL el pasajero puede abrirla.
              </div>
            )}
          </div>

          {/* stats de lectura */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Lectura del pasajero</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {stat("Aperturas", r.aperturas > 0 ? `${r.aperturas}` : <SinDatos />)}
            {stat("Hasta la 1ª apertura", r.hasta ?? <SinDatos />)}
            {stat("Tiempo de lectura", r.lectura ?? <SinDatos />)}
            {stat("Llegó hasta", r.hastaSec ?? <SinDatos />)}
          </div>
          {/* embudo: hasta qué sección bajó. `hastaSecIdx` es el índice en
              SECCIONES (src/lib/presupuesto/secciones.ts), que es el mismo
              orden que manda el beacon de la página pública. */}
          {r.hastaSecIdx >= 0 ? (
            <div style={{ marginTop:12 }}>
              {SECCIONES.map((sc, i) => (
                <div key={sc.clave} className="fun-row"
                  data-on={i <= r.hastaSecIdx ? "1" : "0"}
                  data-fin={i === r.hastaSecIdx ? "1" : "0"}>
                  <span className="fun-l">{sc.label}</span>
                  <span className="fun-t">
                    <span className="fun-b" style={{ width: i <= r.hastaSecIdx ? "100%" : "0%" }} />
                  </span>
                </div>
              ))}
              <div style={{ fontSize:10.5, color:"var(--n400)", marginTop:7, lineHeight:1.5 }}>
                Se mide con la sección que quedó en pantalla mientras leía. Volver
                a subir no borra lo que ya vio.
              </div>
            </div>
          ) : (
            <div style={{ fontSize:10.5, color:"var(--n400)", marginTop:7, lineHeight:1.5 }}>
              Cuando el pasajero abra el link vas a ver acá cuánto tardó en abrirla,
              cuánto la leyó y hasta qué sección bajó.
            </div>
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


          {/* ── datos del pasajero: lo que volvió por los links del vendedor ── */}
          <div style={{ display:"flex", alignItems:"center", gap:7, margin:"18px 0 8px" }}>
            <span className="lbl">Datos del pasajero</span>
            <button className="btn btn-g btn-xs" style={{ marginLeft:"auto" }}
              title="Mandarle el formulario de datos o el de tarjeta"
              disabled={cargandoQ}
              onClick={async () => { if (await cargarContenido()) setComp("datos"); }}>
              <ClipboardList size={11} /> Pedir datos
            </button>
          </div>

          {errDatos ? (
            <div style={{ fontSize:11.5, color:"var(--coral)", lineHeight:1.5 }}>{errDatos}</div>
          ) : !datos ? (
            <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:11.5, color:"var(--n400)" }}>
              <Loader2 size={12} className="spin" /> Buscando lo que llegó con {r.num}…
            </div>
          ) : (
            <BloqueDatos d={datos} num={r.num} />
          )}

          {/* ── bitácora interna: se maneja acá mismo, sin abrir la cotización ── */}
          <div style={{ display:"flex", alignItems:"center", gap:7, margin:"16px 0 8px" }}>
            <span className="lbl">Notas internas</span>
            <Pill tone="coral"><Lock size={9} /> No se comparte</Pill>
          </div>
          <textarea className="in" rows={5} value={notas}
            style={{ width:"100%", resize:"none", lineHeight:1.5, paddingTop:8, fontSize:12 }}
            placeholder="Escribí libre: netos, avisos, pedidos especiales…"
            onChange={(e) => setNotas(e.target.value)} />

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

          {/* baja lógica: la fila queda en el histórico y en la auditoría */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:18 }}>
            <button
              style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11.5, fontWeight:600,
                color: borrando ? "var(--coral)" : "var(--n400)" }}
              onClick={() => {
                if (!borrando) { setBorrando(true); setTimeout(() => setBorrando(false), 4000); return; }
                onEliminar?.(r);
              }}>
              <Trash2 size={12} /> {borrando ? "Confirmá: eliminar esta cotización" : "Eliminar cotización"}
            </button>
          </div>
        </div>

        {/* acciones — dos filas, cada botón con su color */}
        <div style={{ padding:"12px 17px 13px", borderTop:"1px solid var(--hair-soft)", display:"flex",
          flexDirection:"column", gap:8 }}>
          <div className="drawer-acc" style={{ display:"flex", gap:8 }}>
            <Btn variant="tv" style={{ flex:1, height:38 }} title="Ver la cotización como la ve el pasajero"
              disabled={cargandoQ}
              onClick={async () => { if (await cargarContenido()) setPreview("cel"); }}>
              {cargandoQ ? <Loader2 size={14} className="spin" /> : <Eye size={14} />} Ver cotización
            </Btn>
            <Btn variant="v" style={{ flex:1, height:38 }} title="Abrirla en el formulario de creación para editarla entera"
              onClick={() => onEditar?.(r)}>
              <PenLine size={13} /> Edición total
            </Btn>
          </div>
          <div className="drawer-acc" style={{ display:"flex", gap:8 }}>
            <Btn variant="tt" style={{ flex:1, height:38 }} title="Copiar esta cotización en una nueva"
              onClick={() => onDuplicar?.(r)}>
              <Copy size={13} /> Duplicar
            </Btn>
            <Btn variant="p" style={{ flex:1, height:38 }} disabled={cargandoQ}
              onClick={async () => { if (await cargarContenido()) setComp("recordatorio"); }}>
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
              {(contenido?.opciones?.length
                ? contenido.opciones.map((o, i) => o.nombre || `Opción ${i + 1}`)
                : ["Opción 1","Opción 2","Opción 3"]).map((o) => (
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
              onClick={() => { onConfirmar?.(r, op, via); setConfOpen(false); }}>
              <CheckCheck size={16} /> Confirmar {op}
            </button>
            <div style={{ fontSize:10.5, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
              La cotización pasa a Confirmada y queda lista para el flujo del Confirmador (Fase 2).
            </div>
          </div>
        )}
      </div>
      {comp && contenido && <ModalCompartir q={contenido} presupuestoId={r.id} vendedor={r.vendedor}
        recordatorio={comp === "recordatorio"} tabInicial={comp === "datos" ? "datos" : undefined}
        toast={toast} onPedido={cargarDatos}
        onClose={() => setComp(null)} onEnviada={(d) => onRecordatorio?.(r, d)} />}
      {preview && contenido && (() => {
        const qPrev = contenido;
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
                    {linkUrl
                      ? linkUrl.replace(/^https?:\/\//, "")
                      : <span style={{ opacity:.6 }}>sin link todavía</span>}
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

/* ── Lo recibido para una cotización ──────────────────────────────────────
   Tres listas cortas: las solicitudes que salieron con este número, los grupos
   de pasajeros que volvieron y las tarjetas que quedaron en la bóveda. Cada
   fila abre su ficha en el panel — la ruta es la misma para el vendedor y para
   el admin: cada uno entra con su propio alcance.

   Las tarjetas se atan por la solicitud, que es el único hilo que guarda el
   modelo de la bóveda: una tarjeta cargada desde el link permanente (sin
   solicitud) no puede saber a qué cotización pertenece. */
function BloqueDatos({ d, num }) {
  const nada = !d.solicitudes.length && !d.envios.length && !d.pagos.length;
  if (nada) {
    return (
      <div style={{ display:"flex", gap:9, padding:"11px 12px", borderRadius:12,
        background:"var(--tile)" }}>
        <Inbox size={15} style={{ color:"var(--n300)", flexShrink:0, marginTop:1 }} />
        <div style={{ fontSize:11.5, color:"var(--n500)", lineHeight:1.55 }}>
          Todavía no llegó nada con la referencia <span className="mono">{num}</span>. Con
          <strong> Pedir datos</strong> le mandás el formulario y lo que cargue vuelve acá.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
      {d.solicitudes.map((sx) => {
        const tono = sx.estado === "completada" ? "teal" : sx.estado === "vencida" ? "coral" : "n";
        const Icono = sx.tipo === "PAGO" ? CreditCard : Users;
        return (
          <div key={sx.id} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px",
            borderRadius:11, background:"var(--tile)" }}>
            <Icono size={13} style={{ color:"var(--n400)", flexShrink:0 }} />
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden",
                textOverflow:"ellipsis" }}>
                {sx.tipo === "PAGO" ? "Datos de tarjeta" : "Datos de pasajeros"} · pedidos por email
              </div>
              <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginTop:1,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {sx.destinatarioEmail} · {fmtDesde(sx.enviadoAt)}
              </div>
            </div>
            <Pill tone={tono}>
              {sx.estado === "completada" ? <><MailCheck size={9} /> Completada</>
                : sx.estado === "vencida" ? <><Reloj size={9} /> Vencida</>
                : <><Reloj size={9} /> Vigente</>}
            </Pill>
          </div>
        );
      })}

      {d.envios.map((e) => (
        <a key={e.id} href={e.href} target="_blank" rel="noreferrer"
          style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:11,
            background:"rgba(59,191,173,.09)", border:"1px solid rgba(42,158,142,.25)",
            textDecoration:"none", color:"inherit" }}>
          <Users size={13} style={{ color:"var(--teal-3)", flexShrink:0 }} />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700 }}>
              {e.cantidad} {e.cantidad === 1 ? "pasajero" : "pasajeros"} · {e.contacto}
            </div>
            <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginTop:1 }}>
              {fmtDesde(e.createdAt)}{e.vistoAt ? "" : " · sin abrir"}
            </div>
          </div>
          <ExternalLink size={12} style={{ color:"var(--n400)", flexShrink:0 }} />
        </a>
      ))}

      {d.pagos.map((pg) => (
        <a key={pg.id} href={pg.href} target="_blank" rel="noreferrer"
          style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:11,
            background:"rgba(120,90,229,.08)", border:"1px solid rgba(120,90,229,.22)",
            textDecoration:"none", color:"inherit" }}>
          <CreditCard size={13} style={{ color:"var(--violet)", flexShrink:0 }} />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden",
              textOverflow:"ellipsis" }}>
              {pg.titular} · {pg.emisor || "Tarjeta"} •••• {pg.ultimos4}
            </div>
            <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginTop:1 }}>
              {fmtDesde(pg.createdAt)} · {pg.estado === "purgado" ? "ya no se puede abrir" : pg.estado === "visto" ? "abierta" : "en la bóveda"}
            </div>
          </div>
          <ExternalLink size={12} style={{ color:"var(--n400)", flexShrink:0 }} />
        </a>
      ))}
    </div>
  );
}

/* "hace 3 h" con el mismo formateo que el resto del drawer. */
function fmtDesde(fecha) {
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return "—";
  return fmtHace(Math.max(0, Math.round((Date.now() - t) / 3600000)));
}

export { DrawerAnalytics };
