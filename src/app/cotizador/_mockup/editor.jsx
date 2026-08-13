"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plane, Building2, Sparkles, MapPin, User, MessageSquare, FileText, Copy, Trash2, GripVertical,
  Plus, Check, ChevronDown, ChevronRight, Search, Eye, EyeOff, Command, Zap, Bed, X, LayoutGrid,
  Loader2, CheckCheck, AlertCircle, RefreshCw, PenLine, Lock, ArrowUp, ArrowDown, CornerDownLeft,
  StickyNote, History, Keyboard, Maximize2, Luggage
} from "lucide-react";
import {
  MESES, ANIO_BASE, REGIMENES, SUG, MODALIDADES, SUG_ALL, CIUDADES, AEROLINEAS,
  CABINAS, EQUIPAJES, OCUPACIONES, TARIFA_TIPOS,
  PNR_DEMO, CLIENTES, uid, hotelById, clamp, toISO, parseISO, fmtCorto, money, venta, margenPct,
  limpiarPegado, parsePNR, pareceTel, matchTel, ultimaDe, FRECUENTES, hotelesCotizadosEn,
  snippetMensaje, redactarMensaje, habitacionNueva, tarifaNueva, ventaTarifa, etiquetaTarifa,
  precioOpcion
} from "./data";
import {
  Foto, CATS, Btn, Label, Pill, ChipIA, Estrellas, Block, Vacio, Calendario, AutoCiudad,
  BuscadorHotel
} from "./ui";

/* ── v2B · Enter pasa al campo siguiente del mismo bloque ────────────────
   Sin librerías: el contenedor marca [data-campos] y cada campo [data-campo]. */
function enterAvanza(e) {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent?.isComposing) return;
  const el = e.currentTarget;
  const cont = el.closest("[data-campos]");
  if (!cont) return;
  e.preventDefault();
  const campos = Array.from(cont.querySelectorAll("[data-campo]")).filter((x) => !x.disabled);
  const sig = campos[campos.indexOf(el) + 1];
  if (sig) { sig.focus(); sig.select?.(); } else el.blur();
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOQUES DEL ARMADO
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1 · Cliente ─────────────────────────────────────────────────────── */
function BloqueCliente({ q, set, refEl, onUsarBase }) {
  const primero = useRef(null);
  const [bq, setBq] = useState("");
  const [bOpen, setBOpen] = useState(false);
  const [ultima, setUltima] = useState(null);   /* v2B · última cotización del cliente elegido */
  const bBox = useRef(null);
  /* v2B · si lo pegado parece teléfono, matcheamos por dígitos: con o sin +598, con o sin espacios */
  const res = useMemo(() => {
    const crudo = bq.trim(); if (!crudo) return [];
    const t = crudo.toLowerCase();
    const tel = pareceTel(crudo);
    return CLIENTES.filter((c) =>
      (tel && matchTel(c.telefono, crudo)) ||
      `${c.nombre} ${c.apellido} ${c.email} ${c.telefono}`.toLowerCase().includes(t)
    ).slice(0, 4);
  }, [bq]);
  const elegir = (c) => {
    set((d) => { d.cliente = { nombre:c.nombre, apellido:c.apellido, email:c.email, telefono:c.telefono }; });
    setBq(""); setBOpen(false); setUltima(ultimaDe(c));
  };
  useEffect(() => {
    const h = (e) => { if (bBox.current && !bBox.current.contains(e.target)) setBOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { const t = setTimeout(() => primero.current?.focus(), 220); return () => clearTimeout(t); }, []);
  const F = (k, ph, tipo = "text", ref) => (
    <div style={{ flex:"1 1 150px", minWidth:0 }}>
      <Label>{ph}</Label>
      <input ref={ref} className="in" type={tipo} value={q.cliente[k]} placeholder="Opcional" data-campo
        onKeyDown={enterAvanza}
        onChange={(e) => set((d) => { d.cliente[k] = e.target.value; })} />
    </div>
  );
  return (
    <Block id="b-cliente" forwardRef={refEl} icon={User} title="Cliente"
      right={<Pill tone="n"><Check size={9} /> Ningún campo obligatorio</Pill>}>
      <div ref={bBox} style={{ position:"relative", marginBottom:11 }}>
        <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--n300)" }} />
        <input className="in" style={{ paddingLeft:34 }} value={bq}
          placeholder="Buscar cliente existente por nombre, email o teléfono… o cargalo abajo"
          onFocus={() => setBOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && res[0]) { e.preventDefault(); elegir(res[0]); }
            else if (e.key === "Escape") setBOpen(false); }}
          onChange={(e) => { setBq(e.target.value); setBOpen(true); }} />
        {bOpen && res.length > 0 && (
          <div className="ac-pop a-slide">
            {res.map((c) => (
              <button key={c.email} className="ac-i" onClick={() => elegir(c)}>
                <span style={{ width:24, height:24, borderRadius:99, flexShrink:0, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.12)", color:"var(--violet)", fontSize:9.5, fontWeight:800 }}>
                  {c.nombre[0]}{c.apellido[0]}</span>
                <span style={{ flex:1 }}><b style={{ color:"var(--ink)" }}>{c.nombre} {c.apellido}</b>
                  <span style={{ color:"var(--n400)", fontSize:11.5 }}> · {c.email}</span></span>
                <span className="mono" style={{ fontSize:10.5, color:"var(--n400)", flexShrink:0 }}>{c.telefono}</span>
              </button>
            ))}
            {pareceTel(bq) && (
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px", fontSize:10.5,
                color:"var(--n400)", borderTop:"1px solid var(--hair-soft)" }}>
                <Zap size={10} style={{ color:"var(--teal-2)", flexShrink:0 }} />
                Encontrado por teléfono — da igual si va con +598, con espacios o pelado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* v2B · su última cotización, lista para reusar */}
      {ultima && (
        <div className="a-slide sug-base">
          <span className="sug-ico"><History size={14} /></span>
          <div style={{ flex:"1 1 220px", minWidth:0, fontSize:12.5, lineHeight:1.5 }}>
            <span style={{ color:"var(--n500)" }}>Su última cotización: </span>
            <span className="mono" style={{ fontWeight:500 }}>{ultima.num}</span>
            <span style={{ color:"var(--n400)" }}> · </span>{ultima.destino}
            {ultima.monto > 0 && <><span style={{ color:"var(--n400)" }}> · </span>
              <span className="mono" style={{ fontWeight:500 }}>{money(ultima.monto)}</span></>}
          </div>
          <Btn size="sm" variant="v" onClick={() => { onUsarBase?.(ultima); setUltima(null); }}>
            <Copy size={12} /> Usar como base
          </Btn>
          <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} title="No, gracias"
            onClick={() => setUltima(null)}><X size={12} /></button>
        </div>
      )}

      <div data-campos style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {F("nombre","Nombre","text",primero)}{F("apellido","Apellido")}{F("email","Email","email")}{F("telefono","Teléfono","tel")}
      </div>
      <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:9, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        El nombre alimenta el saludo de la cotización. Podés guardar y completarlo después.
        <span style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
          <span className="kbd">↵</span> pasa al campo siguiente</span>
      </div>
    </Block>
  );
}

