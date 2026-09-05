"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plane, Building2, User, MessageSquare, FileText, Copy, Trash2, GripVertical,
  Plus, Check, ChevronDown, ChevronUp, ChevronRight, Search, Eye, EyeOff, Command, Zap, Bed, X, LayoutGrid,
  Loader2, CheckCheck, AlertCircle, RefreshCw, PenLine, Lock, ArrowUp, ArrowDown, CornerDownLeft,
  StickyNote, Keyboard, Maximize2, Luggage, Star, Image as ImageIcon, MapPin
} from "lucide-react";
import {
  MESES, ANIO_ACTUAL, REGIMENES, SUG, MODALIDADES, SUG_ALL,
  REGIMENES_DESTINO, REGIMEN_DETALLADO, esDetallado, regimenHeredable,
  CABINAS, EQUIPAJES, OCUPACIONES, OCUPACION_MAS, PERSONAS_MIN, PERSONAS_MAX,
  personasDeOcupacion, ocupacionDePersonas, TARIFA_TIPOS,
  PNR_DEMO, uid, clamp, toISO, parseISO, fmtCorto, money, venta,
  limpiarPegado, parsePNR, fechaDeVuelo, itinerarioMasCompleto,
  habitacionNueva, tarifaNueva, ventaTarifa,
  precioOpcion, norm, destinoFinal, diasDeMas
} from "./data";
import { useCatalogo, useAjustes, useAerolineas } from "./contexto";
import { uploadFile } from "@/components/lib/upload";
import { buscarEnHistorial } from "@/actions/presupuesto.actions";
import {
  Foto, CATS, Btn, Label, Pill, ChipIA, Estrellas, Block, Vacio, Calendario, AutoCiudad,
  BuscadorHotel, SelectBuscable
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
  const [res, setRes] = useState([]);          /* cotizaciones anteriores que matchean */
  const [buscando, setBuscando] = useState(false);
  const bBox = useRef(null);
  /* La memoria del vendedor es el historial de cotizaciones: el server busca por
     nombre, apellido, mail y teléfono (este último por dígitos, así que da igual
     si va con +598, con espacios o pelado). Debounce de 300 ms para no disparar
     una consulta por tecla. */
  useEffect(() => {
    const t = bq.trim();
    if (t.length < 3) { setRes([]); setBuscando(false); return; }
    setBuscando(true);
    let vivo = true;
    const id = setTimeout(async () => {
      const r = await buscarEnHistorial(t);
      if (!vivo) return;
      setBuscando(false);
      setRes(r.ok ? r.data.slice(0, 4) : []);
    }, 300);
    return () => { vivo = false; clearTimeout(id); };
  }, [bq]);
  /* Clic en el resultado (o Enter): copia SOLO la ficha del cliente —nombre,
     apellido, mail y teléfono— y deja la cotización como está. Arrastrar
     hoteles, vuelos y opciones es la otra acción, la de abajo, y hay que
     pedirla a propósito. */
  const usarDatos = (c) => {
    set((d) => { d.cliente = {
      nombre: c.clienteNombre || "", apellido: c.clienteApellido || "",
      email: c.clienteEmail || "", telefono: c.clienteTelefono || "" }; });
    setBq(""); setBOpen(false); setRes([]);
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
          placeholder="Buscar en cotizaciones anteriores por nombre, email o teléfono… o cargá el cliente abajo"
          onFocus={() => setBOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && res[0]) { e.preventDefault(); usarDatos(res[0]); }
            else if (e.key === "Escape") setBOpen(false); }}
          onChange={(e) => { setBq(e.target.value); setBOpen(true); }} />
        {bOpen && (res.length > 0 || buscando) && (
          <div className="ac-pop a-slide">
            {buscando && res.length === 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 11px",
                fontSize:12, color:"var(--n400)" }}>
                <Loader2 size={12} className="spin" /> Buscando en el historial…
              </div>
            )}
            {res.map((c) => {
              const nom = [c.clienteNombre, c.clienteApellido].filter(Boolean).join(" ") || "Sin nombre";
              const ini = (c.clienteNombre?.[0] || "") + (c.clienteApellido?.[0] || "");
              return (
                <div key={c.id}>
                  <div className="ac-i" style={{ cursor:"pointer", alignItems:"center" }} role="button"
                    title="Traer nombre, apellido, email y teléfono de esta persona"
                    onClick={() => usarDatos(c)}>
                    <span style={{ width:24, height:24, borderRadius:99, flexShrink:0, display:"grid", placeItems:"center",
                      background:"rgba(120,90,229,.12)", color:"var(--violet)", fontSize:9.5, fontWeight:800 }}>
                      {ini || "?"}</span>
                    <span style={{ flex:1, minWidth:0 }}>
                      <b style={{ color:"var(--ink)" }}>{nom}</b>
                      <span style={{ color:"var(--n400)", fontSize:11.5 }}> · {c.clienteEmail || c.clienteTelefono || "sin contacto"}</span>
                      <span style={{ display:"block", fontSize:11, color:"var(--n400)" }}>
                        <span className="mono">{c.numero}</span>
                        {c.destino ? ` · ${c.destino}` : ""}
                        {c.montoPrincipal ? ` · ${money(c.montoPrincipal)}` : ""}
                      </span>
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, flexShrink:0, fontSize:10.5,
                      color:"var(--teal-3)", whiteSpace:"nowrap" }}>
                      <User size={11} /> Traer datos
                    </span>
                  </div>
                  {onUsarBase && (
                    <div style={{ padding:"0 11px 8px 41px" }}>
                      <Btn size="xs" variant="g" data-base={c.id}
                        title="Arranca una cotización NUEVA con todo el contenido de esa: hoteles, vuelos, opciones y precios"
                        onClick={(e) => { e.stopPropagation();
                          onUsarBase(c); setBq(""); setBOpen(false); setRes([]); }}>
                        <Copy size={11} /> Copiar también hoteles, vuelos y opciones
                      </Btn>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 11px", fontSize:10.5,
              color:"var(--n400)", borderTop:"1px solid var(--hair-soft)" }}>
              <Zap size={10} style={{ color:"var(--teal-2)", flexShrink:0 }} />
              Un clic trae solo nombre, apellido, email y teléfono. El teléfono matchea por dígitos:
              da igual si va con +598, con espacios o pelado.
            </div>
          </div>
        )}
      </div>

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

/* ── El campo del título: sugiere ciudades, no las impone ───────────────
   El encabezado es "Caribe › Jamaica, Octubre 2026" y el vendedor tiene que
   poder escribir eso tal cual. `AutoCiudad` (./ui) sirve para los tramos, donde
   la ciudad SÍ tiene que ser una del catálogo: ahí Enter agarra la primera
   sugerencia, y en el título eso pisaba lo escrito ("Punta" pasaba a "Punta
   Cana"). Acá la lista solo aparece como ayuda: se elige con las flechas o con
   el mouse, y Enter deja el texto como está y sigue al mes. */
