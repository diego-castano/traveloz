"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Foto, Estrellas } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════════
   PROPUESTAS PARA MOSTRAR LAS OPCIONES DE ALOJAMIENTO

   Gero, 23/09: tres pasajeros no se dieron cuenta de que había más opciones
   además de la primera. En el celular las pestañas de arriba no se leen como
   pestañas. Estas son cuatro formas de resolverlo, para que el cliente elija
   una mirando su propia cotización en /propuestas/opciones/<n>.

   Gero eligió la 1 (pestañas con círculo de selección), con el recuadro más
   grueso, y desde el 24/09 es la de todas las cotizaciones: `SalidaPasajero`
   la usa cuando no le piden otra. Las demás solo las dibuja la página de
   propuestas, y se pueden borrar junto con ella.

   Regla que vale para las cuatro: ningún precio se muestra como diferencia
   contra otra opción. Un pasajero ya leyó "+USD 150" como algo que había que
   sumar (Gero, 11/09).
   ═══════════════════════════════════════════════════════════════════════════ */

export const VARIANTES_OPCIONES = [
  { id: "actual", n: 0, nombre: "Como está hoy" },
  { id: "pestanas", n: 1, nombre: "Pestañas que se ven como pestañas" },
  { id: "lista", n: 2, nombre: "Una debajo de la otra" },
  { id: "carrusel", n: 3, nombre: "Tarjetas que se deslizan" },
  { id: "selector", n: 4, nombre: "Lista para elegir" },
];

/* ── cartel de cuántas opciones hay ──────────────────────────────────────── */
export function AvisoOpciones({ n, texto, G }) {
  return (
    <div className="pv-aviso">
      <span className="pv-cuenta" style={{ background: G.b }}>{n} opciones</span>
      <span>{texto}</span>
    </div>
  );
}

/* ── 1 · pestañas que se ven como pestañas ───────────────────────────────
   La que eligió Gero el 23/09, con su pedido: más grosor en el recuadro de
   cada opción. Cada pestaña es una tarjeta con un círculo de selección, como
   en un formulario. Con cuatro opciones o más ya no entran a lo ancho: la
   fila se corre de costado, con flechas en los bordes y arrastre con el
   mouse, que captura el puntero recién cuando el mouse se movió de verdad
   (capturarlo al apretar le robaba el clic a la pestaña). */
/** Hasta tres, las pestañas se reparten el ancho; desde cuatro, la fila se desliza. */
const MAX_A_LO_ANCHO = 3;

