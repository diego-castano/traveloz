"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plane, Building2, User, MessageSquare, FileText, Copy, Plus, Send, ArrowLeft, Command, Zap, X,
  Smartphone, LayoutGrid, Loader2, CheckCheck, Lock, Gauge, Ticket, Files, Monitor, StickyNote,
  ListChecks
} from "lucide-react";
import { CSS } from "./_mockup/styles";
import {
  MESES, ANIO_BASE, PLANTILLAS, VENDEDORES, uid, toISO, addDays, venta, norm, ESTADOS
} from "./_mockup/data";
import { Btn, Pill, Toasts } from "./_mockup/ui";
import { SalidaPasajero } from "./_mockup/telefono";
import {
  BloqueCliente, BloqueEncabezado, BloqueAlojamiento, BloqueMensaje, BloqueVuelos, BloqueServicios,
  BloqueNotas, BloqueNotasCliente, BannerIA, Paleta
} from "./_mockup/editor";
import { Inicio } from "./_mockup/inicio";
import { ModalCompartir } from "./_mockup/compartir";

/* ═══════════════════════════════════════════════════════════════════════════
   COTIZADOR — Mockup funcional
   Latitud Nómade · TravelOz + Destínico

   Tokens tomados de tailwind.config.ts (backend) y site.css (sitio público):
     · Gradiente de marca TravelOz  #F43E55 → #785AE5
     · Acción primaria (clay teal)  #45D4C0 → #2A9E8E
     · Tinta                        #1A1A2E / #111124
     · Página / Card                #F5F6FA / #FFFFFF
     · Hairline                     rgba(17,17,36,0.07)
     · Tipografías                  Playfair Display · DM Sans · JetBrains Mono

   Sin base de datos. Todo el estado vive en memoria.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE RAÍZ
   ═══════════════════════════════════════════════════════════════════════════ */

let CORRELATIVO = 148;
function cotizacionVacia() {
  return {
    numero: `COT-2026-${String(CORRELATIVO++).padStart(4, "0")}`,
    estado: "borrador",
    origen: null,
    ia: null,                 /* v2 · lo que la IA leyó de la consulta de WhatsApp */
    cliente: { nombre:"", apellido:"", email:"", telefono:"" },
    titulo: { destino:"", mes:null, anio:ANIO_BASE },
    fechaSalida: "",
    mensaje: "",
    mensajeHtml: "",
    pnrRaw: "",
    vuelos: [],
    destinos: [],
    servicios: [],
    notas: [],
    notasCliente: [],
    vigencia: 48,
    opciones: [],
  };
}

function desdePaquete(p) {
  const q = cotizacionVacia();
  q.origen = p.nombre;
  q.titulo = { destino:p.destinos[0].ciudad, mes:p.mes, anio:p.anio };
  const hoy = new Date(); const salida = new Date(p.anio, p.mes, 15);
  q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
  q.destinos = p.destinos.map((d) => ({ id:uid("dst"), ciudad:d.ciudad, noches:d.noches, checkinManual:null }));
  q.servicios = p.servicios.map((s) => ({ id:uid("srv"), categoria:s.cat, texto:s.texto,
    ciudad:s.ciudad ?? null, modalidad:s.modalidad ?? null }));
  q.opciones = p.opciones.map((o) => ({ id:uid("op"), nombre:o.nombre,
    hoteles:o.hoteles.map((h) => ({ hotelId:h, libre:"" })),
    habitacion:o.habitacion, regimen:o.regimen, neto:o.neto, factor:o.factor }));
  q.notas = [
    { id:uid("nt"), concepto:"Neto aéreo por pasajero", neto:Math.round(o0(p) * 0.42) },
    { id:uid("nt"), concepto:"Traslados", neto:64 },
    { id:uid("nt"), concepto:"Asistencia al viajero", neto:38 },
  ];
  q.notasCliente = [
    { id:uid("nc"), texto:"Pasaporte con vigencia mínima de 6 meses al momento del viaje." },
  ];
  return q;
}
function o0(p) { return p.opciones[0]?.neto || 900; }