function DestinoLibre({ value, onChange, onElegir, placeholder }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);   /* -1 = lo que el vendedor escribió */
  const box = useRef(null);
  const { ciudades } = useCatalogo();

  const res = useMemo(() => {
    const q = norm(String(value || "").trim());
    const pool = ciudades || [];
    return (q ? pool.filter((c) => norm(c).includes(q)) : pool).slice(0, 6);
  }, [value, ciudades]);

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const elegir = (c) => { onElegir(c); setOpen(false); setIdx(-1); };
  const marcar = (c) => {
    const q = String(value || "").trim();
    if (!q) return c;
    const i = norm(c).indexOf(norm(q));
    return i < 0 ? c : <>{c.slice(0, i)}<b>{c.slice(i, i + q.length)}</b>{c.slice(i + q.length)}</>;
  };

  return (
    <div ref={box} style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <MapPin size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          color: value ? "var(--violet)" : "var(--n300)" }} />
        <input className="in in-lg" style={{ paddingLeft:34 }} value={value} placeholder={placeholder}
          onFocus={() => { setOpen(true); setIdx(-1); }}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setIdx(-1); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setIdx((i) => clamp(i + 1, 0, res.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i <= 0 ? -1 : i - 1)); }
            else if (e.key === "Enter") {
              e.preventDefault();
              /* solo cuando el vendedor bajó a propósito a una sugerencia */
              if (open && idx >= 0 && res[idx]) elegir(res[idx]);
              else { setOpen(false); onElegir(String(value || "")); }
            }
            else if (e.key === "Escape") setOpen(false);
          }} />
      </div>
      {open && res.length > 0 && (
        <div className="ac-pop a-slide">
          <div style={{ padding:"6px 10px", fontSize:10.5, color:"var(--n300)" }}>
            Sugerencias — el título admite cualquier texto
          </div>
          {res.map((c, i) => (
            <button key={c} className="ac-i" data-on={i === idx ? "1" : "0"}
              onMouseEnter={() => setIdx(i)} onClick={() => elegir(c)}>
              <MapPin size={12} style={{ color:"var(--n300)", flexShrink:0 }} />
              <span>{marcar(c)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 2 · Encabezado: título por clic + fecha disparadora ─────────────── */
function BloqueEncabezado({ q, set, tramos, hayManual, onRepropagar, refEl }) {
  const [openMes, setOpenMes] = useState(false);
  const anios = [ANIO_ACTUAL, ANIO_ACTUAL + 1];
  /* v2B · la cadena del teclado: destino → mes → año → fecha de salida */
  const mesRef = useRef(null);
  const anioRef = useRef(null);
  const fechaRef = useRef(null);
  const saltar = (r) => requestAnimationFrame(() => {
    const n = r.current; if (!n) return;
    (n.matches?.("button,input,select") ? n : n.querySelector("button,input,select"))?.focus();
  });
  /* si ya hay fecha de salida, seguir al mes/año elegido conservando el día */
  const moverSalida = (d, mes, anio) => {
    const f = parseISO(d.fechaSalida); if (!f) return;
    const m = mes ?? f.getMonth(), y = anio ?? f.getFullYear();
    if (m === f.getMonth() && y === f.getFullYear()) return;
    const ultimo = new Date(y, m + 1, 0).getDate();
    d.fechaSalida = toISO(new Date(y, m, Math.min(f.getDate(), ultimo)));
  };
  /* El encabezado y la vista previa muestran lo que va a leer el pasajero: solo
     el destino final (pedido del cliente, 26/08). El input de abajo sigue con el
     valor crudo —"Caribe › Jamaica"— para que el vendedor lo pueda editar. */
  const destTitulo = destinoFinal(q.titulo.destino);
  const titulo = [destTitulo || "Destino", q.titulo.mes != null ? MESES[q.titulo.mes] : "Mes", q.titulo.anio || "Año"].join(" · ");
  const previa = `${destTitulo || "Destino"}, ${q.titulo.mes != null ? MESES[q.titulo.mes] : "Mes"} ${q.titulo.anio || ""}`.trim();

  return (
    <Block id="b-encabezado" forwardRef={refEl} icon={FileText} title="Encabezado"
      right={<Pill tone="violet"><Lock size={9} /> Formato controlado</Pill>}>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ flex:"2 1 190px", minWidth:0 }}>
          <Label hint="texto libre, con sugerencias">Destino</Label>
          <DestinoLibre value={q.titulo.destino} placeholder="Destino o título libre"
            onChange={(v) => set((d) => { d.titulo.destino = v; })}
            onElegir={(v) => { set((d) => { d.titulo.destino = v; }); saltar(mesRef); }} />
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
                  <button key={m} onClick={() => { set((d) => { d.titulo.mes = i; moverSalida(d, i, d.titulo.anio); }); setOpenMes(false); saltar(anioRef); }}
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
                onClick={() => { set((d) => { d.titulo.anio = a; moverSalida(d, d.titulo.mes, a); }); saltar(fechaRef); }}
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
          El destino admite cualquier texto: las ciudades del catálogo se sugieren, pero podés escribir el título que
          quieras (“Caribe › Jamaica”). Mes y año se eligen por clic para que todas las cotizaciones salgan iguales:
          solo se ofrecen {anios[0]} y {anios[1]}, los vuelos no se ven más allá de once meses.
        </span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0 }}>
          <span className="kbd">↵</span> destino → mes → año → fecha</span>
      </div>

      <div className="hairline" style={{ margin:"15px 0" }} />

      <div style={{ display:"flex", gap:14, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div ref={fechaRef} style={{ flex:"1 1 230px" }}>
          <Label hint="se carga una sola vez y baja a todo">Fecha de salida</Label>
          <Calendario grande value={q.fechaSalida} placeholder="Elegir la salida"
            mesPreferido={q.titulo.mes} anioPreferido={q.titulo.anio}
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
        Mes, año y fecha de salida van atados: cambiá cualquiera y los otros se acomodan.
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
  /* 7 noches por defecto: es el paquete estándar del 70-80% de las ventas */
  const filaNueva = () => ({ id:uid("dst"), ciudad:"", noches:7, regimen:"", checkinManual:null });
  const agregar = () => set((d) => { d.destinos.push(filaNueva()); });

  /* ── La cascada del régimen: arriba gobierna abajo ─────────────────────
     Cambiar el régimen de un destino lo baja a ESE tramo de TODAS las opciones
     hoteleras. Al revés no: tocar el régimen del hotel de la opción 1 no mueve
     el de arriba, y está bien —cada hotel puede tener el suyo—. Para ese caso
     existe "Régimen detallado": no cascadea, cada hotel se edita a mano y la
     línea de servicios dice "según régimen detallado". */
  const cascadearRegimen = (i, v) => {
    set((d) => {
      d.destinos[i].regimen = v;
      if (!v || esDetallado(v)) return;
      (d.opciones || []).forEach((o) => {
        const hs = o.hoteles || (o.hoteles = []);
        while (hs.length <= i) hs.push({ hotelId:null, libre:"", cat:0, regimen:"" });
        hs[i].regimen = v;
      });
    });
    const n = (q.opciones || []).length;
    if (esDetallado(v)) toast({ msg:"Régimen detallado: cada hotel lleva el suyo", tone:"ok" });
    else if (v && n > 0) toast({ msg:`Régimen aplicado a ${n} ${n === 1 ? "opción" : "opciones"}`, tone:"ok" });
  };

  /* ¿los hoteles de este tramo dicen algo distinto de lo que dice arriba? */
  const hotelesDivergen = (i) => {
    const dd = q.destinos[i];
    if (esDetallado(dd?.regimen)) return false;
    const regs = [...new Set((q.opciones || [])
      .map((o) => String(o.hoteles?.[i]?.regimen || "").trim()).filter(Boolean))];
    if (regs.length > 1) return true;
    return regs.length === 1 && !!dd?.regimen && regs[0] !== String(dd.regimen).trim();
  };
  return (
    <div>
      {q.destinos.length === 0 ? (
        <div style={{ marginBottom:9 }}>
          <Btn size="sm" onClick={agregar}><Plus size={13} /> Agregar destino</Btn>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:11 }}>
          {q.destinos.map((dd, i) => {
            const t = tramos[i];
            return (
              <div key={dd.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
                background:"var(--card-3)", border:"1px solid var(--hair-soft)", borderRadius:11, flexWrap:"wrap" }}>
                <div className="mono" style={{ width:20, height:20, borderRadius:6, flexShrink:0, display:"grid",
                  placeItems:"center", background:"rgba(120,90,229,.11)", color:"var(--violet)", fontSize:10, fontWeight:600 }}>{i + 1}</div>

                <div style={{ flex:"1 1 120px", minWidth:0 }}>
                  <AutoCiudad value={dd.ciudad} placeholder="Ciudad…"
                    excluir={q.destinos.filter((_, j) => j !== i).map((x) => x.ciudad)}
                    onChange={(v) => set((d) => { d.destinos[i].ciudad = v; })}
                    onPick={(v) => set((d) => { d.destinos[i].ciudad = v; })} />
                </div>

                {/* noches: los dos botoncitos van apilados para no comerse el ancho */}
                <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                  <div className="mono" style={{ minWidth:32, textAlign:"right", fontSize:12, fontWeight:600 }}>{dd.noches} n</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    <button className="btn btn-s btn-ico" style={{ width:22, height:16, borderRadius:6, padding:0 }}
                      title="Una noche más"
                      onClick={() => set((d) => { d.destinos[i].noches += 1; })}><ChevronUp size={11} /></button>
                    <button className="btn btn-s btn-ico" style={{ width:22, height:16, borderRadius:6, padding:0 }}
                      title="Una noche menos"
                      onClick={() => set((d) => { d.destinos[i].noches = Math.max(1, d.destinos[i].noches - 1); })}>
                      <ChevronDown size={11} /></button>
                  </div>
                </div>

                <select className="in" data-regimen-destino={i} style={{ flex:"0 1 168px", height:34, fontSize:12 }}
                  value={dd.regimen || ""}
                  title="Régimen de este destino — baja a los hoteles de todas las opciones"
                  onChange={(e) => cascadearRegimen(i, e.target.value)}>
                  <option value="">Régimen…</option>
                  {REGIMENES_DESTINO.map((x) => <option key={x}>{x}</option>)}
                </select>

                {/* Check-in editable: el default baja de la fecha de salida, pero el
                    vuelo que sale el 14 y llega el 15 arranca el hotel el 15. Editarlo
                    recalcula el check-out; "Actualizar todo" lo devuelve al automático. */}
                <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                  <span className="lbl" style={{ fontSize:9 }}>Check-in</span>
                  <input className="in mono" type="date" data-checkin={i}
                    style={{ height:34, width:126, fontSize:11, padding:"0 7px" }}
                    title="Check-in de este destino. Por defecto sale de la fecha de salida; cambialo si el vuelo llega al día siguiente."
                    value={t?.checkin || ""}
                    onChange={(e) => { const v = e.target.value;
                      set((d) => { d.destinos[i].checkinManual = v || null; }); }} />
                  <span className="mono" data-checkout={i}
                    style={{ fontSize:10.5, color:"var(--n400)", whiteSpace:"nowrap" }}>
                    → {t?.checkout ? fmtCorto(t.checkout) : "—"}
                  </span>
                  {t?.manual && (
                    <button className="btn btn-g btn-ico" style={{ width:24, height:24 }}
                      title="Volver al check-in automático, el que baja de la fecha de salida"
                      onClick={() => set((d) => { d.destinos[i].checkinManual = null; })}>
                      <RefreshCw size={11} /></button>
                  )}
                </div>

                <div style={{ display:"flex", gap:3, marginLeft:"auto", flexShrink:0 }}>
                  <button className="btn btn-g btn-ico" title="Quitar destino"
                    onClick={() => { const cp = { ...dd }; set((d) => { d.destinos.splice(i, 1); });
                      toast({ msg:`Se quitó ${cp.ciudad || "el destino"}`, tone:"warn",
                        undo:() => set((d) => { d.destinos.splice(i, 0, cp); }) }); }}>
                    <Trash2 size={13} />
                  </button>
                  <button className="btn btn-s btn-ico" title="Agregar destino" onClick={agregar}>
                    <Plus size={13} />
                  </button>
                </div>

                {hotelesDivergen(i) && (
                  <div style={{ flexBasis:"100%", display:"flex", alignItems:"center", gap:7, paddingLeft:28 }}>
                    <AlertCircle size={11} style={{ color:"var(--ink-amber)", flexShrink:0 }} />
                    <span style={{ fontSize:10.5, color:"var(--ink-amber)" }}>
                      Los hoteles de este tramo tienen otro régimen.
                    </span>
                    <button className="chip chip-mini" onClick={() => cascadearRegimen(i, REGIMEN_DETALLADO)}>
                      Pasar a régimen detallado</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        El check-in baja solo de la fecha de salida y podés pisarlo por destino: el check-out se recalcula.
        El régimen baja a los servicios y a los hoteles de todas las opciones; con “Régimen detallado” cada hotel lleva el suyo.
      </div>
    </div>
  );
}

/* ── 4 · Mensaje al pasajero — WYSIWYG con formato ───────────────────── */

function BloqueMensaje({ q, set, refEl }) {
  /* v4 · un solo texto: el mensaje automático. Si el vendedor quiere decir algo
     más, lo escribe acá mismo — el cliente pidió eliminar el editor aparte. */
  return (
    <Block id="b-mensaje" forwardRef={refEl} icon={MessageSquare} title="Mensaje al pasajero"
      right={<Pill tone="violet">Editable</Pill>}>
      <Label hint="se completa solo con el nombre y el link del vendedor">Mensaje automático</Label>
      <textarea className="in" rows={7} value={q.mensajeAuto || ""}
        style={{ lineHeight:1.6, fontSize:12.5, resize:"vertical" }}
        placeholder="Hola {nombre}, de acuerdo a lo conversado te comparto la cotización…"
        onChange={(e) => set((d) => { d.mensajeAuto = e.target.value; })} />
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, lineHeight:1.55 }}>
        <span className="mono">{"{nombre}"}</span> toma el nombre del cliente y{" "}
        <span className="mono">{"{link}"}</span> el link de datos de pasajeros del vendedor.
        Si necesitás agregar algo, escribilo acá mismo: este texto sale arriba del detalle.
        El máster define el texto por defecto en Ajustes.
      </div>
    </Block>
  );
}

/* ── 5 · Itinerario de vuelos (PNR) ──────────────────────────────────── */
const LECTOR_URL = "/api/cotizador/leer-itinerario";
const TEXTO_MAX_LECTOR = 20000;   /* mismo tope que valida el endpoint */
const LADO_MAX_FOTO = 1600;       /* una captura de reserva no necesita más */

/* La captura viaja como JPEG chico: 1600 px de lado alcanzan para que el
   modelo lea los horarios y evitan mandar 8 MB de PNG por la red. */
function comprimirImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const lado = Math.max(img.width, img.height) || 1;
      const escala = lado > LADO_MAX_FOTO ? LADO_MAX_FOTO / lado : 1;
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * escala));
      c.height = Math.max(1, Math.round(img.height * escala));
      const ctx = c.getContext("2d");
      /* pasa con la memoria de video agotada (muchos canvas vivos) o con el
         canvas bloqueado por anti-fingerprinting: sin esto la promesa quedaba
         colgada para siempre y el spinner no se iba nunca */
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("El navegador no pudo preparar la imagen. Probá con otra."));
        return;
      }
      /* un PNG con transparencia sobre JPEG queda negro: fondo blanco primero */
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      if (!base64) { reject(new Error("No se pudo preparar la imagen.")); return; }
      resolve({ mimeType:"image/jpeg", base64 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo abrir la imagen.")); };
    img.src = url;
  });
}

/* Una sola puerta al lector. Devuelve los vuelos ya planos o tira el mensaje
   que mandó el server, que es el que ve el vendedor. */
async function pedirLectura(payload) {
  let r;
  try {
    r = await fetch(LECTOR_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No hay conexión con el lector de itinerarios.");
  }
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo leer el itinerario.");
  return Array.isArray(j.vuelos) ? j.vuelos : [];
}

function BloqueVuelos({ q, set, refEl, toast }) {
  /* el parser traduce el código IATA de dos letras con la tabla Aerolinea */
  const aerolineas = useAerolineas();
  const [estado, setEstado] = useState("idle");  // idle | cargando | error
  const [errorMsg, setErrorMsg] = useState(null);/* el mensaje real del lector */
  const [refinando, setRefinando] = useState(false); /* la IA revisa lo del parser */
  /* itinerario que devolvió la IA y NO se aplicó solo porque el vendedor
     estuvo editando mientras tanto: queda ofrecido en un chip */
  const [propuestaIA, setPropuestaIA] = useState(null);
  const [modo, setModo] = useState("texto");     // texto | foto
  const [foto, setFoto] = useState(null);        // { nombre, url }
  const [choque, setChoque] = useState(null);    // fecha del vuelo ≠ fecha de salida
  const fileRef = useRef(null);
  /* cada lectura lleva número: si el vendedor dispara otra, la vieja se descarta */
  const pedidoRef = useRef(0);
  /* los vuelos de ESTE instante: adentro de una promesa el `q` del closure es
     el de cuando se disparó la lectura y no sirve para saber si cambiaron */
  const vuelosRef = useRef(q.vuelos);
  useEffect(() => { vuelosRef.current = q.vuelos; }, [q.vuelos]);
  const urlFotoRef = useRef(null);
  useEffect(() => () => { if (urlFotoRef.current) URL.revokeObjectURL(urlFotoRef.current); }, []);
  const mostrarFoto = (archivo) => {
    if (urlFotoRef.current) URL.revokeObjectURL(urlFotoRef.current);
    const url = URL.createObjectURL(archivo);
    urlFotoRef.current = url;
    setFoto({ nombre: archivo.name || "captura", url });
  };
  /* el encabezado sigue a la fecha de salida, así que se acomoda con ella */
  const atarTitulo = (d, iso) => {
    const f = parseISO(iso);
    if (f) { d.titulo.mes = f.getMonth(); d.titulo.anio = f.getFullYear(); }
  };
  const aplicarVuelos = (v) => {
    if (!v?.length) return;
    /* la IA manda la fecha ISO completa; el parser local solo día y mes */
    const iso = fechaDeVuelo(v[0]);
    if (!iso) { set((d) => { d.vuelos = v; }); return; }
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
  const leerFoto = async (archivo) => {
    if (!archivo) return;
    mostrarFoto(archivo);
    setEstado("cargando");
    setErrorMsg(null);
    setPropuestaIA(null);
    const pedido = ++pedidoRef.current;
    try {
      const imagen = await comprimirImagen(archivo);
      const v = await pedirLectura({ imagen });
      if (pedido !== pedidoRef.current) return;
      if (!v.length) throw new Error("No se reconoció ningún vuelo en esa imagen.");
      aplicarVuelos(v);
      setEstado("idle");
      toast({ msg:`Itinerario leído desde la imagen — ${v.length} tramos`, tone:"ok" });
    } catch (e) {
      if (pedido !== pedidoRef.current) return;
      setErrorMsg(e?.message || "No se pudo leer la imagen.");
      setEstado("error");
    }
  };
  /* Convertir: el parser local contesta al instante y la IA revisa en paralelo.
     Si el regex no reconoce nada, esperamos a la IA con el spinner puesto. */
  const convertir = async () => {
    const crudo = q.pnrRaw || "";
    if (!crudo.trim()) return;
    const local = parsePNR(crudo, aerolineas);
    const pedido = ++pedidoRef.current;
    setErrorMsg(null);
    setPropuestaIA(null);
    /* foto del itinerario tal como queda al disparar la lectura. La IA tarda
       unos segundos y el vendedor sigue trabajando: si en el medio corrigió un
       horario a mano, la respuesta que llega después NO se la puede comer. */
    const antes = JSON.stringify(local.length ? local : q.vuelos);
    if (local.length) {
      aplicarVuelos(local);
      setEstado("idle");
      setRefinando(true);
      toast({ msg:`${local.length} tramos convertidos al formato de la marca`, tone:"ok" });
    } else {
      setEstado("cargando");
    }
    try {
      const ia = await pedirLectura({ texto: crudo.slice(0, TEXTO_MAX_LECTOR) });
      if (pedido !== pedidoRef.current) return;
      setRefinando(false);
      if (!ia.length) throw new Error("No se reconoció ningún tramo en ese texto.");
      if (itinerarioMasCompleto(local, ia)) {
        if (JSON.stringify(vuelosRef.current) !== antes) {
          /* hubo edición a mano: la IA queda ofrecida, no impuesta */
          setPropuestaIA(ia);
        } else {
          aplicarVuelos(ia);
          if (!local.length) toast({ msg:`Itinerario leído — ${ia.length} tramos`, tone:"ok" });
        }
      }
      setEstado("idle");
    } catch (e) {
      if (pedido !== pedidoRef.current) return;
      setRefinando(false);
      /* si el parser ya cargó los tramos, la falla de la IA no molesta a nadie */
      if (local.length) { setEstado("idle"); return; }
      setErrorMsg(e?.message || "No se pudo leer el itinerario.");
      setEstado("error");
    }
  };
  /* la cabina y el equipaje escriben el ítem de aéreo de los servicios incluidos,
     aunque el vendedor lo haya editado a mano: le reponemos el flag y lo vuelve a seguir */
  const escribirAereo = (d) => {
    const iA = d.servicios.findIndex((s) => s.categoria === "aereo");
    if (iA < 0) return;
    const extra = [d.cabina, d.equipaje].filter(Boolean).join(" · ");
    d.servicios[iA].texto = extra
      ? "Aéreo ida y vuelta · " + extra
      : "Aéreo ida y vuelta con artículo personal y equipaje de mano";
    d.servicios[iA].auto = "aereo";
  };
  /* Ctrl+V con una captura en el portapapeles: la IA la lee igual que el texto */
  const pegarImagen = (e) => {
    const f = e.clipboardData?.files?.[0];
    if (!f || !String(f.type).startsWith("image/")) return false;
    e.preventDefault();
    e.stopPropagation();   /* si vino del textarea, que el contenedor no la lea de nuevo */
    setModo("foto");
    toast({ msg:"Imagen pegada — leyendo el itinerario…", tone:"ok" });
    void leerFoto(f);
    return true;
  };
  return (
    <Block id="b-vuelos" forwardRef={refEl} icon={Plane} title="Itinerario de vuelos" count={q.vuelos.length || null}
      right={
        <>
          {q.soloVuelos && <Pill tone="violet">Solo vuelos</Pill>}
          <div className="seg">
            <button data-on={modo === "texto" ? "1" : "0"} onClick={() => setModo("texto")}>
              <FileText size={12} /> Pegar texto</button>
            <button data-on={modo === "foto" ? "1" : "0"} onClick={() => setModo("foto")}>
              <Eye size={12} /> Subir foto</button>
          </div>
        </>
      }>
      <div onPaste={pegarImagen}>
      {modo === "texto" ? (
        <textarea className="in mono" rows={q.pnrRaw ? 5 : 3} value={q.pnrRaw}
          style={{ fontSize:11.5, lineHeight:1.55, background: estado === "error" ? "rgba(244,62,85,.07)" : "var(--field)" }}
          placeholder="Pegá acá el PNR tal como sale del GDS… (igual que en el sistema actual)"
          onChange={(e) => { set((d) => { d.pnrRaw = e.target.value; }); setEstado("idle"); setErrorMsg(null); }}
          onPaste={(e) => { if (pegarImagen(e)) return;
            e.preventDefault(); const t = e.clipboardData.getData("text/plain");
            set((d) => { d.pnrRaw = t; }); setEstado("idle"); setErrorMsg(null); }} />
      ) : (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void leerFoto(f); }} />
          {estado === "cargando" ? (
            <div className="dz" style={{ cursor:"default" }}>
              {foto?.url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={foto.url} alt="" style={{ maxHeight:96, maxWidth:"100%", borderRadius:9,
                  margin:"0 auto 9px", display:"block", objectFit:"contain",
                  border:"1px solid var(--hair-soft)" }} />
              )}
              <Loader2 size={20} className="spin" style={{ color:"var(--violet)", marginBottom:8 }} />
              <div style={{ fontSize:13, fontWeight:600, color:"var(--n600)" }}>Leyendo el itinerario…</div>
              <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:3 }}>{foto?.nombre}</div>
            </div>
          ) : (
            <button className="dz" style={{ width:"100%" }} onClick={() => fileRef.current?.click()}>
              <div style={{ width:38, height:38, borderRadius:12, margin:"0 auto 9px", display:"grid", placeItems:"center",
                background:"rgba(120,90,229,.12)", color:"var(--violet)" }}><Plane size={17} /></div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--n600)" }}>Arrastrá o tocá para subir la foto de la reserva</div>
              <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:3 }}>Captura de Amadeus, foto del papel, lo que tengas — lo leemos igual</div>
              <div style={{ fontSize:11, color:"var(--n400)", marginTop:4 }}>
                También podés pegar una captura con <span className="kbd">Ctrl</span>+<span className="kbd">V</span> — la IA la lee igual que el texto.</div>
            </button>
          )}
          {foto && estado === "idle" && q.vuelos.length > 0 && (
            <div className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, marginTop:9, padding:"8px 11px",
              borderRadius:11, background:"rgba(59,191,173,.07)", border:"1px solid rgba(59,191,173,.2)" }}>
              {foto.url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={foto.url} alt="" style={{ width:34, height:34, borderRadius:7, objectFit:"cover", flexShrink:0 }} />
              )}
              <CheckCheck size={14} style={{ color:"var(--teal-2)" }} />
              <span style={{ fontSize:12, color:"var(--teal-3)", fontWeight:600, minWidth:0, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{foto.nombre}</span>
              <span style={{ fontSize:11.5, color:"var(--n400)", flexShrink:0 }}>· itinerario extraído</span>
            </div>
          )}
        </>
      )}

      {modo === "texto" && (
        <div style={{ fontSize:11, color:"var(--n400)", marginTop:6, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <ImageIcon size={11} style={{ color:"var(--violet)", flexShrink:0 }} />
          <span>También podés pegar una captura con <span className="kbd">Ctrl</span>+<span className="kbd">V</span> — la IA la lee igual que el texto.</span>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:9, marginTop:9, flexWrap:"wrap" }}>
        {modo === "texto" && (
        <Btn variant="p" size="sm" onClick={convertir} disabled={!q.pnrRaw.trim() || estado === "cargando"}>
          {estado === "cargando" ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
          {estado === "cargando" ? "Leyendo el itinerario…" : "Convertir itinerario"}
        </Btn>
        )}
        {refinando && (
          <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11.5, color:"var(--n400)" }}>
            <Loader2 size={12} className="spin" style={{ color:"var(--violet)" }} />
            La IA está revisando el itinerario…
          </span>
        )}
        {propuestaIA && (
          <button className="chip" title="Reemplaza los tramos cargados por los que leyó la IA"
            onClick={() => { aplicarVuelos(propuestaIA); setPropuestaIA(null); }}>
            <Zap size={11} /> La IA leyó {propuestaIA.length} tramos · Aplicar
          </button>
        )}
        {modo === "texto" && !q.pnrRaw && (
          <Btn size="sm" onClick={() => set((d) => { d.pnrRaw = PNR_DEMO; })}>Pegar ejemplo</Btn>
        )}
        {q.vuelos.length > 0 && (
          <>
            <Btn size="sm" onClick={() => set((d) => { d.vuelos.push({ id:uid("vl"), cia:"LA", nro:"0000",
              aerolinea:"LATAM", dia:1, mes:0, origen:"MVD", destino:"GRU", salida:"08:00", llegada:"09:40" }); })}>
              <Plus size={12} /> Agregar tramo a mano
            </Btn>
            {/* borrar de a uno es un embole: esto vacía el itinerario y el pegado, con deshacer */}
            <Btn size="sm" variant="ta" title="Vaciar el itinerario y empezar de nuevo"
              onClick={() => {
                const cpVuelos = JSON.parse(JSON.stringify(q.vuelos));
                const cpPnr = q.pnrRaw;
                set((d) => { d.vuelos = []; d.pnrRaw = ""; });
                /* la captura se saca de pantalla: si no se revoca, el blob
                   queda en memoria hasta que se recarga la página */
                if (urlFotoRef.current) { URL.revokeObjectURL(urlFotoRef.current); urlFotoRef.current = null; }
                setEstado("idle"); setErrorMsg(null); setFoto(null); setPropuestaIA(null);
                toast({ msg:"Itinerario borrado", tone:"warn",
                  undo:() => set((d) => { d.vuelos = cpVuelos; d.pnrRaw = cpPnr; }) });
              }}>
              <Trash2 size={12} /> Borrar itinerario
            </Btn>
          </>
        )}
      </div>

      {estado === "error" && (
        <div className="a-slide" style={{ display:"flex", alignItems:"flex-start", gap:9, marginTop:10, padding:"10px 12px",
          background:"rgba(244,62,85,.07)", border:"1px solid rgba(244,62,85,.24)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"var(--coral)", flexShrink:0, marginTop:1 }} />
          <div style={{ fontSize:12, color:"var(--ink-coral)", flex:1 }}>
            <strong>{errorMsg || "No se reconoció ningún tramo en ese texto."}</strong>{" "}
            {modo === "texto"
              ? "Lo pegado quedó intacto arriba: corregilo y volvé a convertir, o cargá los tramos a mano."
              : "Probá con otra captura, pegá el texto del GDS, o cargá los tramos a mano."}
            <div style={{ marginTop:7, display:"flex", gap:6, flexWrap:"wrap" }}>
              <Btn size="xs" onClick={() => { set((d) => { d.vuelos.push({ id:uid("vl"), cia:"LA", nro:"0000",
                aerolinea:"LATAM", dia:1, mes:0, origen:"MVD", destino:"GRU", salida:"08:00", llegada:"09:40" }); });
                setEstado("idle"); setErrorMsg(null); }}>
                <Plus size={11} /> Cargar a mano
              </Btn>
              {modo === "foto" && (
                <Btn size="xs" onClick={() => { setEstado("idle"); setErrorMsg(null); fileRef.current?.click(); }}>
                  <RefreshCw size={11} /> Probar con otra imagen
                </Btn>
              )}
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
                  set((d) => { d.vuelos[i].cia = c; d.vuelos[i].nro = n; d.vuelos[i].aerolinea = aerolineas[c] || c; }); }} />
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
              {/* Salto de día. Lo trae el PNR —ahora se guardan las dos fechas,
                  no solo la de salida— y acá se puede corregir a mano para los
                  vuelos cargados sin PNR. Cicla 0 → 1 → 2 → 0.

                  Hace falta porque las horas solas mienten en los dos sentidos:
                  un vuelo que sale 01:05 y llega 05:25 puede llegar al día
                  siguiente, y uno que sale 12:30 y llega 11:20 puede llegar el
                  mismo día si cruza la línea de cambio de fecha. */}
              {(() => {
                const dm = diasDeMas(v);
                return (
                  <button className="btn btn-g" style={{ width:46, height:30, flexShrink:0, fontSize:11,
                    fontWeight:700, color: dm > 0 ? "var(--ink-coral)" : "var(--n400)" }}
                    title={dm > 0
                      ? `Llega ${dm} ${dm === 1 ? "día" : "días"} después de salir. Tocá para cambiarlo.`
                      : "Llega el mismo día. Tocá si llega al día siguiente."}
                    onClick={() => set((d) => { d.vuelos[i].masDias = (dm + 1) % 3; })}>
                    {dm > 0 ? `+${dm}` : "mismo"}
                  </button>
                );
              })()}
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
              onClick={() => set((d) => { d.cabina = d.cabina === x ? null : x; escribirAereo(d); })}>
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
              onClick={() => set((d) => { d.equipaje = d.equipaje === x ? null : x; escribirAereo(d); })}>
              {q.equipaje === x ? <Check size={11} /> : <Luggage size={11} />}{x}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        Lo que elijas reescribe la línea de Aéreo de los servicios incluidos, aunque la hayas tocado a mano.
      </div>

      {/* solo vuelos: la cotización se cierra acá, sin hoteles ni servicios */}
      {q.soloVuelos && (
        <>
          <div className="hairline" style={{ margin:"14px 0 12px" }} />
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
            <div style={{ width:22, height:22, borderRadius:7, display:"grid", placeItems:"center",
              background:"rgba(120,90,229,.11)", color:"var(--violet)" }}><Plane size={12} /></div>
            <span style={{ fontSize:12.5, fontWeight:700 }}>Precio del vuelo</span>
            <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div style={{ width:110 }}>
              <Label>Por adulto</Label>
              <input className="in mono" type="number" style={{ height:34, textAlign:"right" }}
                value={q.precioVuelo?.adulto ?? ""}
                onChange={(e) => { const v = e.target.value;
                  set((d) => { d.precioVuelo = { ...(d.precioVuelo || {}), adulto:v }; }); }} />
            </div>
            <div style={{ width:110 }}>
              <Label>Por menor</Label>
              <input className="in mono" type="number" style={{ height:34, textAlign:"right" }}
                value={q.precioVuelo?.menor ?? ""}
                onChange={(e) => { const v = e.target.value;
                  set((d) => { d.precioVuelo = { ...(d.precioVuelo || {}), menor:v }; }); }} />
            </div>
            <div style={{ width:110 }}>
              <Label>Por infante</Label>
              <input className="in mono" type="number" style={{ height:34, textAlign:"right" }}
                value={q.precioVuelo?.infante ?? ""}
                onChange={(e) => { const v = e.target.value;
                  set((d) => { d.precioVuelo = { ...(d.precioVuelo || {}), infante:v }; }); }} />
            </div>
            <div style={{ fontSize:11, color:"var(--n400)", flex:"1 1 180px", paddingBottom:9 }}>
              Va directo en la cotización — sin hoteles ni servicios.
            </div>
          </div>
        </>
      )}

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
      </div>
    </Block>
  );
}

/* ── 6 · Servicios en cápsulas, reordenables ─────────────────────────── */
function BloqueServicios({ q, set, refEl, toast }) {
  const { ciudades: CIUDADES } = useCatalogo();
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

  /* busqueda GLOBAL: en todas las categorias, no solo la activa */
  const acRes = useMemo(() => {
    const t = norm(txt.trim());
    const usados = new Set(q.servicios.map((x) => x.texto));
    if (!t) return SUG[cat].filter((x) => !usados.has(x)).slice(0, 5).map((texto) => ({ cat, texto }));
    return SUG_ALL.filter((x) => !usados.has(x.texto) && norm(x.texto).includes(t)).slice(0, 6);
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
                      {/* decenas de ubicaciones: va con buscador. Primero las
                          ciudades de esta cotización, después el catálogo. */}
                      <SelectBuscable valor={s.ciudad || ""} ancho={126} alto={30} fontSize={12}
                        opciones={[...new Set([...q.destinos.map((x) => x.ciudad), ...CIUDADES])].filter(Boolean)}
                        vacio="Ciudad…" buscarPlaceholder="Buscar ciudad…"
                        titulo="Ciudad del traslado"
                        onChange={(v) => set((d) => { d.servicios[i].ciudad = v; })} />
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

  const agregarCosto = () => {
    if (!c.trim()) return;
    set((d) => { d.notas.push({ id:uid("nt"), concepto:c.trim(), neto:Number(n) || 0 }); });
    setC(""); setN(""); requestAnimationFrame(() => inp.current?.focus());
  };
  const borrarCosto = (x, i) => {
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

  /* un bloc y nada más: Enter es salto de línea, como en cualquier cuaderno */
  const bloc = (grande) => (
    <textarea className="in notas-ta" autoFocus={grande} value={q.notasLibres || ""}
      rows={grande ? undefined : 7}
      style={{ width:"100%", resize:"none", lineHeight:1.55, fontSize:12,
        ...(grande ? { flex:1, height:"100%" } : {}) }}
      placeholder="Escribí libre: aéreo 700, hotel 1 400…"
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
      <div className="card notas-card" style={{ padding:11, marginTop:11 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          <Lock size={12} style={{ color:"var(--coral)", flexShrink:0 }} />
          <span className="lbl">Notas internas</span>
          <Pill tone="coral" style={{ marginLeft:"auto" }}>No se comparte</Pill>
        </div>

        {bloc(false)}

        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
          <button className="btn btn-g btn-xs notas-exp" onClick={() => setAbierto(true)}
            title="Abrir el bloc a pantalla, con los costos fijos">
            <Maximize2 size={11} /> Expandir
          </button>
        </div>
        <div style={{ fontSize:10, color:"var(--n300)", marginTop:6, lineHeight:1.45 }}>
          Escribí como quieras: esto no sale en ningún lado.
        </div>
      </div>

      {/* el drawer entra desde la izquierda, pegado al rail donde vive el block */}
      {abierto && createPortal(
        <>
          <div className="drawer-bg" onClick={() => setAbierto(false)} />
          <div className="drawer-izq">
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px",
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

            <div style={{ flex:1, overflowY:"auto", padding:"14px 17px 20px", display:"flex", flexDirection:"column" }}>
              <div style={{ flex:"1 1 auto", minHeight:260, display:"flex" }}>
                {bloc(true)}
              </div>

              <div className="lbl" style={{ margin:"16px 0 7px", flexShrink:0 }}>Costos fijos</div>
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
                      <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} onClick={() => borrarCosto(x, i)}>
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
                  onChange={(e) => setC(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarCosto()} />
                <input className="in mono" style={{ width:110, textAlign:"right" }} type="number" value={n} placeholder="0"
                  onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarCosto()} />
                <Btn size="sm" onClick={agregarCosto} style={{ height:38 }}><Plus size={13} /></Btn>
              </div>
            </div>
          </div>
        </>,
        /* dentro de .ctz para no perder las variables de color ni el modo oscuro */
        document.querySelector(".ctz") || document.body
      )}
    </>
  );
}

/* ── 7b · Notas — campo libre que SÍ sale en la cotización ───────────── */
/* Tope de itinerarios alternativos en las notas.

   Dos, no ilimitado. El cliente lo pidió así en la llamada del 3/9 y dio la
   razón: "que tengan solo una opción, si quieren meter otra que se la manden
   por WhatsApp, si no queda muy enchoclado la cotización". Dos deja lugar a la
   alternativa que describieron las vendedoras —la del paquete y una más
   cómoda— sin que la cotización se vaya a tres carillas. */
const MAX_VUELOS_NOTA = 2;

/* Un itinerario alternativo adentro de las notas.

   Es el mismo gesto que el bloque de vuelos de arriba —pegar el PNR y
   convertir— pero acotado: acá no entra el lector de IA ni la propuesta a
   confirmar. Con el parser alcanza para el texto que sale del GDS, y si no
   reconoce nada lo dice en vez de dejar al vendedor mirando una pantalla
   quieta. */
function FichaVueloNota({ nota, i, set, aerolineas, toast }) {
  const tramos = nota.vuelos || [];

  const enNota = (fn) => set((d) => { fn(d.vuelosNota[i]); });

  const convertir = () => {
    const crudo = nota.pnrRaw || "";
    if (!crudo.trim()) return;
    const v = parsePNR(crudo, aerolineas);
    if (!v.length) {
      toast({ msg:"No se reconoció ningún tramo en ese texto. Pegá el itinerario tal cual sale del GDS.",
        tone:"warn", ms:5000 });
      return;
    }
    enNota((n) => { n.vuelos = v; });
    toast({ msg:`${v.length} ${v.length === 1 ? "tramo convertido" : "tramos convertidos"}`, tone:"ok" });
  };

  return (
    <div style={{ border:"1px solid var(--hair)", borderRadius:13, padding:"11px 12px 12px",
      background:"var(--card-3)", marginBottom:9 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
        <span style={{ width:24, height:24, borderRadius:7, flexShrink:0, display:"grid", placeItems:"center",
          background:"rgba(120,90,229,.11)", color:"var(--violet)" }}><Plane size={12} /></span>
        <input className="in" style={{ flex:1, height:30, fontSize:12 }} value={nota.nombre || ""}
          placeholder="Cómo se llama esta opción (ej. Llega de día)"
          onChange={(e) => enNota((n) => { n.nombre = e.target.value; })} />
        <button className="btn btn-g btn-ico" title="Quitar este itinerario"
          onClick={() => { const cp = JSON.parse(JSON.stringify(nota));
            set((d) => { d.vuelosNota.splice(i, 1); });
            toast({ msg:"Itinerario quitado de las notas", tone:"warn",
              undo:() => set((d) => { d.vuelosNota.splice(i, 0, cp); }) }); }}>
          <Trash2 size={13} />
        </button>
      </div>

      {tramos.length === 0 ? (
        <>
          <textarea className="in mono" rows={4} style={{ width:"100%", fontSize:11.5, lineHeight:1.5 }}
            value={nota.pnrRaw || ""} placeholder="Pegá acá el itinerario tal cual sale del GDS…"
            onChange={(e) => enNota((n) => { n.pnrRaw = e.target.value; })} />
          <Btn variant="p" size="sm" style={{ marginTop:8 }}
            disabled={!(nota.pnrRaw || "").trim()} onClick={convertir}>
            Convertir itinerario
          </Btn>
        </>
      ) : (
        <>
          {tramos.map((v, k) => {
            const dm = diasDeMas(v);
            return (
              <div key={v.id} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11.5,
                padding:"6px 0", borderTop: k > 0 ? "1px solid var(--hair-soft)" : "none" }}>
                <span className="mono" style={{ width:62, fontWeight:600, flexShrink:0 }}>{v.cia} {v.nro}</span>
                <span className="mono" style={{ flexShrink:0 }}>{v.origen} → {v.destino}</span>
                <span className="mono" style={{ color:"var(--n500)", flexShrink:0 }}>{v.salida}–{v.llegada}</span>
                <button className="btn btn-g" style={{ height:24, fontSize:10, fontWeight:700, flexShrink:0,
                  color: dm > 0 ? "var(--ink-coral)" : "var(--n400)" }}
                  title="Días entre la salida y la llegada. Tocá para cambiarlo."
                  onClick={() => enNota((n) => { n.vuelos[k].masDias = (dm + 1) % 3; })}>
                  {dm > 0 ? `+${dm}` : "mismo"}
                </button>
                <button className="btn btn-g btn-ico" style={{ marginLeft:"auto", flexShrink:0 }}
                  title="Quitar este tramo"
                  onClick={() => enNota((n) => { n.vuelos.splice(k, 1); })}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <button className="btn btn-g" style={{ height:26, fontSize:11, marginTop:8 }}
            onClick={() => enNota((n) => { n.vuelos = []; })}>
            Pegar otro itinerario
          </button>
        </>
      )}
    </div>
  );
}

function BloqueNotasCliente({ q, set, refEl, toast }) {
  const ed = useRef(null);
  const { aerolineas } = useCatalogo();
  const lista = Array.isArray(q.vuelosNota) ? q.vuelosNota : [];
  const html = typeof q.notasCliente === "string" ? q.notasCliente : "";

  /* el editor sigue al estado, pero nunca mientras el vendedor está escribiendo adentro */
  useEffect(() => {
    const el = ed.current; if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [html]);

  const sync = () => { const el = ed.current; if (el) set((d) => { d.notasCliente = el.innerHTML; }); };

  /* ── Imágenes: al bucket, nunca adentro del HTML ──────────────────────
     Pegar una captura la inlineaba en base64 y una sola foto de celular
     sumaba dos o tres megas al JSON de la cotización: el autosave rebotaba
     contra el límite del body de las server actions y el vendedor perdía
     todo lo que venía escribiendo. Ahora sube a /api/upload y en la nota
     queda la URL. Mientras viaja se ve un cartelito con el nombre del
     archivo; si falla, no se inserta nada. */
  const subirImagen = async (file) => {
    const marca = uid("img");
    const el = ed.current;
    if (!el) return;
    el.focus();
    document.execCommand("insertHTML", false,
      `<span data-subiendo="${marca}" style="display:inline-block;padding:5px 10px;margin:4px 0;` +
      `border-radius:9px;background:rgba(69,212,192,.14);font-size:12px;opacity:.65">Subiendo imagen…</span>`);
    sync();

    try {
      const subida = await uploadFile(file, { folder:"cotizador/notas", convertToWebp:true });
      const ph = ed.current?.querySelector(`[data-subiendo="${marca}"]`);
      /* el vendedor puede haber borrado el placeholder mientras subía */
      if (!ph) return;
      const img = document.createElement("img");
      img.src = subida.url;
      img.setAttribute("style", "max-width:100%;border-radius:12px;margin:6px 0");
      ph.replaceWith(img);
      sync();
      toast({ msg:"Imagen subida a las notas", tone:"ok" });
    } catch (err) {
      ed.current?.querySelector(`[data-subiendo="${marca}"]`)?.remove();
      sync();
      toast({ msg: err?.message || "No pudimos subir la imagen. Probá de nuevo.", tone:"warn", ms:5000 });
    }
  };

  const primeraImagen = (lista) =>
    Array.from(lista || []).find((f) => String(f?.type).startsWith("image/")) || null;

  const pegar = (e) => {
    const f = primeraImagen(e.clipboardData?.files);
    if (f) { e.preventDefault(); void subirImagen(f); return; }
    e.preventDefault();
    document.execCommand("insertText", false, limpiarPegado(e.clipboardData.getData("text/plain")));
    sync();
  };

  const soltar = (e) => {
    const f = primeraImagen(e.dataTransfer?.files);
    if (!f) return;
    e.preventDefault();
    void subirImagen(f);
  };

  return (
    <Block id="b-notascliente" forwardRef={refEl} icon={StickyNote} title="Notas"
      right={<Pill tone="teal"><Eye size={9} /> Sale en la cotización</Pill>}>
      <div ref={ed} className="wys" contentEditable suppressContentEditableWarning
        style={{ minHeight:140 }}
        data-ph="Escribí libre o pegá contenido: itinerarios, detalle de un circuito, condiciones… También imágenes."
        onInput={sync} onPaste={pegar} onDrop={soltar}
        onDragOver={(e) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); }} />
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, display:"flex", alignItems:"center", gap:6 }}>
        <ImageIcon size={11} style={{ color:"var(--teal-2)", flexShrink:0 }} />
        Sale tal cual en la cotización, con el diseño de la agencia. Pegá o soltá una imagen y se sube sola.
      </div>

      {/* Itinerarios de vuelo opcionales. Sin ninguno cargado no hay nada acá
          abajo más que el botón, y la cotización sale exactamente como salía:
          la enorme mayoría no lleva ninguno. */}
      <div style={{ marginTop:14, paddingTop:13, borderTop:"1px solid var(--hair-soft)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap",
          marginBottom: lista.length ? 11 : 0 }}>
          <Plane size={12} style={{ color:"var(--violet)", flexShrink:0 }} />
          <span style={{ fontSize:12.5, fontWeight:700 }}>Otra opción de vuelo</span>
          <span style={{ fontSize:11.5, color:"var(--n400)" }}>opcional · sale abajo del texto</span>
          {lista.length < MAX_VUELOS_NOTA ? (
            <Btn size="sm" style={{ marginLeft:"auto" }}
              onClick={() => set((d) => {
                if (!Array.isArray(d.vuelosNota)) d.vuelosNota = [];
                d.vuelosNota.push({ id:uid("vn"), nombre:"", pnrRaw:"", vuelos:[] });
              })}>
              <Plus size={12} /> Agregar vuelo
            </Btn>
          ) : (
            <span style={{ marginLeft:"auto", fontSize:11, color:"var(--n400)", textAlign:"right" }}>
              Máximo dos. Si hace falta ofrecer otro, va por WhatsApp.
            </span>
          )}
        </div>
        {lista.map((n, i) => (
          <FichaVueloNota key={n.id} nota={n} i={i} set={set} aerolineas={aerolineas} toast={toast} />
        ))}
      </div>
    </Block>
  );
}

/* ── Ocupación: lista corta y "Más…" para el resto ──────────────────────
   Single, Doble y de 3 a 5 personas cubren casi todo lo que se vende. "Más…"
   convierte el selector en un campo numérico de 6 a 20 y la etiqueta pasa a
   decir "N personas". Una cotización vieja guardada con "9 personas" abre
   directo en modo numérico: el valor es el mismo texto de siempre. */
function CampoOcupacion({ valor, onChange }) {
  const n = personasDeOcupacion(valor);
  const fueraDeLista = !OCUPACIONES.includes(valor) && n != null;
  const [manual, setManual] = useState(fueraDeLista);
  const [txt, setTxt] = useState(String(n ?? PERSONAS_MIN));
  useEffect(() => { if (fueraDeLista) setManual(true); }, [fueraDeLista]);
  /* si la réplica de otra opción devolvió la ocupación a la lista ("Doble"),
     este campo tiene que volver con ella y no quedarse con un número viejo */
  useEffect(() => { if (!fueraDeLista && OCUPACIONES.includes(valor)) setManual(false); }, [fueraDeLista, valor]);
  useEffect(() => { if (n != null) setTxt(String(n)); }, [n]);

  if (manual) {
    const cerrar = () => { const v = ocupacionDePersonas(txt); setTxt(String(personasDeOcupacion(v))); onChange(v); };
    /* el campo guarda dígitos pelados mientras se tipea ("1" camino a "12"):
       la etiqueta lee ese número, no el texto "N personas" que todavía no es */
    const enPantalla = Number(txt) > 0 ? Number(txt) : PERSONAS_MIN;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input className="in mono" data-personas inputMode="numeric"
          style={{ height:34, width:58, textAlign:"right" }} value={txt}
          title={`De ${PERSONAS_MIN} a ${PERSONAS_MAX} personas`}
          onChange={(e) => { const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
            setTxt(raw);
            const v = Number(raw);
            if (v >= PERSONAS_MIN && v <= PERSONAS_MAX) onChange(`${v} personas`); }}
          onBlur={cerrar}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); cerrar(); e.currentTarget.blur(); } }} />
        <span style={{ fontSize:11.5, color:"var(--n500)", whiteSpace:"nowrap" }}>
          {enPantalla} personas</span>
        <button className="btn btn-g btn-ico" style={{ width:26, height:26, marginLeft:"auto" }}
          title="Volver a la lista" onClick={() => { setManual(false); onChange("Doble"); }}>
          <X size={12} /></button>
      </div>
    );
  }
  return (
    <select className="in" data-ocupacion style={{ height:34 }} value={valor || ""}
      onChange={(e) => { const v = e.target.value;
        if (v === OCUPACION_MAS) { setManual(true); onChange(ocupacionDePersonas(PERSONAS_MIN)); return; }
        onChange(v); }}>
      {valor && !OCUPACIONES.includes(valor) && <option key="actual">{valor}</option>}
      {OCUPACIONES.map((x) => <option key={x}>{x}</option>)}
      <option value={OCUPACION_MAS}>{OCUPACION_MAS}</option>
    </select>
  );
}

/* ── 8 · Opciones hoteleras ──────────────────────────────────────────── */
function SeccionOpciones({ q, set, tramos, toast, vistaPasajero }) {
  const { hotelById, hotelesCotizadosEn, registrarHotelLibre } = useCatalogo();
  /* toda tarifa nueva arranca con el factor que fijó el máster en Ajustes */
  const { factorDefault } = useAjustes();
  const [foco, setFoco] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [armado, setArmado] = useState(null);
  const nombreRefs = useRef({});
  /* el régimen del destino es solo el arranque: después cada hotel manda el suyo.
     "Régimen detallado" no es un régimen, así que no baja: el hotel nuevo
     arranca con el default y el vendedor lo elige. */
  const regimenDeTramo = (hi) => regimenHeredable(q.destinos[hi]?.regimen);

  useEffect(() => { if (foco && nombreRefs.current[foco]) { nombreRefs.current[foco].focus(); nombreRefs.current[foco].select(); setFoco(null); } }, [foco, q.opciones.length]);

  /* la opción nueva sale clonada de la anterior: se cambia el hotel y el precio, nada más */
  const nueva = () => {
    const id = uid("op");
    const clona = q.opciones.length > 0;
    set((d) => {
      const n = d.opciones.length + 1;
      if (d.opciones.length > 0) {
        const copia = JSON.parse(JSON.stringify(d.opciones[d.opciones.length - 1]));
        copia.id = id;
        copia.nombre = `Opción ${n}`;
        (copia.habitaciones || []).forEach((h) => {
          h.id = uid("hab");
          (h.tarifas || []).forEach((t) => { t.id = uid("tf"); });
        });
        d.opciones.push(copia);
      } else {
        /* el régimen viaja con cada hotel: Madrid con desayuno, Barcelona solo alojamiento */
        d.opciones.push({ id, nombre:`Opción ${n}`,
          hoteles: d.destinos.map((x) => ({ hotelId:null, libre:"", cat:0,
            regimen: regimenHeredable(x.regimen) })),
          factor:factorDefault, habitaciones:[{ ...habitacionNueva("Doble", factorDefault), grupo:uid("hg") }] });
      }
    });
    setFoco(id);
    if (clona) toast({ msg:"Opción clonada — cambiá el hotel y el precio", tone:"ok" });
  };
  /* la segunda tarifa suele ser el menor, después el infante y la familiar */
  const tipoSiguiente = (n) => (n === 1 ? "Por menor" : n === 2 ? "Por infante" : n === 3 ? "Por familia" : "Por adulto");
  /* ── Habitaciones: la misma en todas las opciones ──────────────────────
     Una habitación no cambia entre opciones: cambia el hotel y cambia el
     precio. Por eso "Agregar habitación" la crea en esta opción (clonando la
     última, que es lo que el vendedor quiere el 90% de las veces) y la replica
     en las demás con los netos en 0 — los precios se cargan por hotel. `grupo`
     ata las réplicas: cambiar la ocupación o el tipo en una las mueve a todas.
     Las habitaciones viejas, sin `grupo`, quedan sueltas como hasta ahora. */
  const mismaHab = (h, ocupacion, tipo) =>
    norm(h?.ocupacion || "") === norm(ocupacion || "") && norm(h?.tipo || "") === norm(tipo || "");
  const tarifaEnCero = (t) => ({ id:uid("tf"), tipo:t?.tipo || "Por adulto", tipoLibre:t?.tipoLibre || "",
    neto:0, venta:null, factor:factorDefault });
  const replicaDe = (hab) => ({ id:uid("hab"), grupo:hab.grupo, ocupacion:hab.ocupacion, tipo:hab.tipo,
    tarifas: (hab.tarifas || []).map(tarifaEnCero) });
  /* cuántas opciones no tienen todavía esa ocupación + tipo (para el aviso) */
  const faltantes = (i, ocupacion, tipo) => (q.opciones || [])
    .filter((o, j) => j !== i && !(o.habitaciones || []).some((h) => mismaHab(h, ocupacion, tipo))).length;

  const agregarHabitacion = (i) => {
    const hsAct = q.opciones[i]?.habitaciones || [];
    const ultAct = hsAct[hsAct.length - 1];
    const ocupacion = ultAct?.ocupacion || "Doble";
    const tipo = ultAct?.tipo ?? "Estándar";
    const replicas = faltantes(i, ocupacion, tipo);
    set((d) => {
      const hs = d.opciones[i].habitaciones || (d.opciones[i].habitaciones = []);
      const ult = hs[hs.length - 1];
      const nueva = ult
        ? { ...JSON.parse(JSON.stringify(ult)), id:uid("hab"), grupo:uid("hg") }
        : { ...habitacionNueva("Doble", factorDefault), grupo:uid("hg") };
      (nueva.tarifas || []).forEach((tf) => { tf.id = uid("tf"); });
      hs.push(nueva);
      d.opciones.forEach((o, j) => {
        if (j === i) return;
        const otras = o.habitaciones || (o.habitaciones = []);
        if (otras.some((h) => h.grupo === nueva.grupo || mismaHab(h, nueva.ocupacion, nueva.tipo))) return;
        otras.push(replicaDe(nueva));
      });
    });
    if (replicas > 0) {
      toast({ msg:`Habitación agregada acá y en ${replicas} ${replicas === 1 ? "opción más" : "opciones más"} — los precios se cargan por hotel`, tone:"ok" });
    } else if (hsAct.length > 0) {
      toast({ msg:"Habitación agregada igual a la anterior — ajustá lo que cambie", tone:"ok" });
    }
  };

  /* La ocupación y el tipo viajan a las réplicas; el neto y la venta jamás. */
  const editarHab = (i, hj, campo, valor) => set((d) => {
    const hab = d.opciones[i].habitaciones[hj];
    hab[campo] = valor;
    if (!hab.grupo) return;
    d.opciones.forEach((o, j) => {
      if (j === i) return;
      const hs = o.habitaciones || (o.habitaciones = []);
      const gemela = hs.find((h) => h.grupo === hab.grupo);
      if (gemela) { gemela[campo] = valor; return; }
      if (hs.some((h) => mismaHab(h, hab.ocupacion, hab.tipo))) return;
      hs.push(replicaDe(hab));
    });
  });
  /* el "+" de la cabecera: agrega una opción en las mismas condiciones que esta */
  const duplicar = (i) => {
    const src = q.opciones[i]; const id = uid("op");
    const copia = JSON.parse(JSON.stringify(src));
    copia.id = id;
    (copia.habitaciones || []).forEach((hb) => { hb.id = uid("hab");
      (hb.tarifas || []).forEach((tf) => { tf.id = uid("tf"); }); });
    set((d) => { copia.nombre = `Opción ${d.opciones.length + 1}`; d.opciones.splice(i + 1, 0, copia); });
    setFoco(id);
    toast({ msg:"Opción agregada en las mismas condiciones — cambiá el hotel y el precio", tone:"ok" });
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
        <button className={`chip ${q.fotosHotel ? "chip-on" : ""}`}
          title="Mostrar u ocultar las fotos de hotel en lo que ve el pasajero"
          onClick={() => set((d) => { d.fotosHotel = !d.fotosHotel; })}>
          <ImageIcon size={12} /> Fotos de hotel
        </button>
        <Btn variant="p" size="sm" onClick={nueva}><Plus size={13} /> Nueva opción</Btn>
      </div>
      {q.opciones.length === 0 && <Vacio icon={Building2} titulo="Todavía no hay opciones" accion="Agregá la primera y elegí un hotel por destino — hereda los destinos y fechas de arriba" />}

      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        {q.opciones.map((o, i) => {
          const habs = o.habitaciones || [];
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
                  {/* el precio de la opción, a la vista mientras se toca cualquier tarifa */}
                  <span className="mono" title="Primera tarifa de la primera habitación"
                    style={{ fontSize:12, fontWeight:600, color:"var(--teal-3)", whiteSpace:"nowrap" }}>
                    {money(precioOpcion(o))}
                  </span>
                  <div style={{ display:"flex", gap:3 }}>
                    <button className="btn btn-tt btn-ico" title="Agregar una opción igual a esta — solo cambiás hotel y precio"
                      onClick={() => duplicar(i)}>
                      <Plus size={14} /></button>
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
                  {/* Régimen de la opción. Es el que vale cuando ningún hotel
                      trae el suyo, y el ÚNICO control disponible mientras no
                      haya destinos cargados: los selectores de régimen viven
                      dentro de cada tramo, así que una opción armada sobre la
                      marcha salía sin régimen y la hoja del pasajero lo
                      mostraba vacío. (Reporte de Gero, 01/09.) */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11, flexWrap:"wrap" }}>
                    <span className="lbl">Régimen</span>
                    <select className="in" style={{ flex:"0 1 210px", height:34, fontSize:12 }}
                      title="Régimen de la opción. Cada hotel puede llevar el suyo y pisa a este."
                      value={o.regimen || ""}
                      onChange={(e) => { const v = e.target.value;
                        set((d) => { d.opciones[i].regimen = v; }); }}>
                      <option value="">Régimen…</option>
                      {REGIMENES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                    {tramos.length > 0 && (
                      <span style={{ fontSize:10.5, color:"var(--n400)" }}>
                        Vale para los hoteles que no tengan el suyo.
                      </span>
                    )}
                  </div>
                  {tramos.length === 0 && <div style={{ fontSize:12, color:"var(--n400)" }}>Agregá destinos para elegir hoteles por tramo.</div>}
                  {tramos.map((t, hi) => {
                    const h = o.hoteles[hi] || { hotelId:null, libre:"", cat:0, regimen:"" };
                    const H = hotelById(h.hotelId);
                    const antes = hotelesCotizadosEn(t.ciudad);   /* v2B · de los paquetes publicados */
                    return (
                      <div key={t.id} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <Foto seed={H?.seed ?? (hi + 40)} url={H?.foto} alt={H?.nombre || ""} w={48} h={36} r={9} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <span className="lbl" style={{ color:"var(--violet)" }}>{t.ciudad}</span>
                              <span className="mono" style={{ fontSize:10, color:"var(--n400)" }}>
                                {t.noches}n · {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)}
                              </span>
                            </div>
                            {/* el régimen va pegado al buscador: cada hotel el suyo */}
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                              <div style={{ flex:"1 1 200px", minWidth:0 }}>
                                <BuscadorHotel ciudad={t.ciudad} valor={h.libre || H?.nombre || ""} onToast={toast}
                                  onPick={(hh) => set((d) => { const prev = d.opciones[i].hoteles[hi] || {};
                                    d.opciones[i].hoteles[hi] = { ...prev, hotelId:hh.id, libre:"",
                                      regimen: prev.regimen || regimenDeTramo(hi) }; })}
                                  onLibre={(txt) => {
                                    registrarHotelLibre(txt, t.ciudad, h.cat || 0);
                                    set((d) => { const prev = d.opciones[i].hoteles[hi] || {};
                                      d.opciones[i].hoteles[hi] = { ...prev, hotelId:null, libre:txt,
                                        cat: prev.cat || 0, regimen: prev.regimen || regimenDeTramo(hi) }; });
                                  }}
                                  /* El tramo queda sin hotel y sin estrellas, pero conserva el
                                     régimen: ese lo manda el destino, no el alojamiento. Aguas
                                     abajo el vacío ya estaba contemplado —la ficha y el PDF
                                     dicen "A definir"— y el precio sale de las tarifas de la
                                     habitación, así que no se mueve. */
                                  onVaciar={() => set((d) => { const prev = d.opciones[i].hoteles[hi] || {};
                                    d.opciones[i].hoteles[hi] = { ...prev, hotelId:null, libre:"", cat:0 }; })} />
                              </div>
                              <select className="in" style={{ flex:"0 1 190px", height:38, fontSize:12 }}
                                title="Régimen de este hotel" value={h.regimen || ""}
                                onChange={(e) => { const v = e.target.value;
                                  set((d) => { const prev = d.opciones[i].hoteles[hi] || {};
                                    d.opciones[i].hoteles[hi] = { ...prev, regimen:v }; }); }}>
                                <option value="">Régimen…</option>
                                {REGIMENES.map((x) => <option key={x}>{x}</option>)}
                              </select>
                            </div>
                          </div>
                          {H && <div style={{ flexShrink:0 }}><Estrellas n={H.cat} /></div>}
                          {h.libre && (
                            <div style={{ display:"flex", alignItems:"center", gap:1, flexShrink:0 }}
                              title="Categoría del hotel — un clic en la estrella; el mismo clic la saca">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} style={{ padding:2, lineHeight:0 }}
                                  onClick={() => { const cat = h.cat === n ? 0 : n;
                                    registrarHotelLibre(h.libre, t.ciudad, cat);
                                    set((d) => { const hh = d.opciones[i].hoteles[hi]; hh.cat = cat; }); }}>
                                  <Star size={14} fill={(h.cat || 0) >= n ? "#F7B267" : "none"}
                                    style={{ color:(h.cat || 0) >= n ? "#E8A13C" : "var(--n300)" }} />
                                </button>
                              ))}
                            </div>
                          )}
                          {h.libre && <Pill tone="amber" style={{ flexShrink:0 }}><PenLine size={9} /> libre</Pill>}
                        </div>
                        {antes.length > 0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginTop:6, paddingLeft:57 }}>
                            <span style={{ fontSize:10.5, color:"var(--n400)", whiteSpace:"nowrap" }}>
                              Cotizados antes en {t.ciudad}:</span>
                            {antes.map((hh) => (
                              <button key={hh.id} className={`chip chip-mini ${h.hotelId === hh.id ? "chip-on" : ""}`}
                                title={`${hh.nombre} · ${hh.cat} estrellas`}
                                onClick={() => set((d) => { const prev = d.opciones[i].hoteles[hi] || {};
                                  d.opciones[i].hoteles[hi] = { ...prev, hotelId:hh.id, libre:"",
                                    regimen: prev.regimen || regimenDeTramo(hi) }; })}>
                                {h.hotelId === hh.id ? <Check size={10} /> : <Plus size={10} />}{hh.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* habitaciones: cada una con su ocupación, su tipo y sus tarifas */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, margin:"14px 0 8px" }}>
                    <span className="lbl">Habitaciones</span>
                    {habs.length > 0 && <Pill tone="n">{habs.length}</Pill>}
                    <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
                  </div>

                  {habs.length === 0 && (
                    <div style={{ fontSize:11.5, color:"var(--n400)", marginBottom:9 }}>
                      Esta opción todavía no tiene habitaciones. Agregá la primera para cargarle tarifas.
                    </div>
                  )}

                  {habs.map((hab, hj) => (
                    <div key={hab.id} className="a-pop" style={{ border:"1px solid var(--hair-soft)", borderRadius:12,
                      padding:"12px", marginBottom:12, background:"var(--card-3)" }}>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
                        <div style={{ flex:"1 1 165px" }}>
                          <Label hint={hab.grupo ? "igual en todas las opciones" : null}>Ocupación</Label>
                          <CampoOcupacion valor={hab.ocupacion}
                            onChange={(v) => editarHab(i, hj, "ocupacion", v)} />
                        </div>
                        <div style={{ flex:"2 1 190px" }}>
                          <Label hint="opcional">Tipo de habitación</Label>
                          <input className="in" style={{ height:34 }} value={hab.tipo || ""}
                            placeholder="Vista al mar, suite junior, apartamento…"
                            onChange={(e) => editarHab(i, hj, "tipo", e.target.value)} />
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
                              <div style={{ flex:"0 1 132px" }}>
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
                                <input className="in mono" style={{ height:32, textAlign:"right" }} type="number"
                                  min="0" max="99999999" value={t.neto}
                                  onChange={(e) => set((d) => { d.opciones[i].habitaciones[hj].tarifas[tk].neto = e.target.value; })} />
                              </div>
                              <div style={{ width:112 }}>
                                {L("Venta")}
                                <input className="in mono" type="number" min="0" max="99999999"
                                  style={{ height:32, textAlign:"right",
                                    color: manual ? "var(--ink-amber)" : "var(--teal-3)" }}
                                  value={manual ? t.venta : Math.round(ventaTarifa(t, o.factor))}
                                  onChange={(e) => { const v = e.target.value;
                                    set((d) => { const tt = d.opciones[i].habitaciones[hj].tarifas[tk];
                                      tt.venta = v === "" ? null : v;
                                      /* si el vendedor escribe la venta, el factor pasa a contar la relación real */
                                      if (Number(tt.neto) > 0 && Number(v) > 0)
                                        tt.factor = Math.round((Number(tt.neto) / Number(v)) * 100) / 100; }); }} />
                              </div>
                              <div style={{ width:78 }}>
                                {L("Factor", Number(t.factor ?? 0.88) > 0
                                  ? `${Math.round((1 - Number(t.factor ?? 0.88)) * 100)}%` : null)}
                                <input className="in mono" type="number" step="0.01" min="0.5" max="1"
                                  style={{ height:32, textAlign:"right" }} value={t.factor ?? 0.88}
                                  title="Neto ÷ factor = venta. 0,88 es el 12% mínimo."
                                  onChange={(e) => { const v = e.target.value;
                                    set((d) => { const tt = d.opciones[i].habitaciones[hj].tarifas[tk];
                                      tt.factor = v; tt.venta = null; }); }} />
                              </div>
                              <button className="btn btn-g btn-ico" style={{ width:32, height:32 }} title="Quitar tarifa"
                                disabled={(hab.tarifas || []).length <= 1}
                                onClick={() => set((d) => { d.opciones[i].habitaciones[hj].tarifas.splice(tk, 1); })}>
                                <Trash2 size={12} /></button>
                            </div>
                          );
                        })}
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Btn size="xs" onClick={() => set((d) => {
                            const ts = d.opciones[i].habitaciones[hj].tarifas;
                            ts.push(tarifaNueva(tipoSiguiente(ts.length), factorDefault)); })}>
                            <Plus size={11} /> Tarifa</Btn>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Btn size="xs" data-agregar-hab={i}
                    title="Agrega la habitación acá y en las demás opciones que todavía no la tengan — los precios se cargan por hotel"
                    onClick={() => agregarHabitacion(i)}>
                    <Plus size={11} /> Agregar habitación</Btn>
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
    const s = norm(q);
    return acciones.filter((a) => norm(a.label).includes(s) || norm(a.grupo || "").includes(s));
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
  BannerPasajero, HojaAtajos, ATAJOS, enterAvanza,
};
