"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText, CheckCheck, Download, Eye, X, Mail, Smartphone, Loader2, AlertCircle,
  Printer, Lock, Info, Check
} from "lucide-react";
import { Btn, Label } from "./ui";
import { precioOpcion } from "./data";
import { useAjustes } from "./contexto";
import { marcarEnviada } from "@/actions/presupuesto.actions";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARTIR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Compartir una cotización.
 *
 * Los links públicos y el envío automático (WhatsApp Business y el mail con el
 * PDF adjunto) llegan en la próxima ola. Hasta entonces las dos pestañas de
 * envío quedan visibles pero apagadas —para que se vea a dónde va la cosa— y
 * el camino real es: PDF + "Marcar como enviada", que es lo que arranca el
 * reloj de la vigencia y el seguimiento.
 *
 * `presupuestoId` es la fila en la base; sin él no hay nada que marcar (una
 * cotización recién abierta que todavía no guardó).
 */
function ModalCompartir({ q, presupuestoId, onClose, onEnviada, toast, recordatorio = false, onVigencia, onIr, onPreview, onImprimir }) {
  const { emailCopia, vigenciaDefault } = useAjustes();
  const tel = String(q.cliente.telefono || "").trim();
  const nom = String(q.cliente.nombre || "").trim();
  const [tab, setTab] = useState("pdf");
  const [extras, setExtras] = useState("");
  const [canal, setCanal] = useState(tel ? "whatsapp" : "email");
  const [marcando, setMarcando] = useState(false);
  const [vig, setVig] = useState(q.vigencia ?? vigenciaDefault ?? 48);

  /* v2C · pre-flight: cuenta lo que falta, nunca frena el envío */
  const checks = useMemo(() => {
    const l = [];
    l.push(tel
      ? { k:"tel", t:"ok", txt:`WhatsApp listo: ${tel}` }
      : { k:"tel", t:"warn", txt:"Sin teléfono — WhatsApp queda para cuando lo cargues", ir:"b-cliente" });
    l.push(nom
      ? { k:"nom", t:"ok", txt:`El saludo va a nombre de ${nom}` }
      : { k:"nom", t:"warn", txt:"Sin nombre — el saludo va a salir genérico", ir:"b-cliente" });
    if (q.soloVuelos) {
      if (!Number(q.precioVuelo?.adulto))
        l.push({ k:"op", t:"warn", txt:"Falta el precio del vuelo", ir:"b-vuelos" });
    } else {
      const sinPrecio = q.opciones.filter((o) => !precioOpcion(o)).length;
      if (!q.opciones.length)
        l.push({ k:"op", t:"warn", txt:"Sin opciones de alojamiento — la cotización sale sin precio", ir:"b-alojamiento" });
      else if (sinPrecio)
        l.push({ k:"op", t:"warn", ir:"b-alojamiento",
          txt: sinPrecio === 1 ? "Hay una opción sin precio cargado" : `Hay ${sinPrecio} opciones sin precio cargado` });
    }
    if (!q.vuelos.length)
      l.push({ k:"vue", t:"info", txt:"Sin vuelos cargados — la cotización sale sin ese bloque" });
    return l;
  }, [q.opciones, q.vuelos.length, q.soloVuelos, q.precioVuelo, tel, nom]);
  const todoListo = checks.every((c) => c.t === "ok");

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  /* Sella el envío en la base: arranca el reloj de la vigencia y la fila pasa a
     Enviada en el seguimiento. El mensaje sale por afuera (el vendedor manda el
     PDF), así que acá solo queda registrado que salió y por dónde. */
  const marcar = async () => {
    if (marcando) return;
    if (!presupuestoId) {
      toast?.({ msg:"Guardá la cotización antes de marcarla como enviada", tone:"warn" });
      return;
    }
    setMarcando(true);
    const r = await marcarEnviada(presupuestoId, { canal, vigenciaHoras: vig });
    setMarcando(false);
    if (!r.ok) { toast?.({ msg:r.error, tone:"warn" }); return; }
    onEnviada?.(r.data);
    toast?.({ msg: recordatorio
      ? `Recordatorio anotado — el link vuelve a valer ${vig} h`
      : `Marcada como enviada — vence en ${vig} h`, tone:"ok" });
    onClose();
  };

  /* Aviso único de las dos vías que todavía no mandan solas. */
  const notaProximaOla = (
    <div style={{ display:"flex", gap:9, padding:"12px 13px", borderRadius:12,
      background:"rgba(120,90,229,.06)", border:"1px solid rgba(120,90,229,.2)" }}>
      <Info size={15} style={{ color:"var(--violet)", flexShrink:0, marginTop:1 }} />
      <div style={{ fontSize:12, lineHeight:1.55, color:"var(--n600)" }}>
        Disponible en la próxima entrega; mientras tanto mandá el PDF.
      </div>
    </div>
  );

  const TABS = [["pdf","PDF",Printer],["whatsapp","WhatsApp",Smartphone],["email","Email",Mail]];

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(520px,100%)", padding:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>{recordatorio ? "Enviar recordatorio" : "Compartir cotización"}</div>
          <span className="mono" style={{ fontSize:11, color:"var(--n400)" }}>{q.numero}</span>
          <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>
        </div>

        {/* v2C · pre-flight: mira cómo está la cotización, pero deja mandar igual */}
        {!recordatorio && (
          <div className="pref a-slide">
            {todoListo ? (
              <div className="pref-ok">Todo listo para mandar ✓</div>
            ) : (
              <>
                <div className="lbl" style={{ marginBottom:6 }}>Antes de mandar</div>
                {checks.map((c) => (
                  <div key={c.k} className="pref-i" data-t={c.t}>
                    {c.t === "warn" ? <AlertCircle size={13} />
                      : c.t === "ok" ? <Check size={13} />
                      : <Info size={13} />}
                    <span style={{ flex:1 }}>{c.txt}</span>
                    {c.ir && onIr && (
                      <button className="pref-cta" onClick={() => onIr(c.ir)}>Completar</button>
                    )}
                  </div>
                ))}
                <div style={{ fontSize:10.5, color:"var(--n300)", marginTop:6, lineHeight:1.5 }}>
                  Nada de esto frena el envío — es para que sepas cómo va a salir.
                </div>
              </>
            )}
          </div>
        )}

        {onPreview && (
          <div style={{ display:"flex", alignItems:"center", gap:8, margin:"11px 17px 0", flexWrap:"wrap" }}>
            <Btn size="xs" onClick={onPreview}>
              <Eye size={12} /> Previsualizar antes de mandar
            </Btn>
            <span style={{ fontSize:10.5, color:"var(--n400)" }}>No cuenta como apertura del pasajero.</span>
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:8, margin:"11px 17px 0", flexWrap:"wrap" }}>
          <span className="lbl">Vigencia</span>
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
              {notaProximaOla}
              <div style={{ marginTop:13, padding:"12px 13px", borderRadius:12, background:"var(--wa-bg)",
                border:"1px solid rgba(59,191,173,.28)" }}>
                <div style={{ fontSize:12, lineHeight:1.6, color:"var(--wa-fg)" }}>
                  {recordatorio
                    ? <>Hola{nom ? ` ${nom}` : ""} 👋 ¿pudiste ver la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>? Te la dejo de nuevo por acá 👇</>
                    : <>Hola{nom ? ` ${nom}` : ""}, te comparto la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>. Se abre desde el celular 👇</>}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                <Smartphone size={12} style={{ color:"var(--teal-2)" }} />
                {tel ? `El pasajero está en ${tel}.` : "Sin teléfono cargado — completalo en el bloque Cliente."}
              </div>
            </>
          )}

          {tab === "email" && (
            <>
              {notaProximaOla}
              <div style={{ marginTop:13 }}>
                <Label>Para</Label>
                <div className="in" style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <Mail size={13} style={{ color:"var(--n300)" }} />
                  <span style={{ fontSize:13 }}>{q.cliente.email || <span style={{ color:"var(--n300)" }}>Sin email cargado</span>}</span>
                </div>
                <Label>Copia</Label>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
                  <span className="chip chip-on" style={{ gap:6 }}>
                    <Lock size={10} /> {emailCopia || "sin casilla configurada"}
                  </span>
                  <span style={{ fontSize:11, color:"var(--n400)" }}>fija, se cambia en Ajustes</span>
                </div>
                <Label hint="separados por coma">Otros destinatarios</Label>
                <input className="in" value={extras} placeholder="supervisor@…, operaciones@…"
                  onChange={(e) => setExtras(e.target.value)} />
                <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                  <Download size={12} style={{ color:"var(--teal-2)" }} /> El PDF va a ir adjunto automáticamente.
                </div>
              </div>
            </>
          )}

          {tab === "pdf" && (
            <>
              <div style={{ display:"flex", gap:12, alignItems:"center", padding:"13px", borderRadius:12,
                border:"1px solid var(--hair-soft)", background:"var(--card-3)", marginBottom:12 }}>
                <div style={{ width:44, height:56, borderRadius:7, background:"var(--pop)", border:"1px solid var(--hair)",
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
                Las opciones salen una debajo de la otra, con los saltos de página cuidados:
                nada se corta al medio y la firma no queda huérfana en la última hoja.
              </div>
              <Btn variant="p" style={{ width:"100%", height:42 }} onClick={() => onImprimir?.()}>
                <Printer size={15} /> Abrir la vista de impresión
              </Btn>
              <div style={{ fontSize:10.5, color:"var(--n400)", textAlign:"center", marginTop:8 }}>
                Desde ahí guardás el PDF o mandás a la impresora.
              </div>
            </>
          )}

          {/* el envío real es por afuera; esto es lo que arranca el seguimiento */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid var(--hair-soft)" }}>
            <Label hint="arranca el reloj de la vigencia">¿Ya se la mandaste?</Label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:11 }}>
              {[["whatsapp","WhatsApp"],["email","Email"],["manual","Otro canal"]].map(([k, l]) => (
                <button key={k} className={`chip ${canal === k ? "chip-on" : ""}`} onClick={() => setCanal(k)}>{l}</button>
              ))}
            </div>
            <Btn variant="p" style={{ width:"100%", height:42 }} disabled={marcando || !presupuestoId}
              onClick={marcar}>
              {marcando
                ? <><Loader2 size={15} className="spin" /> Marcando…</>
                : <><CheckCheck size={15} /> Marcar como enviada · {vig} h</>}
            </Btn>
            <div style={{ fontSize:10.5, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
              {presupuestoId
                ? "Queda registrada como enviada y empieza a correr la vigencia del seguimiento."
                : "Todavía no está guardada: escribí algo y el autoguardado la crea."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ModalCompartir };
