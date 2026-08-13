"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plane, MapPin, Calendar, ChevronDown, Bed, Smartphone, CheckCheck, Wallet, Utensils
} from "lucide-react";
import {
  MESES, MES_AB, AEROPUERTOS, VENDEDORES, hotelById, fmtCorto, fmtLargo, money,
  precioOpcion, ventaTarifa, etiquetaTarifa
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

  const desk = modo === "desk";
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
  const visibles = !q.opciones.length ? [] : varias ? [elegida] : q.opciones;

  /* escala: en escritorio todo un punto más grande */
  const fz = (cel, d) => desk ? d : cel;

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

        {/* saludo */}
        <p style={{ fontSize:fz(14.5, 15.5), lineHeight:1.65, margin:"0 0 6px", fontWeight:600 }}>
          Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""} 👋
        </p>
        <p style={{ fontSize:fz(13.5, 14.5), lineHeight:1.65, margin:"0 0 18px", color:"#3D4066" }}>
          De acuerdo a lo conversado, te comparto la cotización de tu viaje.
        </p>

        {q.mensaje && (
          <div style={{ fontSize:fz(13.5, 14), lineHeight:1.7, margin:"0 0 20px", color:"#3D4066",
            padding:"12px 14px", background:"#F5F6FA", borderRadius:12,
            borderLeft:`3px solid ${G.b}` }}
            dangerouslySetInnerHTML={{ __html: q.mensajeHtml || q.mensaje }} />
        )}

        {/* incluye */}
        {q.servicios.length > 0 && (
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

        {/* itinerario */}
        {q.vuelos.length > 0 && (
          <div ref={(el) => { anclas.current["b-vuelos"] = el; }}>
            <SecTitulo texto="Itinerario de vuelos" color={G.b} />
            <div style={{ border:"1px solid rgba(17,17,36,.09)", borderRadius:15, overflow:"hidden", marginBottom:24 }}>
              {q.vuelos.map((v, i) => (
                <div key={v.id} style={{ padding:"12px 14px",
                  borderBottom: i < q.vuelos.length - 1 ? "1px solid rgba(17,17,36,.07)" : "none",
                  background: i % 2 ? "#FCFCFE" : "#fff" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ width:22, height:22, borderRadius:7, background:`${G.b}12`, color:G.b,
                      display:"grid", placeItems:"center" }}><Plane size={11} /></div>
                    <span style={{ fontSize:fz(12.5, 13), fontWeight:700 }}>{v.aerolinea}</span>
                    <span className="mono" style={{ fontSize:fz(10, 10.5), color:"#8A8DB5" }}>{v.cia}{v.nro}</span>
                    <span style={{ marginLeft:"auto", fontSize:fz(11, 11.5), fontWeight:600, color:"#3D4066" }}>
                      {v.dia} {MES_AB[v.mes]}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div className="mono" style={{ fontSize:fz(16, 17), fontWeight:600, letterSpacing:"-.02em" }}>{v.salida}</div>
                      <div style={{ fontSize:fz(10.5, 11), color:"#8A8DB5", lineHeight:1.3, marginTop:2 }}>{AEROPUERTOS[v.origen] || v.origen}</div>
                    </div>
                    <div style={{ flex:"0 0 52px", display:"flex", alignItems:"center", gap:4, opacity:.35 }}>
                      <div style={{ height:1.5, flex:1, background:"#1A1A2E", borderRadius:9 }} />
                      <Plane size={11} style={{ transform:"rotate(45deg)" }} />
                    </div>
                    <div style={{ flex:1, textAlign:"right" }}>
                      <div className="mono" style={{ fontSize:fz(16, 17), fontWeight:600, letterSpacing:"-.02em" }}>{v.llegada}</div>
                      <div style={{ fontSize:fz(10.5, 11), color:"#8A8DB5", lineHeight:1.3, marginTop:2 }}>{AEROPUERTOS[v.destino] || v.destino}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* opciones — cards verticales, foto protagonista */}
        {q.opciones.length > 0 && (
          <div ref={(el) => { anclas.current["b-alojamiento"] = el; }}>
            <SecTitulo texto="Opciones de alojamiento" color={G.b} />
            <div style={{ fontSize:fz(11.5, 12), color:"#8A8DB5", margin:"-4px 0 12px" }}>
              {varias
                ? "Cambiá de opción para comparar precios, hoteles y régimen."
                : "Tocá la opción para ver el detalle de hoteles y fechas."}
            </div>

            {/* v2C · switcher del pasajero: precio de cada opción y diferencia contra la 1 */}
            {varias && (
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
                const on = abierta === o.id;
                const pv = precioOpcion(o);
                const H0 = hotelById(o.hoteles?.[0]?.hotelId);
                const hab0 = o.habitaciones?.[0];
                const tarifa0 = hab0?.tarifas?.[0];
                const caption = tarifa0
                  ? `${etiquetaTarifa(tarifa0).toLowerCase()}${hab0.ocupacion ? ` · hab. ${String(hab0.ocupacion).toLowerCase()}` : ""}`
                  : "por adulto · base doble";
                return (
                  /* con switcher hay una sola card: la clave fija deja que el precio ruede al cambiar */
                  <div key={varias ? "op-visible" : o.id} style={{ borderRadius:18, overflow:"hidden", background:"#fff",
                    border: on ? `1.5px solid ${G.b}55` : "1px solid rgba(17,17,36,.09)",
                    boxShadow: on ? `0 14px 34px -14px ${G.b}45` : "0 2px 6px rgba(17,17,36,.06)",
                    transition:"box-shadow .28s, border-color .28s, transform .28s" }}>

                    {/* foto full-width con overlay */}
                    <button onClick={() => setAbierta(on ? null : o.id)} style={{ width:"100%", textAlign:"left", display:"block" }}>
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
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, flexShrink:0,
                          fontSize:fz(10.5, 11), fontWeight:700, color:G.b }}>
                          {on ? "Cerrar" : "Ver detalle"}
                          <ChevronDown size={13} style={{ transform: on ? "rotate(180deg)" : "none",
                            transition:"transform .26s cubic-bezier(.2,.8,.2,1)" }} />
                        </span>
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
                              borderRadius:13, background:"#FAFBFE", border:"1px solid rgba(17,17,36,.06)" }}>
                              <Foto seed={H?.seed ?? 99} w={fz(58, 76)} h={fz(58, 62)} r={11} />
                              <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:fz(13, 13.5), fontWeight:700 }}>{h.libre || H?.nombre || "A definir"}</span>
                                  {H && <Estrellas n={H.cat} size={10} />}
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
                              <div key={hab.id ?? hi} style={{ marginBottom: hi < o.habitaciones.length - 1 ? 10 : 0 }}>
                                <div style={{ fontSize:fz(11.5, 12), fontWeight:700, color:"#3D4066", marginBottom:6 }}>
                                  Habitación {hab.ocupacion}{hab.tipo ? ` · ${hab.tipo}` : ""}
                                </div>
                                {(hab.tarifas || []).map((tar, ti) => {
                                  const valor = ventaTarifa(tar, o.factor);
                                  return hi === 0 && ti === 0 ? (
                                    <div key={tar.id ?? ti} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                      padding:"12px 14px", borderRadius:13, background:grad, color:"#fff", marginBottom:8 }}>
                                      <span style={{ fontSize:fz(11.5, 12), fontWeight:600, opacity:.92 }}>{etiquetaTarifa(tar)}</span>
                                      <span style={{ fontSize:fz(19, 21), fontWeight:800, letterSpacing:"-.03em" }}><Odometro valor={valor} /></span>
                                    </div>
                                  ) : (
                                    <div key={tar.id ?? ti} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                      padding:"9px 12px", borderRadius:11, background:"#FAFBFE", border:"1px solid rgba(17,17,36,.06)",
                                      marginBottom:6 }}>
                                      <span style={{ fontSize:fz(11, 11.5), color:"#3D4066", fontWeight:600 }}>{etiquetaTarifa(tar)}</span>
                                      <span className="mono" style={{ fontSize:fz(12.5, 13), fontWeight:700, color:"#1A1A2E" }}>{money(valor)}</span>
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
                        {confirmada === o.id ? (
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

        {/* notas para el pasajero */}
        {q.notasCliente.length > 0 && (
          <div ref={(el) => { anclas.current["b-notascliente"] = el; }}>
            <SecTitulo texto="A tener en cuenta" color={G.b} />
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
              {q.notasCliente.map((n) => (
                <div key={n.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:6, height:6, borderRadius:99, background:G.b, marginTop:7, flexShrink:0 }} />
                  <div style={{ fontSize:fz(12.5, 13), lineHeight:1.55, color:"#3D4066" }}>{n.texto}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* condiciones */}
        <div style={{ background:"#F5F6FA", borderRadius:13, padding:"13px 15px", marginBottom:18 }}>
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
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:9 }}>
          {["BROU","Itaú","Santander","Scotiabank","BBVA"].map((b) => (
            <div key={b} style={{ height:32, minWidth:66, padding:"0 11px", borderRadius:9,
              border:"1px solid rgba(17,17,36,.09)", background:"#fff", display:"grid", placeItems:"center",
              fontSize:fz(10.5, 11), fontWeight:700, color:"#3D4066" }}>{b}</div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:fz(11, 11.5), color:"#6B6F99", marginBottom:22 }}>
          <Wallet size={12} style={{ color:G.b }} /> Hasta 12 cuotas sin recargo con tarjetas seleccionadas
        </div>

        {/* firma */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px", borderRadius:15,
          border:"1px solid rgba(17,17,36,.09)", background:"linear-gradient(180deg,#fff,#FAFBFE)" }}>
          <div style={{ width:46, height:46, borderRadius:"50%", flexShrink:0, background:grad, color:"#fff",
            display:"grid", placeItems:"center", fontWeight:700, fontSize:15 }}>{V.inicial}</div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:fz(13, 14), fontWeight:700 }}>{V.nombre}</div>
            <div style={{ fontSize:fz(11, 11.5), color:"#8A8DB5" }}>{V.cargo} · TravelOz</div>
            <div className="mono" style={{ fontSize:fz(10.5, 11), color:"#6B6F99", marginTop:2 }}>{V.tel}</div>
          </div>
          <div style={{ width:34, height:34, borderRadius:11, background:"#25D36615", color:"#128C7E",
            display:"grid", placeItems:"center", flexShrink:0 }}><Smartphone size={16} /></div>
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
