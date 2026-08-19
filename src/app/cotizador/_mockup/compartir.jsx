"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText, Copy, Check, CheckCheck, Send, Download, Eye, X, Mail, Smartphone, Loader2, AlertCircle,
  Link2, Printer, Lock, Info
} from "lucide-react";
import { Btn, Label } from "./ui";
import { precioOpcion } from "./data";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARTIR
   ═══════════════════════════════════════════════════════════════════════════ */

function ModalCompartir({ q, marca, onClose, onEnviada, toast, recordatorio = false, onVigencia, onIr, onPreview, onImprimir }) {
  const tel = String(q.cliente.telefono || "").trim();
  const nom = String(q.cliente.nombre || "").trim();
  /* v2C · sin teléfono no hay WhatsApp: se arranca en la vía que sí está disponible */
  const waOff = !tel && !recordatorio;
  const [tab, setTab] = useState(waOff ? "email" : "whatsapp");
  const [extras, setExtras] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [copiadoCorto, setCopiadoCorto] = useState(false);
  const [fase, setFase] = useState(null);                 // null | generando | link | enviada
  const [vig, setVig] = useState(q.vigencia ?? 48);
  const pasos = useRef([]);

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

  /* link corto ficticio del envío — siempre el mismo para la misma cotización */
  const linkCorto = useMemo(() => {
    const s = String(q.numero || "");
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return `cotz.traveloz.uy/c/${h.toString(36).slice(-4).padStart(4, "7")}`;
  }, [q.numero]);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  /* nada de timers huérfanos si el modal se cierra en el medio */
  useEffect(() => () => pasos.current.forEach(clearTimeout), []);

  const copiar = () => { setCopiado(true); toast?.({ msg:"Link copiado al portapapeles", tone:"ok" }); setTimeout(() => setCopiado(false), 2200); };
  const copiarCorto = () => { setCopiadoCorto(true); toast?.({ msg:"Link copiado al portapapeles", tone:"ok" }); };

  /* v2C · envío en tres tiempos: genera el link, lo muestra y recién ahí queda enviada */
  const enviar = () => {
    if (fase) return;
    setFase("generando");
    pasos.current.push(setTimeout(() => setFase("link"), 800));
    pasos.current.push(setTimeout(() => setFase("enviada"), 1400));
    pasos.current.push(setTimeout(() => {
      onEnviada?.();
      toast?.({ msg: recordatorio ? "Recordatorio enviado al pasajero." : "Cotización enviada. Te avisamos cuando la abran.", tone:"ok" });
      onClose();
    }, 2150));
  };

  /* el mismo botón y la misma secuencia en WhatsApp y en Email */
  const botonEnvio = (texto, Icon) => fase ? (
    <div className="env a-slide">
      <div className="env-p" data-on={fase === "generando" ? "1" : "2"}>
        {fase === "generando"
          ? <><Loader2 size={14} className="spin" /> Generando el link…</>
          : <><Check size={14} /> Link generado</>}
      </div>
      {fase !== "generando" && (
        <div className="env-link a-slide">
          <span className="mono">{linkCorto}</span>
          <Btn size="xs" variant={copiadoCorto ? "p" : "s"} onClick={copiarCorto}>
            {copiadoCorto ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </Btn>
        </div>
      )}
      {fase === "enviada" && (
        <div className="env-ok a-pop"><CheckCheck size={15} /> {recordatorio ? "Recordatorio enviado ✓" : "Enviada ✓"}</div>
      )}
    </div>
  ) : (
    <Btn variant="p" onClick={enviar} style={{ width:"100%", marginTop:14, height:42 }}>
      <Icon size={15} /> {texto}
    </Btn>
  );

  const TABS = [["whatsapp","WhatsApp",Smartphone],["email","Email",Mail],["pdf","PDF",Printer]];

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
          {TABS.map(([k, l, I]) => {
            const off = k === "whatsapp" && waOff;
            return (
              <button key={k} className={`chip ${tab === k ? "chip-on" : ""} ${off ? "via-off" : ""}`}
                disabled={off} onClick={() => setTab(k)}
                title={off ? "Sin teléfono del cliente — cargalo y WhatsApp se habilita" : undefined}>
                <I size={12} /> {l}
              </button>
            );
          })}
          {waOff && <span style={{ alignSelf:"center", fontSize:10.5, color:"var(--n400)" }}>
            WhatsApp necesita el teléfono</span>}
        </div>

        <div style={{ padding:"15px 17px 17px" }}>
          {tab === "whatsapp" && (
            <>
              <Label hint="es el canal principal">Link para el pasajero</Label>
              <div style={{ display:"flex", gap:8 }}>
                <div className="in mono" style={{ flex:1, display:"flex", alignItems:"center", color:"var(--n600)", overflow:"hidden" }}>{linkCorto}</div>
                <Btn variant={copiado ? "p" : "s"} onClick={copiar} style={{ flexShrink:0 }}>
                  {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </Btn>
              </div>
              <div style={{ marginTop:13, padding:"12px 13px", borderRadius:12, background:"var(--wa-bg)",
                border:"1px solid rgba(59,191,173,.28)" }}>
                <div style={{ fontSize:12, lineHeight:1.6, color:"var(--wa-fg)" }}>
                  {recordatorio
                    ? <>Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""} 👋 ¿pudiste ver la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>? Te la dejo de nuevo por acá 👇<br />{linkCorto}</>
                    : <>Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""}, te comparto la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>. Se abre desde el celular 👇<br />{linkCorto}</>}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                <Eye size={12} style={{ color:"var(--teal-2)" }} />
                Registramos si el pasajero la abre. Si no la abrió a las 48 horas, te avisamos.
              </div>
              {botonEnvio(recordatorio ? "Mandar el recordatorio" : "Mandar por WhatsApp", Link2)}
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
              {botonEnvio("Mandar por email", Send)}
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
        </div>
      </div>
    </div>
  );
}

export { ModalCompartir };