function desdePlantilla(t) {
  const q = cotizacionVacia();
  q.origen = `Plantilla · ${t.nombre}`;
  q.titulo = { destino:t.destino, mes:null, anio:ANIO_BASE };
  q.destinos = [{ id:uid("dst"), ciudad:t.destino, noches:7, checkinManual:null }];
  const cat = t.destino === "Madrid" ? "Privado" : "Regular";
  q.servicios = [
    { id:uid("srv"), categoria:"aereo", texto:"Aéreo ida y vuelta con valija en bodega 23kg", ciudad:null, modalidad:null },
    { id:uid("srv"), categoria:"traslado", texto:"Traslado llegada y salida", ciudad:t.destino, modalidad:cat },
    { id:uid("srv"), categoria:"alojamiento", texto:"Alojamiento en base doble", ciudad:null, modalidad:null },
    { id:uid("srv"), categoria:"seguro", texto:"Asistencia al viajero cobertura premium", ciudad:null, modalidad:null },
  ];
  return q;
}

/* ── v2 · duplicar una fila del seguimiento (cliente y destino precargados) ── */
function desdeFila(r) {
  const q = cotizacionVacia();
  q.origen = `Duplicada de ${r.num}`;
  const [dest = "", resto = ""] = String(r.destino || "").split(",").map((x) => x.trim());
  const mes = MESES.findIndex((m) => norm(resto).startsWith(norm(m)));
  const anio = (resto.match(/(20\d{2})/) || [])[1];
  q.titulo = { destino:dest, mes: mes >= 0 ? mes : null, anio: anio ? Number(anio) : ANIO_BASE };
  const cli = String(r.cliente || "").trim();
  if (/^(familia|flia)\b/i.test(cli)) q.cliente.nombre = cli;
  else { const p = cli.split(/\s+/); q.cliente.nombre = p[0] || ""; q.cliente.apellido = p.slice(1).join(" "); }
  if (dest) q.destinos = [{ id:uid("dst"), ciudad:dest, noches:7, checkinManual:null }];
  if (q.titulo.mes != null) {
    const hoy = new Date(); const salida = new Date(q.titulo.anio, q.titulo.mes, 15);
    q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
  }
  return q;
}

/* ── v2 · borrador armado a partir de una consulta de WhatsApp ─────────── */
function desdeIA(det) {
  const q = det.paquete ? desdePaquete(det.paquete) : cotizacionVacia();
  if (det.mes != null) {
    q.titulo.mes = det.mes;
    q.titulo.anio = det.anio;
    const hoy = new Date(); const salida = new Date(det.anio, det.mes, 15);
    q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
  }
  if (!det.paquete && det.destino) {
    q.titulo.destino = det.destino;
    q.destinos = [{ id:uid("dst"), ciudad:det.destino, noches: det.noches || 7, checkinManual:null }];
  }
  if (det.cliente) q.cliente.nombre = det.cliente;
  q.ia = { consulta:det.texto, chips:det.chips, paquete: det.paquete ? det.paquete.nombre : null };
  return q;
}

