"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText, CheckCheck, Download, Eye, X, Mail, Smartphone, Loader2, AlertCircle,
  Printer, Lock, Info, Check, Link2, Copy, Send, Users, CreditCard, ClipboardList,
  ExternalLink, MailCheck
} from "lucide-react";
import { Btn, Label } from "./ui";
import { telefonoWa } from "@/lib/telefono";
import { precioOpcion, renderPlantilla, destinoFinal } from "./data";
import { sumarHorasHabiles, textoVencimiento, textoDiaCorto } from "@/lib/presupuesto/habiles";
import { useAjustes, useCtz, buscarVendedor } from "./contexto";
import {
  marcarEnviada, emitirLink, enviarPorEmail, pedirDatosDelPasajero,
} from "@/actions/presupuesto.actions";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARTIR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Compartir una cotización.
 *
 * Las tres pestañas mandan de verdad:
 *   • WhatsApp — emite el link público y arma el mensaje; el vendedor lo abre
 *     en su WhatsApp (no mandamos nosotros: el pasajero tiene que ver el
 *     mensaje viniendo de su asesor, no de un número de sistema).
 *   • Email    — lo manda el server con el link adentro, con copia a la casilla
 *     del máster y responder-a del vendedor.
 *   • PDF      — lo baja el server (Chromium imprime la misma página que abre
 *     el pasajero). La vista de impresión del navegador queda como salida de
 *     emergencia si el render del server está caído.
 *
 * Cualquiera de las tres sella el envío: estado Enviada, reloj de la vigencia
 * corriendo y el link listo para que el pasajero lo abra. El "ya la mandé por
 * otro medio" quedó como una línea al pie, para el caso raro.
 *
 * `presupuestoId` es la fila en la base; sin él no hay nada que compartir (una
 * cotización recién abierta que todavía no guardó).
 */
