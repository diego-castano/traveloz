"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText, Copy, Check, Send, Download, Eye, X, Mail, Smartphone, Loader2, AlertCircle, Link2,
  Printer, Lock
} from "lucide-react";
import { Btn, Label } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARTIR
   ═══════════════════════════════════════════════════════════════════════════ */

function ModalCompartir({ q, marca, onClose, onEnviada, toast, recordatorio = false, onVigencia }) {
  const [tab, setTab] = useState("whatsapp");
  const [extras, setExtras] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [vig, setVig] = useState(q.vigencia ?? 48);
  const avisos = useMemo(() => {
    const a = [];
    if (!q.cliente.nombre) a.push("Sin nombre de cliente — el saludo sale genérico");
    if (!q.fechaSalida) a.push("Sin fecha de salida");
    if (!q.opciones.length) a.push("Sin opciones hoteleras");
    q.opciones.forEach((o, i) => { if (!Number(o.neto)) a.push(`${o.nombre || `Opción ${i + 1}`} sin precio`); });
    if (!q.vuelos.length) a.push("Sin itinerario de vuelos");
    return a;
  }, [q]);
  const link = `traveloz.com.uy/c/${q.numero.toLowerCase()}`;

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const copiar = () => { setCopiado(true); toast?.({ msg:"Link copiado al portapapeles", tone:"ok" }); setTimeout(() => setCopiado(false), 2200); };
  const enviar = () => { setEnviando(true); setTimeout(() => { setEnviando(false); onEnviada();
    toast?.({ msg: recordatorio ? "Recordatorio enviado al pasajero." : "Cotización enviada. Te avisamos cuando la abran.", tone:"ok" }); onClose(); }, 900); };

  const TABS = [["whatsapp","WhatsApp",Smartphone],["email","Email",Mail],["pdf","PDF",Printer]];

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(520px,100%)", padding:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>{recordatorio ? "Enviar recordatorio" : "Compartir cotización"}</div>
          <span className="mono" style={{ fontSize:11, color:"var(--n400)" }}>{q.numero}</span>
          <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>
        </div>

        {!recordatorio && avisos.length > 0 && (
          <div className="a-slide" style={{ margin:"11px 17px 0", padding:"10px 12px", borderRadius:12,
            background:"rgba(247,178,103,.12)", border:"1px solid rgba(247,178,103,.32)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <AlertCircle size={13} style={{ color:"#8A5A16" }} />
              <span style={{ fontSize:12, fontWeight:700, color:"#8A5A16" }}>
                Antes de enviar — {avisos.length} {avisos.length === 1 ? "detalle" : "detalles"} (no bloquea)</span>
            </div>
            {avisos.slice(0, 4).map((a) => (
              <div key={a} style={{ fontSize:11.5, color:"#8A5A16", paddingLeft:20, lineHeight:1.6 }}>· {a}</div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:8, margin:"11px 17px 0", flexWrap:"wrap" }}>
          <span className="lbl">Vigencia del link</span>
          <div className="seg">
            {[24, 48, 72].map((h) => (
              <button key={h} data-on={vig === h ? "1" : "0"}
                onClick={() => { setVig(h); onVigencia?.(h); }}>{h}h</button>
            ))}
          </div>
          <span style={{ fontSize:10.5, color:"var(--n400)" }}>después se muestra como vencida y se puede reactivar</span>
        </div>

        <div style={{ display:"flex", gap:5, padding:"11px 17px 0" }}>
          {TABS.map(([k, l, I]) => (
            <button key={k} className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>
              <I size={12} /> {l}
            </button>
          ))}
        </div>

        <div style={{ padding:"15px 17px 17px" }}>
          {tab === "whatsapp" && (
            <>
              <Label hint="es el canal principal">Link para el pasajero</Label>
              <div style={{ display:"flex", gap:8 }}>
                <div className="in mono" style={{ flex:1, display:"flex", alignItems:"center", color:"var(--n600)", overflow:"hidden" }}>{link}</div>
                <Btn variant={copiado ? "p" : "s"} onClick={copiar} style={{ flexShrink:0 }}>
                  {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </Btn>
              </div>
              <div style={{ marginTop:13, padding:"12px 13px", borderRadius:12, background:"#E6F8F5",
                border:"1px solid rgba(59,191,173,.28)" }}>
                <div style={{ fontSize:12, lineHeight:1.6, color:"#165C53" }}>
                  {recordatorio
                    ? <>Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""} 👋 ¿pudiste ver la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>? Te la dejo de nuevo por acá 👇<br />{link}</>
                    : <>Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""}, te comparto la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>. Se abre desde el celular 👇<br />{link}</>}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                <Eye size={12} style={{ color:"var(--teal-2)" }} />
                Registramos si el pasajero la abre. Si no la abrió a las 48 horas, te avisamos.
              </div>
              <Btn variant="p" onClick={enviar} style={{ width:"100%", marginTop:14, height:42 }} disabled={enviando}>
                {enviando ? <Loader2 size={15} className="spin" /> : <Link2 size={15} />} {recordatorio ? "Enviar recordatorio" : "Marcar como enviada"}
              </Btn>
            </>
          )}

          {tab === "email" && (
            <>
              <Label>Para</Label>
              <div className="in" style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                <Mail size={13} style={{ color:"var(--n300)" }} />
                <span style={{ fontSize:13 }}>{q.cliente.email || <span style={{ color:"var(--n300)" }}>Sin email cargado</span>}</span>
              </div>
              <Label>Copia</Label>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
                <span className="chip chip-on" style={{ gap:6 }}>
                  <Lock size={10} /> cotizaciones@traveloz.com.uy
                </span>
                <span style={{ fontSize:11, color:"var(--n400)" }}>fija, siempre</span>
              </div>
              <Label hint="separados por coma">Otros destinatarios</Label>
              <input className="in" value={extras} placeholder="supervisor@…, operaciones@…"
                onChange={(e) => setExtras(e.target.value)} />
              <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                <Download size={12} style={{ color:"var(--teal-2)" }} /> El PDF va adjunto automáticamente.
              </div>
              <Btn variant="p" onClick={enviar} style={{ width:"100%", marginTop:14, height:42 }} disabled={enviando}>
                {enviando ? <Loader2 size={15} className="spin" /> : <Send size={15} />} Enviar cotización
              </Btn>
            </>
          )}

          {tab === "pdf" && (
            <>
              <div style={{ display:"flex", gap:12, alignItems:"center", padding:"13px", borderRadius:12,
                border:"1px solid var(--hair-soft)", background:"#FCFCFE", marginBottom:12 }}>
                <div style={{ width:44, height:56, borderRadius:7, background:"#fff", border:"1px solid var(--hair)",
                  display:"grid", placeItems:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(26,26,46,.07)" }}>
                  <FileText size={19} style={{ color:"var(--coral)" }} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{q.numero}.pdf</div>
                  <div style={{ fontSize:11.5, color:"var(--n400)" }}>
                    {q.opciones.length} opciones · {q.vuelos.length} tramos · saltos de página controlados
                  </div>
                </div>
              </div>
              <div style={{ fontSize:11.5, color:"var(--n400)", lineHeight:1.6, marginBottom:14 }}>
                Sale bien de una: sin Ctrl+P, sin ajustar márgenes, sin tablas cortadas al medio
                y sin la firma huérfana en la última hoja.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="p" style={{ flex:1, height:42 }} onClick={() => toast({ msg:"PDF generado", tone:"ok" })}>
                  <Download size={15} /> Descargar
                </Btn>
                <Btn style={{ flex:1, height:42 }} onClick={() => toast({ msg:"Enviado a la impresora", tone:"ok" })}>
                  <Printer size={15} /> Imprimir
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { ModalCompartir };