export default function Cotizador() {
  const [pantalla, setPantalla] = useState("inicio");     // inicio | editor | listado
  const marca = "traveloz";
  const [vendedor, setVendedor] = useState("v1");
  const [q, setQ] = useState(cotizacionVacia);
  const [guardado, setGuardado] = useState("ok");          // ok | guardando
  const [toasts, setToasts] = useState([]);
  const [paleta, setPaleta] = useState(false);
  const [compartir, setCompartir] = useState(false);
  const [prev, setPrev] = useState(null);                  // overlay de vista previa: null | "cel" | "tab" | "desk" 
  const [plantillas, setPlantillas] = useState(PLANTILLAS);
  const [homeTab, setHomeTab] = useState("cotizar");
  const pantallaRef = useRef("inicio");
  const [crono, setCrono] = useState(0);
  const [activo, setActivo] = useState("b-cliente");
  const primerCampo = useRef(null);
  const scroller = useRef(null);
  const timerRef = useRef(null);
  const phoneScroll = useRef(null);

  /* mutación inmutable simple */
  const set = useCallback((fn) => {
    setQ((prev) => { const d = JSON.parse(JSON.stringify(prev)); fn(d); return d; });
    setGuardado("guardando");
  }, []);

  /* autosave simulado */
  useEffect(() => {
    if (guardado !== "guardando") return;
    const t = setTimeout(() => setGuardado("ok"), 620);
    return () => clearTimeout(t);
  }, [guardado, q]);

  /* cronómetro */
  useEffect(() => {
    if (pantalla !== "editor") return;
    timerRef.current = setInterval(() => setCrono((c) => c + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [pantalla]);

  /* atajos globales */
  useEffect(() => { pantallaRef.current = pantalla; }, [pantalla]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaleta((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && pantallaRef.current === "editor") {
        e.preventDefault(); setCompartir(true); }
    };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);

  const toast = useCallback((t) => {
    const id = uid("ts");
    setToasts((l) => [...l, { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), t.undo ? 5200 : 2800);
  }, []);

  /* ── propagación de fechas ─────────────────────────────────────────── */
  const tramos = useMemo(() => {
    let acum = 0;
    return q.destinos.map((d) => {
      const auto = q.fechaSalida ? addDays(q.fechaSalida, acum) : "";
      const checkin = d.checkinManual || auto;
      const out = { id:d.id, ciudad:d.ciudad, noches:d.noches,
        checkin, checkout: checkin ? addDays(checkin, d.noches) : "",
        manual: !!d.checkinManual && d.checkinManual !== auto };
      acum += d.noches; return out;
    });
  }, [q.destinos, q.fechaSalida]);

  const hayManual = tramos.some((t) => t.manual);
  const repropagar = () => { set((d) => { d.destinos.forEach((x) => { x.checkinManual = null; }); });
    toast({ msg:"Fechas actualizadas desde la salida", tone:"ok" }); };

  /* ── progreso por bloque ───────────────────────────────────────────── */
  const bloques = [
    { id:"b-cliente",    l:"Cliente",     Icon:User,        ok: !!(q.cliente.nombre || q.cliente.email) },
    { id:"b-encabezado", l:"Encabezado",  Icon:FileText,    ok: !!(q.titulo.destino && q.titulo.mes != null && q.fechaSalida) },
    { id:"b-alojamiento", l:"Alojamiento", Icon:Building2,  ok: q.destinos.length > 0 && q.opciones.length > 0 },
    { id:"b-mensaje",    l:"Mensaje",     Icon:MessageSquare, ok: !!q.mensaje },
    { id:"b-vuelos",     l:"Vuelos",      Icon:Plane,       ok: q.vuelos.length > 0 },
    { id:"b-servicios",  l:"Servicios",   Icon:LayoutGrid,  ok: q.servicios.length > 0 },
    { id:"b-notas",      l:"Notas internas", Icon:Lock,     ok: q.notas.length > 0 },
    { id:"b-notascliente", l:"Notas pasajero", Icon:StickyNote, ok: q.notasCliente.length > 0 },
  ];
  const listos = bloques.filter((b) => b.ok).length;

  const irA = (id) => {
    setActivo(id);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  /* observer para el rail */
  useEffect(() => {
    if (pantalla !== "editor") return;
    const obs = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActivo(vis[0].target.id);
    }, { rootMargin:"-70px 0px -55% 0px", threshold:0 });
    bloques.forEach((b) => { const el = document.getElementById(b.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [pantalla, q.destinos.length]);

  const abrir = (nueva) => {
    setQ(nueva); setCrono(0); setPantalla("editor"); setActivo("b-cliente");
    requestAnimationFrame(() => window.scrollTo({ top:0, behavior:"instant" }));
  };

  const acciones = [
    ...bloques.map((b) => ({ label:`Ir a ${b.l}`, grupo:"bloque", Icon:b.Icon, run:() => irA(b.id) })),
    { label:"Nueva opción hotelera", grupo:"acción", Icon:Plus, run:() => { set((d) => { d.opciones.push({ id:uid("op"),
        nombre:`Opción ${d.opciones.length + 1}`, hoteles:d.destinos.map(() => ({ hotelId:null, libre:"" })),
        habitacion:"Doble estándar", regimen:"Desayuno", neto:0, factor:0.88 }); }); irA("b-alojamiento"); } },
    { label:"Compartir cotización", grupo:"acción", Icon:Send, run:() => setCompartir(true) },
    { label:"Duplicar esta cotización", grupo:"acción", Icon:Copy, run:() => {
        const c = JSON.parse(JSON.stringify(q)); c.numero = `COT-2026-${String(CORRELATIVO++).padStart(4,"0")}`;
        c.estado = "borrador"; abrir(c); toast({ msg:"Cotización duplicada — cambiá las fechas y listo", tone:"ok" }); } },
    { label:"Ver cotizaciones", grupo:"ir", Icon:ListChecks, run:() => { setHomeTab("cotizar"); setPantalla("inicio"); } },
    { label:"Volver al inicio", grupo:"ir", Icon:ArrowLeft, run:() => setPantalla("inicio") },
  ];

  const actualEnListado = (q.titulo.destino || q.cliente.nombre || q.opciones.length) ? {
    num:q.numero, cliente:[q.cliente.nombre, q.cliente.apellido].filter(Boolean).join(" ") || "Sin cliente",
    destino:`${q.titulo.destino || "Sin destino"}${q.titulo.mes != null ? `, ${MESES[q.titulo.mes]} ${q.titulo.anio}` : ""}`,
    vendedor, estado:q.estado, monto: q.opciones.length ? Math.round(venta(q.opciones[0].neto, q.opciones[0].factor)) : 0,
    dias:0, aperturas: q.estado === "abierta" ? 1 : 0,
  } : null;

  const G = ["#F43E55","#785AE5"];
  const mm = String(Math.floor(crono / 60)); const ss = String(crono % 60).padStart(2, "0");
  const meta = q.origen ? 60 : 240;

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <div className="ctz" data-brand={marca} style={{ minHeight:"100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {pantalla === "inicio" && (
        <Inicio
          onPaquete={(p) => abrir(desdePaquete(p))}
          onBlanco={() => abrir(cotizacionVacia())}
          onPlantilla={(t) => abrir(desdePlantilla(t))}
          onIA={(det) => {
            abrir(desdeIA(det));
            toast({ msg: det.paquete
              ? `Borrador armado desde “${det.paquete.nombre}” — revisalo y ajustá`
              : "No encontré un paquete que coincida — la armé en blanco con lo que entendí", tone: det.paquete ? "ok" : "warn" });
          }}
          onFila={(r) => {
            abrir(desdeFila(r));
            toast({ msg:`Duplicada desde ${r.num} — cambiá las fechas y listo`, tone:"ok" });
          }}
          toast={toast}
          tab={homeTab} setTab={setHomeTab}
          actual={actualEnListado}
          plantillas={plantillas}
          onCrearPlantilla={(nombre, destino) => {
            setPlantillas((l) => [...l, { id:uid("pl"), nombre, destino, detalle:"Creada a mano — sin servicios aún", usos:0, ultimo:"recién creada" }]);
            toast({ msg:`Plantilla “${nombre}” creada`, tone:"ok" });
          }}
          onDuplicarPlantilla={(t) => {
            setPlantillas((l) => [...l, { ...t, id:uid("pl"), nombre:t.nombre + " (copia)", usos:0, ultimo:"recién creada" }]);
            toast({ msg:`Plantilla duplicada`, tone:"ok" });
          }}
          onBorrarPlantilla={(t) => {
            setPlantillas((l) => l.filter((x) => x.id !== t.id));
            toast({ msg:`Plantilla “${t.nombre}” eliminada`, tone:"warn",
              undo:() => setPlantillas((l) => [...l, t]) });
          }} />
      )}

      {pantalla === "editor" && (
        <>
          {/* ── barra superior ────────────────────────────────────────── */}
          <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(245,246,250,.86)",
            backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", borderBottom:"1px solid var(--hair-soft)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 18px", maxWidth:1460, margin:"0 auto" }}>
              <button className="btn btn-g btn-ico" onClick={() => setPantalla("inicio")}><ArrowLeft size={16} /></button>
              <div style={{ width:30, height:30, borderRadius:10, background:`linear-gradient(87deg,${G[0]},${G[1]})`,
                display:"grid", placeItems:"center", color:"#fff", flexShrink:0 }}><Ticket size={15} /></div>
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span className="mono" style={{ fontSize:12, fontWeight:500 }}>{q.numero}</span>
                  <Pill tone={ESTADOS[q.estado].tone}>{ESTADOS[q.estado].l}</Pill>
                </div>
                {q.origen && <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden",
                  textOverflow:"ellipsis", maxWidth:220 }}>desde {q.origen}</div>}
              </div>

              {/* cronómetro */}
              <div className="mono" title="Tiempo de armado" style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8,
                padding:"5px 10px", borderRadius:9, background:"rgba(17,17,36,.04)", fontSize:11.5,
                color: crono > meta ? "var(--coral)" : "var(--n500)" }}>
                <Gauge size={12} /> {mm}:{ss}
                <span style={{ opacity:.5 }}>/ meta {meta === 60 ? "1:00" : "4:00"}</span>
              </div>

              <div style={{ flex:1 }} />

              {/* autosave */}
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:"var(--n400)" }}>
                {guardado === "guardando"
                  ? <><Loader2 size={12} className="spin" /> Guardando…</>
                  : <><CheckCheck size={12} style={{ color:"var(--teal-2)" }} /> Guardado</>}
              </div>

              <select className="in" style={{ width:150, height:34, fontSize:12 }} value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}>
                {VENDEDORES.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>

              <button className="btn btn-s btn-sm" onClick={() => setPaleta(true)} title="Paleta de comandos">
                <Command size={13} /><span className="kbd" style={{ marginLeft:-2 }}>K</span>
              </button>
              <Btn className="only-wide" onClick={() => setPrev("cel")} size="sm"><Smartphone size={13} /> Vista previa</Btn>
              <Btn variant="p" size="sm" onClick={() => setCompartir(true)}><Send size={13} /> Compartir</Btn>
            </div>
          </header>

          {/* ── cuerpo: rail · formulario · teléfono ──────────────────── */}
          <div style={{ display:"flex", gap:20, maxWidth:1460, margin:"0 auto", padding:"18px 18px 60px", alignItems:"flex-start" }}>

            {/* rail */}
            <aside className="rail-col" style={{ width:172, flexShrink:0, position:"sticky", top:74 }}>
              <div className="card" style={{ padding:9 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"3px 7px 8px" }}>
                  <span className="lbl">Bloques</span>
                  <span className="mono" style={{ fontSize:10.5, color:"var(--n400)" }}>{listos}/{bloques.length}</span>
                </div>
                <div style={{ height:3, borderRadius:9, background:"rgba(17,17,36,.06)", margin:"0 7px 9px", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:9, width:`${(listos / bloques.length) * 100}%`,
                    background:"linear-gradient(90deg,#45D4C0,#2A9E8E)", transition:"width .5s cubic-bezier(.2,.8,.2,1)" }} />
                </div>
                {bloques.map((b) => (
                  <button key={b.id} className="rail-i" data-on={activo === b.id ? "1" : "0"} onClick={() => irA(b.id)}>
                    <span className="rail-dot" data-ok={b.ok ? "1" : "0"} />
                    <b.Icon size={13} style={{ opacity:.75, flexShrink:0 }} />
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.l}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding:"11px 9px 0", fontSize:10.5, color:"var(--n300)", lineHeight:1.5 }}>
                Un solo scroll. El rail es para saltar, no un asistente por pasos.
              </div>
            </aside>

            {/* formulario */}
            <main ref={scroller} style={{ flex:1, minWidth:0 }}>
              {q.ia && <BannerIA ia={q.ia} />}

              {q.origen && !q.ia && (
                <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", marginBottom:14,
                  borderRadius:14, background:"linear-gradient(90deg,rgba(59,191,173,.11),rgba(120,90,229,.07))",
                  border:"1px solid rgba(59,191,173,.24)" }}>
                  <Zap size={15} style={{ color:"var(--teal-2)", flexShrink:0 }} />
                  <div style={{ fontSize:12.5, flex:1 }}>
                    Precargado desde <strong>{q.origen}</strong> — destinos, noches, servicios, opciones y fotos.
                    <span style={{ color:"var(--n400)" }}> Todo editable.</span>
                  </div>
                </div>
              )}

              <BloqueCliente q={q} set={set} refEl={primerCampo} />
              <BloqueEncabezado q={q} set={set} tramos={tramos} hayManual={hayManual} onRepropagar={repropagar} />
              <BloqueAlojamiento q={q} set={set} tramos={tramos} toast={toast} />
              <BloqueMensaje q={q} set={set} toast={toast} />
              <BloqueVuelos q={q} set={set} toast={toast} />
              <BloqueServicios q={q} set={set} toast={toast} />
              <BloqueNotas q={q} set={set} toast={toast} />
              <BloqueNotasCliente q={q} set={set} toast={toast} />

              <div style={{ display:"flex", gap:9, marginTop:18, flexWrap:"wrap" }}>
                <Btn variant="p" style={{ height:44, paddingInline:22 }} onClick={() => setCompartir(true)}>
                  <Send size={15} /> Compartir cotización
                </Btn>
                <Btn style={{ height:44 }} onClick={() => { const c = JSON.parse(JSON.stringify(q));
                  c.numero = `COT-2026-${String(CORRELATIVO++).padStart(4,"0")}`; c.estado = "borrador"; abrir(c);
                  toast({ msg:"Cotización duplicada — cambiá las fechas y listo", tone:"ok" }); }}>
                  <Copy size={15} /> Duplicar cotización
                </Btn>
                <Btn style={{ height:44 }} onClick={() => {
                  const nombre = q.titulo.destino ? `${q.titulo.destino} · plantilla` : "Plantilla sin nombre";
                  setPlantillas((l) => [...l, { id:uid("pl"), nombre, destino:q.titulo.destino || "General",
                    detalle:`${q.servicios.length} servicios · ${q.opciones.length} opciones` }]);
                  toast({ msg:`Guardada como plantilla “${nombre}”`, tone:"ok" });
                }}><Files size={15} /> Guardar como plantilla</Btn>
                <Btn variant="v" style={{ height:44 }} onClick={() => { setHomeTab("cotizar"); setPantalla("inicio"); }}>
                  <ListChecks size={15} /> Cotizaciones</Btn>
              </div>
            </main>

            {/* teléfono */}
            <aside className="phone-col" style={{ width:336, flexShrink:0, position:"sticky", top:74 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10, paddingLeft:4 }}>
                <span className="lbl" style={{ whiteSpace:"nowrap" }}>Lo que ve el pasajero</span>
                <span title="Las notas internas no aparecen acá" style={{ display:"grid", placeItems:"center",
                  width:20, height:20, borderRadius:7, background:"rgba(244,62,85,.1)", color:"#CC2030" }}>
                  <Lock size={10} /></span>
                <div style={{ marginLeft:"auto", display:"flex", gap:3, padding:3, background:"rgba(17,17,36,.05)", borderRadius:9 }}>
                  <button title="Vista celular" style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center",
                    background:"#fff", color:"var(--ink)", boxShadow:"0 1px 3px rgba(26,26,46,.12)" }}>
                    <Smartphone size={12} /></button>
                  <button title="Ver en tablet" onClick={() => setPrev("tab")}
                    style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center", color:"var(--n400)" }}>
                    <Smartphone size={14} style={{ transform:"rotate(90deg)" }} /></button>
                  <button title="Ver en escritorio" onClick={() => setPrev("desk")}
                    style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center", color:"var(--n400)" }}>
                    <Monitor size={12} /></button>
                </div>
              </div>
              <div className="phone">
                <div className="phone-scr" ref={phoneScroll}>
                  <div className="notch" />
                  <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos}
                    foco={activo} scrollRef={phoneScroll} />
                </div>
              </div>
              <div style={{ fontSize:10.5, color:"var(--n300)", textAlign:"center", marginTop:9, lineHeight:1.5 }}>
                Se actualiza mientras armás y sigue al bloque que editás.
                Las notas internas nunca aparecen acá.
              </div>
            </aside>
          </div>

          {/* vista previa unificada: celular · tablet · escritorio */}
          {prev && (
            <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && setPrev(null)}>
              <div className="a-zoom" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, maxWidth:"96vw" }}>

                {/* selector de formato */}
                <div style={{ display:"flex", gap:4, padding:4, borderRadius:13,
                  background:"rgba(255,255,255,.12)", backdropFilter:"blur(8px)" }}>
                  {[["cel","Celular",Smartphone],["tab","Tablet",null],["desk","Escritorio",Monitor]].map(([k, l, I]) => (
                    <button key={k} onClick={() => setPrev(k)}
                      style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10,
                        fontSize:13, fontWeight:700, transition:"all .18s",
                        background: prev === k ? "#fff" : "transparent",
                        color: prev === k ? "var(--ink)" : "rgba(255,255,255,.75)",
                        boxShadow: prev === k ? "0 4px 14px rgba(0,0,0,.25)" : "none" }}>
                      {I ? <I size={13} /> : <Smartphone size={15} style={{ transform:"rotate(90deg)" }} />}
                      {l}
                    </button>
                  ))}
                </div>

                {/* celular */}
                {prev === "cel" && (
                  <div className="phone a-zoom" key="cel">
                    <div className="phone-scr">
                      <div className="notch" />
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} />
                    </div>
                  </div>
                )}

                {/* tablet */}
                {prev === "tab" && (
                  <div className="a-zoom" key="tab" style={{ width:"min(700px,94vw)", borderRadius:30, padding:12,
                    background:"linear-gradient(160deg,#2A2A45,#14142A)",
                    boxShadow:"0 34px 80px -24px rgba(17,17,36,.55), 0 0 0 1px rgba(255,255,255,.06) inset" }}>
                    <div style={{ borderRadius:20, overflow:"hidden", background:"#fff", height:"min(540px,66vh)", overflowY:"auto" }}>
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} modo="desk" />
                    </div>
                  </div>
                )}

                {/* escritorio */}
                {prev === "desk" && (
                  <div className="browser a-zoom" key="desk" style={{ width:"min(940px,96vw)" }}>
                    <div className="browser-bar">
                      <span className="browser-dot" style={{ background:"#F25C54" }} />
                      <span className="browser-dot" style={{ background:"#F7B267" }} />
                      <span className="browser-dot" style={{ background:"#45D4C0" }} />
                      <div className="browser-url">
                        <Lock size={10} style={{ color:"var(--teal-2)" }} />
                        traveloz.com.uy/c/{q.numero.toLowerCase()}
                      </div>
                    </div>
                    <div style={{ height:"min(560px,66vh)", overflowY:"auto" }}>
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} modo="desk" />
                    </div>
                  </div>
                )}

                <Btn onClick={() => setPrev(null)} style={{ background:"rgba(255,255,255,.92)" }}>
                  <X size={14} /> Cerrar vista previa</Btn>
              </div>
            </div>
          )}
        </>
      )}

      {compartir && (
        <ModalCompartir q={q} marca={marca} toast={toast} onClose={() => setCompartir(false)}
          onVigencia={(h) => set((d) => { d.vigencia = h; })}
          onEnviada={() => set((d) => { d.estado = "enviada"; })} />
      )}
      {paleta && <Paleta acciones={acciones} onClose={() => setPaleta(false)} />}

      <Toasts items={toasts} onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))}
        onUndo={(t) => { t.undo?.(); setToasts((l) => l.filter((x) => x.id !== t.id)); }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width:1320px){ .ctz .phone-col{ display:none } }
        @media (min-width:1321px){ .ctz .only-wide{ display:none } }
        @media (max-width:900px){ .ctz .rail-col{ display:none } }
      `}} />
    </div>
  );
}
