"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plane, MapPin, Calendar, ChevronDown, Bed, Smartphone, CheckCheck, Utensils, Link2, Clock,
  CreditCard, Lock
} from "lucide-react";
import {
  MESES, MES_AB, ANIO_ACTUAL,
  fmtCorto, fmtLargo, money, precioOpcion, ventaTarifa, etiquetaTarifa, renderPlantilla, fotoBg,
  destinoLimpio,
} from "./data";
import { useCtz, useCatalogo, useAjustes, useAeropuertos, buscarVendedor } from "./contexto";
import { Foto, CATS, Estrellas, Wordmark } from "./ui";
import { telefonoWa } from "@/lib/telefono";

/* pago — logos reales del sitio público (public/site/img), mismo orden que producción */
const PAGO_TARJETAS = [
  { src:"/site/img/visa.png",       alt:"Visa" },
  { src:"/site/img/dca.png",        alt:"OCA" },
  { src:"/site/img/mastercard.png", alt:"Mastercard" },
  { src:"/site/img/ae.png",         alt:"American Express" },
];
const PAGO_BANCOS = [
  { src:"/site/img/santander.png",  alt:"Santander" },
  { src:"/site/img/itau.png",       alt:"Itaú" },
  { src:"/site/img/bbva.png",       alt:"BBVA" },
  { src:"/site/img/banco.png",      alt:"Banco República" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   EL PAPEL · medidas
   Píxeles de CSS a 96 dpi, con los márgenes del `@page` ya descontados. Son
   estimaciones: alcanza con que distingan "entra" de "no entra".
   ═══════════════════════════════════════════════════════════════════════════ */

/** Alto útil de una carilla A4 con los márgenes de `@page` (10mm arriba, 13 abajo). */
const CARILLA = 1035;

/** Piso de tipografía sobre papel: 12 px = 9 pt. El PDF se lee en el celular. */
const PISO_PAPEL = 12;

/** Arriba de esto una opción no entra en una carilla razonable y se parte. */
const ALTO_MAX_OPCION = 900;

/** Y con más hoteles que esto tampoco: no hay estimación que la salve. */
const MAX_HOTELES_ENTEROS = 4;

/**
 * ¿El bloc de notas al pasajero tiene contenido de verdad?
 *
 * Sale de un contenteditable, así que lo "vacío" casi nunca es la cadena
 * vacía: es `<div><br></div>`, un `<p>&nbsp;</p>` o el resto de un párrafo
 * borrado. Sin esto la ficha dibuja el título "Notas" arriba de la nada, en
 * pantalla y en el PDF.
 *
 * Cuenta como contenido: texto una vez sacado el markup y los espacios duros,
 * o una imagen/tabla incrustada (el editor las admite).
 */
function hayNotasReales(html) {
  const s = typeof html === "string" ? html : "";
  if (!s) return false;
  if (/<(img|table|hr)\b/i.test(s)) return true;
  const texto = s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/[\s\u00a0\u200b]+/g, " ")
    .trim();
  return texto.length > 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SALIDA AL PASAJERO  ·  mobile-first
   Lo que se comparte por WhatsApp. Las notas internas NUNCA llegan acá.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * La cotización como la ve el pasajero.
 *
 * `onConfirmar` y `onRevision` son opcionales a propósito. Sin ellos —vista
 * previa del editor y del drawer— los botones solo cambian el estado local: el
 * vendedor tiene que poder mirar la pantalla sin confirmarse una venta a sí
 * mismo. En el link público (/c/<token>) llegan cableados a las actions y su
 * respuesta es la que decide qué se muestra.
 *
 * `confirmadaInicial` es el id de la opción ya confirmada: la página pública
 * abre directamente en ese estado, sin que el pasajero tenga que volver a
 * apretar nada.
 *
 * `data-sec` marca las secciones que mide el tracking de lectura. Las claves
 * son las de SECCIONES en src/lib/presupuesto/links.ts y el orden importa.
 *
 * `animar` enciende la entrada escalonada de los bloques. Va apagado por
 * defecto porque esta misma ficha vive dentro del teléfono de vista previa del
 * editor: al vendedor, que toca un campo y mira, los bloques subiendo de a uno
 * le tapan justo lo que quiere ver. Lo prende el link público y nadie más.
 */
function SalidaPasajero({
  q, marca, vendedor, tramos, foco, scrollRef, modo = "cel",
  onConfirmar, onRevision, confirmadaInicial = null, animar = false,
}) {
  const { hotelById } = useCatalogo();
  const anclas = useRef({});
  const raiz = useRef(null);
  useEffect(() => {
    const cont = scrollRef?.current; if (!cont || !foco) return;
    const el = anclas.current[foco];
    const top = el ? Math.max(0, el.offsetTop - 12) : 0;
    cont.scrollTo({ top, behavior:"smooth" });
  }, [foco, scrollRef]);

  const [abierta, setAbierta] = useState(confirmadaInicial || q.opciones[0]?.id || null);
  const [confirmada, setConfirmada] = useState(confirmadaInicial || null);
  const [revision, setRevision] = useState(null);
  /* acciones reales: mientras viaja la action los botones se bloquean y, si el
     server dice que no, el pasajero lee el motivo en vez de quedarse mirando */
  const [enviando, setEnviando] = useState(null);   /* "conf" | "rev" | null */
  const [errorAcc, setErrorAcc] = useState(null);
  useEffect(() => {
    if (!q.opciones.length) { setAbierta(null); return; }
    if (!q.opciones.some((o) => o.id === abierta)) setAbierta(q.opciones[0].id);
  }, [q.opciones, abierta]);

  /* v2C · el pasajero cambia de opción desde el switcher (solo vista, no toca el editor) */
  const [sel, setSel] = useState(confirmadaInicial || q.opciones[0]?.id || null);
  useEffect(() => {
    if (!q.opciones.length) { setSel(null); return; }
    if (!q.opciones.some((o) => o.id === sel)) setSel(q.opciones[0].id);
  }, [q.opciones, sel]);

  const impresion = modo === "print";   /* PDF: todas las opciones abiertas, sin botones */
  const desk = modo === "desk" || impresion;

  /* ── entrada de los bloques ───────────────────────────────────────────────
     El marcado sale VISIBLE del server: el `data-animar` que esconde los
     bloques lo pone este efecto, ya montado, así que una cotización sin JS —o
     con el observer roto— se lee igual. Cada bloque se revela una sola vez y
     con un escalón de retardo dentro de su tanda; después deja de observarse.
     Nada de esto corre en el papel ni con reduce-motion. */
  useEffect(() => {
    const nodo = raiz.current;
    if (!animar || impresion || !nodo) return undefined;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return undefined;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches) return undefined;
    const bloques = Array.from(nodo.querySelectorAll("[data-ap]"));
    if (!bloques.length) return undefined;

    let io;
    try {
      io = new IntersectionObserver(
        (entradas) => {
          let i = 0;
          for (const e of entradas) {
            if (!e.isIntersecting) continue;
            e.target.style.transitionDelay = `${Math.min(i++, 4) * 70}ms`;
            e.target.setAttribute("data-vis", "1");
            io.unobserve(e.target);
          }
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.02 },
      );
    } catch {
      return undefined;   /* sin observer no se esconde nada */
    }
    nodo.setAttribute("data-animar", "1");
    bloques.forEach((b) => io.observe(b));
    return () => { io.disconnect(); nodo.removeAttribute("data-animar"); };
  }, [animar, impresion]);
  const G = { a:"#F43E55", b:"#785AE5", web:"traveloz.com.uy" };
  const grad = `linear-gradient(87deg, ${G.a} 0%, ${G.b} 100%)`;
  /* El encabezado es la marca y se queda, pero un lineal de 45° plano es
     exactamente el degradado que dibuja cualquiera. Acá el coral y el violeta
     pasan por un magenta intermedio y encima caen dos radiales —luz arriba a
     la izquierda, sombra abajo a la derecha— para que la banda tenga volumen
     en vez de ser una rampa de dos paradas. */
  const gradHead = [
    `radial-gradient(125% 155% at 6% -35%, rgba(255,255,255,.22), rgba(255,255,255,0) 56%)`,
    `radial-gradient(105% 135% at 97% 120%, rgba(74,48,168,.55), rgba(74,48,168,0) 62%)`,
    `linear-gradient(103deg, ${G.a} 0%, #C4409B 47%, ${G.b} 100%)`,
  ].join(", ");
  /* grano finísimo sobre el degradado: rompe el banding de la rampa */
  const GRANO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";
  /* destinoLimpio también acá: las cotizaciones guardadas antes del 26/08 traen
     "Caribe › Jamaica › Jamaica" en el título y el pasajero no tiene por qué verlo */
  const titulo = [destinoLimpio(q.titulo.destino) || "Destino", q.titulo.mes != null ? MESES[q.titulo.mes] : null, q.titulo.anio]
    .filter(Boolean).join(", ").replace(/, (\w+), (\d{4})$/, ", $1 $2");
  const { vendedores } = useCtz();
  const ajustes = useAjustes();
  const V = buscarVendedor(vendedores, vendedor);
  /* wa.me necesita el número con código de país, no el local. */
  const telWa = telefonoWa(V.tel);
  const totalNoches = tramos.reduce((a, t) => a + t.noches, 0);

  /* v2C · comparación: la opción 1 es la base, las demás muestran cuánto suben o bajan */
  const varias = q.opciones.length > 1;
  const base = q.opciones[0] ? Math.round(precioOpcion(q.opciones[0])) : 0;
  const elegida = q.opciones.find((o) => o.id === sel) || q.opciones[0];
  const visibles = !q.opciones.length ? [] : impresion ? q.opciones : varias ? [elegida] : q.opciones;

  /* escala: en escritorio todo un punto más grande.
     `fzp` es la variante con tercer valor para el papel: cuando la pantalla
     abrió una medida para que respire, el papel se queda con la de antes. Una
     carilla de más por documento es un costo real —el PDF se manda por mail—
     y sobre papel nadie scrollea buscando aire.

     Sobre el papel las dos funciones aplican además el piso de PISO_PAPEL:
     el PDF se lee en el celular y abajo de 9 pt no se lee. Los tres usos que
     no son texto (los `size` de dos iconos del encabezado) ya están arriba
     del piso, así que la cuenta no les cambia nada. */
  const fz = (cel, d) => impresion ? Math.max(d, PISO_PAPEL) : desk ? d : cel;
  const fzp = (cel, d, papel) => impresion ? Math.max(papel, PISO_PAPEL) : desk ? d : cel;

  /* mensaje automático: texto ya resuelto ({nombre}/{link}), listo para partir en párrafos */
  const mensajeAutoTxt = useMemo(
    () => {
      const txt = q.mensajeAuto ? renderPlantilla(q.mensajeAuto, q.cliente.nombre, V.linkDatos) : "";
      return String(q.cliente.nombre || "").trim() ? txt : saludoSinNombre(txt);
    },
    [q.mensajeAuto, q.cliente.nombre, V.linkDatos]
  );

  /* Condiciones del pie: las edita el máster en /backend/cotizador/ajustes.
     La línea de la vigencia —la que lleva `{vigencia}`— NO se dibuja acá: el
     documento que el pasajero lee y el PDF que se guarda no llevan fecha de
     vencimiento. La vigencia sigue viva donde importa: el link vence solo, el
     email la dice y el listado del vendedor la muestra con su semáforo. */
  const condiciones = useMemo(
    () => (ajustes.condiciones || []).map((l) => String(l)).filter((l) => !/\{vigencia\}/.test(l)),
    [ajustes.condiciones],
  );

  /* Dos columnas en el papel solo si las líneas son cortas: con una condición
     larga la columna angosta la parte en cinco renglones y se lee peor que a
     todo lo ancho. Tres líneas es el mínimo para que la segunda columna no
     quede con una sola. */
  const condicionesCortas = useMemo(
    () => condiciones.length >= 3 && condiciones.every((l) => l.length <= 95),
    [condiciones],
  );

  /* ¿el pie del documento entra en media carilla? (ver el bloque de cierre)
     Medido sobre el papel: condiciones ~30 px de título más 20 por renglón,
     formas de pago 160 con sus dos filas de logos, y la firma con el cierre
     de marca, 150. */
  const cierreEntero = useMemo(() => {
    if (!impresion) return false;
    const renglones = condicionesCortas ? Math.ceil(condiciones.length / 2) : condiciones.length;
    const cond = condiciones.length ? 30 + renglones * 20 + 16 : 0;
    return cond + 160 + 150 <= CARILLA / 2;
  }, [impresion, condiciones.length, condicionesCortas]);

  /* nombre visible de una opción, el mismo fallback que usa el switcher */
  const nombreDe = (o) => String(o?.nombre || "").trim() || `Opción ${q.opciones.indexOf(o) + 1}`;

  const confirmar = async (o) => {
    if (enviando) return;
    setErrorAcc(null);
    if (!onConfirmar) { setConfirmada(o.id); return; }
    setEnviando("conf");
    const r = await onConfirmar({ id: o.id, nombre: nombreDe(o) });
    setEnviando(null);
    if (r && r.ok === false) { setErrorAcc(r.error || "No pudimos registrarlo. Probá de nuevo."); return; }
    setConfirmada(o.id);
  };

  const pedirRevision = async (o) => {
    if (enviando) return;
    setErrorAcc(null);
    if (!onRevision) { setRevision(o.id); return; }
    setEnviando("rev");
    const r = await onRevision({ id: o.id, nombre: nombreDe(o) });
    setEnviando(null);
    if (r && r.ok === false) { setErrorAcc(r.error || "No pudimos avisarle. Probá de nuevo."); return; }
    setRevision(o.id);
  };

  /* itinerario agrupado en trayectos (Ida / Vuelta / Tramo N) */
  const trayectos = useMemo(() => agruparTrayectos(q.vuelos), [q.vuelos]);
  /* el PNR trae día y mes pero no el año: lo saca de la fecha de salida cargada */
  const anioItinerario = useMemo(() => {
    const m = String(q.fechaSalida || "").match(/^(\d{4})/);
    return m ? Number(m[1]) : ANIO_ACTUAL;
  }, [q.fechaSalida]);

  /* ¿hay bloc de notas al pasajero? El HTML puede ser puro markup vacío. */
  const hayNotas = hayNotasReales(q.notasCliente);

  /* ── papel: dónde conviene cortar ─────────────────────────────────────
     Sin itinerario de vuelos la hoja queda apenas por encima de una carilla
     y el cierre —condiciones, formas de pago y firma— se va solo a la
     segunda: media página de trámite y ni una línea de la cotización. Eso es
     lo que el cliente marcó como "la segunda casi vacía".

     Arrancando las opciones en hoja nueva el corte cae donde tiene sentido:
     portada con el saludo y lo que incluye, y detalle con el precio, los
     hoteles y la firma juntos. Pero el corte forzado solo mejora si las dos
     carillas quedan razonablemente llenas, así que se pide las tres cosas:
       · la hoja NO entra en una sola carilla (si entra, no se toca nada);
       · lo que va después del corte SÍ entra en una (opciones + notas +
         cierre): si no, el corte agrega una tercera página en vez de sacarla;
       · la portada queda al menos a media carilla.

     Las alturas son las medidas sobre el papel a 96 dpi, con los márgenes del
     @page ya descontados. Es una estimación y no pretende ser exacta: solo
     tiene que distinguir "entra" de "no entra". */
  const cortarAntesDeOpciones = useMemo(() => {
    if (!impresion || q.vuelos.length || !q.opciones.length) return false;
    const PAGINA = CARILLA;                  // A4 menos margen de 10mm/13mm
    const CIERRE = 430;                      // condiciones + formas de pago + firma
    /* membrete + banda + saludo, con el bloque de servicios si lo hay */
    const portada = 386 + (q.servicios.length && !q.soloVuelos ? 130 : 0);
    /* cabecera con el precio + una ficha de hotel por tramo + tarifas */
    const porOpcion = 192 + 46 * Math.max(1, tramos.length);
    const opciones = 45 + q.opciones.length * porOpcion + (q.opciones.length - 1) * 16;
    const notas = hayNotas ? 90 : 0;
    return (
      portada + opciones + notas + CIERRE > PAGINA &&
      opciones + notas + CIERRE <= PAGINA &&
      portada >= PAGINA * 0.45
    );
  }, [impresion, q.vuelos.length, q.opciones.length, q.servicios.length, q.soloVuelos, tramos.length, hayNotas]);

  /* ── papel: la opción viaja entera ────────────────────────────────────
     La regla que pidió el cliente: una opción de alojamiento no se parte.
     Header, hoteles, tarifas y cierre caen juntos aunque al pie de la hoja
     anterior quede blanco — el blanco se perdona, una opción cortada al medio
     no. La única excepción es la opción que no entra en una carilla útil: ahí
     vuelve al esquema de antes, donde lo que viaja junto es cada pieza (el
     header con su primer hotel, cada hotel, el bloque de tarifas) y el corte
     cae entre hotel y hotel, que es donde menos molesta.

     Estimación en píxeles de papel, con el piso de tipografía ya aplicado.
     No pretende ser exacta: distingue "entra" de "no entra". */
  const opcionEntera = useMemo(() => {
    if (!impresion) return () => false;
    const nH = Math.max(1, tramos.length);
    return (o) => {
      const hoteles = Math.max(nH, (o.hoteles || []).length || 1);
      if (hoteles > MAX_HOTELES_ENTEROS) return false;
      /* números medidos sobre el papel con el piso de 9 pt puesto: una opción
         de un hotel sin foto mide 220 px, cada hotel más suma 46 (75 con la
         foto) y la cabecera con foto agrega ~60 sobre la franja de precio */
      const cabecera = q.fotosHotel ? 150 : 88;
      const fichas = hoteles * (q.fotosHotel ? 75 : 46);    // una fila por tramo
      const tarifas = o.habitaciones?.length
        ? 26 + (o.habitaciones || []).reduce(
            (a, h) => a + 42 + Math.max(1, (h.tarifas || []).length) * 34 + 10, 0)
        : 48;                                               // respaldo: la franja de precio final
      return cabecera + fichas + tarifas + 30 <= ALTO_MAX_OPCION;
    };
  }, [impresion, tramos.length, q.fotosHotel]);

  /* Pie de las páginas 2+: lo dibuja `@page { @bottom-right }` en styles.js y
     el número lo pone esta variable.

     El valor se interpola dentro de un `<style>`, así que no alcanza con
     escapar comillas: cualquier `</style>`, `;` o `}` que se cuele en el
     número rompe la regla o, peor, cierra el bloque. En vez de escapar se
     filtra por lista blanca — letras, números, espacio y los cuatro signos que
     de verdad aparecen en un correlativo (COT-2026-0148) — y se corta a 40
     caracteres. Un número que quede vacío después del filtro cae al respaldo. */
  const piePagina = useMemo(() => {
    const limpio = String(q.numero ?? "")
      .replace(/[^A-Za-z0-9 ._·-]/g, "")
      .slice(0, 40)
      .trim();
    return limpio ? `"TravelOz · Cotización ${limpio}"` : `"TravelOz"`;
  }, [q.numero]);

  return (
    <div ref={raiz} style={{ fontFamily:"'DM Sans',sans-serif", color:"#1A1A2E", background:"#fff", minHeight:"100%" }}>

      {/* el número que lleva el pie de las páginas 2+ (ver @page en styles.js) */}
      {impresion && (
        <style dangerouslySetInnerHTML={{ __html: `:root{--ctz-pie:${piePagina};}` }} />
      )}

      {/* ── membrete del papel ───────────────────────────────────────────
          El logo va arriba, sobre el blanco de la hoja. Adentro de la banda
          violeta necesitaba una píldora blanca de fondo y ese parche es lo
          que el cliente marcó como "raro". Acá el documento arranca como un
          membrete de agencia: número a la izquierda, logo centrado, aire.

          La fecha de emisión no existe en `q` —`contenidoPublico` recorta el
          contenido a lo que el pasajero necesita y ninguna fecha de alta
          cruza—, así que el lado derecho queda vacío en vez de inventarse un
          dato: el hueco sostiene el logo centrado sobre la hoja. */}
      {impresion && (
        <div className="pr-mbr">
          {/* un borrador todavía sin numerar deja el lado vacío, no un rótulo
              a medio escribir */}
          <span className="pr-mbr-num mono">{q.numero ? `Cotización ${q.numero}` : ""}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pr-mbr-logo" src="/site/img/header-logo.webp" alt="TravelOz"
            width={1572} height={523} loading="eager" decoding="async" />
          <span aria-hidden />
        </div>
      )}

      {/* ── encabezado de marca ── */}
      <div data-sec="encabezado" data-ap style={{ background:gradHead,
        padding: impresion ? "20px 24px 21px" : desk ? "38px 40px 30px" : "36px 20px 24px", color:"#fff",
        ...(impresion ? { borderRadius:16 } : null),
        position:"relative", overflow:"hidden" }}>
        {/* El grano va solo a pantalla. En el papel Chromium rasteriza el
            mosaico de ruido a la resolución de impresión y el PDF pasa de
            medio mega a cuatro: el adjunto del email no vale ese precio, y
            sobre papel el banding que el grano viene a tapar no se ve. */}
        {!impresion && (
          <div aria-hidden style={{ position:"absolute", inset:0, backgroundImage:GRANO, opacity:.075,
            mixBlendMode:"overlay", pointerEvents:"none" }} />
        )}
        {/* el halo de la esquina es para la banda alta de pantalla; sobre la
            banda baja del papel queda como una mancha y se apaga */}
        {!impresion && (
          <div aria-hidden style={{ position:"absolute", right:-46, top:-52, width:190, height:190, borderRadius:"50%",
            background:"radial-gradient(circle at 34% 30%, rgba(255,255,255,.16), rgba(255,255,255,0) 70%)" }} />
        )}
        <div style={{ maxWidth: desk ? 660 : "none", margin:"0 auto", position:"relative" }}>
          {/* En el papel la banda es solo marca: el logo y el número ya
              salieron arriba, en el membrete. */}
          {!impresion && (
          <div style={{ display:"flex", alignItems:"center", marginBottom:fzp(18, 22, 18) }}>
            {/* El logo del sitio, como imagen.
                El wordmark de texto pinta "oz" con un degradado sobre el
                glifo (`background-clip:text`) y eso es lo primero que se
                rompe cuando el que imprime es el diálogo del navegador: el
                relleno se va y quedan dos letras transparentes. Un PNG no
                depende de nada de eso. Es el mismo archivo que usa el header
                del sitio público. */}
            <div className="wm-pildora" style={{ background:"rgba(255,255,255,.95)", borderRadius:11,
              padding:"7px 12px 6px", boxShadow:"0 6px 18px -6px rgba(48,20,70,.45)", lineHeight:0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/site/img/header-logo.webp" alt="TravelOz" width={1572} height={523}
                loading="eager" decoding="async"
                style={{ display:"block", width: fz(100, 110), height:"auto",
                  WebkitPrintColorAdjust:"exact", printColorAdjust:"exact" }} />
            </div>
            <div className="mono" style={{ marginLeft:"auto", fontSize:fz(10, 11), opacity:.78, letterSpacing:".02em" }}>{q.numero}</div>
          </div>
          )}
          {/* En el papel la banda es baja y el título tiene todo el ancho de
              la hoja: con 22ch un "Caribe › Jamaica, Noviembre 2026" se
              partía en dos renglones y la banda crecía 30 px por nada. */}
          <div className="disp" style={{ fontSize:fzp(28, 37, 26), fontWeight:600, lineHeight: impresion ? 1.12 : 1.1, letterSpacing:"-.028em",
            textWrap:"balance", maxWidth: impresion ? "34ch" : "22ch", textShadow:"0 1px 20px rgba(60,20,80,.18)" }}>
            {titulo}
          </div>
          <div style={{ display:"flex", gap: impresion ? 6 : 7, flexWrap: impresion ? "nowrap" : "wrap",
            marginTop: impresion ? 10 : 13 }}>
            {q.fechaSalida && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:fz(11.5, 12.5),
                whiteSpace: impresion ? "nowrap" : undefined,
                background:"rgba(255,255,255,.22)", padding: impresion ? "4px 10px" : "6px 12px", borderRadius:999,
                backdropFilter:"blur(6px)", fontWeight:600 }}>
                <Calendar size={fz(11, 12)} /> {fmtLargo(q.fechaSalida)}
              </span>
            )}
            {totalNoches > 0 && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:fz(11.5, 12.5),
                whiteSpace: impresion ? "nowrap" : undefined,
                background:"rgba(255,255,255,.22)", padding: impresion ? "4px 10px" : "6px 12px", borderRadius:999, fontWeight:600 }}>
                <Bed size={fz(11, 12)} /> {totalNoches} noches
              </span>
            )}
            {tramos.map((t) => (
              <span key={t.id} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:fz(11.5, 12.5),
                ...(impresion ? { whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" } : null),
                background:"rgba(0,0,0,.18)", padding: impresion ? "4px 10px" : "6px 12px", borderRadius:999 }}>
                {t.ciudad} · {t.noches}n
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* El cuerpo del papel se alinea con los bordes de la banda: el margen
          de la hoja lo pone `@page` (12 mm a los lados) y adentro no hace
          falta otro. Antes había 38 px más de aire por lado y el documento
          quedaba en una columna angosta con dos márgenes superpuestos. */}
      <div style={{ padding: impresion ? "24px 2px 0" : desk ? "30px 42px 40px" : "22px 20px 30px",
        maxWidth: desk ? 748 : "none", margin:"0 auto" }}>

        {/* saludo — mensaje automático de la cotización, o el fallback fijo si no hay plantilla */}
        {mensajeAutoTxt ? (
          <div data-ap style={{ margin: impresion ? "0 0 16px" : "0 0 22px", maxWidth:"68ch" }}>
            {mensajeAutoTxt.split("\n\n").map((parrafo, pi) => (
              <div key={pi} style={{ margin: pi === 0 ? "0 0 7px" : "0 0 9px" }}>
                {parrafo.split("\n").map((linea, li) => {
                  const t = linea.trim();
                  const esLink = !!t && (t.includes("datos-de-pasajeros")
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
                    <p key={li} style={{ fontSize: primera ? fzp(15, 16.5, 15.5) : fzp(14, 15.5, 14.5),
                      lineHeight: primera ? 1.4 : (impresion ? 1.55 : 1.58), margin:0, fontWeight: primera ? 600 : 400,
                      letterSpacing: primera ? "-.012em" : "-.004em",
                      textWrap:"pretty",
                      color: primera ? "#1A1A2E" : "#3D4066" }}>
                      {t}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div data-ap style={{ maxWidth:"68ch" }}>
            <p style={{ fontSize:fzp(15, 16.5, 15.5), lineHeight:1.4, margin:"0 0 7px", fontWeight:600,
              letterSpacing:"-.012em" }}>
              {q.cliente.nombre ? `Hola ${q.cliente.nombre} 👋` : "¡Hola! 👋"}
            </p>
            <p style={{ fontSize:fzp(14, 15.5, 14.5), lineHeight:1.55, margin: impresion ? "0 0 16px" : "0 0 22px",
              color:"#3D4066", textWrap:"pretty" }}>
              De acuerdo a lo conversado, te comparto la cotización de tu viaje.
            </p>
          </div>
        )}

        {q.mensaje && (
          <div data-ap style={{ fontSize:fz(13.5, 14.5), lineHeight:1.68, margin:"0 0 22px", color:"#3D4066",
            maxWidth:"68ch", padding:"13px 16px", background:"rgba(120,90,229,.045)", borderRadius:"4px 14px 14px 4px",
            borderLeft:`3px solid ${G.b}` }}
            dangerouslySetInnerHTML={{ __html: q.mensajeHtml || q.mensaje }} />
        )}

        {/* incluye */}
        {q.servicios.length > 0 && !q.soloVuelos && (
          <div ref={(el) => { anclas.current["b-servicios"] = el; }} data-sec="servicios" data-ap>
            <SecTitulo texto="Tu viaje incluye" />
            <div style={{ display:"grid", gridTemplateColumns: desk ? "1fr 1fr" : "1fr",
              gap: impresion ? "12px 24px" : "9px 18px", ...(impresion ? { alignItems:"start" } : null), marginBottom:24 }}>
              {q.servicios.map((sv) => {
                const C = CATS.find((c) => c.id === sv.categoria) || CATS[0];
                return (
                  <div key={sv.id} style={{ display:"flex", gap: impresion ? 10 : 11, alignItems:"flex-start",
                    ...(impresion ? { breakInside:"avoid" } : null) }}>
                    <div style={{ width: impresion ? 26 : 30, height: impresion ? 26 : 30,
                      borderRadius: impresion ? 999 : 9, flexShrink:0, display:"grid", placeItems:"center",
                      background:`${G.b}${impresion ? "0F" : "12"}`, color:G.b }}><C.Icon size={impresion ? 13 : 14} /></div>
                    <div style={{ fontSize:fzp(13, 13.5, 12.5), lineHeight:1.5, paddingTop: impresion ? 4 : 5, fontWeight:500 }}>
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
          <div ref={(el) => { anclas.current["b-vuelos"] = el; }} data-sec="vuelos" data-ap>
            <SecTitulo texto="Itinerario de vuelos" />
            {/* En papel la lista va en flujo normal, no en flex: Chromium no
                fragmenta bien un contenedor flex y ahí `break-inside:avoid`
                deja de valer — es lo que partía las tarjetas del itinerario
                entre dos hojas. El `gap` pasa a margen, como en las opciones. */}
            <div style={{ ...(impresion
              ? { display:"block" }
              : { display:"flex", flexDirection:"column", gap:14 }), marginBottom: q.soloVuelos ? 14 : 24 }}>
              {trayectos.map((seg, ti) => {
                const primero = seg[0];
                const etiqueta = ti === 0 ? "Ida" : ti === 1 ? "Vuelta" : `Tramo ${ti + 1}`;
                /* Papel: el trayecto deja de ser UNA tarjeta indivisible. Un
                   itinerario de dos tramos con espera no entra en lo que queda
                   de hoja y se iba entero a la siguiente, dejando media página
                   en blanco. Ahora el límite es el tramo: cada segmento (fila
                   de aerolínea + los dos puntos de ruta + la espera que le
                   sigue) es su propia tarjeta con `break-inside:avoid`, y el
                   corte cae entre tramos, nunca dentro de uno. La cabecera va
                   como barra arriba, con `break-after:avoid` para no quedar
                   sola al pie. En pantalla no cambia nada. */
                const cajaPapel = { background:"#fff", border:"1px solid rgba(17,17,36,.10)",
                  borderRadius:12, overflow:"hidden" };
                return (
                  <div key={ti} style={impresion
                    ? { marginBottom: ti < trayectos.length - 1 ? 16 : 0 }
                    : { borderRadius:18, background:"#fff", overflow:"hidden", breakInside:"avoid",
                        boxShadow:"0 1px 2px rgba(58,38,120,.05), 0 14px 30px -20px rgba(58,38,120,.35)" }}>

                    {/* Cabecera del trayecto. En pantalla es la píldora de
                        marca dentro de la tarjeta; en el papel se vuelve lo
                        que es —una etiqueta— y deja de ser una barra con caja
                        propia: IDA en violeta a la izquierda, la fecha en gris
                        a la derecha, y las tarjetas de tramo abajo. */}
                    <div style={{ display:"flex", alignItems: impresion ? "baseline" : "center", justifyContent:"space-between",
                      gap:10, flexWrap:"wrap",
                      ...(impresion
                        ? { padding:"0 2px 6px", marginBottom:0, breakInside:"avoid", breakAfter:"avoid" }
                        : { padding:"14px 16px 0" }) }}>
                      <span style={impresion
                        ? { color:G.b, fontSize:fz(10, 10.5), fontWeight:700, letterSpacing:".14em",
                            textTransform:"uppercase" }
                        : { background:grad, color:"#fff", padding:"5px 11px", borderRadius:999,
                            fontSize:fz(10, 10.5), fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" }}>
                        {etiqueta}
                      </span>
                      <span style={{ fontSize:fzp(12.5, 13, 12), fontWeight:600, color:"#6B6F99" }}>
                        {fechaTrayecto(primero, anioItinerario)}
                      </span>
                    </div>

                    {seg.map((s, si) => {
                      const escala = si < seg.length - 1 ? escalaTexto(s.llegada, seg[si + 1].salida) : null;
                      const cruzaMedianoche = String(s.llegada) < String(s.salida);
                      return (
                        <div key={s.id} style={impresion
                          ? { ...cajaPapel, breakInside:"avoid",
                              marginBottom: si < seg.length - 1 ? 8 : 0 }
                          : undefined}>
                          <div style={{ padding: impresion ? (escala ? "13px 16px 12px" : "13px 16px 15px") : "14px 16px 16px",
                            borderTop: !impresion && si > 0 ? "1px solid rgba(17,17,36,.07)" : "none" }}>

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

                          {/* Espera entre tramos. En pantalla es una caja
                              ámbar —ahí compite con nada—; en el papel una
                              caja de color por cada escala pesaba más que el
                              vuelo, así que baja a un renglón con el reloj y
                              una línea fina arriba. */}
                          {escala && (
                            impresion ? (
                              <div style={{ display:"flex", alignItems:"center", gap:7, margin:"0 16px",
                                padding:"8px 0 12px", borderTop:"1px solid rgba(17,17,36,.07)" }}>
                                <Clock size={12} style={{ color:"#8A8DB5", flexShrink:0 }} />
                                <span style={{ fontSize:fz(12, 12), color:"#6B6F99", fontWeight:500,
                                  lineHeight:1.35, overflowWrap:"anywhere" }}>
                                  Espera de <b style={{ fontWeight:700, color:"#3D4066" }}>{escala}</b> en el aeropuerto
                                </span>
                              </div>
                            ) : (
                              <div style={{ display:"flex", alignItems:"center", gap:9, margin:"0 16px 15px",
                                padding:"9px 13px", background:"#FBF3E6", border:"1px dashed #E3C892",
                                borderRadius:12 }}>
                                <Clock size={15} style={{ color:"#B8863A", flexShrink:0 }} />
                                <span style={{ fontSize:fz(12, 12.5), color:"#8A6423", fontWeight:600,
                                  lineHeight:1.35, overflowWrap:"anywhere" }}>
                                  Espera de <b style={{ fontWeight:800, color:"#B8863A" }}>{escala}</b>
                                </span>
                              </div>
                            )
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
          <div data-ap>
            <SecTitulo texto="Precio del vuelo" />
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
              {Number(q.precioVuelo?.infante) > 0 && (
                <>
                  <div style={{ borderBottom:"1px solid rgba(17,17,36,.07)", margin:"0 14px" }} />
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px" }}>
                    <span style={{ fontSize:fz(12, 12.5), color:"#3D4066", fontWeight:600 }}>Por infante</span>
                    <span className="mono" style={{ fontSize:fz(14, 15), fontWeight:700, color:"#1A1A2E" }}>
                      {money(q.precioVuelo.infante)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* opciones — cards verticales, foto protagonista */}
        {q.opciones.length > 0 && !q.soloVuelos && (
          <div ref={(el) => { anclas.current["b-alojamiento"] = el; }} data-sec="hoteles" data-ap
            data-print-corte={cortarAntesDeOpciones ? "pagina" : undefined}>
            <SecTitulo texto="Opciones de alojamiento" />
            <div className="sec-sub" style={{ fontSize:fz(12, 12.5), color:"#8A8DB5", margin:"-6px 0 14px",
              lineHeight:1.5 }}>
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

            {/* en papel la lista de opciones va en flujo normal y no en flex:
                el motor de impresión parte una columna de bloques mucho mejor
                que un contenedor flex, y acá las opciones tienen que poder
                partirse entre hotel y hotel. El `gap` pasa a margen. */}
            <div style={{ ...(impresion
              ? { display:"block" }
              : { display:"flex", flexDirection:"column", gap:14 }), marginBottom: impresion ? 8 : 24 }}>
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
                const regimenesOpcion = [...new Set((o.hoteles || []).map((h) => h.regimen).filter(Boolean))];
                const regimenTxt = regimenesOpcion.length > 1 ? "Régimen según hotel" : (regimenesOpcion[0] || o.regimen);
                return (
                  /* con switcher hay una sola card: la clave fija deja que el precio ruede al cambiar */
                  <div key={varias && !impresion ? "op-visible" : o.id} className="op-card" style={{ borderRadius: impresion ? 14 : 20, overflow:"hidden", background:"#fff",
                    ...(impresion
                      ? { border:"1px solid rgba(17,17,36,.12)" }
                      : {
                          boxShadow: on
                            ? `inset 0 0 0 1px ${G.b}22, 0 2px 5px rgba(58,38,120,.07), 0 26px 52px -26px ${G.b}80`
                            : "inset 0 0 0 1px rgba(17,17,36,.055), 0 1px 2px rgba(58,38,120,.05), 0 12px 28px -20px rgba(58,38,120,.4)",
                        }),
                    /* En papel la opción viaja ENTERA: header, hoteles, tarifas
                       y cierre en la misma hoja. Si al pie de la anterior queda
                       blanco, queda blanco. La excepción es la opción que no
                       entra en una carilla (más de cuatro hoteles, o fotos que
                       la pasan de ~900 px): ahí se saca el `avoid` de la
                       tarjeta y sigue valiendo el esquema por subpartes —header
                       con su primer hotel, cada hotel, el bloque de tarifas—,
                       que parte entre hotel y hotel. */
                    ...(impresion
                      ? { marginBottom:16, ...(opcionEntera(o) ? { breakInside:"avoid" } : null) }
                      : null) }}>

                    {/* foto full-width con overlay — o, si están apagadas, header compacto.
                        `break-after:avoid` lo pega a lo que sigue: el primer hotel del
                        detalle. Un header al pie de la hoja, solo, no dice nada. */}
                    <button className="op-cab" onClick={() => !impresion && setAbierta(on ? null : o.id)}
                      style={{ width:"100%", textAlign:"left", display:"block", cursor: impresion ? "default" : "pointer",
                        breakInside:"avoid", breakAfter:"avoid" }}>
                      {q.fotosHotel ? (
                        /* la foto de portada de la opción: en pantalla 150 px,
                           en el papel 130 — con el precio encima sigue siendo
                           la pieza más grande de la opción y esos 20 px son
                           los que deciden si el cierre entra en la hoja */
                        <Foto seed={H0?.seed ?? oi} url={H0?.foto} alt={H0?.nombre || ""} w="100%" h={fzp(112, 150, 130)} r={0}>
                          <span style={{ position:"absolute", top:10, left:10, display:"inline-flex", alignItems:"center",
                            gap:5, padding:"4px 11px", borderRadius:999, background:"rgba(255,255,255,.94)",
                            fontSize:fz(10.5, 11), fontWeight:800, color:"#1A1A2E",
                            boxShadow:"0 2px 8px rgba(0,0,0,.18)" }}>
                            <span style={{ width:fzp(15, 15, 18), height:fzp(15, 15, 18), borderRadius:99, background:grad, color:"#fff",
                              display:"grid", placeItems:"center", fontSize:fzp(9, 9, 12) }}>{oi + 1}</span>
                            {o.nombre}
                          </span>
                          <ChipPrecio valor={pv} late={animar && !impresion}
                            style={{ position:"absolute", right:10, bottom:10, padding:"8px 14px 7px", borderRadius:"14px 14px 14px 6px",
                            background:"rgba(255,255,255,.97)", boxShadow:"0 8px 22px -8px rgba(26,10,50,.45)", textAlign:"right" }}>
                            <span style={{ display:"block", fontSize:fz(19, 22), fontWeight:800, color:G.b,
                              letterSpacing:"-.035em", lineHeight:1.05 }}><Odometro valor={pv} /></span>
                            <span style={{ display:"block", fontSize:fz(9, 9.5), color:"#6B6F99", fontWeight:600,
                              letterSpacing:".01em", marginTop:2 }}>{caption}</span>
                          </ChipPrecio>
                        </Foto>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:10,
                          padding: impresion ? "14px 16px 12px" : "14px 16px 13px",
                          background:"#fff", borderBottom: impresion ? "none" : "1px solid rgba(17,17,36,.07)" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0, flex:1 }}>
                            <span style={{ width: impresion ? 22 : 20, height: impresion ? 22 : 20, borderRadius:99, background:grad, color:"#fff",
                              display:"grid", placeItems:"center", fontSize:fzp(10, 10, 12), fontWeight:800, flexShrink:0 }}>{oi + 1}</span>
                            <span style={{ fontSize:fzp(12.5, 13, 13), fontWeight:700, whiteSpace:"nowrap",
                              overflow:"hidden", textOverflow:"ellipsis" }}>{o.nombre}</span>
                          </span>
                          <ChipPrecio valor={pv} late={animar && !impresion}
                            style={{ textAlign:"right", flexShrink:0 }}>
                            {/* En el papel el precio es el protagonista de la
                                opción: 24 px en violeta, con la leyenda de a
                                quién corresponde justo debajo. */}
                            <span style={{ display:"block", fontSize:fzp(19, 22, 24), fontWeight:800, color:G.b,
                              letterSpacing:"-.035em", lineHeight:1.05 }}><Odometro valor={pv} /></span>
                            <span style={{ display:"block", fontSize:fzp(9, 9.5, 12), color:"#6B6F99", fontWeight: impresion ? 500 : 600,
                              letterSpacing:".01em", marginTop:2 }}>{caption}</span>
                          </ChipPrecio>
                        </div>
                      )}

                      {/* Resumen bajo la foto: régimen y ocupación.
                          En el papel no va — el detalle está siempre abierto y
                          cada hotel ya dice su régimen, y la ocupación la dice
                          el encabezado de la tabla de tarifas. Repetirlo dos
                          veces por opción era la mitad del ruido de la hoja. */}
                      {!impresion && (
                      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 14px" }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          {/* hoteles anidados (Santi): con el detalle abierto ya se listan uno por uno,
                              así que este resumen unido con "+" solo se muestra con la card cerrada */}
                          {!on && (
                            <div style={{ fontSize:fz(12.5, 13), fontWeight:700, whiteSpace:"nowrap",
                              overflow:"hidden", textOverflow:"ellipsis" }}>
                              {(tramos.length ? tramos : []).map((_, k) => o.hoteles?.[k])
                                .map((h) => h && (h.libre || hotelById(h.hotelId)?.nombre)).filter(Boolean).join("  +  ") || "Hoteles a definir"}
                            </div>
                          )}
                          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:fz(10.5, 11),
                            color:"#8A8DB5", marginTop:2 }}>
                            <Utensils size={10} /> {regimenTxt}
                            {o.habitaciones?.length ? <> · <Bed size={10} /> {o.habitaciones.map((h) => h.ocupacion).join(" + ")}</> : null}
                          </div>
                        </div>
                        {!impresion && (
                        <span className="op-ver" style={{ display:"inline-flex", alignItems:"center", gap:4, flexShrink:0,
                          fontSize:fz(11, 11.5), fontWeight:700, color:G.b }}>
                          {on ? "Cerrar" : "Ver detalle"}
                          <ChevronDown size={13} style={{ transform: on ? "rotate(180deg)" : "none",
                            transition:"transform .26s cubic-bezier(.2,.8,.2,1)" }} />
                        </span>
                        )}
                      </div>
                      )}
                    </button>

                    {/* detalle expandido */}
                    {on && (
                      <div className="a-slide" style={{ padding: impresion ? "0 16px 14px" : "0 14px 14px" }}>
                        {(tramos.length ? tramos : [null]).map((t, i) => {
                          const h = o.hoteles?.[i] || {};
                          const H = hotelById(h.hotelId);
                          return (
                            /* En el papel el hotel deja de ser una tarjeta
                               adentro de otra tarjeta: es una fila con una
                               línea fina arriba, que es lo que separa dos
                               hoteles de la misma opción. */
                            <div key={i} className={impresion ? "pr-hot" : undefined}
                              style={impresion
                                ? { display:"flex", gap:12, padding: i === 0 ? "2px 0 10px" : "10px 0",
                                    borderTop: i === 0 ? "none" : "1px solid rgba(17,17,36,.07)",
                                    breakInside:"avoid" }
                                : { display:"flex", gap:12, padding:"12px", marginBottom:8,
                                    borderRadius:13, background:"#FAFBFE", border:"1px solid rgba(17,17,36,.06)",
                                    breakInside:"avoid" }}>
                              {q.fotosHotel && <Foto seed={H?.seed ?? 99} url={H?.foto} alt={H?.nombre || ""} w={fz(58, 76)} h={fz(58, 62)} r={11} />}
                              <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", gap: impresion ? 7 : 6, flexWrap:"wrap" }}>
                                  <span className={impresion ? "disp" : undefined}
                                    style={{ fontSize:fzp(13, 13.5, 15), fontWeight: impresion ? 600 : 700,
                                      letterSpacing: impresion ? "-.01em" : undefined }}>
                                    {h.libre || H?.nombre || "A definir"}
                                  </span>
                                  {H && <Estrellas n={H.cat} size={impresion ? 9 : 10} />}
                                  {!H && h.libre && (h.cat || 0) > 0 && <Estrellas n={h.cat} size={impresion ? 9 : 10} />}
                                </div>
                                {/* Papel: régimen, destino y fechas en un solo
                                    renglón. En pantalla son tres filas con su
                                    icono y una píldora para las fechas; sobre
                                    la hoja esas tres filas por hotel eran
                                    media carilla de aire y tres cajas más
                                    adentro de la caja de la opción. */}
                                {impresion ? (
                                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap",
                                    marginTop:4, fontSize:fz(11, 12), color:"#6B6F99", fontWeight:500 }}>
                                    {(h.regimen || o.regimen) && (
                                      <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                                        <Utensils size={11} style={{ color:G.b }} /> {h.regimen || o.regimen}
                                      </span>
                                    )}
                                    {t && (
                                      <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                                        <span style={{ color:"#C9CBE0" }}>·</span>
                                        <MapPin size={11} style={{ color:G.b }} /> {t.ciudad} · {t.noches} {t.noches === 1 ? "noche" : "noches"}
                                      </span>
                                    )}
                                    {t?.checkin && (
                                      <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                                        <span style={{ color:"#C9CBE0" }}>·</span>
                                        <Calendar size={11} style={{ color:G.b }} />
                                        <span className="mono" style={{ fontSize:12, color:"#3D4066", fontWeight:500 }}>
                                          {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                {(h.regimen || o.regimen) && (
                                  <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4,
                                    fontSize:fz(11, 11.5), color:"#6B6F99", fontWeight:600 }}>
                                    <Utensils size={10} style={{ color:G.b }} /> {h.regimen || o.regimen}
                                  </div>
                                )}
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
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {o.habitaciones?.length ? (
                          /* las tarifas son la unidad que cierra la opción: el título
                             y las habitaciones caen juntos o pasan juntos de hoja */
                          <div style={{ breakInside:"avoid" }}>
                            <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".08em", textTransform:"uppercase",
                              color:"#8A8DB5", margin: impresion ? "8px 0 6px" : "4px 0 8px" }}>Tarifas</div>
                            {o.habitaciones.map((hab, hi) => (
                              <div key={hab.id ?? hi} className="tar-box" style={{ borderRadius:13, background:"#FAFBFE",
                                border:"1px solid rgba(17,17,36,.07)", overflow:"hidden",
                                marginBottom: hi < o.habitaciones.length - 1 ? 10 : 0 }}>
                                <div className="tar-hd" style={{ padding:"10px 14px", fontSize:fz(11.5, 12), fontWeight:700, color:"#3D4066",
                                  borderBottom:"1px solid rgba(17,17,36,.07)" }}>
                                  Habitación {hab.ocupacion}{hab.tipo ? ` · ${hab.tipo}` : ""}
                                </div>
                                {(hab.tarifas || []).map((tar, ti) => {
                                  const valor = ventaTarifa(tar, o.factor);
                                  const ultima = ti === (hab.tarifas || []).length - 1;
                                  return (
                                    <div key={tar.id ?? ti}>
                                      <div className="tar-row" style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between",
                                        gap:12, padding:"9px 14px" }}>
                                        <span style={{ fontSize:fz(11.5, 12), color:"#3D4066", fontWeight:500 }}>{etiquetaTarifa(tar)}</span>
                                        <span className="mono" style={{ fontSize:fz(12.5, 13.5), fontWeight:700, color:"#1A1A2E",
                                          fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>{money(valor)}</span>
                                      </div>
                                      {!ultima && <div className="tar-sep" style={{ borderBottom:"1px solid rgba(17,17,36,.06)", margin:"0 14px" }} />}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding:"12px 14px", borderRadius:13, background:grad, color:"#fff", breakInside:"avoid" }}>
                            <span style={{ fontSize:fz(11.5, 12), fontWeight:600, opacity:.92 }}>Precio final por adulto</span>
                            <span style={{ fontSize:fz(19, 21), fontWeight:800, letterSpacing:"-.03em" }}><Odometro valor={precioOpcion(o)} /></span>
                          </div>
                        )}
                        {impresion ? null : confirmada === o.id ? (
                          <div className="a-pop" style={{ marginTop:9, padding:"12px 14px", borderRadius:13,
                            background:"rgba(59,191,173,.1)", border:"1.5px solid rgba(42,158,142,.4)",
                            display:"flex", gap:10, alignItems:"flex-start" }}>
                            <CheckCheck size={18} className="a-pulse" style={{ color:"#2A9E8E", flexShrink:0, marginTop:1 }} />
                            <div>
                              <div style={{ fontSize:fz(12.5, 13), fontWeight:800, color:"#1F7D70" }}>¡Recibimos tu confirmación!</div>
                              <div style={{ fontSize:fz(11, 11.5), color:"#3D4066", lineHeight:1.5, marginTop:2 }}>
                                {V.nombre.split(" ")[0]} te contacta a la brevedad para coordinar la seña y el pago.
                              </div>
                              {V.linkDatos && (
                                <a href={V.linkDatos} target="_blank" rel="noreferrer"
                                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                                    marginTop:10, padding:"11px 14px", borderRadius:12, color:"#fff",
                                    fontSize:fz(12.5, 13), fontWeight:800, background:grad, textDecoration:"none" }}>
                                  <Link2 size={15} /> Cargar los datos de los pasajeros
                                </a>
                              )}
                              {V.linkDatos && (
                                <div style={{ fontSize:fz(10, 10.5), color:"#8A8DB5", textAlign:"center", marginTop:6 }}>
                                  Nombre, documento y pasaporte de cada pasajero, tal cual figuran en el documento de viaje. Con eso arranca la reserva.
                                </div>
                              )}
                              {/* El segundo formulario, en secundario: primero los pasajeros,
                                  después la tarjeta. */}
                              {V.linkPago && (
                                <a href={V.linkPago} target="_blank" rel="noreferrer"
                                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                                    marginTop:8, padding:"10px 14px", borderRadius:12,
                                    fontSize:fz(12, 12.5), fontWeight:800, color:G.b, textDecoration:"none",
                                    background:"#fff", border:`1.5px solid ${G.b}44` }}>
                                  <CreditCard size={14} /> Cargar los datos de pago
                                </a>
                              )}
                              {(V.linkDatos || V.linkPago) && (
                                <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginTop:8 }}>
                                  <Lock size={11} style={{ color:"#8A8DB5", flexShrink:0, marginTop:1 }} />
                                  <div style={{ fontSize:fz(9.5, 10), color:"#8A8DB5", lineHeight:1.5 }}>
                                    Los dos formularios son de {V.nombre.split(" ")[0]} y viajan cifrados:
                                    los datos llegan directo a tu asesor, no a un buzón general.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <button className="a-fade btn-conf" onClick={() => confirmar(o)} disabled={!!enviando}
                              data-enviando={enviando === "conf" ? "1" : undefined}
                              style={{ width:"100%", marginTop:11, minHeight:50, padding:"14px", borderRadius:14, color:"#fff",
                                fontSize:fz(14, 14.5), fontWeight:800, letterSpacing:"-.012em",
                                opacity: enviando ? .7 : 1, cursor: enviando ? "wait" : "pointer",
                                background:"linear-gradient(152deg,#4FDDC8 0%,#2A9E8E 62%,#1F7D70 100%)",
                                boxShadow:"0 10px 24px -8px rgba(42,158,142,.55), inset 0 1px 0 rgba(255,255,255,.32)" }}>
                              {enviando === "conf" ? "Confirmando…" : "Confirmar esta opción"}
                            </button>
                            <div style={{ fontSize:fz(10, 10.5), color:"#8A8DB5", textAlign:"center", marginTop:7,
                              lineHeight:1.5 }}>
                              Al confirmar aceptás esta cotización — vale como firma digital.
                            </div>
                            {revision === o.id ? (
                              <div className="a-pop" style={{ marginTop:8, padding:"9px 12px", borderRadius:11,
                                background:"rgba(120,90,229,.08)", fontSize:fz(11, 11.5), color:"#5B3FBF",
                                textAlign:"center", fontWeight:600 }}>
                                Le avisamos a {V.nombre.split(" ")[0]} — te contacta para ajustar la cotización.
                              </div>
                            ) : (
                              <button className="lnk-rev" onClick={() => pedirRevision(o)} disabled={!!enviando}
                                style={{ display:"block", margin:"2px auto 0", minHeight:44, padding:"0 14px",
                                  fontSize:fz(11.5, 11.5), fontWeight:700,
                                  color:G.b, textDecoration:"underline", textUnderlineOffset:3,
                                  opacity: enviando ? .65 : 1 }}>
                                {enviando === "rev" ? "Avisando…" : "Solicitar una revisión"}
                              </button>
                            )}
                            {errorAcc && (
                              <div className="a-pop" style={{ marginTop:8, padding:"9px 12px", borderRadius:11,
                                background:"rgba(244,62,85,.08)", fontSize:fz(11, 11.5), color:"#CC2030",
                                textAlign:"center", fontWeight:600, lineHeight:1.5 }}>
                                {errorAcc}
                              </div>
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

        {/* ── cierre ───────────────────────────────────────────────────────
            Notas, condiciones, formas de pago y firma.

            Las notas quedan afuera del grupo y siguen siendo partibles, con su
            título pegado al primer párrafo (`SecTitulo` lleva
            `break-after:avoid`): pueden medir tres renglones o media carilla.

            Las otras tres son el pie del documento y viajan juntas cuando la
            estimación dice que entran en media carilla (`cierreEntero`).
            Sueltas, el corte las repartía y la última hoja terminaba con la
            firma sola arriba de una página en blanco — el mismo problema que
            el cliente marcó como "la segunda casi vacía", corrido al final.
            Juntas miden unos 430 px: si no entran al pie de la hoja pasan
            enteras a la siguiente y esa última carilla queda a poco menos de
            media página, que ya es una hoja con cuerpo. Con una lista de
            condiciones larga la estimación se pasa y vuelve el esquema de
            antes, bloque por bloque. */}
        <div>

        {/* notas para el pasajero — bloc de HTML libre */}
        {hayNotas && (
          <div ref={(el) => { anclas.current["b-notascliente"] = el; }} data-sec="notas" data-ap>
            <SecTitulo texto="Notas" />
            <div style={{ fontSize:fz(12.5, 13), lineHeight:1.6, color:"#3D4066", marginBottom:22, overflowWrap:"anywhere" }}
              dangerouslySetInnerHTML={{ __html: q.notasCliente }} />
          </div>
        )}

        {/* el pie del documento: condiciones + formas de pago + firma */}
        <div style={impresion && cierreEntero ? { breakInside:"avoid" } : undefined}>

        {/* condiciones — si el máster las borró todas, el bloque no se dibuja */}
        {condiciones.length > 0 && (
        /* En el papel las condiciones dejan la caja gris: son letra chica de
           cierre, no un bloque destacado. Quedan bajo una línea fina y, si son
           cortas, en dos columnas — así el cierre no se come una carilla. */
        <div data-sec="condiciones" data-ap
          style={impresion
            ? { borderTop:"1px solid rgba(17,17,36,.10)", padding:"12px 0 0", marginBottom:8, breakInside:"avoid" }
            : { background:"rgba(17,17,36,.028)", borderRadius:"14px", padding:"15px 17px 16px",
                marginBottom:20, breakInside:"avoid" }}>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Condiciones</div>
          {/* las escribe el máster en /backend/cotizador/ajustes, una por línea */}
          <ul className={impresion && condicionesCortas ? "pr-2col" : undefined}
            style={{ margin:0, paddingLeft:15, fontSize:fz(10.5, 11), lineHeight: impresion ? 1.6 : 1.65, color:"#6B6F99" }}>
            {condiciones.map((linea, i) => <li key={i}>{linea}</li>)}
          </ul>
        </div>
        )}

        {/* pago — logos reales del sitio público, en cajas uniformes.
            El título y las dos filas de logos son una sola unidad de lectura. */}
        <div data-ap style={{ breakInside:"avoid" }}>
        <SecTitulo texto="Formas de pago" />
        <div data-sec="pago" style={{ marginBottom: impresion ? 8 : 22 }}>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Tarjetas de crédito</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap: impresion ? 10 : 8, marginBottom:14 }}>
            {PAGO_TARJETAS.map((l) => (
              /* En el papel el logo va suelto y a 40 px de alto: la cajita con
                 borde y sombra alrededor de cada marca sumaba ocho bordes más
                 a una hoja que ya tenía demasiados. */
              <div key={l.src} style={impresion
                ? { display:"inline-flex", alignItems:"center", justifyContent:"center", height:40 }
                : { display:"inline-flex", alignItems:"center", justifyContent:"center",
                    width:fz(68, 76), height:fz(40, 44), padding:"6px 10px", borderRadius:10, background:"#fff",
                    border:"1px solid rgba(17,17,36,.09)", boxShadow:"0 1px 3px rgba(17,17,36,.05)" }}>
                <img src={l.src} alt={l.alt} loading="eager" decoding="async"
                  style={{ maxWidth:"100%", maxHeight:"100%", height: impresion ? "100%" : undefined,
                    objectFit:"contain", display:"block" }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Transferencia bancaria</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap: impresion ? 10 : 8 }}>
            {PAGO_BANCOS.map((l) => (
              <div key={l.src} style={impresion
                ? { display:"inline-flex", alignItems:"center", justifyContent:"center", height:40 }
                : { display:"inline-flex", alignItems:"center", justifyContent:"center",
                    width:fz(68, 76), height:fz(40, 44), padding:"6px 10px", borderRadius:10, background:"#fff",
                    border:"1px solid rgba(17,17,36,.09)", boxShadow:"0 1px 3px rgba(17,17,36,.05)" }}>
                <img src={l.src} alt={l.alt} loading="eager" decoding="async"
                  style={{ maxWidth:"100%", maxHeight:"100%", height: impresion ? "100%" : undefined,
                    objectFit:"contain", display:"block" }} />
              </div>
            ))}
          </div>
        </div>
        </div>{/* /formas de pago */}

        {/* firma + cierre: en papel viajan juntos */}
        <div data-sec="firma" data-ap style={{ breakInside:"avoid" }}>
        <div className="firma-caja" style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 17px", borderRadius:17, breakInside:"avoid",
          border:"1px solid rgba(17,17,36,.085)",
          background:"linear-gradient(170deg,#fff 0%,#FAF9FE 100%)" }}>
          {/* foto del vendedor, la que cargó en Perfiles. Sin foto, el degradado
              con las iniciales encima. */}
          {V.foto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={V.foto} alt="" style={{ width:fzp(54, 54, 50), height:fzp(54, 54, 50), borderRadius:"50%", flexShrink:0,
              objectFit:"cover", boxShadow:"0 0 0 3px rgba(120,90,229,.13), inset 0 0 0 2px rgba(255,255,255,.65)" }} />
          ) : (
            <div style={{ width:fzp(54, 54, 50), height:fzp(54, 54, 50), borderRadius:"50%", flexShrink:0, overflow:"hidden",
              position:"relative", background:fotoBg(String(V.id || "").length + 20),
              boxShadow:"0 0 0 3px rgba(120,90,229,.13), inset 0 0 0 2px rgba(255,255,255,.65)" }}>
              <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", color:"#fff",
                fontWeight:700, fontSize:15, textShadow:"0 1px 6px rgba(0,0,0,.35)" }}>{V.inicial}</div>
            </div>
          )}
          <div style={{ minWidth:0, flex:1 }}>
            <div className={impresion ? "disp" : undefined}
              style={{ fontSize:fzp(14.5, 15.5, 15.5), fontWeight: impresion ? 600 : 700, letterSpacing:"-.015em" }}>
              {V.nombre}
            </div>
            <div style={{ fontSize:fz(11.5, 12), color:"#8A8DB5", marginTop:1 }}>{V.cargo} · TravelOz</div>
            {telWa && (
              <a href={`https://wa.me/${telWa}`} target="_blank" rel="noreferrer"
                title="Escribirle por WhatsApp" className="mono"
                style={{ fontSize:fz(10.5, 11), color:"#6B6F99", marginTop:2, display:"block", textDecoration:"none" }}>
                {V.tel}
              </a>
            )}
            {V.email && (
              <a href={`mailto:${V.email}`} className="mono"
                style={{ fontSize:fz(9.5, 10), color:"#6B6F99", marginTop:2, display:"block",
                  textDecoration:"underline", textDecorationColor:"rgba(107,111,153,.4)", textUnderlineOffset:2 }}>
                {V.email}
              </a>
            )}
          </div>
          {telWa && (
            <a href={`https://wa.me/${telWa}`} target="_blank" rel="noreferrer"
              title="Escribirle por WhatsApp" style={{ width:34, height:34, borderRadius:11, background:"#25D36615",
              color:"#128C7E", display:"grid", placeItems:"center", flexShrink:0 }}><Smartphone size={16} /></a>
          )}
        </div>
        {/* Cierre. En pantalla firma el wordmark; en el papel el logo ya
            está en el membrete y repetirlo abajo —encima con el "oz" pintado
            por `background-clip:text`, que es lo primero que se rompe cuando
            imprime el diálogo del navegador— no agrega nada. Queda la
            dirección web, centrada. */}
        {!impresion && <div style={{ textAlign:"center", marginTop:16 }}><Wordmark size={13} /></div>}
        <div style={{ textAlign:"center", fontSize:fz(9.5, 10), color: impresion ? "#8A8DB5" : "#B0B4CD",
          letterSpacing: impresion ? ".02em" : undefined, marginTop: impresion ? 16 : 4 }}>{G.web}</div>
        </div>

        </div>{/* /pie: condiciones + pago + firma */}

        </div>{/* /cierre: notas + pie */}
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

/* La plantilla del saludo dice "Hola {nombre}, ¿cómo estás?". Cuando la
   cotización no tiene nombre cargado, esa coma queda sosteniendo un vocativo
   que no existe. En vez de dejarla colgada, el saludo cierra en su propia
   exclamación y lo que sigue arranca en mayúscula. */
function saludoSinNombre(txt) {
  return String(txt)
    .replace(/^(\s*)¡?\s*Hola\s*[,;]\s*/i, "$1¡Hola! ")
    .replace(/^(\s*¡Hola! [¿¡]?)([a-záéíóúüñ])/u, (m, cab, c) => cab + c.toLocaleUpperCase("es"));
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

/* un punto de la ruta vertical: ciudad + hora arriba, terminal abajo.
   La ciudad y el nombre de la terminal salen de la tabla Aeropuerto; un código
   que no esté cargado se muestra tal cual, sin romper la ficha.

   Sin nombre en la tabla no se inventa ninguno: con MBJ el renglón decía
   "MBJ — 11:18 hs / Aeropuerto MBJ (MBJ)". El subtítulo se omite y queda solo
   la línea grande con el código, que al menos es dato real. */
function PuntoRuta({ cod, hora, plus, coral, fz }) {
  const aeropuertos = useAeropuertos();
  const a = aeropuertos[cod];
  const ciudad = a?.ciudad || cod;
  const terminal = a?.nombre ? `${a.nombre} (${cod})` : "";
  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:fz(15, 16), fontWeight:700, lineHeight:1.25, overflowWrap:"anywhere" }}>{ciudad}</span>
        <span style={{ fontSize:fz(12.5, 13), fontWeight:600, color:"#6B6F99", whiteSpace:"nowrap" }}>
          — {hora} hs
          {plus && (
            <span style={{ fontSize:fz(10, 10.5), fontWeight:700, color:coral, marginLeft:3 }}>+1 día</span>
          )}
        </span>
      </div>
      {terminal && (
        <div style={{ fontSize:fz(12.5, 13), color:"#8A8DB5", fontWeight:500, marginTop:1,
          lineHeight:1.35, overflowWrap:"anywhere" }}>
          {terminal}
        </div>
      )}
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

/* El chip del precio late cuando el número cambia de verdad. El odómetro rueda
   solo, y sin nada alrededor ese giro pasa desapercibido justo en el momento
   que importa: el pasajero comparando dos opciones. Ojo con el remonte — un
   `key` que cambie acá mata el rodado, así que el latido va por estado. */
function ChipPrecio({ valor, late = false, style, children }) {
  const [on, setOn] = useState(false);
  const previo = useRef(valor);
  useEffect(() => {
    if (previo.current === valor) return undefined;
    previo.current = valor;
    if (!late) return undefined;
    setOn(true);
    const t = setTimeout(() => setOn(false), 460);
    return () => clearTimeout(t);
  }, [valor, late]);
  return (
    <span className="precio-chip" data-latido={on ? "1" : undefined} style={style}>{children}</span>
  );
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

/* El título de una sección.
   Era el patrón de siempre: barrita de color, texto de 10 px en versalitas y
   una línea gris estirada hasta el borde. Lo dibuja cualquier plantilla y no
   deja jerarquía: todas las secciones pesaban lo mismo que un pie de tabla.
   Ahora es un título de verdad —sentence case, 15 px, semibold— con un guion
   corto de marca arriba. La regla se queda cortita a propósito: marca dónde
   arranca la sección sin cerrarla de lado a lado. */
function SecTitulo({ texto }) {
  return (
    <div className="sec-t" style={{ breakAfter:"avoid" }}>
      <span className="sec-t-rule" />
      <span className="sec-t-tx">{texto}</span>
    </div>
  );
}

export { SalidaPasajero, SecTitulo, hayNotasReales };
