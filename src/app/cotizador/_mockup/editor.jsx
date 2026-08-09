"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plane, Building2, Sparkles, MapPin, User, MessageSquare, FileText, Copy, Trash2, GripVertical,
  Plus, Check, ChevronDown, ChevronRight, Search, Eye, Command, Zap, Bed, X, LayoutGrid, Loader2,
  CheckCheck, AlertCircle, RefreshCw, PenLine, Lock, ArrowUp, ArrowDown, CornerDownLeft,
  StickyNote
} from "lucide-react";
import {
  MESES, ANIO_BASE, REGIMENES, HABITACIONES, SUG, MODALIDADES, SUG_ALL, CIUDADES, AEROLINEAS,
  PNR_DEMO, CLIENTES, uid, hotelById, clamp, toISO, fmtCorto, money, venta, margenPct,
  limpiarPegado, parsePNR
} from "./data";
import {
  Foto, CATS, Btn, Label, Pill, ChipIA, Estrellas, Block, Vacio, Calendario, AutoCiudad,
  BuscadorHotel
} from "./ui";

/* ═══════════════════════════════════════════════════════════════════════════
   BLOQUES DEL ARMADO
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1 · Cliente ─────────────────────────────────────────────────────── */
function BloqueCliente({ q, set, refEl }) {
  const primero = useRef(null);
  const [bq, setBq] = useState("");
  const [bOpen, setBOpen] = useState(false);
  const bBox = useRef(null);
  const res = useMemo(() => {
    const t = bq.trim().toLowerCase(); if (!t) return [];
    return CLIENTES.filter((c) => `${c.nombre} ${c.apellido} ${c.email} ${c.telefono}`.toLowerCase().includes(t)).slice(0, 4);
  }, [bq]);
  useEffect(() => {
    const h = (e) => { if (bBox.current && !bBox.current.contains(e.target)) setBOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { const t = setTimeout(() => primero.current?.focus(), 220); return () => clearTimeout(t); }, []);
  const F = (k, ph, tipo = "text", ref) => (
    <div style={{ flex:"1 1 150px", minWidth:0 }}>
      <Label>{ph}</Label>
      <input ref={ref} className="in" type={tipo} value={q.cliente[k]} placeholder="Opcional"
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
          onChange={(e) => { setBq(e.target.value); setBOpen(true); }} />
        {bOpen && res.length > 0 && (
          <div className="ac-pop a-slide">
            {res.map((c) => (
              <button key={c.email} className="ac-i"
                onClick={() => { set((d) => { d.cliente = { ...c }; }); setBq(""); setBOpen(false); }}>
                <span style={{ width:24, height:24, borderRadius:99, flexShrink:0, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.12)", color:"var(--violet)", fontSize:9.5, fontWeight:800 }}>
                  {c.nombre[0]}{c.apellido[0]}</span>
                <span style={{ flex:1 }}><b style={{ color:"var(--ink)" }}>{c.nombre} {c.apellido}</b>
                  <span style={{ color:"var(--n400)", fontSize:11.5 }}> · {c.email}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {F("nombre","Nombre","text",primero)}{F("apellido","Apellido")}{F("email","Email","email")}{F("telefono","Teléfono","tel")}
      </div>
      <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:9, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        El nombre alimenta el saludo de la cotización. Podés guardar y completarlo después.
      </div>
    </Block>
  );
}

/* ── 2 · Encabezado: título por clic + fecha disparadora ─────────────── */
function BloqueEncabezado({ q, set, tramos, hayManual, onRepropagar, refEl }) {
  const [openMes, setOpenMes] = useState(false);
  const anios = [ANIO_BASE, ANIO_BASE + 1];
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
            onPick={(v) => set((d) => { d.titulo.destino = v; })} />
        </div>
        <div style={{ flex:"1 1 130px", position:"relative" }}>
          <Label hint="por clic">Mes</Label>
          <button className="in in-lg" onClick={() => setOpenMes((v) => !v)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left",
              color: q.titulo.mes != null ? "var(--ink)" : "var(--n300)" }}>
            {q.titulo.mes != null ? MESES[q.titulo.mes] : "Elegir"}
            <ChevronDown size={14} style={{ color:"var(--n300)", transform: openMes ? "rotate(180deg)":"none", transition:"transform .2s" }} />
          </button>
          {openMes && (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:29 }} onClick={() => setOpenMes(false)} />
              <div className="a-slide" style={{ position:"absolute", top:"calc(100% + 5px)", left:0, zIndex:30, width:230,
                background:"#fff", border:"1px solid var(--hair)", borderRadius:13, padding:7,
                boxShadow:"0 22px 50px -14px rgba(17,17,36,.28)", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
                {MESES.map((m, i) => (
                  <button key={m} onClick={() => { set((d) => { d.titulo.mes = i; }); setOpenMes(false); }}
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
            {anios.map((a) => (
              <button key={a} onClick={() => set((d) => { d.titulo.anio = a; })}
                className="in in-lg" style={{ flex:1, fontWeight:700, padding:0,
                  background: q.titulo.anio === a ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : "#fff",
                  color: q.titulo.anio === a ? "#fff" : "var(--n500)",
                  borderColor: q.titulo.anio === a ? "transparent" : "rgba(17,17,36,.14)" }}>{a}</button>
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
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7 }}>
        Mes y año se eligen por clic para que todas las cotizaciones salgan iguales. Solo se ofrecen {anios[0]} y {anios[1]}:
        los vuelos no se ven más allá de once meses.
      </div>

      <div className="hairline" style={{ margin:"15px 0" }} />

      <div style={{ display:"flex", gap:14, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 230px" }}>
          <Label hint="se carga una sola vez y baja a todo">Fecha de salida</Label>
          <Calendario grande value={q.fechaSalida} placeholder="Elegir la salida"
            nota="De acá salen los check-in de cada destino y las fechas de todos los servicios."
            onChange={(v) => set((d) => { d.fechaSalida = v; })} />
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

      {hayManual && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, padding:"10px 12px",
          background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"#8A5A16", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"#8A5A16", flex:1 }}>
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
                background:"#FCFCFE", border:"1px solid var(--hair-soft)", borderRadius:11 }}>
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
                      style={{ background:"rgba(247,178,103,.2)", color:"#8A5A16", cursor:"pointer" }}
                      onClick={() => set((d) => { d.destinos[i].checkinManual = null; })}>
                      manual <RefreshCw size={9} />
                    </button>
                  ) : (
                    <span className="pill" style={{ background:"rgba(59,191,173,.12)", color:"#1F7D70" }}
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
function BloqueMensaje({ q, set, refEl, toast }) {
  const ed = useRef(null);
  useEffect(() => { if (ed.current && ed.current.innerHTML !== (q.mensajeHtml || "")) {
    ed.current.innerHTML = q.mensajeHtml || ""; } }, []);   // carga inicial
  const sync = () => set((d) => { d.mensajeHtml = ed.current.innerHTML;
    d.mensaje = ed.current.innerText.trim(); });
  const cmd = (c, v) => { ed.current?.focus(); document.execCommand(c, false, v || null); sync(); };
  const B = ({ c, v, title, children }) => (
    <button className="wys-b" title={title} onMouseDown={(e) => { e.preventDefault(); cmd(c, v); }}>{children}</button>
  );
  return (
    <Block id="b-mensaje" forwardRef={refEl} icon={MessageSquare} title="Mensaje al pasajero"
      right={<Pill tone="n">Opcional · con formato</Pill>}>
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
  const aplicarVuelos = (v) => {
    const p = v[0];
    const iso = toISO(new Date(p.mes >= new Date().getMonth() ? ANIO_BASE : ANIO_BASE + 1, p.mes, p.dia));
    if (!q.fechaSalida) {
      set((d) => { d.vuelos = v; d.fechaSalida = iso; });
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
          style={{ fontSize:11.5, lineHeight:1.55, background: estado === "error" ? "rgba(244,62,85,.04)" : "#fff" }}
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
          <div style={{ fontSize:12, color:"#A8192A", flex:1 }}>
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
              borderBottom: i < q.vuelos.length - 1 ? "1px solid var(--hair-soft)" : "none", background:"#FCFCFE" }}>
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
      {choque && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, padding:"10px 12px",
          background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"#8A5A16", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"#8A5A16", flex:1 }}>
            El vuelo sale el <b>{fmtCorto(choque)}</b> pero la fecha de salida cargada es <b>{fmtCorto(q.fechaSalida)}</b>.
          </span>
          <Btn size="sm" onClick={() => { set((d) => { d.fechaSalida = choque; }); setChoque(null);
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
                  <span className="pill" style={{ background:"rgba(17,17,36,.05)", color:"var(--n400)", flexShrink:0 }}>{C.label}</span>
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
                    background:"#FCFCFE", border:"1px solid var(--hair-soft)", borderRadius:11, transition:"box-shadow .16s" }}>
                  <GripVertical size={14} style={{ color:"var(--n300)", cursor:"grab", flexShrink:0 }}
                    onMouseDown={() => setArmado(i)} onMouseUp={() => setArmado(null)} />
                  <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.10)", color:"var(--violet)" }}><C.Icon size={12} /></div>
                  <input className="in" style={{ flex:"1 1 140px", height:30, border:"1px solid transparent",
                    background:"transparent", paddingLeft:2 }} value={s.texto}
                    onChange={(e) => set((d) => { d.servicios[i].texto = e.target.value; })} />
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

/* ── 7 · Notas internas — nunca salen ────────────────────────────────── */
function BloqueNotas({ q, set, refEl, toast }) {
  const [c, setC] = useState(""); const [n, setN] = useState("");
  const inp = useRef(null);
  const total = q.notas.reduce((a, x) => a + Number(x.neto || 0), 0);
  const agregar = () => { if (!c.trim()) return;
    set((d) => { d.notas.push({ id:uid("nt"), concepto:c.trim(), neto:Number(n) || 0 }); });
    setC(""); setN(""); requestAnimationFrame(() => inp.current?.focus()); };
  return (
    <Block id="b-notas" forwardRef={refEl} icon={Lock} title="Notas internas" count={q.notas.length}
      right={<Pill tone="coral"><Lock size={9} /> No se comparte</Pill>}>
      {q.notas.length === 0
        ? <Vacio icon={Lock} titulo="Sin notas internas" accion="Netos y costos fijos que el pasajero nunca ve" />
        : (
        <div style={{ border:"1px solid var(--hair-soft)", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
          {q.notas.map((x, i) => (
            <div key={x.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
              borderBottom:"1px solid var(--hair-soft)", background:"#FCFCFE" }}>
              <input className="in" style={{ flex:1, height:29, border:"1px solid transparent", background:"transparent", paddingLeft:2 }}
                value={x.concepto} onChange={(e) => set((d) => { d.notas[i].concepto = e.target.value; })} />
              <input className="in mono" style={{ width:104, height:29, textAlign:"right" }} type="number" value={x.neto}
                onChange={(e) => set((d) => { d.notas[i].neto = e.target.value; })} />
              <button className="btn btn-g btn-ico" style={{ width:25, height:25 }}
                onClick={() => { const cp = { ...x }; set((d) => { d.notas.splice(i, 1); });
                  toast({ msg:"Nota eliminada", tone:"warn", undo:() => set((d) => { d.notas.splice(i, 0, cp); }) }); }}>
                <Trash2 size={12} /></button>
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px",
            background:"rgba(17,17,36,.028)" }}>
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
    </Block>
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

/* ── 8 · Opciones hoteleras ──────────────────────────────────────────── */
function SeccionOpciones({ q, set, tramos, toast }) {
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
      habitacion:"Doble estándar", regimen:"Desayuno", neto:0, factor:0.88 }); });
    setFoco(id);
  };
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
          const pv = venta(o.neto, o.factor);
          return (
            <React.Fragment key={o.id}>
              {over === i && drag !== null && <div className="drop-line" />}
              <div draggable={armado === i}
                onDragStart={() => setDrag(i)}
                onDragEnd={() => { mover(drag, over); setDrag(null); setOver(null); setArmado(null); }}
                onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                className={`a-pop ${drag === i ? "drag-on" : ""}`}
                style={{ border:"1px solid var(--hair-soft)", borderRadius:14, overflow:"hidden", background:"#fff",
                  boxShadow:"0 1px 2px rgba(26,26,46,.03)" }}>

                {/* cabecera de la opción */}
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px",
                  background:"linear-gradient(180deg,#FCFCFE,#F8F9FC)", borderBottom:"1px solid var(--hair-soft)" }}>
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
                    return (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
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
                    );
                  })}

                  <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:11 }}>
                    <div style={{ flex:"1 1 150px" }}>
                      <Label>Habitación</Label>
                      <select className="in" value={o.habitacion} onChange={(e) => set((d) => { d.opciones[i].habitacion = e.target.value; })}>
                        {HABITACIONES.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                    <div style={{ flex:"1 1 150px" }}>
                      <Label>Régimen</Label>
                      <select className="in" value={o.regimen} onChange={(e) => set((d) => { d.opciones[i].regimen = e.target.value; })}>
                        {REGIMENES.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* markup: factor divisor, venta en vivo */}
                  <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:10, alignItems:"flex-end",
                    padding:"10px", background:"rgba(59,191,173,.045)", border:"1px solid rgba(59,191,173,.16)", borderRadius:11 }}>
                    <div style={{ flex:"1 1 110px" }}>
                      <Label>Neto</Label>
                      <input className="in mono" type="number" value={o.neto}
                        onChange={(e) => set((d) => { d.opciones[i].neto = e.target.value; })} />
                    </div>
                    <div style={{ flex:"1 1 110px" }}>
                      <Label hint={`${margenPct(o.factor)}%`}>Factor</Label>
                      <input className="in mono" type="number" step="0.01" min="0.5" max="1" value={o.factor}
                        onChange={(e) => set((d) => { d.opciones[i].factor = e.target.value; })} />
                    </div>
                    <div style={{ flex:"1 1 130px", textAlign:"right" }}>
                      <Label>Precio de venta</Label>
                      <div key={pv} className="a-pulse" style={{ fontSize:20, fontWeight:700, letterSpacing:"-.025em",
                        color:"var(--teal-3)", lineHeight:1.25 }}>{money(pv)}</div>
                      <div style={{ fontSize:10.5, color:"var(--n400)" }}>por adulto en base doble</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                    {!Number(o.neto) && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"#8A5A16" }}>
                        <AlertCircle size={11} /> Falta el neto de esta opción
                      </span>
                    )}
                    <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginLeft:"auto", textAlign:"right" }}>
                      {money(o.neto)} ÷ {o.factor} = {money(pv)} · margen {money(pv - o.neto)}
                    </div>
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
function BloqueAlojamiento({ q, set, tramos, refEl, toast }) {
  const noches = tramos.reduce((a, t) => a + t.noches, 0);
  return (
    <Block id="b-alojamiento" forwardRef={refEl} icon={Building2} title="Destinos y alojamiento"
      count={q.destinos.length}
      right={noches > 0 && <Pill tone="teal"><Bed size={9} /> {noches} noches</Pill>}>
      <SeccionDestinos q={q} set={set} tramos={tramos} toast={toast} />
      <SeccionOpciones q={q} set={set} tramos={tramos} toast={toast} />
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
          <span className="pill" style={{ background:"rgba(59,191,173,.14)", color:"#1F7D70" }}>
            <Zap size={8} /> Precargado desde {ia.paquete}
          </span>
        )}
        {(ia.chips || []).map((c) => (
          <span key={c} className="pill" style={{ background:"#fff", color:"var(--n600)", border:"1px solid var(--hair)" }}>
            <Check size={8} style={{ color:"var(--teal-2)" }} /> {c}
          </span>
        ))}
      </div>

      {!ia.paquete && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:9, fontSize:11.5, color:"#8A5A16" }}>
          <AlertCircle size={12} style={{ flexShrink:0 }} />
          No encontré un paquete que coincida — la armé en blanco con lo que entendí.
        </div>
      )}

      {ver && (
        <div className="a-slide" style={{ marginTop:10, padding:"11px 13px", borderRadius:12, background:"#fff",
          border:"1px solid var(--hair-soft)" }}>
          <div className="lbl" style={{ marginBottom:6 }}>Lo que escribió el pasajero</div>
          <div style={{ fontSize:12.5, lineHeight:1.65, color:"var(--n600)", whiteSpace:"pre-wrap" }}>{ia.consulta}</div>
        </div>
      )}
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
  BloqueNotas, BloqueNotasCliente, SeccionOpciones, BloqueAlojamiento, BannerIA, Paleta,
};