function ModalCompartir({
  q, presupuestoId, vendedor, onClose, onEnviada, toast, recordatorio = false,
  onVigencia, onIr, onPreview, onImprimir, tabInicial, onPedido,
  /* del drawer: el número, cuándo salió la primera y hasta cuándo abre el link
     vivo. Solo los usa el recordatorio, que cuenta esa historia. */
  numero, enviadaAt, expiraAt,
}) {
  const { emailCopia, vigenciaDefault } = useAjustes();
  const { vendedores, esAdmin, yo } = useCtz();
  const V = buscarVendedor(vendedores, vendedor);
  const tel = String(q.cliente.telefono || "").trim();
  const nom = String(q.cliente.nombre || "").trim();
  const [tab, setTab] = useState(
    tabInicial || (recordatorio ? (tel ? "whatsapp" : "email") : "pdf"),
  );
  const [extras, setExtras] = useState("");
  const [marcando, setMarcando] = useState(false);
  const [vig, setVig] = useState(q.vigencia ?? vigenciaDefault ?? 96);

  /* el link público: se emite al entrar a WhatsApp o al tocar "Generar link" */
  const [link, setLink] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [errLink, setErrLink] = useState(null);
  const [enviandoMail, setEnviandoMail] = useState(false);
  const [mailListo, setMailListo] = useState(null);
  const [copiado, setCopiado] = useState(null);

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

  /* ── el link ──────────────────────────────────────────────────────────────
     Emitirlo YA sella el envío: en cuanto existe una URL viva, el pasajero la
     puede abrir, así que la cotización está enviada aunque el vendedor todavía
     no haya tocado "Abrir WhatsApp". */
  const generar = useCallback(async (canal) => {
    if (!presupuestoId) {
      toast?.({ msg:"Guardá la cotización antes de compartirla", tone:"warn" });
      return null;
    }
    setGenerando(true); setErrLink(null);
    const r = await emitirLink(presupuestoId, { canal, vigenciaHoras: vig });
    setGenerando(false);
    if (!r.ok) { setErrLink(r.error); return null; }
    setLink(r.data);
    onEnviada?.(r.data);
    return r.data;
  }, [presupuestoId, vig, toast, onEnviada]);

  /* Mirar la pestaña de WhatsApp NO emite nada.
     Emitir el link sella el envío: la cotización pasa a Enviada, arranca el
     reloj de la vigencia y el pasajero ya podría abrirla. Que eso pasara por
     tocar una pestaña —para espiar cómo iba a quedar el mensaje— dejaba
     cotizaciones "enviadas" que nunca se mandaron y el vencimiento corriendo.
     El link sale con una acción explícita: "Abrir WhatsApp", "Copiar mensaje",
     "Copiar link" o "Generar el link". Hasta entonces la vista previa muestra
     el mensaje con un marcador en el lugar del link. */

  /* Cambiar la vigencia con el link ya emitido lo corre: el token es el mismo,
     lo que se mueve es el vencimiento. */
  useEffect(() => {
    if (!link || generando) return;
    /* si el vencimiento ya está donde tendría que estar (±2 min de holgura),
       no hay nada que correr */
    const objetivo = sumarHorasHabiles(new Date(), vig).getTime();
    const actual = link.expiraAt ? new Date(link.expiraAt).getTime() : 0;
    if (Math.abs(actual - objetivo) < 120000) return;
    void generar(tab === "email" ? "email" : "whatsapp");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vig]);

  const copiar = async (texto, clave) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 2200);
    } catch {
      toast?.({ msg:"El navegador no dejó copiar — seleccioná el texto a mano", tone:"warn" });
    }
  };

  /* ── el mensaje de WhatsApp ─────────────────────────────────────────────
     `base` es el saludo; el link se le pega recién cuando existe. Antes de
     generarlo, la vista previa muestra un marcador para que el vendedor lea el
     mensaje entero sin emitir nada. */
  const MARCADOR_LINK = "🔗 (el link se genera al mandar)";

  /* Hasta cuándo abre el link: el del link vivo si ya se emitió, y si no el que
     va a quedar con la vigencia elegida. Horas hábiles, como en el server. */
  const venceTxt = useMemo(() => {
    const delLink = link?.expiraAt ?? expiraAt;
    const t = delLink ? new Date(delLink).getTime() : NaN;
    if (Number.isFinite(t) && t > Date.now()) return textoVencimiento(t);
    return textoVencimiento(sumarHorasHabiles(new Date(), vig));
  }, [link, expiraAt, vig]);

  /* El mensaje inicial suele terminar firmado ("Agustina"). El recordatorio no
     lo hereda entero, pero sí la firma: el pasajero tiene que seguir viendo
     quién le escribe. */
  const firma = useMemo(() => {
    const txt = (q.mensajeAuto || "").trim()
      ? renderPlantilla(q.mensajeAuto, nom, V.linkDatos)
      : "";
    const lineas = txt.split("\n").map((l) => l.trim()).filter(Boolean);
    const ultima = lineas[lineas.length - 1] || "";
    const pila = String(V.nombre || "").trim().split(/\s+/)[0].toLowerCase();
    if (!pila || !ultima || ultima.length > 40) return "";
    return ultima.toLowerCase().includes(pila) ? ultima : "";
  }, [q.mensajeAuto, nom, V.linkDatos, V.nombre]);

  const base = useMemo(() => {
    /* al pasajero se le nombra el destino final, no el camino del panel */
    const destino = destinoFinal(q.titulo?.destino) || "tu viaje";
    /* El recordatorio tiene texto propio: recuerda cuándo salió y hasta cuándo
       sirve. Mandar de nuevo el mismo mensaje del primer envío hacía que el
       pasajero lo leyera como un copy-paste. */
    if (recordatorio) {
      const dia = enviadaAt ? textoDiaCorto(enviadaAt) : "";
      const cuerpo = [
        `Hola${nom ? ` ${nom}` : ""}, te escribo por la cotización${numero ? ` ${numero}` : ""}${dia ? ` que te mandé el ${dia}` : " que te mandé"}.`,
        venceTxt ? `Sigue disponible hasta el ${venceTxt}.` : "Sigue disponible.",
        "Cualquier duda me decís.",
      ].join(" ");
      return firma ? `${cuerpo}\n\n${firma}` : cuerpo;
    }
    return (q.mensajeAuto || "").trim()
      ? renderPlantilla(q.mensajeAuto, nom, V.linkDatos)
      : `Hola${nom ? ` ${nom}` : ""}, te comparto la cotización de ${destino}. Se abre desde el celular 👇`;
  }, [q.mensajeAuto, q.titulo, nom, V.linkDatos, recordatorio, numero, enviadaAt, venceTxt, firma]);

  const mensajeCon = useCallback((url) => (url ? `${base}\n\n${url}` : base), [base]);
  /* lo que se ve en la caja: con el link si ya está, con el marcador si no */
  const vistaMensaje = link?.url ? mensajeCon(link.url) : `${base}\n\n${MARCADOR_LINK}`;

  /* wa.me exige el número internacional completo: un "099 000 222" tal cual
     sale de la ficha abre un chat vacío. */
  const telWa = telefonoWa(tel);
  const urlWa = (url) => `https://wa.me/${telWa}?text=${encodeURIComponent(mensajeCon(url))}`;

  /* Un solo toque: si el link todavía no existe, se emite y se abre WhatsApp.
     La pestaña se reserva ANTES del await —con el gesto del vendedor todavía
     vivo— porque si no Safari la bloquea por venir de una promesa. */
  const abrirWhatsApp = async () => {
    if (generando) return;
    const listo = (url) => {
      toast?.({ msg:`Se abrió WhatsApp — el link abre hasta el ${venceTxt}`, tone:"ok" });
      onClose();
      return url;
    };
    if (link?.url) {
      window.open(urlWa(link.url), "_blank", "noopener");
      listo(link.url);
      return;
    }
    const w = window.open("", "_blank");
    if (w) w.opener = null;
    const nuevo = await generar("whatsapp");
    if (!nuevo?.url) { w?.close(); return; }
    if (w) w.location.href = urlWa(nuevo.url);
    else window.open(urlWa(nuevo.url), "_blank", "noopener");
    listo(nuevo.url);
  };

  /* Copiar también es una acción explícita: emite si hace falta y copia el
     mensaje con el link adentro (nunca el saludo pelado). */
  const copiarMensaje = async () => {
    if (generando) return;
    const l = link?.url ? link : await generar("whatsapp");
    if (!l?.url) return;
    await copiar(mensajeCon(l.url), "msg");
  };

  const copiarLink = async () => {
    if (generando) return;
    const l = link?.url ? link : await generar("whatsapp");
    if (!l?.url) return;
    await copiar(l.url, "url");
  };

  /* ── el envío por email ───────────────────────────────────────────────── */
  const mandarMail = async () => {
    if (enviandoMail) return;
    if (!presupuestoId) {
      toast?.({ msg:"Guardá la cotización antes de compartirla", tone:"warn" });
      return;
    }
    setEnviandoMail(true); setErrLink(null);
    const lista = extras.split(/[,;]+/).map((e) => e.trim()).filter(Boolean);
    const r = await enviarPorEmail(presupuestoId, {
      vigenciaHoras: vig,
      extras: lista,
      esRecordatorio: recordatorio,
    });
    setEnviandoMail(false);
    if (!r.ok) { setErrLink(r.error); return; }
    setLink(r.data);
    setMailListo(r.data);
    onEnviada?.(r.data);
    toast?.({
      msg: r.data.entregado
        ? `Email enviado a ${r.data.destinatarios[0]}${
            r.data.pdfAdjunto ? " con el PDF adjunto" : " (sin PDF adjunto)"
          } — abre hasta el ${venceTxt}`
        : "Email preparado (sin proveedor configurado): el link ya está vivo",
      tone: r.data.entregado ? "ok" : "warn",
    });
    onClose();
  };

  /* ── el PDF ───────────────────────────────────────────────────────────────
     Lo arma el server contra el link público. Se abre en una pestaña en vez de
     hacer fetch + blob para que el navegador muestre su propia descarga (y su
     propio error si el server contesta 503). */
  const bajarPdf = () => {
    if (!presupuestoId) {
      toast?.({ msg:"Guardá la cotización antes de bajar el PDF", tone:"warn" });
      return;
    }
    window.open(`/api/cotizador/${presupuestoId}/pdf`, "_blank", "noopener");
  };

  /* ── "ya la mandé por otro medio" ─────────────────────────────────────── */
  const marcar = async () => {
    if (marcando) return;
    if (!presupuestoId) {
      toast?.({ msg:"Guardá la cotización antes de marcarla como enviada", tone:"warn" });
      return;
    }
    setMarcando(true);
    const r = await marcarEnviada(presupuestoId, { canal:"manual", vigenciaHoras: vig });
    setMarcando(false);
    if (!r.ok) { toast?.({ msg:r.error, tone:"warn" }); return; }
    onEnviada?.(r.data);
    toast?.({ msg:`Marcada como enviada — abre hasta el ${venceTxt}`, tone:"ok" });
    onClose();
  };

  /* ── datos del pasajero ───────────────────────────────────────────────────
     La solicitud por email sale SIEMPRE a nombre del vendedor de la sesión
     (así la escribe `crearSolicitud`), así que un admin que mira la cotización
     de otro puede copiar y mandar el link, pero no pedir en su nombre. */
  const puedePedir = !yo?.id || String(vendedor) === String(yo.id);
  const motivoPedido = puedePedir
    ? null
    : `La solicitud saldría a tu nombre, no al de ${V.nombre}. Copiá el link y pasáselo, o pedíselo desde su usuario.`;
  const sinLinks = !V.linkDatos && !V.linkPago;

  const TABS = [
    ["pdf","PDF",Printer], ["whatsapp","WhatsApp",Smartphone], ["email","Email",Mail],
    ["datos","Datos del pasajero",ClipboardList],
  ];

  /* Caja del link: la misma en las tres pestañas. */
  const cajaLink = link && (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px", borderRadius:11,
      background:"var(--sunk)", border:"1px solid var(--hair-soft)", marginBottom:11 }}>
      <Link2 size={13} style={{ color:"var(--violet)", flexShrink:0 }} />
      <span className="mono" style={{ fontSize:11.5, flex:1, minWidth:0, overflow:"hidden",
        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{link.url}</span>
      <button className="btn btn-g btn-xs" onClick={copiarLink}>
        {copiado === "url" ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
      </button>
    </div>
  );

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
            {[24, 48, 72, 96].map((h) => (
              <button key={h} data-on={vig === h ? "1" : "0"}
                onClick={() => { setVig(h); onVigencia?.(h); }}>{h}h</button>
            ))}
          </div>
          <span style={{ fontSize:10.5, color:"var(--n400)" }}>
            horas hábiles: no corren sábados ni domingos{venceTxt ? ` — vence el ${venceTxt}` : ""}. Después el link muestra “cotización vencida” y se puede reactivar
          </span>
        </div>

        <div style={{ display:"flex", gap:5, padding:"11px 17px 0" }}>
          {TABS.map(([k, l, I]) => (
            <button key={k} className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>
              <I size={12} /> {l}
            </button>
          ))}
        </div>

        <div style={{ padding:"15px 17px 17px" }}>
          {errLink && (
            <div style={{ display:"flex", gap:8, padding:"10px 12px", borderRadius:11, marginBottom:11,
              background:"rgba(244,62,85,.07)", border:"1px solid rgba(244,62,85,.22)" }}>
              <AlertCircle size={14} style={{ color:"var(--coral)", flexShrink:0, marginTop:1 }} />
              <span style={{ fontSize:12, color:"var(--ink-coral)", lineHeight:1.5 }}>{errLink}</span>
            </div>
          )}

          {tab === "whatsapp" && (
            <>
              {generando && !link && (
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--n400)", marginBottom:11 }}>
                  <Loader2 size={13} className="spin" /> Generando el link…
                </div>
              )}
              {cajaLink}

              {/* Dos pasos y nada más: generar y copiar. Antes acá abajo iba el
                  mensaje armado en un cuadro, con "Abrir WhatsApp" y "Copiar
                  mensaje". El vendedor ya escribe el saludo en su propio
                  WhatsApp, así que era una pantalla larga para pegar una URL.
                  (Gero, 04/09.)

                  El mensaje no se fue a ningún lado: sigue en el bloque
                  "Mensaje al pasajero" del editor, encabeza el email y se
                  imprime arriba de la ficha del pasajero. */}
              <Btn variant="p" style={{ width:"100%", height:42, marginTop: link ? 12 : 0 }}
                disabled={!presupuestoId || generando}
                onClick={link ? copiarLink : () => generar("whatsapp")}>
                {generando
                  ? <><Loader2 size={15} className="spin" /> Generando el link…</>
                  : link
                    ? (copiado === "url"
                        ? <><Check size={15} /> Link copiado</>
                        : <><Copy size={15} /> Copiar el link</>)
                    : <><Link2 size={15} /> Generar el link</>}
              </Btn>
            </>
          )}

          {tab === "email" && (
            <>
              {mailListo ? (
                <div className="a-pop" style={{ padding:"13px", borderRadius:12,
                  background:"rgba(59,191,173,.1)", border:"1px solid rgba(42,158,142,.35)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:"var(--teal-3)" }}>
                    <CheckCheck size={15} /> Enviado a {mailListo.destinatarios.join(", ")}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:6, fontSize:11.5,
                    color:"var(--n500)", lineHeight:1.5 }}>
                    {mailListo.pdfAdjunto
                      ? <><Download size={12} style={{ color:"var(--teal-2)" }} /> Con el PDF adjunto.</>
                      : <><AlertCircle size={12} style={{ color:"var(--coral)" }} /> Salió sin PDF adjunto — el link va igual en el cuerpo.</>}
                  </div>
                </div>
              ) : (
                <>
                  {cajaLink}
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
                  <Label hint="separados por coma · hasta 5">Otros destinatarios</Label>
                  <input className="in" value={extras} placeholder="supervisor@…, operaciones@…"
                    onChange={(e) => setExtras(e.target.value)} />

                  <Btn variant="p" style={{ width:"100%", height:42, marginTop:13 }}
                    disabled={enviandoMail || !presupuestoId || !q.cliente.email}
                    onClick={mandarMail}>
                    {enviandoMail
                      ? <><Loader2 size={15} className="spin" /> Enviando…</>
                      : <><Send size={15} /> {recordatorio ? "Mandar recordatorio" : "Mandar la cotización"}</>}
                  </Btn>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:7, marginTop:10, fontSize:11.5,
                    color:"var(--n400)", lineHeight:1.55 }}>
                    <Download size={12} style={{ color:"var(--teal-2)", flexShrink:0, marginTop:2 }} />
                    El PDF va adjunto y el link en el cuerpo. Generarlo suma unos segundos al envío.
                  </div>
                </>
              )}
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
              <Btn variant="p" style={{ width:"100%", height:42 }}
                disabled={!presupuestoId}
                title={presupuestoId
                  ? "Lo genera el servidor con la misma hoja que ve el pasajero"
                  : "Guardá la cotización antes de bajar el PDF"}
                onClick={bajarPdf}>
                <Download size={15} /> Descargar PDF
              </Btn>
              <Btn style={{ width:"100%", height:38, marginTop:8 }} onClick={() => onImprimir?.()}>
                <Printer size={14} /> Vista de impresión
              </Btn>
              <div style={{ fontSize:10.5, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.55 }}>
                {presupuestoId
                  ? "La descarga tarda unos segundos: la hoja se imprime en el servidor. La vista de impresión es la salida del navegador, por si la necesitás."
                  : "Todavía no está guardada: escribí algo y el autoguardado la crea."}
              </div>
            </>
          )}

          {tab === "datos" && (
            <>
              <div style={{ fontSize:11.5, color:"var(--n400)", lineHeight:1.6, marginBottom:12 }}>
                Los dos formularios son de <strong style={{ color:"var(--n600)" }}>{V.nombre}</strong>: lo que
                cargue el pasajero le llega a su bandeja, no a un buzón general. Lo que salga de acá queda
                atado a {q.numero || "esta cotización"}.
              </div>

              {sinLinks ? (
                <div style={{ display:"flex", gap:8, padding:"11px 12px", borderRadius:12,
                  background:"rgba(232,161,60,.09)", border:"1px solid rgba(232,161,60,.28)" }}>
                  <AlertCircle size={14} style={{ color:"#B87516", flexShrink:0, marginTop:1 }} />
                  <div style={{ fontSize:11.5, lineHeight:1.55, color:"var(--n600)" }}>
                    {V.nombre} todavía no tiene link personal, o lo tiene apagado. Sin eso no hay formulario
                    que mandar.
                    <a href={esAdmin ? "/backend/perfiles?vista=vendedores" : "/backend/mi-perfil"}
                      target="_blank" rel="noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:7,
                        fontWeight:700, color:"var(--violet)", textDecoration:"underline", textUnderlineOffset:3 }}>
                      <ExternalLink size={11} /> {esAdmin ? "Abrir Perfiles" : "Abrir Mi perfil"}
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <FilaLinkDatos
                    tipo="PASAJEROS" Icon={Users} titulo="Datos de pasajeros"
                    ayuda="Nombre, documento y pasaporte de cada uno, tal cual figuran en el documento de viaje."
                    url={V.linkDatos} tel={tel} nombre={nom} numero={q.numero}
                    emailCliente={q.cliente.email} presupuestoId={presupuestoId}
                    puedePedir={puedePedir} motivo={motivoPedido}
                    toast={toast} onPedido={onPedido} copiar={copiar} copiado={copiado} />
                  <FilaLinkDatos
                    tipo="PAGO" Icon={CreditCard} titulo="Datos de tarjeta"
                    ayuda="Los datos viajan cifrados y se borran solos a las 96 horas."
                    url={V.linkPago} tel={tel} nombre={nom} numero={q.numero}
                    emailCliente={q.cliente.email} presupuestoId={presupuestoId}
                    puedePedir={puedePedir} motivo={motivoPedido}
                    toast={toast} onPedido={onPedido} copiar={copiar} copiado={copiado} />
                </>
              )}
            </>
          )}

          {/* El caso raro: la mandó por fuera y solo quiere que arranque el reloj. */}
          <div style={{ marginTop:16, paddingTop:12, borderTop:"1px solid var(--hair-soft)", textAlign:"center" }}>
            <button onClick={marcar} disabled={marcando || !presupuestoId}
              style={{ fontSize:11.5, fontWeight:600, color:"var(--n400)", textDecoration:"underline",
                textUnderlineOffset:3, opacity: presupuestoId ? 1 : .5 }}>
              {marcando ? "Marcando…" : "Ya la mandé por otro medio"}
            </button>
            <div style={{ fontSize:10.5, color:"var(--n300)", marginTop:5, lineHeight:1.5 }}>
              {presupuestoId
                ? `Sella el envío y arranca la vigencia de ${vig} h hábiles, sin abrir nada.`
                : "Todavía no está guardada: escribí algo y el autoguardado la crea."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Una fila de la pestaña "Datos del pasajero" ──────────────────────────
   El mismo trío de acciones para los dos formularios: copiar el link
   permanente del vendedor, mandarlo por WhatsApp al teléfono del cliente, o
   pedirlo por email (eso sí crea una solicitud con token de un uso, con el
   destino y el número de cotización ya adentro).

   Las tres anotan en la bitácora de la cotización. Copiar y WhatsApp no mandan
   nada: el mensaje sale del teléfono del vendedor, como todo lo demás acá. */
function FilaLinkDatos({
  tipo, Icon, titulo, ayuda, url, tel, nombre, numero, emailCliente,
  presupuestoId, puedePedir, motivo, toast, onPedido, copiar, copiado,
}) {
  const [ocupado, setOcupado] = useState(null);   // null | "email" | "wa" | "link"
  const [listo, setListo] = useState(false);
  const telWa = telefonoWa(tel);

  const texto = tipo === "PAGO"
    ? `Hola${nombre ? ` ${nombre}` : ""}, para cerrar la reserva${numero ? ` ${numero}` : ""} necesito los datos de la tarjeta. Se cargan en este formulario seguro 👇`
    : `Hola${nombre ? ` ${nombre}` : ""}, para arrancar la reserva${numero ? ` ${numero}` : ""} necesito los datos de los pasajeros. Se cargan acá 👇`;

  /* La bitácora es secundaria: si falla, el link ya se compartió igual. */
  const anotar = async (canal) => {
    if (!presupuestoId) return;
    const r = await pedirDatosDelPasajero(presupuestoId, { tipo, canal });
    if (r.ok) onPedido?.();
  };

  const alWhatsApp = () => {
    if (!url || ocupado) return;
    /* La pestaña se abre con el gesto todavía vivo: si esperáramos al server,
       Safari la bloquea por venir de una promesa. */
    window.open(`https://wa.me/${telWa}?text=${encodeURIComponent(`${texto}\n\n${url}`)}`,
      "_blank", "noopener");
    void anotar("whatsapp");
  };

  const alCopiar = async () => {
    if (!url || ocupado) return;
    setOcupado("link");
    await copiar(url, `dato-${tipo}`);
    await anotar("link");
    setOcupado(null);
  };

  const alEmail = async () => {
    if (!presupuestoId) {
      toast?.({ msg:"Guardá la cotización antes de pedir los datos", tone:"warn" });
      return;
    }
    if (ocupado) return;
    setOcupado("email");
    const r = await pedirDatosDelPasajero(presupuestoId, { tipo, canal:"email" });
    setOcupado(null);
    if (!r.ok) { toast?.({ msg:r.error, tone:"warn" }); return; }
    setListo(true);
    setTimeout(() => setListo(false), 4000);
    toast?.({ msg:r.data.mensaje, tone:"ok" });
    onPedido?.();
  };

  if (!url) return null;

  return (
    <div style={{ padding:"12px 13px", borderRadius:13, border:"1px solid var(--hair-soft)",
      background:"var(--card-3)", marginBottom:9 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
        <Icon size={14} style={{ color:"var(--violet)" }} />
        <span style={{ fontSize:13, fontWeight:700 }}>{titulo}</span>
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", lineHeight:1.5, marginBottom:9 }}>{ayuda}</div>

      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10,
        background:"var(--sunk)", border:"1px solid var(--hair-soft)", marginBottom:9 }}>
        <Link2 size={12} style={{ color:"var(--violet)", flexShrink:0 }} />
        <span className="mono" style={{ fontSize:11, flex:1, minWidth:0, overflow:"hidden",
          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{url}</span>
        <button className="btn btn-g btn-xs" onClick={() => { void alCopiar(); }}>
          {copiado === `dato-${tipo}` ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
        </button>
      </div>

      <div style={{ display:"flex", gap:7 }}>
        <Btn size="xs" style={{ flex:1, height:34 }} disabled={!telWa} onClick={alWhatsApp}
          title={telWa ? "Abre tu WhatsApp con el mensaje y el link" : "El cliente no tiene teléfono cargado"}>
          <Smartphone size={13} /> WhatsApp
        </Btn>
        <Btn size="xs" variant="p" style={{ flex:1, height:34 }}
          disabled={!puedePedir || !emailCliente || ocupado === "email"}
          title={!puedePedir ? motivo : emailCliente ? `Le llega a ${emailCliente}` : "El cliente no tiene email cargado"}
          onClick={() => { void alEmail(); }}>
          {ocupado === "email" ? <><Loader2 size={13} className="spin" /> Enviando…</>
            : listo ? <><MailCheck size={13} /> Enviado</>
            : <><Mail size={13} /> Pedir por email</>}
        </Btn>
      </div>

      <div style={{ fontSize:10.5, color:"var(--n400)", marginTop:7, lineHeight:1.5 }}>
        {!puedePedir
          ? motivo
          : !emailCliente
            ? "Sin email del cliente no se puede pedir por email — mandale el link por WhatsApp."
            : `El email sale a nombre de tu usuario, con ${numero || "el número de la cotización"} como referencia: lo que cargue el pasajero vuelve atado a esta cotización.`}
      </div>
    </div>
  );
}

export { ModalCompartir };