export function PestanasOpciones({ resumenes, elegidaId, onElegir, desk, G }) {
  const fila = useRef(null);
  const arrastre = useRef(null);
  const [puntas, setPuntas] = useState({ izq: false, der: false });
  const muchas = resumenes.length > MAX_A_LO_ANCHO;

  /* Solo avisa si una punta cambió: corre en cada render y con un objeto nuevo
     cada vez el render se repetiría sin fin. */
  const medir = useCallback(() => {
    const c = fila.current;
    if (!c) return;
    const max = c.scrollWidth - c.clientWidth;
    const izq = c.scrollLeft > 4;
    const der = max > 4 && c.scrollLeft < max - 4;
    setPuntas((p) => (p.izq === izq && p.der === der ? p : { izq, der }));
  }, []);

  useEffect(() => {
    const c = fila.current;
    if (!c) return undefined;
    c.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      c.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, [medir]);

  /* sin dependencias a propósito: el ancho depende del modo y de los precios */
  useEffect(medir);

  /* la elegida siempre a la vista, en el centro de la fila */
  useEffect(() => {
    const c = fila.current;
    const b = c?.querySelector('[data-on="1"]');
    if (!c || !b || c.scrollWidth <= c.clientWidth) return;
    const izq = b.offsetLeft - (c.clientWidth - b.offsetWidth) / 2;
    c.scrollTo({ left: Math.max(0, izq), behavior: "smooth" });
  }, [elegidaId]);

  const correr = (dir) => {
    const c = fila.current;
    if (!c) return;
    c.scrollBy({ left: dir * Math.max(120, c.clientWidth * 0.7), behavior: "smooth" });
  };

  /* ── arrastre con el mouse (en táctil manda el scroll nativo) ──────────── */
  const bajar = (e) => {
    const c = fila.current;
    if (!c || e.pointerType === "touch" || c.scrollWidth <= c.clientWidth) return;
    arrastre.current = { x: e.clientX, left: c.scrollLeft, movido: false, id: e.pointerId };
  };
  const mover = (e) => {
    const a = arrastre.current;
    const c = fila.current;
    if (!a || !c) return;
    const dx = e.clientX - a.x;
    if (!a.movido) {
      /* un temblor de la mano no es un arrastre: el clic tiene que seguir
         llegando a la pestaña */
      if (Math.abs(dx) <= 4) return;
      a.movido = true;
      try { c.setPointerCapture?.(a.id); } catch { /* sin captura */ }
      c.dataset.arrastrando = "1";
    }
    c.scrollLeft = a.left - dx;
  };
  const soltar = () => {
    const a = arrastre.current;
    const c = fila.current;
    arrastre.current = null;
    if (!a || !c || !a.movido) return;
    try { c.releasePointerCapture?.(a.id); } catch { /* ya no estaba capturado */ }
    delete c.dataset.arrastrando;
    /* después de arrastrar, soltar encima de una pestaña no la elige */
    const tragar = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    c.addEventListener("click", tragar, { capture: true, once: true });
    setTimeout(() => c.removeEventListener("click", tragar, { capture: true }), 0);
  };

  return (
    <div>
      <div className="pv-aviso">
        <span className="pv-cuenta" style={{ background: G.b }}>{resumenes.length} opciones</span>
        <span>{muchas && !desk ? "Deslizá y tocá cada una para compararla" : "Tocá cada una para compararla"}</span>
      </div>
      <div className="pv-tabs-wrap">
        <div className="pv-tabs" ref={fila} role="tablist"
          data-desk={desk ? "1" : "0"} data-muchas={muchas ? "1" : "0"}
          onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
          {resumenes.map((r) => {
            const on = r.id === elegidaId;
            return (
              <button key={r.id} type="button" role="tab" aria-selected={on}
                className="pv-tab" data-on={on ? "1" : "0"} onClick={() => onElegir(r.id)}>
                <span className="pv-radio" aria-hidden="true" />
                <span className="pv-tab-n">{r.nombre}</span>
                <span className="pv-tab-p">{r.precio}</span>
              </button>
            );
          })}
        </div>
        {puntas.izq && (
          <button type="button" className="pv-fl" data-lado="i" aria-label="Ver las opciones anteriores"
            onClick={() => correr(-1)}><ChevronLeft size={14} /></button>
        )}
        {puntas.der && (
          <button type="button" className="pv-fl" data-lado="d" aria-label="Ver las opciones siguientes"
            onClick={() => correr(1)}><ChevronRight size={14} /></button>
        )}
      </div>
    </div>
  );
}

/* El pie de la opción abierta: "anterior / siguiente" con los puntos en el
   medio. Es lo que ve quien bajó leyendo la opción entera y llegó al final. */
export function NavOpciones({ resumenes, elegidaId, onElegir }) {
  const i = Math.max(0, resumenes.findIndex((r) => r.id === elegidaId));
  const ant = resumenes[i - 1];
  const sig = resumenes[i + 1];
  return (
    <div className="pv-nav">
      <button type="button" className="pv-nav-b" disabled={!ant}
        onClick={() => ant && onElegir(ant.id, { subir: true })}>
        <ChevronLeft size={15} /> {ant ? ant.nombre : ""}
      </button>
      <div className="pv-dots" aria-label={`Opción ${i + 1} de ${resumenes.length}`}>
        {resumenes.map((r, k) => (
          <i key={r.id} data-on={k === i ? "1" : "0"} onClick={() => onElegir(r.id, { subir: true })} />
        ))}
      </div>
      <button type="button" className="pv-nav-b" data-sig="1" disabled={!sig}
        onClick={() => sig && onElegir(sig.id, { subir: true })}>
        {sig ? `Ver ${sig.nombre}` : ""} <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ── 3 · tarjetas que se deslizan ─────────────────────────────────────────
   Una tarjeta por opción, con la foto del hotel, y la siguiente asomando por
   el borde: en el celular es la señal más clara de que hay más. La que queda
   al centro es la elegida, y su detalle completo se dibuja abajo. En la
   computadora se arrastra con el mouse o con las flechas. */
export function CarruselOpciones({ resumenes, elegidaId, onElegir, desk, G, grad, margen }) {
  const pista = useRef(null);
  const arrastre = useRef(null);
  const quieto = useRef(null);

  /* elegida desde afuera (puntos, flechas): se la trae al centro */
  useEffect(() => {
    const c = pista.current;
    const el = c?.querySelector(`[data-id="${elegidaId}"]`);
    if (!c || !el) return;
    const izq = el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2;
    if (Math.abs(c.scrollLeft - izq) > el.offsetWidth * 0.3) {
      c.scrollTo({ left: Math.max(0, izq), behavior: "smooth" });
    }
  }, [elegidaId]);

  /* elegida por el dedo: cuando el deslizamiento se detiene, gana la que
     quedó más cerca del centro */
  const alDeslizar = useCallback(() => {
    clearTimeout(quieto.current);
    quieto.current = setTimeout(() => {
      const c = pista.current;
      if (!c) return;
      const centro = c.scrollLeft + c.clientWidth / 2;
      let mejor = null;
      let dist = Infinity;
      c.querySelectorAll("[data-id]").forEach((el) => {
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - centro);
        if (d < dist) { dist = d; mejor = el.getAttribute("data-id"); }
      });
      if (mejor && mejor !== elegidaId) onElegir(mejor);
    }, 120);
  }, [elegidaId, onElegir]);

  useEffect(() => () => clearTimeout(quieto.current), []);

  const i = Math.max(0, resumenes.findIndex((r) => r.id === elegidaId));
  const ir = (k) => { const r = resumenes[k]; if (r) onElegir(r.id); };

  /* arrastre con mouse; en táctil manda el scroll nativo */
  /* el puntero se captura recién cuando el mouse se movió: capturarlo al
     apretar le robaba el clic a la tarjeta */
  const bajar = (e) => {
    const c = pista.current;
    if (!c || e.pointerType === "touch") return;
    arrastre.current = { x: e.clientX, left: c.scrollLeft, movido: false, id: e.pointerId };
  };
  const mover = (e) => {
    const a = arrastre.current;
    const c = pista.current;
    if (!a || !c) return;
    const dx = e.clientX - a.x;
    if (!a.movido) {
      if (Math.abs(dx) <= 4) return;
      a.movido = true;
      try { c.setPointerCapture?.(a.id); } catch { /* sin captura */ }
      c.dataset.arrastrando = "1";
    }
    c.scrollLeft = a.left - dx;
  };
  const soltar = () => {
    const c = pista.current;
    const a = arrastre.current;
    arrastre.current = null;
    if (!c || !a || !a.movido) return;
    try { c.releasePointerCapture?.(a.id); } catch { /* ya no estaba capturado */ }
    delete c.dataset.arrastrando;
    /* un arrastre no es un clic: la tarjeta de abajo no se elige al soltar */
    const tragar = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    c.addEventListener("click", tragar, { capture: true, once: true });
    setTimeout(() => c.removeEventListener("click", tragar, { capture: true }), 0);
    alDeslizar();
  };

  return (
    <div>
      <AvisoOpciones n={resumenes.length} texto={desk ? "Arrastrá o usá las flechas para verlas" : "Deslizá para ver todas"} G={G} />
      <div className="pv-car" ref={pista} data-desk={desk ? "1" : "0"}
        style={{ margin: `0 -${margen}px 2px`, padding: `4px ${margen}px 14px`, scrollPaddingInline: `${margen}px` }}
        onScroll={alDeslizar}
        onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
        {resumenes.map((r) => {
          const on = r.id === elegidaId;
          return (
            <button key={r.id} type="button" data-id={r.id} className="pv-card" data-on={on ? "1" : "0"}
              onClick={() => onElegir(r.id)}>
              <Foto seed={r.seed} url={r.foto} alt="" w="100%" h={desk ? 118 : 100} r={0}>
                <span className="pv-card-n">
                  <b style={{ background: grad }}>{r.n}</b>{r.nombre}
                </span>
              </Foto>
              <span className="pv-card-body">
                <span className="pv-card-h">{r.hoteles.join(" + ") || "Hotel a definir"}</span>
                {r.cat > 0 && <Estrellas n={r.cat} size={10} />}
                <span className="pv-card-reg">{r.regimen}</span>
                <span className="pv-card-p" style={{ color: G.b }}>{r.precio}</span>
                <span className="pv-card-cap">{r.caption}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="pv-car-pie">
        <button type="button" className="pv-car-fl" aria-label="Opción anterior"
          disabled={i === 0} onClick={() => ir(i - 1)}><ChevronLeft size={15} /></button>
        <div className="pv-dots">
          {resumenes.map((r, k) => (
            <i key={r.id} data-on={k === i ? "1" : "0"} onClick={() => ir(k)} />
          ))}
        </div>
        <button type="button" className="pv-car-fl" aria-label="Opción siguiente"
          disabled={i === resumenes.length - 1} onClick={() => ir(i + 1)}><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

/* ── 4 · lista para elegir ────────────────────────────────────────────────
   Como elegir una tarifa de avión: todas las opciones a la vista, una por
   renglón, con hotel, régimen y precio, y un círculo que dice cuál está
   elegida. El detalle completo de la elegida va abajo. */
export function SelectorOpciones({ resumenes, elegidaId, onElegir, G }) {
  return (
    <div className="pv-sel" role="radiogroup" aria-label="Opciones de alojamiento">
      <div className="pv-sel-t">
        Tenés <b style={{ color: G.b }}>{resumenes.length} opciones</b> para elegir. Tocá una para ver su detalle.
      </div>
      {resumenes.map((r) => {
        const on = r.id === elegidaId;
        return (
          <button key={r.id} type="button" role="radio" aria-checked={on}
            className="pv-sel-i" data-on={on ? "1" : "0"} onClick={() => onElegir(r.id)}>
            <span className="pv-radio" aria-hidden="true" />
            <span className="pv-sel-txt">
              <span className="pv-sel-n">{r.nombre}</span>
              <span className="pv-sel-h">
                <span>{r.hoteles.join(" + ") || "Hotel a definir"}</span>
                {r.cat > 0 && <Estrellas n={r.cat} size={9} />}
              </span>
              <span className="pv-sel-r">{r.regimen}</span>
            </span>
            <span className="pv-sel-p" style={on ? { color: G.b } : undefined}>
              {r.precio}
              <small>{r.caption}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