/* ── 2 · Encabezado: título por clic + fecha disparadora ─────────────── */
function BloqueEncabezado({ q, set, tramos, hayManual, onRepropagar, refEl }) {
  const [openMes, setOpenMes] = useState(false);
  const anios = [ANIO_BASE, ANIO_BASE + 1];
  /* v2B · la cadena del teclado: destino → mes → año → fecha de salida */
  const mesRef = useRef(null);
  const anioRef = useRef(null);
  const fechaRef = useRef(null);
  const saltar = (r) => requestAnimationFrame(() => {
    const n = r.current; if (!n) return;
    (n.matches?.("button,input,select") ? n : n.querySelector("button,input,select"))?.focus();
  });
  const titulo = [q.titulo.destino || "Destino", q.titulo.mes != null ? MESES[q.titulo.mes] : "Mes", q.titulo.anio || "Año"].join(" · ");
  const previa = `${q.titulo.destino || "Destino"}, ${q.titulo.mes != null ? MESES[q.titulo.mes] : "Mes"} ${q.titulo.anio || ""}`.trim();

  return (
    <Block id="b-encabezado" forwardRef={refEl} icon={FileText} title="Encabezado"
      right={<Pill tone="violet"><Lock size={9} /> Formato controlado</Pill>}>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ flex:"2 1 190px", minWidth:0 }}>
          <Label hint="con autocompletado">Destino</Label>
          <AutoCiudad grande value={q.titulo.destino} placeholder="Punta Cana"
            onChange={(v) => set((d) => { d.titulo.destino = v; })}
            onPick={(v) => { set((d) => { d.titulo.destino = v; }); saltar(mesRef); }} />
        </div>
        <div style={{ flex:"1 1 130px", position:"relative" }}>
          <Label hint="por clic">Mes</Label>
          <button ref={mesRef} className="in in-lg" onClick={() => setOpenMes((v) => !v)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left",
              color: q.titulo.mes != null ? "var(--ink)" : "var(--n300)" }}>
            {q.titulo.mes != null ? MESES[q.titulo.mes] : "Elegir"}
            <ChevronDown size={14} style={{ color:"var(--n300)", transform: openMes ? "rotate(180deg)":"none", transition:"transform .2s" }} />
          </button>
          {openMes && (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:29 }} onClick={() => setOpenMes(false)} />
              <div className="a-slide" style={{ position:"absolute", top:"calc(100% + 5px)", left:0, zIndex:30, width:230,
                background:"var(--pop)", border:"1px solid var(--hair)", borderRadius:13, padding:7,
                boxShadow:"0 22px 50px -14px rgba(17,17,36,.28)", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
                {MESES.map((m, i) => (
                  <button key={m} onClick={() => { set((d) => { d.titulo.mes = i; }); setOpenMes(false); saltar(anioRef); }}
                    style={{ padding:"7px 4px", borderRadius:8, fontSize:11.5, fontWeight:600,
                      background: q.titulo.mes === i ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : "transparent",
                      color: q.titulo.mes === i ? "#fff" : "var(--n600)" }}>{m.slice(0,3)}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ flex:"1 1 120px" }}>
          <Label hint="solo 2">Año</Label>
          <div style={{ display:"flex", gap:6 }}>
            {anios.map((a, ai) => (
              <button key={a} ref={ai === 0 ? anioRef : null}
                onClick={() => { set((d) => { d.titulo.anio = a; }); saltar(fechaRef); }}
                className="in in-lg" style={{ flex:1, fontWeight:700, padding:0,
                  background: q.titulo.anio === a ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : "var(--field)",
                  color: q.titulo.anio === a ? "#fff" : "var(--n500)",
                  borderColor: q.titulo.anio === a ? "transparent" : "var(--field-brd)" }}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:9, marginTop:12, padding:"9px 12px",
        background:"rgba(120,90,229,.055)", border:"1px solid rgba(120,90,229,.14)", borderRadius:11 }}>
        <Eye size={13} style={{ color:"var(--violet)", flexShrink:0 }} />
        <span style={{ fontSize:11.5, color:"var(--n500)" }}>Sale así:</span>
        <span className="disp" style={{ fontSize:16, fontWeight:600, letterSpacing:"-.02em" }}>{previa}</span>
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ flex:1 }}>
          Mes y año se eligen por clic para que todas las cotizaciones salgan iguales. Solo se ofrecen {anios[0]} y {anios[1]}:
          los vuelos no se ven más allá de once meses.
        </span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0 }}>
          <span className="kbd">↵</span> destino → mes → año → fecha</span>
      </div>

      <div className="hairline" style={{ margin:"15px 0" }} />

      <div style={{ display:"flex", gap:14, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div ref={fechaRef} style={{ flex:"1 1 230px" }}>
          <Label hint="se carga una sola vez y baja a todo">Fecha de salida</Label>
          <Calendario grande value={q.fechaSalida} placeholder="Elegir la salida"
            nota="De acá salen los check-in de cada destino y las fechas de todos los servicios."
            onChange={(v) => set((d) => {
              d.fechaSalida = v;
              const f = parseISO(v);
              if (f) { d.titulo.mes = f.getMonth(); d.titulo.anio = f.getFullYear(); }
            })} />
        </div>
        <div style={{ flex:"2 1 240px", paddingBottom:4 }}>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {tramos.map((t) => (
              <div key={t.id} className="mono" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px",
                background:"rgba(59,191,173,.09)", border:"1px solid rgba(59,191,173,.2)", borderRadius:9,
                fontSize:11, color:"var(--teal-3)", fontWeight:500 }}>
                {t.ciudad}: {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)} · {t.noches}n
                {t.manual && <Pill tone="amber" style={{ padding:"1px 5px", fontSize:9 }}>manual</Pill>}
              </div>
            ))}
            {!tramos.length && <span style={{ fontSize:11.5, color:"var(--n300)" }}>Agregá destinos abajo y las fechas se calculan solas.</span>}
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        El mes y el año se atan a la fecha de salida: si la cambiás, el encabezado se acomoda solo.
      </div>

      {hayManual && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, padding:"10px 12px",
          background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"var(--ink-amber)", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"var(--ink-amber)", flex:1 }}>
            Hay fechas editadas a mano que no siguen a la fecha de salida.
          </span>
          <Btn size="sm" onClick={onRepropagar}><RefreshCw size={12} /> Actualizar todo</Btn>
        </div>
      )}
    </Block>
  );
}

/* ── 3 · Destinos y noches ───────────────────────────────────────────── */
function SeccionDestinos({ q, set, tramos, toast }) {
  const [nuevo, setNuevo] = useState("");
  const inp = useRef(null);
  const agregar = (ciudad) => {
    const c = (ciudad || nuevo).trim(); if (!c) return;
    set((d) => { d.destinos.push({ id:uid("dst"), ciudad:c, noches:3, checkinManual:null }); });
    setNuevo(""); requestAnimationFrame(() => inp.current?.focus());
  };
  const sigueAlAnterior = (i) => i > 0 && !q.destinos[i].checkinManual;
  return (
    <div>
      {q.destinos.length === 0
        ? <Vacio icon={MapPin} titulo="Todavía no hay destinos" accion="Escribí una ciudad y apretá Enter" />
        : (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:11 }}>
          {q.destinos.map((dd, i) => {
            const t = tramos[i];
            return (
              <div key={dd.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px",
                background:"var(--card-3)", border:"1px solid var(--hair-soft)", borderRadius:11 }}>
                <div className="mono" style={{ width:20, height:20, borderRadius:6, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.11)", color:"var(--violet)", fontSize:10, fontWeight:600 }}>{i + 1}</div>
                <input className="in" style={{ flex:"1 1 130px", height:32 }} value={dd.ciudad}
                  onChange={(e) => set((d) => { d.destinos[i].ciudad = e.target.value; })} />
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <button className="btn btn-s btn-ico" style={{ width:27, height:27 }}
                    onClick={() => set((d) => { d.destinos[i].noches = Math.max(1, d.destinos[i].noches - 1); })}>−</button>
                  <div className="mono" style={{ width:52, textAlign:"center", fontSize:12, fontWeight:600 }}>{dd.noches} n</div>
                  <button className="btn btn-s btn-ico" style={{ width:27, height:27 }}
                    onClick={() => set((d) => { d.destinos[i].noches += 1; })}>+</button>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:168 }}>
                    <Calendario value={t?.checkin || ""} placeholder="Check-in"
                      onChange={(v) => set((d) => { d.destinos[i].checkinManual = v || null; })} />
                  </div>
                  <span className="mono" style={{ fontSize:10.5, color:"var(--n400)", width:56, whiteSpace:"nowrap" }}>
                    → {t ? fmtCorto(t.checkout) : "—"}
                  </span>
                  {t?.manual ? (
                    <button className="pill" title="Volver a la fecha automática"
                      style={{ background:"rgba(247,178,103,.2)", color:"var(--ink-amber)", cursor:"pointer" }}
                      onClick={() => set((d) => { d.destinos[i].checkinManual = null; })}>
                      manual <RefreshCw size={9} />
                    </button>
                  ) : (
                    <span className="pill" style={{ background:"rgba(59,191,173,.12)", color:"var(--teal-3)" }}
                      title={i === 0 ? "Sigue a la fecha de salida" : "Sigue al check-out del destino anterior"}>
                      <Zap size={9} /> {i === 0 ? "= salida" : "sigue al anterior"}
                    </span>
                  )}
                </div>
                <button className="btn btn-g btn-ico" title="Quitar destino"
                  onClick={() => { const cp = { ...dd }; set((d) => { d.destinos.splice(i, 1); });
                    toast({ msg:`Se quitó ${cp.ciudad}`, tone:"warn", undo:() => set((d) => { d.destinos.splice(i, 0, cp); }) }); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:"1 1 230px" }}>
          <AutoCiudad inputRef={inp} value={nuevo} placeholder="Agregar ciudad… (autocompleta)"
            excluir={q.destinos.map((d) => d.ciudad)}
            onChange={setNuevo} onPick={(c) => agregar(c)} />
        </div>
        <span className="kbd">↵</span>
        {CIUDADES.filter((c) => !q.destinos.some((d) => d.ciudad === c)).slice(0, 3).map((c) => (
          <button key={c} className="chip" onClick={() => agregar(c)}><Plus size={11} />{c}</button>
        ))}
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        Elegís el check-in del primero y los siguientes se encadenan solos: cada destino arranca cuando termina el anterior.
      </div>
    </div>
  );
}

/* ── 4 · Mensaje al pasajero — WYSIWYG con formato ───────────────────── */
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const aHtml = (t) => String(t).split("\n").map((l) => (l ? `<div>${escHtml(l)}</div>` : "<div><br></div>")).join("");

function BloqueMensaje({ q, set, refEl, toast }) {
  const ed = useRef(null);
  const [tono, setTono] = useState("cercano");      // cercano | formal
  const [escribiendo, setEscribiendo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [generado, setGenerado] = useState(false);
  const tipeo = useRef(null);
  const tipeando = useRef(false);

  /* el editor sigue al estado salvo mientras se tipea o mientras el vendedor escribe */
  useEffect(() => {
    const el = ed.current; if (!el || tipeando.current) return;
    if (document.activeElement === el) return;
    const html = q.mensajeHtml || "";
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [q.mensajeHtml]);
  useEffect(() => () => clearInterval(tipeo.current), []);

  const sync = () => set((d) => { d.mensajeHtml = ed.current.innerHTML;
    d.mensaje = ed.current.innerText.trim(); });
  const cmd = (c, v) => { ed.current?.focus(); document.execCommand(c, false, v || null); sync(); };
  const alFinal = () => {
    const el = ed.current, sel = window.getSelection?.(); if (!el || !sel) return;
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    sel.removeAllRanges(); sel.addRange(r); el.scrollTop = el.scrollHeight;
  };
  /* v2B · pega un parrafito al final respetando lo que ya está escrito */
  const anexar = (txt) => {
    const el = ed.current; if (!el) return;
    const hay = el.innerText.trim().length > 0;
    el.innerHTML = (hay ? el.innerHTML + "<div><br></div>" : "") + aHtml(txt);
    sync(); el.focus(); alFinal();
  };
  /* v2B · "Escribir por mí": arma el texto desde lo cargado y lo tipea a la vista */
  const escribir = () => {
    const txt = redactarMensaje(q, tono);
    const el = ed.current; if (!el) return;
    setConfirmar(false); setEscribiendo(true); tipeando.current = true;
    el.innerHTML = "";
    const cortes = 26, paso = Math.max(1, Math.ceil(txt.length / cortes));
    let i = 0;
    clearInterval(tipeo.current);
    tipeo.current = setInterval(() => {
      i = Math.min(txt.length, i + paso);
      el.innerHTML = aHtml(txt.slice(0, i));
      el.scrollTop = el.scrollHeight;
      sync();
      if (i >= txt.length) {
        clearInterval(tipeo.current); tipeando.current = false;
        setEscribiendo(false); setGenerado(true);
        toast({ msg:"Mensaje escrito — leelo y cambiá lo que quieras", tone:"ok" });
      }
    }, 58);
  };
  const pedir = () => { if ((q.mensaje || "").trim()) setConfirmar(true); else escribir(); };

  const B = ({ c, v, title, children }) => (
    <button className="wys-b" title={title} onMouseDown={(e) => { e.preventDefault(); cmd(c, v); }}>{children}</button>
  );
  const SNIPS = [["saludo","+ Saludo"], ["urgencia","+ Cierre con urgencia"], ["sena","+ Info de seña"]];

  return (
    <Block id="b-mensaje" forwardRef={refEl} icon={MessageSquare} title="Mensaje al pasajero"
      right={<Pill tone="n">Opcional · con formato</Pill>}>

      {/* v2B · escribir por mí + tono */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:9 }}>
        <button className="btn btn-s btn-sm btn-ia" onClick={pedir} disabled={escribiendo}>
          {escribiendo
            ? <Loader2 size={13} className="spin" style={{ color:"var(--violet)" }} />
            : <ChipIA />}
          {escribiendo ? "Escribiendo…" : "Escribir por mí"}
        </button>
        <div className="seg seg-xs">
          {[["cercano","Cercano"], ["formal","Formal"]].map(([k, l]) => (
            <button key={k} data-on={tono === k ? "1" : "0"} onClick={() => setTono(k)}>{l}</button>
          ))}
        </div>
        {generado && !escribiendo && (
          <Btn size="xs" onClick={escribir}><RefreshCw size={11} /> Volver a escribir</Btn>
        )}
        <span style={{ fontSize:10.5, color:"var(--n400)", marginLeft:"auto", textAlign:"right" }}>
          Usa el destino, el mes y las noches que ya cargaste.
        </span>
      </div>

      {confirmar && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap", marginBottom:9,
          padding:"9px 12px", background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"var(--ink-amber)", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"var(--ink-amber)", flex:"1 1 200px" }}>
            Ya hay un mensaje escrito. ¿Lo reemplazo?
          </span>
          <Btn size="sm" variant="p" onClick={escribir}>Sí, reemplazalo</Btn>
          <Btn size="sm" onClick={() => setConfirmar(false)}>Dejarlo como está</Btn>
        </div>
      )}

      {/* v2B · parrafitos listos */}
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:9 }}>
        <span className="lbl" style={{ marginRight:2 }}>Agregar al final</span>
        {SNIPS.map(([k, l]) => (
          <button key={k} className="chip" style={{ height:27, fontSize:11.5 }} disabled={escribiendo}
            onClick={() => anexar(snippetMensaje(k, q))}>{l}</button>
        ))}
      </div>

      {/* línea fija: el pasajero siempre lee esto antes del mensaje */}
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7, padding:"7px 11px",
        borderRadius:10, background:"var(--wash)", border:"1px solid var(--hair-soft)" }}>
        <Eye size={12} style={{ color:"var(--n400)", flexShrink:0 }} />
        <span style={{ fontSize:11.5, color:"var(--n400)", lineHeight:1.45 }}>
          Sale debajo de: “De acuerdo a lo conversado, te comparto la cotización para tu viaje.”
        </span>
      </div>

      <div className="wys-bar">
        <B c="bold" title="Negrita"><b>B</b></B>
        <B c="italic" title="Cursiva"><i style={{ fontFamily:"Georgia" }}>I</i></B>
        <B c="underline" title="Subrayado"><u>U</u></B>
        <span style={{ width:1, background:"var(--hair)", margin:"3px 4px" }} />
        <B c="insertUnorderedList" title="Lista"><LayoutGrid size={13} /></B>
        <B c="removeFormat" title="Quitar formato"><X size={13} /></B>
        <span style={{ marginLeft:"auto", fontSize:10.5, color:"var(--n300)", alignSelf:"center", paddingRight:4 }}>
          lo pegado entra sin formato ajeno</span>
      </div>
      <div ref={ed} className="wys" contentEditable suppressContentEditableWarning
        data-ph="Escribí o pegá acá. Negrita, cursiva y listas — siempre con la tipografía de la marca."
        onInput={sync}
        onPaste={(e) => {
          e.preventDefault();
          const t = limpiarPegado(e.clipboardData.getData("text/plain"));
          document.execCommand("insertText", false, t);
          sync();
          toast({ msg:"Texto pegado y normalizado a la tipografía de la marca", tone:"ok" });
        }} />
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, display:"flex", alignItems:"center", gap:6 }}>
        <Check size={11} style={{ color:"var(--teal-2)" }} />
        El formato que apliques acá sale igual en la cotización. Lo que pegues de Word o WhatsApp pierde su fuente y toma la de la marca.
      </div>
    </Block>
  );
}

