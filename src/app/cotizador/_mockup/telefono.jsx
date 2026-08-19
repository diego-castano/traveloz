"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plane, MapPin, Calendar, ChevronDown, Bed, Smartphone, CheckCheck, Utensils, Link2, Clock
} from "lucide-react";
import {
  MESES, MES_AB, ANIO_BASE, AEROPUERTOS, AEROPUERTOS_NOMBRE, VENDEDORES, hotelById,
  fmtCorto, fmtLargo, money, precioOpcion, ventaTarifa, etiquetaTarifa, renderPlantilla, fotoBg
} from "./data";
import { Foto, CATS, Estrellas, Wordmark } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════════
   SALIDA AL PASAJERO  ·  mobile-first
   Lo que se comparte por WhatsApp. Las notas internas NUNCA llegan acá.
   ═══════════════════════════════════════════════════════════════════════════ */

function SalidaPasajero({ q, marca, vendedor, tramos, foco, scrollRef, modo = "cel" }) {
  const anclas = useRef({});
  useEffect(() => {
    const cont = scrollRef?.current; if (!cont || !foco) return;
    const el = anclas.current[foco];
    const top = el ? Math.max(0, el.offsetTop - 12) : 0;
    cont.scrollTo({ top, behavior:"smooth" });
  }, [foco, scrollRef]);

  const [abierta, setAbierta] = useState(q.opciones[0]?.id || null);
  const [confirmada, setConfirmada] = useState(null);
  const [revision, setRevision] = useState(null);
  useEffect(() => {
    if (!q.opciones.length) { setAbierta(null); return; }
    if (!q.opciones.some((o) => o.id === abierta)) setAbierta(q.opciones[0].id);
  }, [q.opciones, abierta]);

  /* v2C · el pasajero cambia de opción desde el switcher (solo vista, no toca el editor) */
  const [sel, setSel] = useState(q.opciones[0]?.id || null);
  useEffect(() => {
    if (!q.opciones.length) { setSel(null); return; }
    if (!q.opciones.some((o) => o.id === sel)) setSel(q.opciones[0].id);
  }, [q.opciones, sel]);

  const impresion = modo === "print";   /* PDF: todas las opciones abiertas, sin botones */
  const desk = modo === "desk" || impresion;
  const G = { a:"#F43E55", b:"#785AE5", web:"traveloz.com.uy" };
  const grad = `linear-gradient(87deg, ${G.a} 0%, ${G.b} 100%)`;
  const titulo = [q.titulo.destino || "Destino", q.titulo.mes != null ? MESES[q.titulo.mes] : null, q.titulo.anio]
    .filter(Boolean).join(", ").replace(/, (\w+), (\d{4})$/, ", $1 $2");
  const V = VENDEDORES.find((v) => v.id === vendedor) || VENDEDORES[0];
  const totalNoches = tramos.reduce((a, t) => a + t.noches, 0);

  /* v2C · comparación: la opción 1 es la base, las demás muestran cuánto suben o bajan */
  const varias = q.opciones.length > 1;
  const base = q.opciones[0] ? Math.round(precioOpcion(q.opciones[0])) : 0;
  const elegida = q.opciones.find((o) => o.id === sel) || q.opciones[0];
  const visibles = !q.opciones.length ? [] : impresion ? q.opciones : varias ? [elegida] : q.opciones;

  /* escala: en escritorio todo un punto más grande */
  const fz = (cel, d) => desk ? d : cel;

  /* mensaje automático: texto ya resuelto ({nombre}/{link}), listo para partir en párrafos */
  const mensajeAutoTxt = useMemo(
    () => (q.mensajeAuto ? renderPlantilla(q.mensajeAuto, q.cliente.nombre, V.linkDatos) : ""),
    [q.mensajeAuto, q.cliente.nombre, V.linkDatos]
  );

  /* itinerario agrupado en trayectos (Ida / Vuelta / Tramo N) */
  const trayectos = useMemo(() => agruparTrayectos(q.vuelos), [q.vuelos]);
  /* el PNR trae día y mes pero no el año: lo saca de la fecha de salida cargada */
  const anioItinerario = useMemo(() => {
    const m = String(q.fechaSalida || "").match(/^(\d{4})/);
    return m ? Number(m[1]) : ANIO_BASE;
  }, [q.fechaSalida]);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"#1A1A2E", background:"#fff", minHeight:"100%" }}>

      {/* ── encabezado de marca ── */}
      <div style={{ background:grad, padding: desk ? "34px 40px 26px" : "36px 20px 22px", color:"#fff",
        position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:170, height:170, borderRadius:"50%", background:"rgba(255,255,255,.10)" }} />
        <div style={{ position:"absolute", right:30, bottom:-56, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,.07)" }} />
        <div style={{ maxWidth: desk ? 660 : "none", margin:"0 auto", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", marginBottom:desk ? 20 : 16 }}>
            <div style={{ background:"rgba(255,255,255,.94)", borderRadius:10, padding:"6px 12px",
              boxShadow:"0 4px 14px rgba(0,0,0,.14)" }}>
              <Wordmark size={fz(17, 20)} />
            </div>
            <div className="mono" style={{ marginLeft:"auto", fontSize:fz(10, 11), opacity:.8 }}>{q.numero}</div>
          </div>
          <div className="disp" style={{ fontSize:fz(27, 34), fontWeight:600, lineHeight:1.14, letterSpacing:"-.02em" }}>
            {titulo}
          </div>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:13 }}>
            {q.fechaSalida && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:fz(11.5, 12.5),
                background:"rgba(255,255,255,.22)", padding:"6px 12px", borderRadius:999, backdropFilter:"blur(6px)", fontWeight:600 }}>
                <Calendar size={fz(11, 12)} /> {fmtLargo(q.fechaSalida)}
              </span>
            )}
            {totalNoches > 0 && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:fz(11.5, 12.5),
                background:"rgba(255,255,255,.22)", padding:"6px 12px", borderRadius:999, fontWeight:600 }}>
                <Bed size={fz(11, 12)} /> {totalNoches} noches
              </span>
            )}
            {tramos.map((t) => (
              <span key={t.id} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:fz(11.5, 12.5),
                background:"rgba(0,0,0,.18)", padding:"6px 12px", borderRadius:999 }}>
                {t.ciudad} · {t.noches}n
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: desk ? "26px 40px 34px" : "20px 20px 28px", maxWidth: desk ? 740 : "none", margin:"0 auto" }}>

        {/* saludo — mensaje automático de la cotización, o el fallback fijo si no hay plantilla */}
        {mensajeAutoTxt ? (
          <div style={{ margin:"0 0 18px" }}>
            {mensajeAutoTxt.split("\n\n").map((parrafo, pi) => (
              <div key={pi} style={{ margin: pi === 0 ? "0 0 6px" : "0 0 8px" }}>
                {parrafo.split("\n").map((linea, li) => {
                  const t = linea.trim();
                  const esLink = !!t && (t.includes("datos-pasajeros")
                    || /^https?:\/\//i.test(t)
                    || (V.linkDatos && t.includes(V.linkDatos)));
                  if (esLink) {
                    const href = /^https?:\/\//i.test(t) ? t : `https://${t}`;
                    return (
                      <a key={li} href={href} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:2,
                          fontSize:fz(13, 14), fontWeight:700, color:G.b, textDecoration:"underline",
                          textUnderlineOffset:3, overflowWrap:"anywhere", wordBreak:"break-word" }}>
                        <Link2 size={13} style={{ flexShrink:0 }} /> {t}
                      </a>
                    );
                  }
                  const primera = pi === 0 && li === 0;
                  return (
                    <p key={li} style={{ fontSize: primera ? fz(14.5, 15.5) : fz(13.5, 14.5),
                      lineHeight:1.65, margin:0, fontWeight: primera ? 600 : 400,
                      color: primera ? "#1A1A2E" : "#3D4066" }}>
                      {t}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <>
            <p style={{ fontSize:fz(14.5, 15.5), lineHeight:1.65, margin:"0 0 6px", fontWeight:600 }}>
              Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""} 👋
            </p>
            <p style={{ fontSize:fz(13.5, 14.5), lineHeight:1.65, margin:"0 0 18px", color:"#3D4066" }}>
              De acuerdo a lo conversado, te comparto la cotización de tu viaje.
            </p>
          </>
        )}

        {q.mensaje && (
          <div style={{ fontSize:fz(13.5, 14), lineHeight:1.7, margin:"0 0 20px", color:"#3D4066",
            padding:"12px 14px", background:"#F5F6FA", borderRadius:12,
            borderLeft:`3px solid ${G.b}` }}
            dangerouslySetInnerHTML={{ __html: q.mensajeHtml || q.mensaje }} />
        )}

        {/* incluye */}
        {q.servicios.length > 0 && !q.soloVuelos && (
          <div ref={(el) => { anclas.current["b-servicios"] = el; }}>
            <SecTitulo texto="Tu viaje incluye" color={G.b} />
            <div style={{ display:"grid", gridTemplateColumns: desk ? "1fr 1fr" : "1fr", gap:"9px 18px", marginBottom:24 }}>
              {q.servicios.map((sv) => {
                const C = CATS.find((c) => c.id === sv.categoria) || CATS[0];
                return (
                  <div key={sv.id} style={{ display:"flex", gap:11, alignItems:"flex-start" }}>
                    <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, display:"grid", placeItems:"center",
                      background:`${G.b}12`, color:G.b }}><C.Icon size={14} /></div>
                    <div style={{ fontSize:fz(13, 13.5), lineHeight:1.5, paddingTop:5, fontWeight:500 }}>
                      {sv.texto}
                      {(sv.ciudad || sv.modalidad) && (
                        <div style={{ fontSize:fz(11, 11.5), color:"#8A8DB5", fontWeight:400 }}>
                          {[sv.ciudad, sv.modalidad].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* itinerario — tarjetas por trayecto (Ida / Vuelta / Tramo N) */}
        {q.vuelos.length > 0 && (
          <div ref={(el) => { anclas.current["b-vuelos"] = el; }}>
            <SecTitulo texto="Itinerario de vuelos" color={G.b} />
            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom: q.soloVuelos ? 14 : 24 }}>
              {trayectos.map((seg, ti) => {
                const primero = seg[0];
                const etiqueta = ti === 0 ? "Ida" : ti === 1 ? "Vuelta" : `Tramo ${ti + 1}`;
                return (
                  <div key={ti} style={{ borderRadius:18, background:"#fff", overflow:"hidden",
                    border:"1px solid rgba(17,17,36,.08)", breakInside:"avoid",
                    boxShadow:"0 1px 3px rgba(17,17,36,.06), 0 10px 26px -14px rgba(17,17,36,.22)" }}>

                    {/* cabecera del trayecto: pill de marca + fecha */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      gap:10, flexWrap:"wrap", padding:"14px 16px 0" }}>
                      <span style={{ background:grad, color:"#fff", padding:"5px 11px", borderRadius:999,
                        fontSize:fz(10, 10.5), fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" }}>
                        {etiqueta}
                      </span>
                      <span style={{ fontSize:fz(12.5, 13), fontWeight:600, color:"#6B6F99" }}>
                        {fechaTrayecto(primero, anioItinerario)}
                      </span>
                    </div>

                    {seg.map((s, si) => {
                      const escala = si < seg.length - 1 ? escalaTexto(s.llegada, seg[si + 1].salida) : null;
                      const cruzaMedianoche = String(s.llegada) < String(s.salida);
                      return (
                        <div key={s.id}>
                          <div style={{ padding:"14px 16px 16px",
                            borderTop: si > 0 ? "1px solid rgba(17,17,36,.07)" : "none" }}>

                            {/* aerolínea y número de vuelo */}
                            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:13 }}>
                              <span style={{ width:26, height:26, borderRadius:8, background:grad,
                                display:"grid", placeItems:"center", flexShrink:0 }}>
                                <Plane size={13} color="#fff" />
                              </span>
                              <span style={{ fontSize:fz(13.5, 14.5), fontWeight:700 }}>{s.aerolinea}</span>
                              <span style={{ fontSize:fz(13.5, 14.5), fontWeight:500, color:"#6B6F99" }}>
                                · {s.cia} {s.nro}
                              </span>
                            </div>

                            {/* ruta vertical: sale arriba, llega abajo */}
                            <div style={{ display:"flex", gap:11 }}>
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                                width:11, flexShrink:0, paddingTop:5 }}>
                                <span style={{ width:9, height:9, borderRadius:"50%", background:G.b, flexShrink:0 }} />
                                <span style={{ width:2, flex:1, minHeight:34, margin:"4px 0", borderRadius:2,
                                  background:`linear-gradient(180deg, ${G.b} 0%, ${G.a} 100%)` }} />
                                <span style={{ width:9, height:9, borderRadius:"50%", background:G.a, flexShrink:0 }} />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <PuntoRuta cod={s.origen} hora={s.salida} fz={fz} />
                                <div style={{ marginTop:26 }}>
                                  <PuntoRuta cod={s.destino} hora={s.llegada} fz={fz}
                                    plus={cruzaMedianoche} coral={G.a} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* espera entre tramos */}
                          {escala && (
                            <div style={{ display:"flex", alignItems:"center", gap:9, margin:"0 16px 15px",
                              padding:"9px 13px", background:"#FBF3E6", border:"1px dashed #E3C892",
                              borderRadius:12 }}>
                              <Clock size={15} style={{ color:"#B8863A", flexShrink:0 }} />
                              <span style={{ fontSize:fz(12, 12.5), color:"#8A6423", fontWeight:600,
                                lineHeight:1.35, overflowWrap:"anywhere" }}>
                                Espera de <b style={{ fontWeight:800, color:"#B8863A" }}>{escala}</b>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* solo vuelos: precio final sin alojamiento */}
        {q.soloVuelos && (
          <div>
            <SecTitulo texto="Precio del vuelo" color={G.b} />
            <div style={{ borderRadius:13, background:"#FAFBFE", border:"1px solid rgba(17,17,36,.08)",
              marginBottom:24, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px" }}>
                <span style={{ fontSize:fz(12, 12.5), color:"#3D4066", fontWeight:600 }}>Por adulto</span>
                <span className="mono" style={{ fontSize:fz(14, 15), fontWeight:700, color:"#1A1A2E" }}>
                  {q.precioVuelo?.adulto ? money(q.precioVuelo.adulto) : "—"}
                </span>
              </div>
              {Number(q.precioVuelo?.menor) > 0 && (
                <>
                  <div style={{ borderBottom:"1px solid rgba(17,17,36,.07)", margin:"0 14px" }} />
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px" }}>
                    <span style={{ fontSize:fz(12, 12.5), color:"#3D4066", fontWeight:600 }}>Por menor</span>
                    <span className="mono" style={{ fontSize:fz(14, 15), fontWeight:700, color:"#1A1A2E" }}>
                      {money(q.precioVuelo.menor)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* opciones — cards verticales, foto protagonista */}
        {q.opciones.length > 0 && !q.soloVuelos && (
          <div ref={(el) => { anclas.current["b-alojamiento"] = el; }}>
            <SecTitulo texto="Opciones de alojamiento" color={G.b} />
            <div style={{ fontSize:fz(11.5, 12), color:"#8A8DB5", margin:"-4px 0 12px" }}>
              {impresion
                ? (varias ? "Las opciones cotizadas, una debajo de la otra." : "El detalle de hoteles y fechas.")
                : varias
                ? "Cambiá de opción para comparar precios, hoteles y régimen."
                : "Tocá la opción para ver el detalle de hoteles y fechas."}
            </div>

            {/* v2C · switcher del pasajero: precio de cada opción y diferencia contra la 1 */}
            {varias && !impresion && (
              <div className="opt-seg" data-desk={desk ? "1" : "0"}>
                {q.opciones.map((o, i) => {
                  const pv = precioOpcion(o);
                  return (
                    <button key={o.id} data-on={elegida?.id === o.id ? "1" : "0"}
                      onClick={() => { setSel(o.id); setAbierta(o.id); }}>
                      <span className="opt-n">{tabNombre(o, i)}</span>
                      <span className="opt-p">{money(pv)}</span>
                      {i > 0 && <span className="opt-d">{delta(pv, base)}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:24 }}>
              {visibles.map((o) => {
                const oi = q.opciones.indexOf(o);
                const on = impresion ? true : abierta === o.id;
                const pv = precioOpcion(o);
                const H0 = hotelById(o.hoteles?.[0]?.hotelId);
                const hab0 = o.habitaciones?.[0];
                const tarifa0 = hab0?.tarifas?.[0];
                const caption = tarifa0
                  ? `${etiquetaTarifa(tarifa0).toLowerCase()}${hab0.ocupacion ? ` · hab. ${String(hab0.ocupacion).toLowerCase()}` : ""}`
                  : "por adulto · base doble";
                return (
                  /* con switcher hay una sola card: la clave fija deja que el precio ruede al cambiar */
                  <div key={varias && !impresion ? "op-visible" : o.id} style={{ borderRadius:18, overflow:"hidden", background:"#fff",
                    border: on ? `1.5px solid ${G.b}55` : "1px solid rgba(17,17,36,.09)",
                    boxShadow: on ? `0 14px 34px -14px ${G.b}45` : "0 2px 6px rgba(17,17,36,.06)",
                    transition:"box-shadow .28s, border-color .28s, transform .28s" }}>

                    {/* foto full-width con overlay — o, si están apagadas, header compacto */}
                    <button onClick={() => !impresion && setAbierta(on ? null : o.id)}
                      style={{ width:"100%", textAlign:"left", display:"block", cursor: impresion ? "default" : "pointer" }}>
                      {q.fotosHotel ? (
                        <Foto seed={H0?.seed ?? oi} w="100%" h={fz(112, 150)} r={0}>
                          <span style={{ position:"absolute", top:10, left:10, display:"inline-flex", alignItems:"center",
                            gap:5, padding:"4px 11px", borderRadius:999, background:"rgba(255,255,255,.94)",
                            fontSize:fz(10.5, 11), fontWeight:800, color:"#1A1A2E",
                            boxShadow:"0 2px 8px rgba(0,0,0,.18)" }}>
                            <span style={{ width:15, height:15, borderRadius:99, background:grad, color:"#fff",
                              display:"grid", placeItems:"center", fontSize:9 }}>{oi + 1}</span>
                            {o.nombre}
                          </span>
                          <span style={{ position:"absolute", right:10, bottom:10, padding:"6px 13px", borderRadius:12,
                            background:"rgba(255,255,255,.96)", boxShadow:"0 4px 14px rgba(0,0,0,.2)", textAlign:"right" }}>
                            <span style={{ display:"block", fontSize:fz(15.5, 17), fontWeight:800, color:G.b,
                              letterSpacing:"-.025em", lineHeight:1.1 }}><Odometro valor={pv} /></span>
                            <span style={{ display:"block", fontSize:fz(8.5, 9), color:"#6B6F99", fontWeight:600 }}>{caption}</span>
                          </span>
                        </Foto>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                          background:"#fff", borderBottom:"1px solid rgba(17,17,36,.08)" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0, flex:1 }}>
                            <span style={{ width:20, height:20, borderRadius:99, background:grad, color:"#fff",
                              display:"grid", placeItems:"center", fontSize:10, fontWeight:800, flexShrink:0 }}>{oi + 1}</span>
                            <span style={{ fontSize:fz(12.5, 13), fontWeight:700, whiteSpace:"nowrap",
                              overflow:"hidden", textOverflow:"ellipsis" }}>{o.nombre}</span>
                          </span>
                          <span style={{ textAlign:"right", flexShrink:0 }}>
                            <span style={{ display:"block", fontSize:fz(15.5, 17), fontWeight:800, color:G.b,
                              letterSpacing:"-.025em", lineHeight:1.1 }}><Odometro valor={pv} /></span>
                            <span style={{ display:"block", fontSize:fz(8.5, 9), color:"#6B6F99", fontWeight:600 }}>{caption}</span>
                          </span>
                        </div>
                      )}

                      {/* resumen bajo la foto */}
                      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 14px" }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:fz(12.5, 13), fontWeight:700, whiteSpace:"nowrap",
                            overflow:"hidden", textOverflow:"ellipsis" }}>
                            {(tramos.length ? tramos : []).map((_, k) => o.hoteles?.[k])
                              .map((h) => h && (h.libre || hotelById(h.hotelId)?.nombre)).filter(Boolean).join("  +  ") || "Hoteles a definir"}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:fz(10.5, 11),
                            color:"#8A8DB5", marginTop:2 }}>
                            <Utensils size={10} /> {o.regimen}
                            {o.habitaciones?.length ? <> · <Bed size={10} /> {o.habitaciones.map((h) => h.ocupacion).join(" + ")}</> : null}
                          </div>
                        </div>
                        {!impresion && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, flexShrink:0,
                          fontSize:fz(10.5, 11), fontWeight:700, color:G.b }}>
                          {on ? "Cerrar" : "Ver detalle"}
                          <ChevronDown size={13} style={{ transform: on ? "rotate(180deg)" : "none",
                            transition:"transform .26s cubic-bezier(.2,.8,.2,1)" }} />
                        </span>
                        )}
                      </div>
                    </button>

                    {/* detalle expandido */}
                    {on && (
                      <div className="a-slide" style={{ padding:"0 14px 14px" }}>
                        {(tramos.length ? tramos : [null]).map((t, i) => {
                          const h = o.hoteles?.[i] || {};
                          const H = hotelById(h.hotelId);
                          return (
                            <div key={i} style={{ display:"flex", gap:12, padding:"12px", marginBottom:8,
                              borderRadius:13, background:"#FAFBFE", border:"1px solid rgba(17,17,36,.06)",
                              breakInside:"avoid" }}>
                              {q.fotosHotel && <Foto seed={H?.seed ?? 99} w={fz(58, 76)} h={fz(58, 62)} r={11} />}
                              <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:fz(13, 13.5), fontWeight:700 }}>{h.libre || H?.nombre || "A definir"}</span>
                                  {H && <Estrellas n={H.cat} size={10} />}
                                  {!H && h.libre && (h.cat || 0) > 0 && <Estrellas n={h.cat} size={10} />}
                                </div>
                                {t && (
                                  <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4,
                                    fontSize:fz(11, 11.5), color:"#6B6F99", fontWeight:600 }}>
                                    <MapPin size={10} style={{ color:G.b }} /> {t.ciudad} · {t.noches} {t.noches === 1 ? "noche" : "noches"}
                                  </div>
                                )}
                                {t?.checkin && (
                                  <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:7,
                                    padding:"4px 10px", borderRadius:999, background:"#fff",
                                    border:"1px solid rgba(17,17,36,.08)",
                                    fontSize:fz(10.5, 11), color:"#3D4066", fontWeight:700 }}>
                                    <Calendar size={9} style={{ color:G.b }} /> {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {o.habitaciones?.length ? (
                          <div>
                            <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
                              color:"#8A8DB5", margin:"2px 0 8px" }}>Tarifas</div>
                            {o.habitaciones.map((hab, hi) => (
                              <div key={hab.id ?? hi} style={{ borderRadius:13, background:"#FAFBFE",
                                border:"1px solid rgba(17,17,36,.08)", overflow:"hidden",
                                marginBottom: hi < o.habitaciones.length - 1 ? 10 : 0 }}>
                                <div style={{ padding:"10px 14px", fontSize:fz(11.5, 12), fontWeight:700, color:"#3D4066",
                                  borderBottom:"1px solid rgba(17,17,36,.07)" }}>
                                  Habitación {hab.ocupacion}{hab.tipo ? ` · ${hab.tipo}` : ""}
                                </div>
                                {(hab.tarifas || []).map((tar, ti) => {
                                  const valor = ventaTarifa(tar, o.factor);
                                  const ultima = ti === (hab.tarifas || []).length - 1;
                                  return (
                                    <div key={tar.id ?? ti}>
                                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                        padding:"9px 14px" }}>
                                        <span style={{ fontSize:fz(11, 11.5), color:"#3D4066", fontWeight:600 }}>{etiquetaTarifa(tar)}</span>
                                        <span className="mono" style={{ fontSize:fz(12.5, 13), fontWeight:700, color:"#1A1A2E" }}>{money(valor)}</span>
                                      </div>
                                      {!ultima && <div style={{ borderBottom:"1px solid rgba(17,17,36,.07)", margin:"0 14px" }} />}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding:"12px 14px", borderRadius:13, background:grad, color:"#fff" }}>
                            <span style={{ fontSize:fz(11.5, 12), fontWeight:600, opacity:.92 }}>Precio final por adulto</span>
                            <span style={{ fontSize:fz(19, 21), fontWeight:800, letterSpacing:"-.03em" }}><Odometro valor={precioOpcion(o)} /></span>
                          </div>
                        )}
                        {impresion ? null : confirmada === o.id ? (
                          <div className="a-pop" style={{ marginTop:9, padding:"12px 14px", borderRadius:13,
                            background:"rgba(59,191,173,.1)", border:"1.5px solid rgba(42,158,142,.4)",
                            display:"flex", gap:10, alignItems:"flex-start" }}>
                            <CheckCheck size={17} style={{ color:"#2A9E8E", flexShrink:0, marginTop:1 }} />
                            <div>
                              <div style={{ fontSize:fz(12.5, 13), fontWeight:800, color:"#1F7D70" }}>¡Recibimos tu confirmación!</div>
                              <div style={{ fontSize:fz(11, 11.5), color:"#3D4066", lineHeight:1.5, marginTop:2 }}>
                                {V.nombre.split(" ")[0]} te contacta a la brevedad para coordinar la seña y el pago.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button className="a-fade" onClick={() => setConfirmada(o.id)}
                              style={{ width:"100%", marginTop:9, padding:"13px", borderRadius:13, color:"#fff",
                                fontSize:fz(13.5, 14), fontWeight:800, letterSpacing:"-.01em",
                                background:"linear-gradient(145deg,#45D4C0,#2A9E8E)",
                                boxShadow:"0 8px 20px -6px rgba(42,158,142,.5), inset 0 1px 0 rgba(255,255,255,.3)" }}>
                              Confirmar esta opción
                            </button>
                            <div style={{ fontSize:fz(9.5, 10), color:"#8A8DB5", textAlign:"center", marginTop:6 }}>
                              Al confirmar aceptás esta cotización — vale como firma digital.
                            </div>
                            {revision === o.id ? (
                              <div className="a-pop" style={{ marginTop:8, padding:"9px 12px", borderRadius:11,
                                background:"rgba(120,90,229,.08)", fontSize:fz(11, 11.5), color:"#5B3FBF",
                                textAlign:"center", fontWeight:600 }}>
                                Le avisamos a {V.nombre.split(" ")[0]} — te contacta para ajustar la cotización.
                              </div>
                            ) : (
                              <button onClick={() => setRevision(o.id)}
                                style={{ display:"block", margin:"7px auto 0", fontSize:fz(10.5, 11), fontWeight:700,
                                  color:G.b, textDecoration:"underline", textUnderlineOffset:3 }}>
                                Solicitar una revisión
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* notas para el pasajero — bloc de HTML libre */}
        {((q.notasCliente || "").replace(/<[^>]*>/g, "").trim() || (q.notasCliente || "").includes("<img")) && (
          <div ref={(el) => { anclas.current["b-notascliente"] = el; }}>
            <SecTitulo texto="Notas" color={G.b} />
            <div style={{ fontSize:fz(12.5, 13), lineHeight:1.6, color:"#3D4066", marginBottom:22, overflowWrap:"anywhere" }}
              dangerouslySetInnerHTML={{ __html: q.notasCliente }} />
          </div>
        )}

        {/* condiciones */}
        <div style={{ background:"#F5F6FA", borderRadius:13, padding:"13px 15px", marginBottom:18, breakInside:"avoid" }}>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Condiciones</div>
          <ul style={{ margin:0, paddingLeft:15, fontSize:fz(10.5, 11), lineHeight:1.65, color:"#6B6F99" }}>
            <li>Precios en dólares americanos, según la tarifa y ocupación indicadas.</li>
            <li>Valores sujetos a disponibilidad y confirmación al momento de la reserva.</li>
            <li>Tarifa no incluye gastos personales ni excursiones no detalladas.</li>
            <li>Cotización válida por {q.vigencia ?? 48} horas.</li>
          </ul>
        </div>

        {/* pago */}
        <SecTitulo texto="Formas de pago" color={G.b} />
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Tarjetas de crédito</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
            {["Visa","Mastercard","OCA","Amex"].map((b) => (
              <div key={b} style={{ height:32, minWidth:66, padding:"0 11px", borderRadius:9,
                border:"1px solid rgba(17,17,36,.09)", background:"#fff", display:"grid", placeItems:"center",
                fontSize:fz(10.5, 11), fontWeight:700, color:"#3D4066" }}>{b}</div>
            ))}
          </div>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Transferencia bancaria</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["BROU","Itaú","Santander","BBVA"].map((b) => (
              <div key={b} style={{ height:32, minWidth:66, padding:"0 11px", borderRadius:9,
                border:"1px solid rgba(17,17,36,.09)", background:"#fff", display:"grid", placeItems:"center",
                fontSize:fz(10.5, 11), fontWeight:700, color:"#3D4066" }}>{b}</div>
            ))}
          </div>
        </div>

        {/* firma */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px", borderRadius:15, breakInside:"avoid",
          border:"1px solid rgba(17,17,36,.09)", background:"linear-gradient(180deg,#fff,#FAFBFE)" }}>
          {/* acá va la FOTO del vendedor, cargada desde su perfil de usuario —
              en el mockup la simula el degradado con la inicial encima */}
          <div style={{ width:46, height:46, borderRadius:"50%", flexShrink:0, overflow:"hidden",
            position:"relative", background:fotoBg(Number(String(V.id).replace(/\D/g, "")) + 20),
            boxShadow:"inset 0 0 0 2px rgba(255,255,255,.65)" }}
            title={`Foto de ${V.nombre} — se carga en su perfil de usuario`}>
            <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", color:"#fff",
              fontWeight:700, fontSize:15, textShadow:"0 1px 6px rgba(0,0,0,.35)" }}>{V.inicial}</div>
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:fz(13, 14), fontWeight:700 }}>{V.nombre}</div>
            <div style={{ fontSize:fz(11, 11.5), color:"#8A8DB5" }}>{V.cargo} · TravelOz</div>
            <a href={`https://wa.me/${V.tel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
              title="Escribirle por WhatsApp" className="mono"
              style={{ fontSize:fz(10.5, 11), color:"#6B6F99", marginTop:2, display:"block", textDecoration:"none" }}>
              {V.tel}
            </a>
            <a href={`mailto:${V.email}`} className="mono"
              style={{ fontSize:fz(9.5, 10), color:"#6B6F99", marginTop:2, display:"block",
                textDecoration:"underline", textDecorationColor:"rgba(107,111,153,.4)", textUnderlineOffset:2 }}>
              {V.email}
            </a>
          </div>
          <a href={`https://wa.me/${V.tel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
            title="Escribirle por WhatsApp" style={{ width:34, height:34, borderRadius:11, background:"#25D36615",
            color:"#128C7E", display:"grid", placeItems:"center", flexShrink:0 }}><Smartphone size={16} /></a>
        </div>
        <div style={{ textAlign:"center", marginTop:16 }}><Wordmark size={13} /></div>
        <div style={{ textAlign:"center", fontSize:fz(9.5, 10), color:"#B0B4CD", marginTop:4 }}>{G.web}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2C · SWITCHER Y PRECIO QUE RUEDA
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   ITINERARIO POR TRAYECTOS
   ═══════════════════════════════════════════════════════════════════════════ */

/* nombre corto de ciudad para la ruta: "São Paulo · Guarulhos" → "São Paulo" */
function nombreCorto(cod) {
  const full = AEROPUERTOS[cod];
  if (!full) return cod;
  return full.split("·")[0].trim();
}

/* "Jueves 01 Oct" — el PNR no trae el año, se lo pasa quien renderiza */
const DIAS_SEMANA = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
function fechaTrayecto(v, anio) {
  if (!v) return "";
  const ab = MES_AB[v.mes] || "";
  const mes3 = ab ? ab[0].toUpperCase() + ab.slice(1) : "";
  const dia = DIAS_SEMANA[new Date(anio, v.mes, v.dia).getDay()];
  return `${dia} ${String(v.dia).padStart(2, "0")} ${mes3}`.trim();
}

/* un punto de la ruta vertical: ciudad + hora arriba, terminal abajo */
function PuntoRuta({ cod, hora, plus, coral, fz }) {
  const ciudad = nombreCorto(cod);
  const terminal = AEROPUERTOS_NOMBRE[cod]
    ? `${AEROPUERTOS_NOMBRE[cod]} (${cod})`
    : `Aeropuerto ${ciudad} (${cod})`;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:fz(15, 16), fontWeight:700, lineHeight:1.25, overflowWrap:"anywhere" }}>{ciudad}</span>
        <span style={{ fontSize:fz(12.5, 13), fontWeight:600, color:"#6B6F99", whiteSpace:"nowrap" }}>
          — {hora}
          {plus && (
            <span style={{ fontSize:fz(10, 10.5), fontWeight:700, color:coral, marginLeft:3 }}>+1 día</span>
          )}
        </span>
      </div>
      <div style={{ fontSize:fz(12.5, 13), color:"#8A8DB5", fontWeight:500, marginTop:1,
        lineHeight:1.35, overflowWrap:"anywhere" }}>
        {terminal}
      </div>
    </div>
  );
}

function minutosDesde(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/* diferencia entre la llegada de un tramo y la salida del siguiente; si da
   negativa o irrazonable (cruce de medianoche mal calculado, etc.) se omite */
function escalaTexto(llegada, salida) {
  const d = minutosDesde(salida) - minutosDesde(llegada);
  if (d <= 0 || d > 20 * 60) return null;
  const h = Math.floor(d / 60), m = d % 60;
  return h > 0 ? `${h} h${m > 0 ? ` ${m} min` : ""}` : `${m} min`;
}

/* agrupa los tramos del PNR en trayectos: un tramo abre uno nuevo si es el
   primero, si su origen no es el destino del anterior, o si la fecha retrocede */
function agruparTrayectos(vuelos) {
  const trayectos = [];
  let prev = null;
  for (const v of vuelos) {
    const orden = v.mes * 31 + v.dia;
    const prevOrden = prev ? prev.mes * 31 + prev.dia : null;
    /* corta cuando se rompe la cadena de aeropuertos, la fecha retrocede,
       o pasa más de un día entre tramos (la vuelta suele salir días después) */
    const abreNuevo = !prev || v.origen !== prev.destino
      || (prevOrden != null && (orden < prevOrden || orden - prevOrden > 1));
    if (abreNuevo) trayectos.push([]);
    trayectos[trayectos.length - 1].push(v);
    prev = v;
  }
  return trayectos;
}

/* "Opción 2 · Superior" → "Opción 2": el nombre largo va en la card, no en la pestaña */
function tabNombre(o, i) {
  const n = String(o.nombre || "").trim();
  if (!n) return `Opción ${i + 1}`;
  const corto = n.split("·")[0].trim();
  return corto.length > 2 ? corto : n;
}

/* diferencia contra la opción 1, ya redondeada */
function delta(pv, base) {
  const d = Math.round(pv) - base;
  if (!d) return "mismo precio";
  return `${d > 0 ? "+" : "−"}${money(Math.abs(d))}`;
}

/* Odómetro: cada dígito es una columna 0-9 que rueda; "USD" y los puntos quedan quietos */
const DIGITOS = ["0","1","2","3","4","5","6","7","8","9"];
function Odometro({ valor }) {
  const txt = money(valor);
  return (
    <span className="odo" title={txt}>
      {txt.split("").map((c, i) => (
        c >= "0" && c <= "9" ? (
          <span key={i} className="odo-d">
            <span className="odo-col" style={{ transform:`translateY(-${Number(c) * 10}%)` }}>
              {DIGITOS.map((d) => <span key={d}>{d}</span>)}
            </span>
          </span>
        ) : (
          <span key={i} className="odo-s">{c === " " ? " " : c}</span>
        )
      ))}
    </span>
  );
}

function SecTitulo({ texto, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
      <div style={{ width:3, height:13, borderRadius:9, background:color }} />
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:"#3D4066" }}>{texto}</span>
      <div style={{ flex:1, height:1, background:"rgba(17,17,36,.07)" }} />
    </div>
  );
}

export { SalidaPasajero, SecTitulo };