/* ── 5 · Itinerario de vuelos (PNR) ──────────────────────────────────── */
function BloqueVuelos({ q, set, refEl, toast }) {
  const [estado, setEstado] = useState("idle");  // idle | cargando | error
  const [modo, setModo] = useState("texto");     // texto | foto
  const [foto, setFoto] = useState(null);        // { nombre, url }
  const [choque, setChoque] = useState(null);    // fecha del vuelo ≠ fecha de salida
  const fileRef = useRef(null);
  /* el encabezado sigue a la fecha de salida, así que se acomoda con ella */
  const atarTitulo = (d, iso) => {
    const f = parseISO(iso);
    if (f) { d.titulo.mes = f.getMonth(); d.titulo.anio = f.getFullYear(); }
  };
  const aplicarVuelos = (v) => {
    const p = v[0];
    const iso = toISO(new Date(p.mes >= new Date().getMonth() ? ANIO_BASE : ANIO_BASE + 1, p.mes, p.dia));
    if (!q.fechaSalida) {
      set((d) => { d.vuelos = v; d.fechaSalida = iso; atarTitulo(d, iso); });
      toast({ msg:`Fecha de salida tomada del primer vuelo: ${fmtCorto(iso)}`, tone:"ok" });
    } else if (q.fechaSalida !== iso) {
      set((d) => { d.vuelos = v; });
      setChoque(iso);
    } else {
      set((d) => { d.vuelos = v; });
    }
  };
  const leerFoto = (archivo) => {
    const nombre = archivo ? archivo.name : "reserva-amadeus.png";
    const url = archivo ? URL.createObjectURL(archivo) : null;
    setFoto({ nombre, url });
    setEstado("cargando");
    setTimeout(() => {
      const v = parsePNR(PNR_DEMO);
      set((d) => { d.pnrRaw = PNR_DEMO; });
      aplicarVuelos(v);
      setEstado("idle");
      toast({ msg:`Itinerario leído desde la imagen — ${v.length} tramos`, tone:"ok" });
    }, 1400);
  };
  const convertir = () => {
    if (!q.pnrRaw.trim()) return;
    setEstado("cargando");
    setTimeout(() => {
      const v = parsePNR(q.pnrRaw);
      if (!v.length) { setEstado("error"); return; }           // el pegado NO se pierde
      aplicarVuelos(v);
      setEstado("idle");
      toast({ msg:`${v.length} tramos convertidos al formato de la marca`, tone:"ok" });
    }, 620);
  };
  return (
    <Block id="b-vuelos" forwardRef={refEl} icon={Plane} title="Itinerario de vuelos" count={q.vuelos.length || null}
      right={
        <div className="seg">
          <button data-on={modo === "texto" ? "1" : "0"} onClick={() => setModo("texto")}>
            <FileText size={12} /> Pegar texto</button>
          <button data-on={modo === "foto" ? "1" : "0"} onClick={() => setModo("foto")}>
            <Eye size={12} /> Subir foto</button>
        </div>
      }>
      {modo === "texto" ? (
        <textarea className="in mono" rows={q.pnrRaw ? 5 : 3} value={q.pnrRaw}
          style={{ fontSize:11.5, lineHeight:1.55, background: estado === "error" ? "rgba(244,62,85,.07)" : "var(--field)" }}
          placeholder="Pegá acá el PNR tal como sale del GDS… (igual que en el sistema actual)"
          onChange={(e) => { set((d) => { d.pnrRaw = e.target.value; }); setEstado("idle"); }}
          onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData("text/plain");
            set((d) => { d.pnrRaw = t; }); setEstado("idle"); }} />
      ) : (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={(e) => e.target.files?.[0] && leerFoto(e.target.files[0])} />
          {estado === "cargando" ? (
            <div className="dz" style={{ cursor:"default" }}>
              <Loader2 size={20} className="spin" style={{ color:"var(--violet)", marginBottom:8 }} />
              <div style={{ fontSize:13, fontWeight:600, color:"var(--n600)" }}>Leyendo la reserva…</div>
              <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:3 }}>{foto?.nombre}</div>
            </div>
          ) : (
            <button className="dz" style={{ width:"100%" }} onClick={() => fileRef.current?.click()}>
              <div style={{ width:38, height:38, borderRadius:12, margin:"0 auto 9px", display:"grid", placeItems:"center",
                background:"rgba(120,90,229,.12)", color:"var(--violet)" }}><Plane size={17} /></div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--n600)" }}>Arrastrá o tocá para subir la foto de la reserva</div>
              <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:3 }}>Captura de Amadeus, foto del papel, lo que tengas — lo leemos igual</div>
              <div style={{ marginTop:10 }}>
                <span className="chip" style={{ height:27, fontSize:11.5 }}
                  onClick={(e) => { e.stopPropagation(); leerFoto(null); }}>
                  <Sparkles size={11} /> Probar con una foto de ejemplo</span>
              </div>
            </button>
          )}
          {foto && estado === "idle" && (
            <div className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, marginTop:9, padding:"8px 11px",
              borderRadius:11, background:"rgba(59,191,173,.07)", border:"1px solid rgba(59,191,173,.2)" }}>
              <CheckCheck size={14} style={{ color:"var(--teal-2)" }} />
              <span style={{ fontSize:12, color:"var(--teal-3)", fontWeight:600 }}>{foto.nombre}</span>
              <span style={{ fontSize:11.5, color:"var(--n400)" }}>· itinerario extraído</span>
            </div>
          )}
        </>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:9, marginTop:9, flexWrap:"wrap" }}>
        {modo === "texto" && (
        <Btn variant="p" size="sm" onClick={convertir} disabled={!q.pnrRaw.trim() || estado === "cargando"}>
          {estado === "cargando" ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
          {estado === "cargando" ? "Convirtiendo…" : "Convertir itinerario"}
        </Btn>
        )}
        {modo === "texto" && !q.pnrRaw && (
          <Btn size="sm" onClick={() => set((d) => { d.pnrRaw = PNR_DEMO; })}>Pegar ejemplo</Btn>
        )}
        {q.vuelos.length > 0 && (
          <Btn size="sm" onClick={() => set((d) => { d.vuelos.push({ id:uid("vl"), cia:"LA", nro:"0000",
            aerolinea:"LATAM", dia:1, mes:0, origen:"MVD", destino:"GRU", salida:"08:00", llegada:"09:40" }); })}>
            <Plus size={12} /> Agregar tramo a mano
          </Btn>
        )}
      </div>

      {estado === "error" && (
        <div className="a-slide" style={{ display:"flex", alignItems:"flex-start", gap:9, marginTop:10, padding:"10px 12px",
          background:"rgba(244,62,85,.07)", border:"1px solid rgba(244,62,85,.24)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"var(--coral)", flexShrink:0, marginTop:1 }} />
          <div style={{ fontSize:12, color:"var(--ink-coral)", flex:1 }}>
            <strong>No se reconoció ningún tramo en ese texto.</strong> Lo pegado quedó intacto arriba:
            corregilo y volvé a convertir, o cargá los tramos a mano.
            <div style={{ marginTop:7 }}>
              <Btn size="xs" onClick={() => { set((d) => { d.vuelos.push({ id:uid("vl"), cia:"LA", nro:"0000",
                aerolinea:"LATAM", dia:1, mes:0, origen:"MVD", destino:"GRU", salida:"08:00", llegada:"09:40" }); }); setEstado("idle"); }}>
                <Plus size={11} /> Cargar a mano
              </Btn>
            </div>
          </div>
        </div>
      )}

      {q.vuelos.length > 0 && (
        <div style={{ marginTop:12, border:"1px solid var(--hair-soft)", borderRadius:12, overflow:"hidden" }}>
          {q.vuelos.map((v, i) => (
            <div key={v.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
              borderBottom: i < q.vuelos.length - 1 ? "1px solid var(--hair-soft)" : "none", background:"var(--card-3)" }}>
              <div style={{ width:26, height:26, borderRadius:8, background:"rgba(120,90,229,.11)", color:"var(--violet)",
                display:"grid", placeItems:"center", flexShrink:0 }}><Plane size={12} /></div>
              <input className="in mono" style={{ width:80, height:30, textAlign:"center", fontSize:11.5 }} value={v.cia + v.nro}
                onChange={(e) => { const t = e.target.value.toUpperCase(); const c = t.slice(0,2), n = t.slice(2);
                  set((d) => { d.vuelos[i].cia = c; d.vuelos[i].nro = n; d.vuelos[i].aerolinea = AEROLINEAS[c] || c; }); }} />
              <div style={{ flex:"1 1 96px", fontSize:12, fontWeight:600, minWidth:0, whiteSpace:"nowrap",
                overflow:"hidden", textOverflow:"ellipsis" }}>{v.aerolinea}</div>
              <input className="in mono" style={{ width:58, height:30, textAlign:"center" }} value={v.origen}
                onChange={(e) => set((d) => { d.vuelos[i].origen = e.target.value.toUpperCase().slice(0,3); })} />
              <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
              <input className="in mono" style={{ width:58, height:30, textAlign:"center" }} value={v.destino}
                onChange={(e) => set((d) => { d.vuelos[i].destino = e.target.value.toUpperCase().slice(0,3); })} />
              <input className="in mono" style={{ width:62, height:30, textAlign:"center" }} value={v.salida}
                onChange={(e) => set((d) => { d.vuelos[i].salida = e.target.value; })} />
              <input className="in mono" style={{ width:62, height:30, textAlign:"center" }} value={v.llegada}
                onChange={(e) => set((d) => { d.vuelos[i].llegada = e.target.value; })} />
              <button className="btn btn-g btn-ico" onClick={() => { const cp = { ...v };
                set((d) => { d.vuelos.splice(i, 1); });
                toast({ msg:"Tramo eliminado", tone:"warn", undo:() => set((d) => { d.vuelos.splice(i, 0, cp); }) }); }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* cabina y equipaje: un clic apaga, otro enciende */}
      <div className="hairline" style={{ margin:"14px 0 12px" }} />
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
        <div style={{ width:22, height:22, borderRadius:7, display:"grid", placeItems:"center",
          background:"rgba(120,90,229,.11)", color:"var(--violet)" }}><Luggage size={12} /></div>
        <span style={{ fontSize:12.5, fontWeight:700 }}>Cabina y equipaje</span>
        <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
      </div>

      <div style={{ marginBottom:10 }}>
        <Label>Tipo de cabina</Label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {CABINAS.map((x) => (
            <button key={x} className={`chip ${q.cabina === x ? "chip-on" : ""}`}
              onClick={() => set((d) => { d.cabina = d.cabina === x ? null : x; })}>
              {q.cabina === x ? <Check size={11} /> : <Plane size={11} />}{x}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Equipaje</Label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {EQUIPAJES.map((x) => (
            <button key={x} className={`chip ${q.equipaje === x ? "chip-on" : ""}`}
              onClick={() => set((d) => { d.equipaje = d.equipaje === x ? null : x; })}>
              {q.equipaje === x ? <Check size={11} /> : <Luggage size={11} />}{x}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        Se replica solo en la línea de Aéreo de los servicios incluidos.
      </div>

      {choque && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, padding:"10px 12px",
          background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"var(--ink-amber)", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"var(--ink-amber)", flex:1 }}>
            El vuelo sale el <b>{fmtCorto(choque)}</b> pero la fecha de salida cargada es <b>{fmtCorto(q.fechaSalida)}</b>.
          </span>
          <Btn size="sm" onClick={() => { set((d) => { d.fechaSalida = choque; atarTitulo(d, choque); }); setChoque(null);
            toast({ msg:"Fecha de salida actualizada desde el vuelo", tone:"ok" }); }}>
            <RefreshCw size={12} /> Usar la del vuelo</Btn>
          <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} onClick={() => setChoque(null)}><X size={12} /></button>
        </div>
      )}
      {q.vuelos.length > 0 && !choque && (
        <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
          <Check size={11} style={{ color:"var(--teal-2)" }} />
          Con los vuelos cargados, las fechas de traslado no se piden en ningún otro lado.
        </div>
      )}
    </Block>
  );
}

/* ── 6 · Servicios en cápsulas, reordenables ─────────────────────────── */
function BloqueServicios({ q, set, refEl, toast }) {
  const [cat, setCat] = useState("aereo");
  const [txt, setTxt] = useState("");
  const [acOpen, setAcOpen] = useState(false);
  const [acIdx, setAcIdx] = useState(0);
  const [fly, setFly] = useState(null);      // { cat, ts } badge volador
  const [pulseCat, setPulseCat] = useState(null);
  const acBox = useRef(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [armado, setArmado] = useState(null);
  const inp = useRef(null);

  const agregar = (texto, categoria) => {
    const t = (typeof texto === "string" ? texto : txt).trim(); if (!t) return;
    const c = categoria || cat;
    set((d) => { d.servicios.push({ id:uid("srv"), categoria:c, texto:t,
      ciudad: c === "traslado" ? "" : null, modalidad: c === "traslado" ? "Regular" : null }); });
    setTxt(""); setAcIdx(0);
    setFly({ cat:c, ts:Date.now() });
    setPulseCat(c + Date.now());
    setTimeout(() => setFly(null), 820);
    requestAnimationFrame(() => inp.current?.focus());
  };
  const mover = (from, to) => {
    if (from === to || to == null) return;
    set((d) => { const [it] = d.servicios.splice(from, 1); d.servicios.splice(from < to ? to - 1 : to, 0, it); });
  };

  const sugerencias = SUG[cat].filter((s) => !q.servicios.some((x) => x.texto === s));
  /* busqueda GLOBAL: en todas las categorias, no solo la activa */
  const acRes = useMemo(() => {
    const t = txt.trim().toLowerCase();
    const usados = new Set(q.servicios.map((x) => x.texto));
    if (!t) return SUG[cat].filter((x) => !usados.has(x)).slice(0, 5).map((texto) => ({ cat, texto }));
    return SUG_ALL.filter((x) => !usados.has(x.texto) && x.texto.toLowerCase().includes(t)).slice(0, 6);
  }, [txt, cat, q.servicios]);
  useEffect(() => {
    const h = (e) => { if (acBox.current && !acBox.current.contains(e.target)) setAcOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <Block id="b-servicios" forwardRef={refEl} icon={LayoutGrid} title="Servicios incluidos" count={q.servicios.length}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:11 }}>
        {CATS.map((c) => {
          const n = q.servicios.filter((s) => s.categoria === c.id).length;
          const late = pulseCat && String(pulseCat).startsWith(c.id);
          return (
            <button key={c.id} className={`chip ${cat === c.id ? "chip-on" : ""} ${late ? "a-tada" : ""}`}
              onClick={() => { setCat(c.id); requestAnimationFrame(() => inp.current?.focus()); }}>
              <c.Icon size={12} />{c.label}
              {n > 0 && <span key={n} className="mono a-pulse" style={{ fontSize:10, opacity:.7 }}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* v2B · los cinco que entran en casi todas las cotizaciones */}
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:11 }}>
        <span className="lbl" style={{ marginRight:2 }}>Más usados</span>
        {FRECUENTES.map((f) => {
          const puesto = q.servicios.some((s) => s.texto === f.texto);
          const C = CATS.find((c) => c.id === f.cat) || CATS[0];
          return (
            <button key={f.texto} className={`chip chip-frec ${puesto ? "chip-off" : ""}`} disabled={puesto}
              title={puesto ? "Ya está en la lista" : `Se agrega en ${C.label}`}
              onClick={() => agregar(f.texto, f.cat)}>
              {puesto ? <Check size={11} style={{ color:"var(--teal-2)" }} /> : <Plus size={11} />}
              {f.texto.length > 34 ? f.texto.slice(0, 34) + "…" : f.texto}
            </button>
          );
        })}
      </div>

      <div ref={acBox} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, position:"relative" }}>
        <div style={{ flex:1, position:"relative" }}>
          {fly && (() => { const C = CATS.find((c) => c.id === fly.cat) || CATS[0];
            return <span key={fly.ts} className="fly"><C.Icon size={11} /> {C.label}</span>; })()}
          <input ref={inp} className="in" style={{ width:"100%" }} value={txt}
            placeholder="Buscá en todos los servicios… se agrega en su categoría solo"
            onFocus={() => { setAcOpen(true); setAcIdx(0); }}
            onChange={(e) => { setTxt(e.target.value); setAcOpen(true); setAcIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAcOpen(true); setAcIdx((i) => clamp(i + 1, 0, acRes.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAcIdx((i) => clamp(i - 1, 0, acRes.length - 1)); }
              else if (e.key === "Tab" && acOpen && acRes[acIdx]) { e.preventDefault(); setTxt(acRes[acIdx].texto); }
              else if (e.key === "Enter") { e.preventDefault();
                if (acOpen && acRes[acIdx]) agregar(acRes[acIdx].texto, acRes[acIdx].cat);
                else agregar();
                setAcIdx(0); }
              else if (e.key === "Escape") setAcOpen(false);
            }} />
          {acOpen && acRes.length > 0 && (
            <div className="ac-pop a-slide">
              {acRes.map((x, i) => {
                const C = CATS.find((c) => c.id === x.cat) || CATS[0];
                return (
                <button key={x.cat + x.texto} className="ac-i" data-on={i === acIdx ? "1" : "0"}
                  onMouseEnter={() => setAcIdx(i)} onClick={() => { agregar(x.texto, x.cat); }}>
                  <span style={{ width:22, height:22, borderRadius:7, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.1)", color:"var(--violet)", flexShrink:0 }}><C.Icon size={11} /></span>
                  <span style={{ flex:1 }}>{x.texto}</span>
                  <span className="pill" data-tone="n" style={{ flexShrink:0 }}>{C.label}</span>
                  {i === acIdx && <span className="kbd">{"\u21B5"}</span>}
                </button>
                );
              })}
              <div style={{ padding:"6px 11px", fontSize:10.5, color:"var(--n400)", borderTop:"1px solid var(--hair-soft)",
                display:"flex", gap:10 }}>
                <span><span className="kbd">↑↓</span> elegir</span>
                <span><span className="kbd">Tab</span> completar</span>
                <span><span className="kbd">↵</span> agregar y seguir</span>
              </div>
            </div>
          )}
        </div>
        <span className="kbd" style={{ minWidth:44, gap:4 }}><CornerDownLeft size={10} /> Enter</span>
      </div>

      {sugerencias.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:13 }}>
          {sugerencias.slice(0, 6).map((s) => (
            <button key={s} className="chip" style={{ height:27, fontSize:11.5, color:"var(--n500)" }} onClick={() => agregar(s)}>
              <Plus size={10} />{s.length > 42 ? s.slice(0, 42) + "…" : s}
            </button>
          ))}
        </div>
      )}

      {q.servicios.length === 0
        ? <Vacio icon={LayoutGrid} titulo="Todavía no hay servicios" accion="Elegí una categoría y escribí, o tocá una sugerencia" />
        : (
        <div>
          {q.servicios.map((s, i) => {
            const C = CATS.find((c) => c.id === s.categoria) || CATS[0];
            return (
              <React.Fragment key={s.id}>
                {over === i && drag !== null && <div className="drop-line" />}
                <div draggable={armado === i}
                  onDragStart={() => setDrag(i)}
                  onDragEnd={() => { mover(drag, over); setDrag(null); setOver(null); setArmado(null); }}
                  onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                  className={drag === i ? "drag-on" : ""}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 9px", marginBottom:5,
                    background:"var(--card-3)", border:"1px solid var(--hair-soft)", borderRadius:11, transition:"box-shadow .16s" }}>
                  <GripVertical size={14} style={{ color:"var(--n300)", cursor:"grab", flexShrink:0 }}
                    onMouseDown={() => setArmado(i)} onMouseUp={() => setArmado(null)} />
                  <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.10)", color:"var(--violet)" }}><C.Icon size={12} /></div>
                  <input className="in" style={{ flex:"1 1 140px", height:30, border:"1px solid transparent",
                    background:"transparent", paddingLeft:2 }} value={s.texto}
                    onChange={(e) => set((d) => { d.servicios[i].texto = e.target.value;
                      delete d.servicios[i].auto; })} />
                  {s.categoria === "traslado" && (
                    <>
                      <select className="in" style={{ width:126, height:30, fontSize:12 }} value={s.ciudad || ""}
                        onChange={(e) => set((d) => { d.servicios[i].ciudad = e.target.value; })}>
                        <option value="">Ciudad…</option>
                        {[...new Set([...q.destinos.map((x) => x.ciudad), ...CIUDADES])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <select className="in" style={{ width:92, height:30, fontSize:12 }} value={s.modalidad || "Regular"}
                        onChange={(e) => set((d) => { d.servicios[i].modalidad = e.target.value; })}>
                        {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </>
                  )}
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} disabled={i === 0}
                      onClick={() => mover(i, i - 1)}><ArrowUp size={12} /></button>
                    <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} disabled={i === q.servicios.length - 1}
                      onClick={() => mover(i, i + 2)}><ArrowDown size={12} /></button>
                    <button className="btn btn-g btn-ico" style={{ width:25, height:25 }}
                      onClick={() => { const cp = { ...s }; set((d) => { d.servicios.splice(i, 1); });
                        toast({ msg:"Servicio eliminado", tone:"warn", undo:() => set((d) => { d.servicios.splice(i, 0, cp); }) }); }}>
                      <Trash2 size={12} /></button>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {over === q.servicios.length && drag !== null && <div className="drop-line" />}
          <div onDragOver={(e) => { e.preventDefault(); setOver(q.servicios.length); }} style={{ height:10 }} />
        </div>
      )}
      <div style={{ fontSize:11, color:"var(--n400)", display:"flex", alignItems:"center", gap:6 }}>
        <GripVertical size={11} /> Arrastrá para reordenar, o usá las flechas. El orden es el que ve el pasajero.
      </div>
    </Block>
  );
}

/* ── Notas internas — block fijo en la columna izquierda; nunca salen ──── */
function NotasRail({ q, set, vistaPasajero, toast }) {
  const [abierto, setAbierto] = useState(false);
  const [c, setC] = useState("");
  const [n, setN] = useState("");
  const inp = useRef(null);
  const notas = q.notas || [];
  const total = notas.reduce((a, x) => a + Number(x.neto || 0), 0);
  const agregar = () => {
    if (!c.trim()) return;
    set((d) => { d.notas.push({ id:uid("nt"), concepto:c.trim(), neto:Number(n) || 0 }); });
    setC(""); setN(""); requestAnimationFrame(() => inp.current?.focus());
  };
  const borrar = (x, i) => {
    const cp = { ...x };
    set((d) => { d.notas.splice(i, 1); });
    toast?.({ msg:"Nota eliminada", tone:"warn", undo:() => set((d) => { d.notas.splice(i, 0, cp); }) });
  };

  useEffect(() => {
    if (!abierto) return;
    const h = (e) => { if (e.key === "Escape") { e.preventDefault(); setAbierto(false); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [abierto]);

  /* el mismo textarea en la card y en el overlay — función, no componente,
     para que React no lo remonte en cada tecla */
  const area = (filas, foco) => (
    <textarea className="in" rows={filas} autoFocus={foco} value={q.notasLibres || ""}
      style={{ width:"100%", resize:"vertical", lineHeight:1.5, paddingTop:8, fontSize:12 }}
      placeholder="Anotá acá netos, avisos, lo que necesites mientras cotizás…"
      onChange={(e) => set((d) => { d.notasLibres = e.target.value; })} />
  );

  if (vistaPasajero) {
    return (
      <div className="card" style={{ padding:11, marginTop:11, opacity:.55 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
          <Lock size={12} style={{ color:"var(--n400)", flexShrink:0 }} />
          <span className="lbl">Notas internas</span>
        </div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:10.5, color:"var(--n400)", lineHeight:1.5 }}>
          <EyeOff size={13} style={{ flexShrink:0, marginTop:1 }} />
          <span>Escondido — el pasajero nunca ve esto.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ padding:11, marginTop:11 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          <Lock size={12} style={{ color:"var(--coral)", flexShrink:0 }} />
          <span className="lbl">Notas internas</span>
          <Pill tone="coral" style={{ marginLeft:"auto" }}>No se comparte</Pill>
        </div>
        {area(7, false)}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
          <button className="btn btn-g btn-xs" onClick={() => setAbierto(true)}>
            <Maximize2 size={11} /> Expandir
          </button>
          {notas.length > 0 && (
            <span className="mono" style={{ marginLeft:"auto", fontSize:10, color:"var(--n400)" }}>
              {notas.length} · {money(total)}
            </span>
          )}
        </div>
      </div>

      {/* el overlay sale por un portal: la columna izquierda es sticky y se lo comería */}
      {abierto && createPortal(
        <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="a-zoom card" style={{ width:"min(720px,100%)", padding:0, overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 17px",
              borderBottom:"1px solid var(--hair-soft)" }}>
              <div style={{ width:28, height:28, borderRadius:9, display:"grid", placeItems:"center",
                background:"rgba(244,62,85,.11)", color:"var(--ink-coral)" }}><Lock size={15} /></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, letterSpacing:"-.01em" }}>Notas internas</div>
                <div style={{ fontSize:11.5, color:"var(--n400)" }}>Solo para el equipo — el pasajero nunca ve esto.</div>
              </div>
              <span className="kbd">esc</span>
              <button className="btn btn-g btn-ico" onClick={() => setAbierto(false)}><X size={15} /></button>
            </div>

            <div style={{ padding:"14px 17px", maxHeight:"72vh", overflowY:"auto" }}>
              {area(10, true)}

              <div className="lbl" style={{ margin:"16px 0 7px" }}>Costos fijos</div>
              {notas.length === 0
                ? <div style={{ fontSize:11.5, color:"var(--n400)", marginBottom:9 }}>
                    Netos y costos que respaldan el precio — tampoco se comparten.
                  </div>
                : (
                <div style={{ border:"1px solid var(--hair-soft)", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
                  {notas.map((x, i) => (
                    <div key={x.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
                      borderBottom:"1px solid var(--hair-soft)", background:"var(--card-3)" }}>
                      <input className="in" style={{ flex:1, height:29, border:"1px solid transparent",
                        background:"transparent", paddingLeft:2 }} value={x.concepto}
                        onChange={(e) => set((d) => { d.notas[i].concepto = e.target.value; })} />
                      <input className="in mono" style={{ width:104, height:29, textAlign:"right" }} type="number" value={x.neto}
                        onChange={(e) => set((d) => { d.notas[i].neto = e.target.value; })} />
                      <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} onClick={() => borrar(x, i)}>
                        <Trash2 size={12} /></button>
                    </div>
                  ))}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px",
                    background:"var(--wash)" }}>
                    <span className="lbl">Total de costos fijos</span>
                    <span className="mono" style={{ fontSize:14, fontWeight:600 }}>{money(total)}</span>
                  </div>
                </div>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <input ref={inp} className="in" style={{ flex:1 }} value={c} placeholder="Concepto…"
                  onChange={(e) => setC(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
                <input className="in mono" style={{ width:110, textAlign:"right" }} type="number" value={n} placeholder="0"
                  onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
                <Btn size="sm" onClick={agregar} style={{ height:38 }}><Plus size={13} /></Btn>
              </div>
            </div>
          </div>
        </div>,
        /* dentro de .ctz para no perder las variables de color ni el modo oscuro */
        document.querySelector(".ctz") || document.body
      )}
    </>
  );
}

/* ── 7b · Notas para el pasajero — SÍ salen en la cotización ─────────── */
function BloqueNotasCliente({ q, set, refEl, toast }) {
  const [t, setT] = useState("");
  const inp = useRef(null);
  const agregar = () => { if (!t.trim()) return;
    set((d) => { d.notasCliente.push({ id:uid("nc"), texto:t.trim() }); });
    setT(""); requestAnimationFrame(() => inp.current?.focus()); };
  return (
    <Block id="b-notascliente" forwardRef={refEl} icon={StickyNote} title="Notas para el pasajero"
      count={q.notasCliente.length}
      right={<Pill tone="teal"><Eye size={9} /> Sale en la cotización</Pill>}>
      {q.notasCliente.length === 0
        ? <Vacio icon={StickyNote} titulo="Sin notas para el pasajero"
            accion="Aclaraciones que sí se comparten: documentación, vacunas, horarios de check-in…" />
        : (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
          {q.notasCliente.map((x, i) => (
            <div key={x.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
              background:"rgba(59,191,173,.05)", border:"1px solid rgba(59,191,173,.16)", borderRadius:11 }}>
              <StickyNote size={12} style={{ color:"var(--teal-2)", flexShrink:0 }} />
              <input className="in" style={{ flex:1, height:29, border:"1px solid transparent", background:"transparent", paddingLeft:2 }}
                value={x.texto} onChange={(e) => set((d) => { d.notasCliente[i].texto = e.target.value; })} />
              <button className="btn btn-g btn-ico" style={{ width:25, height:25 }}
                onClick={() => { const cp = { ...x }; set((d) => { d.notasCliente.splice(i, 1); });
                  toast({ msg:"Nota eliminada", tone:"warn", undo:() => set((d) => { d.notasCliente.splice(i, 0, cp); }) }); }}>
                <Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <input ref={inp} className="in" style={{ flex:1 }} value={t}
          placeholder="Ej.: Pasaporte con 6 meses de vigencia · Enter para agregar"
          onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <Btn size="sm" onClick={agregar} style={{ height:38 }}><Plus size={13} /></Btn>
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, display:"flex", alignItems:"center", gap:6 }}>
        <Eye size={11} style={{ color:"var(--teal-2)" }} />
        A diferencia de las notas internas, estas aparecen en la cotización bajo "A tener en cuenta".
      </div>
    </Block>
  );
}

/* ── v2B · lectura del margen en criollo, solo para el vendedor ───────── */
function LineaMargen({ neto, factor }) {
  const f = Number(factor);
  if (!Number.isFinite(f) || f <= 0) return (
    <span className="mono" style={{ fontSize:10.5, color:"var(--ink-amber)" }}>Falta el factor para calcular el margen</span>
  );
  const pv = venta(neto, factor);
  const m = margenPct(factor);
  const col = m >= 12 ? "var(--teal-3)" : m >= 8 ? "var(--ink-amber)" : "var(--coral)";
  const fTxt = f.toFixed(2).replace(".", ",");
  const mTxt = String(m).replace(".", ",");
  return (
    <div className="mrg mono" tabIndex={0}>
      <span style={{ color:"var(--n400)" }}>Neto {money(neto)} ÷ {fTxt} → Venta {money(pv)} · </span>
      <span style={{ color:col, fontWeight:500 }}>Margen {mTxt}%</span>
      <span className="tip">
        <b>Margen de la agencia</b>
        Lo que queda para la agencia antes de costos fijos: {money(pv)} de venta − {money(neto)} de neto = {money(pv - neto)}.
        <span style={{ display:"block", marginTop:6, opacity:.8 }}>
          Verde de 12% para arriba · ámbar por debajo de 12% · rojo por debajo de 8%.
        </span>
      </span>
    </div>
  );
}

/* ── 8 · Opciones hoteleras ──────────────────────────────────────────── */
function SeccionOpciones({ q, set, tramos, toast, vistaPasajero }) {
  const [foco, setFoco] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [armado, setArmado] = useState(null);
  const nombreRefs = useRef({});

  useEffect(() => { if (foco && nombreRefs.current[foco]) { nombreRefs.current[foco].focus(); nombreRefs.current[foco].select(); setFoco(null); } }, [foco, q.opciones.length]);

  const nueva = () => {
    const id = uid("op");
    set((d) => { d.opciones.push({ id, nombre:`Opción ${d.opciones.length + 1}`,
      hoteles: d.destinos.map(() => ({ hotelId:null, libre:"" })),
      regimen:"Desayuno", factor:0.88, habitaciones:[habitacionNueva("Doble")] }); });
    setFoco(id);
  };
  /* la segunda tarifa suele ser el menor y la tercera la familiar */
  const tipoSiguiente = (n) => (n === 1 ? "Por menor" : n === 2 ? "Por familia" : "Por adulto");
  const duplicar = (i) => {
    const src = q.opciones[i]; const id = uid("op");
    const copia = JSON.parse(JSON.stringify(src));
    copia.id = id; copia.nombre = src.nombre + " (copia)";
    set((d) => { d.opciones.splice(i + 1, 0, copia); });
    setFoco(id);
    toast({ msg:"Opción duplicada — el orden quedó intacto", tone:"ok" });
  };
  const mover = (from, to) => { if (from === to || to == null) return;
    set((d) => { const [it] = d.opciones.splice(from, 1); d.opciones.splice(from < to ? to - 1 : to, 0, it); }); };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:9, margin:"18px 0 12px" }}>
        <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
          background:"rgba(59,191,173,.13)", color:"var(--teal-3)" }}><Bed size={13} /></div>
        <span style={{ fontSize:12.5, fontWeight:700 }}>Opciones hoteleras</span>
        {q.opciones.length > 0 && <Pill tone="n">{q.opciones.length}</Pill>}
        <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
        <Btn variant="p" size="sm" onClick={nueva}><Plus size={13} /> Nueva opción</Btn>
      </div>
      {q.opciones.length === 0 && <Vacio icon={Building2} titulo="Todavía no hay opciones" accion="Agregá la primera y elegí un hotel por destino — hereda los destinos y fechas de arriba" />}

      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        {q.opciones.map((o, i) => {
          const habs = o.habitaciones || [];
          const t0 = habs[0]?.tarifas?.[0] || null;
          const pv = precioOpcion(o);
          const etiqueta = t0 ? `${etiquetaTarifa(t0)} · ${habs[0].ocupacion}` : "sin tarifas cargadas";
          const faltaPrecio = habs.some((h) => (h.tarifas || []).some((t) => !Number(t.neto) && !Number(t.venta)));
          return (
            <React.Fragment key={o.id}>
              {over === i && drag !== null && <div className="drop-line" />}
              <div draggable={armado === i}
                onDragStart={() => setDrag(i)}
                onDragEnd={() => { mover(drag, over); setDrag(null); setOver(null); setArmado(null); }}
                onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                className={`a-pop ${drag === i ? "drag-on" : ""}`}
                style={{ border:"1px solid var(--hair-soft)", borderRadius:14, overflow:"hidden", background:"var(--card)",
                  boxShadow:"0 1px 2px rgba(26,26,46,.03)" }}>

                {/* cabecera de la opción */}
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px",
                  background:"linear-gradient(180deg,var(--card-3),var(--card-2))", borderBottom:"1px solid var(--hair-soft)" }}>
                  <GripVertical size={14} style={{ color:"var(--n300)", cursor:"grab", flexShrink:0 }}
                    onMouseDown={() => setArmado(i)} onMouseUp={() => setArmado(null)} />
                  <input ref={(el) => { nombreRefs.current[o.id] = el; }}
                    className="in" style={{ flex:"1 1 150px", height:31, fontWeight:700, fontSize:13,
                      border:"1px solid transparent", background:"transparent", paddingLeft:2 }}
                    value={o.nombre} onChange={(e) => set((d) => { d.opciones[i].nombre = e.target.value; })} />
                  <div style={{ display:"flex", gap:3 }}>
                    <button className="btn btn-s btn-ico" title="Duplicar esta opción" onClick={() => duplicar(i)}>
                      <Copy size={13} /></button>
                    <button className="btn btn-g btn-ico" disabled={i === 0} onClick={() => mover(i, i - 1)}><ArrowUp size={13} /></button>
                    <button className="btn btn-g btn-ico" disabled={i === q.opciones.length - 1} onClick={() => mover(i, i + 2)}><ArrowDown size={13} /></button>
                    <button className="btn btn-g btn-ico" onClick={() => { const cp = JSON.parse(JSON.stringify(o));
                      set((d) => { d.opciones.splice(i, 1); });
                      toast({ msg:`${o.nombre} eliminada`, tone:"warn", undo:() => set((d) => { d.opciones.splice(i, 0, cp); }) }); }}>
                      <Trash2 size={13} /></button>
                  </div>
                </div>

                {/* hoteles por tramo */}
                <div style={{ padding:"11px" }}>
                  {tramos.length === 0 && <div style={{ fontSize:12, color:"var(--n400)" }}>Agregá destinos para elegir hoteles por tramo.</div>}
                  {tramos.map((t, hi) => {
                    const h = o.hoteles[hi] || { hotelId:null, libre:"" };
                    const H = hotelById(h.hotelId);
                    const antes = hotelesCotizadosEn(t.ciudad);   /* v2B · de los paquetes publicados */
                    return (
                      <div key={t.id} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <Foto seed={H?.seed ?? (hi + 40)} w={48} h={36} r={9} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <span className="lbl" style={{ color:"var(--violet)" }}>{t.ciudad}</span>
                              <span className="mono" style={{ fontSize:10, color:"var(--n400)" }}>
                                {t.noches}n · {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)}
                              </span>
                            </div>
                            <BuscadorHotel ciudad={t.ciudad} valor={h.libre || H?.nombre || ""}
                              onPick={(hh) => set((d) => { if (!d.opciones[i].hoteles[hi]) d.opciones[i].hoteles[hi] = {};
                                d.opciones[i].hoteles[hi] = { hotelId:hh.id, libre:"" }; })}
                              onLibre={(txt) => set((d) => { if (!d.opciones[i].hoteles[hi]) d.opciones[i].hoteles[hi] = {};
                                d.opciones[i].hoteles[hi] = { hotelId:null, libre:txt }; })} />
                          </div>
                          {H && <div style={{ flexShrink:0 }}><Estrellas n={H.cat} /></div>}
                          {h.libre && <Pill tone="amber" style={{ flexShrink:0 }}><PenLine size={9} /> libre</Pill>}
                        </div>
                        {antes.length > 0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginTop:6, paddingLeft:57 }}>
                            <span style={{ fontSize:10.5, color:"var(--n400)", whiteSpace:"nowrap" }}>
                              Cotizados antes en {t.ciudad}:</span>
                            {antes.map((hh) => (
                              <button key={hh.id} className={`chip chip-mini ${h.hotelId === hh.id ? "chip-on" : ""}`}
                                title={`${hh.nombre} · ${hh.cat} estrellas`}
                                onClick={() => set((d) => { if (!d.opciones[i].hoteles[hi]) d.opciones[i].hoteles[hi] = {};
                                  d.opciones[i].hoteles[hi] = { hotelId:hh.id, libre:"" }; })}>
                                {h.hotelId === hh.id ? <Check size={10} /> : <Plus size={10} />}{hh.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:11 }}>
                    <div style={{ flex:"1 1 180px" }}>
                      <Label>Régimen</Label>
                      <select className="in" value={o.regimen} onChange={(e) => set((d) => { d.opciones[i].regimen = e.target.value; })}>
                        {REGIMENES.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* habitaciones: cada una con su ocupación, su tipo y sus tarifas */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, margin:"14px 0 8px" }}>
                    <span className="lbl">Habitaciones</span>
                    {habs.length > 0 && <Pill tone="n">{habs.length}</Pill>}
                    <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
                    <Btn size="xs" onClick={() => set((d) => {
                      d.opciones[i].habitaciones = d.opciones[i].habitaciones || [];
                      d.opciones[i].habitaciones.push(habitacionNueva("Doble")); })}>
                      <Plus size={11} /> Agregar habitación</Btn>
                  </div>

                  {habs.length === 0 && (
                    <div style={{ fontSize:11.5, color:"var(--n400)", marginBottom:9 }}>
                      Esta opción todavía no tiene habitaciones. Agregá la primera para cargarle tarifas.
                    </div>
                  )}

                  {habs.map((hab, hj) => (
                    <div key={hab.id} className="a-pop" style={{ border:"1px solid var(--hair-soft)", borderRadius:12,
                      padding:"10px", marginBottom:8, background:"var(--card-3)" }}>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
                        <div style={{ flex:"1 1 140px" }}>
                          <Label>Ocupación</Label>
                          <select className="in" style={{ height:34 }} value={hab.ocupacion}
                            onChange={(e) => set((d) => { d.opciones[i].habitaciones[hj].ocupacion = e.target.value; })}>
                            {OCUPACIONES.map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </div>
                        <div style={{ flex:"2 1 190px" }}>
                          <Label hint="opcional">Tipo de habitación</Label>
                          <input className="in" style={{ height:34 }} value={hab.tipo || ""}
                            placeholder="Vista al mar, suite junior, apartamento…"
                            onChange={(e) => set((d) => { d.opciones[i].habitaciones[hj].tipo = e.target.value; })} />
                        </div>
                        <button className="btn btn-g btn-ico" style={{ width:34, height:34 }} title="Quitar habitación"
                          disabled={habs.length <= 1}
                          onClick={() => { const cp = JSON.parse(JSON.stringify(hab));
                            set((d) => { d.opciones[i].habitaciones.splice(hj, 1); });
                            toast({ msg:"Habitación eliminada", tone:"warn",
                              undo:() => set((d) => { d.opciones[i].habitaciones.splice(hj, 0, cp); }) }); }}>
                          <Trash2 size={13} /></button>
                      </div>

                      <div style={{ marginTop:10 }}>
                        {(hab.tarifas || []).map((t, tk) => {
                          /* venta null → automática; con número, el vendedor la pisó */
                          const manual = t.venta !== null && t.venta !== "" && t.venta !== undefined;
                          const L = (txt, hint) => (tk === 0 ? <Label hint={hint}>{txt}</Label> : null);
                          return (
                            <div key={t.id} style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-end", marginBottom:6 }}>
                              <div style={{ flex:"1 1 130px" }}>
                                {L("Tarifa")}
                                <select className="in" style={{ height:32, fontSize:12 }} value={t.tipo}
                                  onChange={(e) => set((d) => { d.opciones[i].habitaciones[hj].tarifas[tk].tipo = e.target.value; })}>
                                  {TARIFA_TIPOS.map((x) => <option key={x}>{x}</option>)}
                                </select>
                              </div>
                              {t.tipo === "Otro" && (
                                <div style={{ flex:"1 1 130px" }}>
                                  {L("Nombre")}
                                  <input className="in" style={{ height:32, fontSize:12 }} value={t.tipoLibre || ""}
                                    placeholder="Ej.: Por bebé"
                                    onChange={(e) => set((d) => { d.opciones[i].habitaciones[hj].tarifas[tk].tipoLibre = e.target.value; })} />
                                </div>
                              )}
                              <div style={{ width:100 }}>
                                {L("Neto")}
                                <input className="in mono" style={{ height:32, textAlign:"right" }} type="number" value={t.neto}
                                  onChange={(e) => set((d) => { d.opciones[i].habitaciones[hj].tarifas[tk].neto = e.target.value; })} />
                              </div>
                              <div style={{ width:112 }}>
                                {L("Venta", manual ? null : "automática")}
                                <input className="in mono" type="number"
                                  style={{ height:32, textAlign:"right",
                                    color: manual ? "var(--ink-amber)" : "var(--teal-3)" }}
                                  value={manual ? t.venta : Math.round(ventaTarifa(t, o.factor))}
                                  onChange={(e) => set((d) => { const v = e.target.value;
                                    d.opciones[i].habitaciones[hj].tarifas[tk].venta = v === "" ? null : v; })} />
                              </div>
                              {manual && (
                                <button className="pill" title="Volver a la venta automática (neto ÷ factor)"
                                  style={{ height:32, background:"rgba(247,178,103,.2)", color:"var(--ink-amber)", cursor:"pointer" }}
                                  onClick={() => set((d) => { d.opciones[i].habitaciones[hj].tarifas[tk].venta = null; })}>
                                  manual <RefreshCw size={9} />
                                </button>
                              )}
                              <button className="btn btn-g btn-ico" style={{ width:32, height:32 }} title="Quitar tarifa"
                                disabled={(hab.tarifas || []).length <= 1}
                                onClick={() => set((d) => { d.opciones[i].habitaciones[hj].tarifas.splice(tk, 1); })}>
                                <Trash2 size={12} /></button>
                            </div>
                          );
                        })}
                        <Btn size="xs" onClick={() => set((d) => {
                          const ts = d.opciones[i].habitaciones[hj].tarifas;
                          ts.push(tarifaNueva(tipoSiguiente(ts.length))); })}>
                          <Plus size={11} /> Tarifa</Btn>
                      </div>
                    </div>
                  ))}

                  {/* markup: factor divisor, venta en vivo */}
                  <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:10, alignItems:"flex-end",
                    padding:"10px", background:"rgba(59,191,173,.045)", border:"1px solid rgba(59,191,173,.16)", borderRadius:11 }}>
                    <div style={{ flex:"1 1 110px" }}>
                      <Label hint={vistaPasajero ? null : `${margenPct(o.factor)}%`}>Factor</Label>
                      <input className="in mono" type="number" step="0.01" min="0.5" max="1" value={o.factor}
                        onChange={(e) => set((d) => { d.opciones[i].factor = e.target.value; })} />
                    </div>
                    <div style={{ flex:"2 1 150px", textAlign:"right" }}>
                      <Label>Precio de venta</Label>
                      <div key={pv} className="a-pulse" style={{ fontSize:20, fontWeight:700, letterSpacing:"-.025em",
                        color:"var(--teal-3)", lineHeight:1.25 }}>{money(pv)}</div>
                      <div style={{ fontSize:10.5, color:"var(--n400)" }}>{etiqueta}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                    {faltaPrecio && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"var(--ink-amber)" }}>
                        <AlertCircle size={11} /> Hay tarifas sin neto ni venta
                      </span>
                    )}
                    {!vistaPasajero && (
                      <div style={{ marginLeft:"auto" }}><LineaMargen neto={t0?.neto ?? 0} factor={o.factor} /></div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {over === q.opciones.length && drag !== null && <div className="drop-line" />}
        <div onDragOver={(e) => { e.preventDefault(); setOver(q.opciones.length); }} style={{ height:6 }} />
      </div>
    </div>
  );
}

/* ── 3+8 · Destinos y alojamiento — un solo módulo ──────────────────── */
function BloqueAlojamiento({ q, set, tramos, refEl, toast, vistaPasajero }) {
  const noches = tramos.reduce((a, t) => a + t.noches, 0);
  return (
    <Block id="b-alojamiento" forwardRef={refEl} icon={Building2} title="Destinos y alojamiento"
      count={q.destinos.length}
      right={noches > 0 && <Pill tone="teal"><Bed size={9} /> {noches} noches</Pill>}>
      <SeccionDestinos q={q} set={set} tramos={tramos} toast={toast} />
      <SeccionOpciones q={q} set={set} tramos={tramos} toast={toast} vistaPasajero={vistaPasajero} />
    </Block>
  );
}

/* ── A2 · banner del editor: qué entendió la IA + la consulta original ── */
function BannerIA({ ia }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="a-rise" style={{ marginBottom:14, padding:"12px 14px", borderRadius:14,
      background:"linear-gradient(90deg,rgba(244,62,85,.06),rgba(120,90,229,.08))",
      border:"1px solid rgba(120,90,229,.24)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <ChipIA />
        <div style={{ fontSize:12.5, flex:"1 1 260px" }}>
          La IA armó este borrador leyendo tu consulta — revisá y ajustá.
          <span style={{ color:"var(--n400)" }}> Todo editable.</span>
        </div>
        <button className="btn btn-g btn-xs" onClick={() => setVer((v) => !v)}>
          {ver ? "Ocultar la consulta" : "Ver la consulta original"}
          <ChevronDown size={11} style={{ transform: ver ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
        </button>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:9 }}>
        {ia.paquete && (
          <span className="pill" style={{ background:"rgba(59,191,173,.14)", color:"var(--teal-3)" }}>
            <Zap size={8} /> Precargado desde {ia.paquete}
          </span>
        )}
        {(ia.chips || []).map((c) => (
          <span key={c} className="pill" style={{ background:"var(--pop)", color:"var(--n600)", border:"1px solid var(--hair)" }}>
            <Check size={8} style={{ color:"var(--teal-2)" }} /> {c}
          </span>
        ))}
      </div>

      {!ia.paquete && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:9, fontSize:11.5, color:"var(--ink-amber)" }}>
          <AlertCircle size={12} style={{ flexShrink:0 }} />
          No encontré un paquete que coincida — la armé en blanco con lo que entendí.
        </div>
      )}

      {ver && (
        <div className="a-slide" style={{ marginTop:10, padding:"11px 13px", borderRadius:12, background:"var(--card)",
          border:"1px solid var(--hair-soft)" }}>
          <div className="lbl" style={{ marginBottom:6 }}>Lo que escribió el pasajero</div>
          <div style={{ fontSize:12.5, lineHeight:1.65, color:"var(--n600)", whiteSpace:"pre-wrap" }}>{ia.consulta}</div>
        </div>
      )}
    </div>
  );
}

/* ── v2B · aviso de "Ver como pasajero" ──────────────────────────────── */
function BannerPasajero({ onSalir }) {
  return (
    <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14,
      padding:"9px 13px", borderRadius:12, background:"rgba(120,90,229,.07)",
      border:"1px solid rgba(120,90,229,.24)" }}>
      <Eye size={14} style={{ color:"var(--violet)", flexShrink:0 }} />
      <span style={{ fontSize:12.5, flex:1 }}>
        Estás viendo lo mismo que el pasajero — nada interno a la vista.
      </span>
      <Btn size="xs" onClick={onSalir}><EyeOff size={11} /> Volver a la vista del vendedor</Btn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2B · HOJA DE ATAJOS  (tecla ?)
   ═══════════════════════════════════════════════════════════════════════════ */

const ATAJOS = [
  { titulo:"Mientras armás la cotización", filas:[
    ["Abrir la paleta de comandos",              ["⌘","K"]],
    ["Compartir la cotización",                  ["⌘","↵"]],
    ["Saltar a un bloque",                       ["Alt","1","…","7"]],
    ["Pasar al campo siguiente (Cliente y Encabezado)", ["↵"]],
    ["Agregar el servicio y seguir escribiendo", ["↵"]],
    ["Completar la sugerencia de servicio",      ["Tab"]],
    ["Moverse entre sugerencias",                ["↑","↓"]],
    ["Cerrar lo que esté abierto",               ["Esc"]],
  ]},
  { titulo:"En el inicio y en los modales", filas:[
    ["Abrir la paleta de comandos",              ["⌘","K"]],
    ["Elegir un camino en “¿Cómo arrancamos?”",  ["1","…","5"]],
    ["Volver a los caminos",                     ["←"]],
    ["Cerrar el modal o la vista previa",        ["Esc"]],
    ["Abrir esta hoja",                          ["?"]],
  ]},
];

function HojaAtajos({ onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" || e.key === "?") { e.preventDefault(); onClose(); } };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(700px,100%)", padding:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 17px",
          borderBottom:"1px solid var(--hair-soft)" }}>
          <div style={{ width:28, height:28, borderRadius:9, display:"grid", placeItems:"center",
            background:"rgba(120,90,229,.12)", color:"var(--violet)" }}><Keyboard size={15} /></div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, letterSpacing:"-.01em" }}>Atajos de teclado</div>
            <div style={{ fontSize:11.5, color:"var(--n400)" }}>Todo lo que se puede hacer sin soltar el teclado.</div>
          </div>
          <span className="kbd">esc</span>
          <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="atj-cols">
          {ATAJOS.map((col) => (
            <div key={col.titulo}>
              <div className="lbl" style={{ marginBottom:8 }}>{col.titulo}</div>
              {col.filas.map(([l, keys], i) => (
                <div key={l + i} className="atj-row">
                  <span style={{ flex:1, fontSize:12.5, color:"var(--n600)" }}>{l}</span>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:3, flexShrink:0 }}>
                    {keys.map((k, j) => k === "…"
                      ? <span key={j} style={{ color:"var(--n300)", fontSize:11 }}>…</span>
                      : <span key={j} className="kbd">{k}</span>)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding:"10px 17px 14px", fontSize:11, color:"var(--n400)", lineHeight:1.55,
          borderTop:"1px solid var(--hair-soft)" }}>
          En Windows y Linux, <span className="kbd">⌘</span> es <span className="kbd">Ctrl</span>.
          La tecla <span className="kbd">?</span> abre esta hoja siempre que no estés escribiendo en un campo.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PALETA DE COMANDOS  ⌘K
   ═══════════════════════════════════════════════════════════════════════════ */

function Paleta({ acciones, onClose }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const res = useMemo(() => {
    if (!q.trim()) return acciones;
    const s = q.toLowerCase();
    return acciones.filter((a) => a.label.toLowerCase().includes(s) || (a.grupo || "").toLowerCase().includes(s));
  }, [q, acciones]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => clamp(x + 1, 0, res.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => clamp(x - 1, 0, res.length - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); res[i]?.run(); onClose(); }
    };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [res, i, onClose]);

  return (
    <div className="ov" style={{ alignItems:"flex-start", paddingTop:"12vh" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(520px,100%)", padding:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 15px", borderBottom:"1px solid var(--hair-soft)" }}>
          <Command size={16} style={{ color:"var(--violet)" }} />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
            placeholder="Buscar acción o bloque…"
            style={{ flex:1, border:"none", background:"transparent", fontSize:15, outline:"none" }} />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight:330, overflowY:"auto", padding:6 }}>
          {res.map((a, k) => (
            <button key={a.label} onMouseEnter={() => setI(k)} onClick={() => { a.run(); onClose(); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 10px", borderRadius:10,
                textAlign:"left", background: i === k ? "rgba(120,90,229,.09)" : "transparent" }}>
              <a.Icon size={14} style={{ color: i === k ? "var(--violet)" : "var(--n400)", flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:500, flex:1 }}>{a.label}</span>
              {a.grupo && <span className="lbl">{a.grupo}</span>}
            </button>
          ))}
          {!res.length && <div style={{ padding:26, textAlign:"center", fontSize:13, color:"var(--n400)" }}>Sin resultados</div>}
        </div>
      </div>
    </div>
  );
}

export {
  BloqueCliente, BloqueEncabezado, SeccionDestinos, BloqueMensaje, BloqueVuelos, BloqueServicios,
  NotasRail, BloqueNotasCliente, SeccionOpciones, BloqueAlojamiento, BannerIA, Paleta,
  /* v2B */
  LineaMargen, BannerPasajero, HojaAtajos, ATAJOS, enterAvanza,
};
