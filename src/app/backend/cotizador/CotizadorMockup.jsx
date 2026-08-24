"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plane, Building2, User, MessageSquare, FileText, Copy, Plus, Send, ArrowLeft, Command, Zap, X,
  Smartphone, LayoutGrid, Loader2, CheckCheck, AlertCircle, Lock, Gauge, Ticket, Files, Monitor,
  StickyNote, ListChecks, Eye, EyeOff, Keyboard
} from "lucide-react";
import { CSS } from "./_mockup/styles";
import {
  ANIO_ACTUAL, registrarVendedores, uid, toISO, parseISO, ESTADOS,
  serviciosDefault, habitacionNueva, ventaTarifa, PNR_DEMO, parsePNR, FACTOR_DEFAULT,
} from "./_mockup/data";
import { CotizadorCtx, indexarAeropuertos, indexarAerolineas } from "./_mockup/contexto";
import { useCatalogoCotizador } from "./_mockup/catalogo";
import { filaDesdePresupuesto } from "./_mockup/adaptadores";
import { calcularTramos } from "./_mockup/tramos";
import {
  listarPresupuestos, obtenerPresupuesto, crearPresupuesto, guardarPresupuesto,
  duplicarPresupuesto, buscarEnHistorial,
  listarPlantillas, crearPlantilla, eliminarPlantilla, usarPlantilla, leerPlantilla,
  toggleFavorito as toggleFavoritoAction,
} from "@/actions/presupuesto.actions";
import { Btn, Pill, Toasts } from "./_mockup/ui";
import { SalidaPasajero } from "./_mockup/telefono";
import {
  BloqueCliente, BloqueEncabezado, BloqueAlojamiento, BloqueMensaje, BloqueVuelos, BloqueServicios,
  NotasRail, BloqueNotasCliente, BannerIA, Paleta, BannerPasajero, HojaAtajos
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

   El contenido de la cotización (el objeto `q`) es lo que se guarda como JSON
   en Presupuesto.contenido. Las columnas de la fila las deriva el server.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE RAÍZ
   ═══════════════════════════════════════════════════════════════════════════ */

/* Cotización nueva. El número queda vacío: lo asigna la base en el primer
   guardado (COT-2026-0148), y hasta entonces el encabezado dice
   "Nueva cotización". Los textos y el factor salen de los ajustes del máster. */
function cotizacionVacia(ajustes) {
  return {
    numero: "",
    estado: "borrador",
    origen: null,
    ia: null,                 /* v2 · lo que la IA leyó de la consulta de WhatsApp */
    cliente: { nombre:"", apellido:"", email:"", telefono:"" },
    titulo: { destino:"", mes:null, anio:ANIO_ACTUAL },
    fechaSalida: "",
    mensaje: "",
    mensajeHtml: "",
    mensajeAuto: ajustes?.plantillaMensaje || "",  /* v4 · texto con {nombre} y {link}, editable por cotización */
    soloVuelos: false,        /* v4 · cotización de solo vuelos: sin servicios ni alojamiento */
    precioVuelo: { adulto:"", menor:"", infante:"" },
    fotosHotel: false,        /* v4 · Gero las prefiere apagadas */
    pnrRaw: "",
    vuelos: [],
    cabina: null,             /* v3 · se replica en la línea de Aéreo de los servicios */
    equipaje: null,
    destinos: [],
    servicios: serviciosDefault(7),
    notas: [],
    notasLibres: "",          /* v4 · bloc de notas interno, sin cápsulas ni autores */
    notasCliente: "",         /* v4 · campo libre HTML del pasajero, admite imágenes */
    vigencia: ajustes?.vigenciaDefault || 48,
    opciones: [],
  };
}

/* "15 noches de alojamiento" no le sirve a nadie cuando hay varias ciudades:
   el cliente quiere leer 03 noches en Madrid, 03 en Barcelona… */
const nn = (n) => String(Number(n) || 0).padStart(2, "0");
/* en el paréntesis va el régimen corto: "Solo alojamiento", no todo el paréntesis de adentro */
function regimenCorto(r) {
  const t = String(r || "").trim(); const i = t.indexOf(" (");
  return i > 0 ? t.slice(0, i) : t;
}
function lineaNoches(destinos) {
  const ds = (destinos || []).filter(Boolean);
  if (!ds.length) return "07 noches de alojamiento";
  const regs = [...new Set(ds.map((d) => (d.regimen || "").trim()).filter(Boolean))];
  if (ds.length === 1)
    return `${nn(ds[0].noches)} noches de alojamiento${regs.length ? ` · ${regs[0]}` : ""}`;
  /* todos con el mismo régimen: se nombra una sola vez al final */
  if (regs.length <= 1) {
    const txt = ds.map((d) => `${nn(d.noches)} noches en ${d.ciudad || "destino"}`).join(" · ");
    return regs.length ? `${txt} · ${regs[0]}` : txt;
  }
  /* regímenes mezclados: cada destino aclara el suyo */
  return ds.map((d) => {
    const r = regimenCorto(d.regimen);
    return `${nn(d.noches)} noches en ${d.ciudad || "destino"}${r ? ` (${r})` : ""}`;
  }).join(" · ");
}

/* Clave de idempotencia del alta: una por cotización nueva. Si el autosave
   reintenta porque se perdió la respuesta, el server reconoce la clave y
   devuelve la fila que ya creó en vez de duplicarla y quemar otro número. */
function nuevaClaveEdicion() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ce_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/* Los códigos que devuelve la capa de datos no son textos de UI. */
const MENSAJES_ERROR = {
  NOTAS_MUY_LARGAS:
    "Las notas del pasajero quedaron demasiado largas. Sacá algo de contenido y volvé a guardar.",
  CONFLICTO: "Esta cotización se modificó en otra pestaña.",
};
const textoDeError = (e) => MENSAJES_ERROR[e] || e || "No pudimos guardar.";

/* El panel scrollea en el <main> del shell, no en la ventana: un
   window.scrollTo no movía nada y el editor abría a mitad de página. */
function scrollArriba() {
  if (typeof document === "undefined") return;
  const cont = document.querySelector("main");
  if (cont) cont.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* el encabezado sigue a la fecha de salida */
function atarTitulo(q) {
  const f = parseISO(q.fechaSalida);
  if (f) { q.titulo.mes = f.getMonth(); q.titulo.anio = f.getFullYear(); }
}

/* ── Precarga desde un paquete del catálogo ──────────────────────────────
   `p` es una fila de `useCatalogoCotizador().paquetes`: destinos, servicios y
   opciones reales, con el neto y el factor que ya calculó el sistema.

   El precio: cada opción del paquete se convierte en UNA habitación doble con
   UNA tarifa "Por adulto" — todo se cotiza por persona en base doble. El neto
   de esa tarifa es `netoFijos + netoAlojamiento` de la opción y su factor es el
   de la opción, así que la venta automática (`ventaTarifa` = neto ÷ factor,
   redondeada al mostrarse) da exactamente lo mismo que `calcularVentaOpcion`,
   que es lo que el motor dejó guardado en `OpcionHotelera.precioVenta`. */
function desdePaquete(p, ajustes, catalogo) {
  const q = cotizacionVacia(ajustes);
  const hotelById = catalogo?.hotelById || (() => undefined);
  q.origen = p.nombre;
  q.titulo = { destino: p.destino || p.destinos[0]?.ciudad || "", mes: p.mes, anio: p.anio };

  /* La fecha de salida la elige el vendedor. Solo se precarga cuando el paquete
     tiene período de viaje cargado y todavía no arrancó. */
  const viaje = parseISO(p.fechaViaje);
  if (viaje && viaje > new Date()) {
    q.fechaSalida = p.fechaViaje;
    atarTitulo(q);
  }

  /* El régimen de cada destino sale de la primera opción: es el hotel que el
     operador dejó primero, y el vendedor lo cambia por tramo si hace falta. */
  const reg0 = p.opciones[0]?.regimenes || [];
  q.destinos = p.destinos.map((d, i) => ({ id:uid("dst"), ciudad:d.ciudad, noches:d.noches,
    checkinManual:null, regimen: reg0[i] || "" }));

  /* Los servicios vienen de los que el paquete tiene asignados en el panel. La
     línea de alojamiento es la única calculada: sigue a las noches y al régimen
     del itinerario hasta que el vendedor la edita. */
  q.servicios = p.servicios.map((s) => ({ id:uid("srv"), categoria:s.cat,
    texto: s.auto === "noches" && !s.texto ? lineaNoches(q.destinos) : s.texto,
    ciudad:s.ciudad ?? null, modalidad:s.modalidad ?? null,
    ...(s.auto ? { auto:s.auto } : {}) }));

  q.opciones = p.opciones.map((o) => {
    const tarifa = { id:uid("tf"), tipo:"Por adulto", tipoLibre:"", neto:o.neto, venta:null, factor:o.factor };
    if (process.env.NODE_ENV !== "production" && o.ventaSistema != null) {
      const calculado = Math.round(ventaTarifa(tarifa, o.factor));
      console.assert(
        calculado === o.ventaSistema,
        `[cotizador] ${p.nombre} · ${o.nombre}: la venta calculada (${calculado}) no coincide con ` +
        `OpcionHotelera.precioVenta (${o.ventaSistema}). Precios del paquete desactualizados.`,
      );
    }
    return {
      id:uid("op"), nombre:o.nombre,
      hoteles:o.hoteles.map((hid, i) => ({ hotelId:hid, libre:"",
        cat: hotelById(hid)?.cat ?? 0, regimen: o.regimenes[i] || "" })),
      regimen: o.regimenes.find(Boolean) || "",
      factor:o.factor,
      habitaciones:[{ id:uid("hab"), ocupacion:"Doble", tipo:"Estándar", tarifas:[tarifa] }],
    };
  });

  /* Bitácora interna: el desglose real del neto fijo, por persona. */
  const n = p.netos || {};
  q.notas = [
    { concepto:"Neto aéreo por pasajero", neto:n.aereo },
    { concepto:"Traslados", neto:n.traslados },
    { concepto:"Asistencia al viajero", neto:n.seguros },
    { concepto:"Circuito", neto:n.circuitos },
  ].filter((x) => Number(x.neto) > 0).map((x) => ({ id:uid("nt"), ...x, neto:Math.round(x.neto) }));

  q.notasCliente = "<div>Pasaporte con vigencia mínima de 6 meses al momento del viaje.</div>";
  return q;
}

/* ── v2 · borrador armado a partir de una consulta de WhatsApp ─────────── */
function desdeIA(det, ajustes, catalogo) {
  const q = det.paquete ? desdePaquete(det.paquete, ajustes, catalogo) : cotizacionVacia(ajustes);
  if (det.mes != null) {
    q.titulo.mes = det.mes;
    q.titulo.anio = det.anio;
    const hoy = new Date(); const salida = new Date(det.anio, det.mes, 15);
    q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
    atarTitulo(q);
  }
  if (!det.paquete && det.destino) {
    q.titulo.destino = det.destino;
    q.destinos = [{ id:uid("dst"), ciudad:det.destino, noches: det.noches || 7, checkinManual:null, regimen:"" }];
  }
  if (det.cliente) q.cliente.nombre = det.cliente;
  /* el teléfono queda cargado; quien llama completa el resto con lo que
     encuentre en el historial (`buscarEnHistorial`) */
  if (det.telefono) q.cliente.telefono = det.telefono;
  /* v2E · los pax leídos quedan escritos en la cotización, no solo en el banner */
  if (det.paxTxt) q.notasCliente += `<div>Cotización pensada para ${det.paxTxt}.</div>`;
  q.ia = { consulta:det.texto, chips:det.chips, paquete: det.paquete ? det.paquete.nombre : null };
  return q;
}

/* Todo el arranque lo carga la página (server component) con
   `getContextoCotizador`: quién soy, el equipo, los textos del máster, mis
   hoteles favoritos y el catálogo IATA. `esAdmin` decide quién ve los ajustes y
   el selector "Ver como": el vendedor firma siempre como el mismo, no elige. */
/**
 * @param {{ yo?: import("./tipos").VendedorCotizador | null,
 *           vendedores?: import("./tipos").VendedorCotizador[],
 *           siteBaseUrl?: string,
 *           ajustes?: object, favoritos?: string[],
 *           aeropuertos?: object[], aerolineas?: object[] }} props
 */
export default function Cotizador({
  yo = null, vendedores = [], siteBaseUrl = "",
  ajustes = null, favoritos = [], aeropuertos = [], aerolineas = [],
}) {
  const esAdmin = yo?.rol === "ADMIN";
  /* el parser de pegados de WhatsApp necesita la lista para no confundir el
     "Hola Agustina!" del arranque con el nombre del pasajero */
  useMemo(() => registrarVendedores(vendedores), [vendedores]);

  const [toasts, setToasts] = useState([]);
  const toast = useCallback((t) => {
    const id = uid("ts");
    setToasts((l) => [...l, { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), t.ms || (t.undo ? 5200 : 2800));
  }, []);

  /* ── favoritos: la estrella se mueve en el acto y el server confirma ──── */
  const catalogoRef = useRef(null);
  const onToggleFavorito = useCallback(async (id) => {
    const antes = catalogoRef.current?.favoritos ?? [];
    const res = await toggleFavoritoAction(id);
    if (!res.ok) {
      catalogoRef.current?.aplicarFavoritos(antes);
      toast({ msg:res.error, tone:"warn" });
      return;
    }
    catalogoRef.current?.aplicarFavoritos(res.data);
  }, [toast]);

  /* Paquetes, hoteles, ciudades y regímenes reales: salen de los providers del
     panel (Package / Service / Catalog), memoizados una sola vez acá arriba. */
  const catalogo = useCatalogoCotizador({ favoritosIniciales: favoritos, onToggleFavorito });
  catalogoRef.current = catalogo;

  const mapaAeropuertos = useMemo(() => indexarAeropuertos(aeropuertos), [aeropuertos]);
  const mapaAerolineas = useMemo(() => indexarAerolineas(aerolineas), [aerolineas]);
  const ctx = useMemo(() => ({
    yo, vendedores, siteBaseUrl, esAdmin, catalogo,
    ajustes, aeropuertos: mapaAeropuertos, aerolineas: mapaAerolineas,
  }), [yo, vendedores, siteBaseUrl, esAdmin, catalogo, ajustes, mapaAeropuertos, mapaAerolineas]);

  /* factor de markup con el que nacen las tarifas nuevas */
  const factorDefault = ajustes?.factorDefault || FACTOR_DEFAULT;

  const [pantalla, setPantalla] = useState("inicio");     // inicio | editor
  const marca = "traveloz";
  const [vendedor, setVendedor] = useState(yo?.id ?? null);
  const [q, setQ] = useState(() => cotizacionVacia(ajustes));
  /* la fila en la base; null mientras la cotización no exista todavía */
  const [presupuestoId, setPresupuestoId] = useState(null);
  const [guardado, setGuardado] = useState("sin cambios");  // sin cambios | guardando | ok | error
  const [paleta, setPaleta] = useState(false);
  const [atajos, setAtajos] = useState(false);             // v2B · hoja de atajos (tecla ?)
  const [vistaPasajero, setVistaPasajero] = useState(false); // v2B · "Ver como pasajero"
  const [compartir, setCompartir] = useState(false);
  const [imprimir, setImprimir] = useState(false);      /* v4 · vista de impresión / PDF */
  /* la marca en <body> la lee el @media print: el sidebar y la topbar del panel
     están fuera del .ctz y hay que apagarlos para que salga solo la hoja */
  useEffect(() => {
    if (!imprimir) return;
    document.body.classList.add("ctz-imprimiendo");
    return () => document.body.classList.remove("ctz-imprimiendo");
  }, [imprimir]);
  const [prev, setPrev] = useState(null);                  // overlay de vista previa: null | "cel" | "tab" | "desk"
  const [plantillas, setPlantillas] = useState([]);
  /* el deep-link ?abrir cuenta con que el listado vive en este tab */
  const [homeTab, setHomeTab] = useState("cotizar");
  /* grilla de cotizaciones: la carga el server y se refresca tras cada cambio */
  const [filas, setFilas] = useState([]);
  const [cargandoFilas, setCargandoFilas] = useState(true);
  /* "Ver como" del admin: filtra en el server, no en pantalla */
  const [verComo, setVerComo] = useState("todos");
  /* v2D · D5 · el modo oscuro queda apagado dentro del panel: el tema lo maneja
     el shell del backend. El CSS de `.dark` sigue en styles.js por si vuelve. */
  const oscuro = false;
  const pantallaRef = useRef("inicio");
  const [crono, setCrono] = useState(0);
  const [activo, setActivo] = useState("b-cliente");
  const primerCampo = useRef(null);
  const scroller = useRef(null);
  const timerRef = useRef(null);
  const phoneScroll = useRef(null);

  /* orden fijo de los bloques (el que pidió el cliente): lo usan el rail y los
     atajos Alt+N. En solo vuelos no hay servicios ni alojamiento. */
  const IDS_BLOQUES = q.soloVuelos
    ? ["b-cliente","b-mensaje","b-encabezado","b-vuelos","b-notascliente"]
    : ["b-cliente","b-mensaje","b-encabezado","b-servicios","b-vuelos","b-alojamiento","b-notascliente"];
  /* el listener de teclado se registra una sola vez: lee el orden vigente por ref */
  const idsRef = useRef(IDS_BLOQUES);
  idsRef.current = IDS_BLOQUES;

  /* mutación inmutable simple. El indicador de guardado lo maneja el autosave:
     acá no se toca, si no un cambio que no cambia nada diría "Guardando…". */
  const set = useCallback((fn) => {
    setQ((prev) => { const d = JSON.parse(JSON.stringify(prev)); fn(d); return d; });
  }, []);

  /* ═════════════════════════════════════════════════════════════════════════
     AUTOGUARDADO

     `q` es el contenido de la cotización y la base es la única copia que vale.
     El ciclo:
       · cualquier cambio en `q` programa `guardarAhora` a los 1.500 ms;
       · `guardarAhora` crea la fila la primera vez (y sella el número que
         devuelve la base) o la actualiza;
       · nunca hay dos llamadas en vuelo: la segunda queda pendiente y sale
         cuando termina la primera;
       · `ultimoGuardadoRef` guarda el contenido ya persistido, serializado. La
         comparación contra ese string es lo que evita el bucle: cuando el
         guardado escribe el número en `q`, el contenido nuevo ya está anotado
         como guardado y el efecto no vuelve a disparar.
     ═════════════════════════════════════════════════════════════════════════ */
  const qRef = useRef(q);
  qRef.current = q;
  const presupuestoIdRef = useRef(null);
  const ultimoGuardadoRef = useRef("");
  const guardandoRef = useRef(false);
  const pendienteRef = useRef(false);
  const debounceRef = useRef(null);
  const reintentoRef = useRef(null);
  const fallosRef = useRef(0);
  const cronoRef = useRef(0);
  const origenRef = useRef({ tipo: null, ref: null });
  /* Época. `abrir()` la incrementa. Un guardado que salió con la cotización
     anterior y vuelve después del cambio ya no puede escribir el id ni el
     número de la vieja arriba de la nueva: se descarta al volver. */
  const epocaRef = useRef(0);
  /* La promesa del guardado en vuelo. `flush()` la espera antes de decidir si
     todavía queda algo por guardar. */
  const enVueloRef = useRef(null);
  /* Idempotencia del alta: un UUID por cotización nueva. */
  const claveEdicionRef = useRef(null);
  /* `updatedAt` de la última versión conocida: el control de concurrencia. */
  const updatedAtRef = useRef(null);
  /* El reintento y la cola llaman al guardado por ref para no depender de una
     función que todavía no existe cuando se define el cuerpo. */
  const guardarRef = useRef(null);
  /* El vendedor que firma lo lee el alta sin volverse dependencia del efecto. */
  const vendedorRef = useRef(vendedor);
  vendedorRef.current = vendedor;

  const guardarInterno = useCallback(async () => {
    if (guardandoRef.current) { pendienteRef.current = true; return; }
    const epoca = epocaRef.current;
    const actual = qRef.current;
    const serial = JSON.stringify(actual);
    if (serial === ultimoGuardadoRef.current) { setGuardado("ok"); return; }

    guardandoRef.current = true;
    setGuardado("guardando");
    clearTimeout(reintentoRef.current);

    let res;
    try {
      if (!presupuestoIdRef.current) {
        const { tipo, ref } = origenRef.current;
        res = await crearPresupuesto({
          contenido: actual,
          ...(tipo ? { origenTipo: tipo } : {}),
          ...(ref ? { origenRef: String(ref).slice(0, 200) } : {}),
          ...(claveEdicionRef.current ? { claveEdicion: claveEdicionRef.current } : {}),
          /* el "Ver como" del admin decide de quién es la cotización; el
             vendedor manda siempre el suyo y el server lo ignora igual */
          ...(esAdmin && vendedorRef.current ? { vendedorId: vendedorRef.current } : {}),
          tiempoArmadoSeg: cronoRef.current,
        });
        if (epoca !== epocaRef.current) { guardandoRef.current = false; return; }
        if (res.ok) {
          const { id, numero, updatedAt } = res.data;
          presupuestoIdRef.current = id;
          updatedAtRef.current = updatedAt ? new Date(updatedAt).toISOString() : null;
          setPresupuestoId(id);
          /* el número viaja adentro del contenido: se anota como guardado antes
             de escribirlo en `q`, así el efecto no lo lee como un cambio nuevo */
          ultimoGuardadoRef.current = JSON.stringify({ ...JSON.parse(serial), numero });
          setQ((p) => (p.numero === numero ? p : { ...p, numero }));
        }
      } else {
        const id = presupuestoIdRef.current;
        res = await guardarPresupuesto(id, {
          contenido: actual,
          tiempoArmadoSeg: cronoRef.current,
          ...(updatedAtRef.current ? { updatedAtEsperado: updatedAtRef.current } : {}),
        });
        if (epoca !== epocaRef.current) { guardandoRef.current = false; return; }

        /* Alguien guardó la misma cotización desde otra pestaña. No se pisa:
           se trae lo que hay en la base y se avisa. */
        if (!res.ok && res.error === "CONFLICTO") {
          guardandoRef.current = false;
          pendienteRef.current = false;
          fallosRef.current = 0;
          const fresca = await obtenerPresupuesto(id);
          if (epoca !== epocaRef.current) return;
          if (fresca.ok) {
            ultimoGuardadoRef.current = JSON.stringify(fresca.data.contenido);
            updatedAtRef.current = new Date(fresca.data.updatedAt).toISOString();
            qRef.current = fresca.data.contenido;
            setQ(fresca.data.contenido);
            setGuardado("ok");
            toast({ msg:"Esta cotización se modificó en otra pestaña; se recargó",
              tone:"warn", ms:6000 });
          } else {
            setGuardado("error");
            toast({ msg: textoDeError(fresca.error), tone:"warn", ms:5000 });
          }
          return;
        }

        if (res.ok) {
          ultimoGuardadoRef.current = serial;
          updatedAtRef.current = res.data.updatedAt
            ? new Date(res.data.updatedAt).toISOString()
            : null;
        }
      }
    } catch {
      if (epoca !== epocaRef.current) { guardandoRef.current = false; return; }
      res = { ok: false, error: "Se cortó la conexión mientras guardábamos." };
    }

    guardandoRef.current = false;

    if (res?.ok) {
      fallosRef.current = 0;
      setGuardado("ok");
    } else {
      setGuardado("error");
      if (fallosRef.current === 0) toast({ msg: textoDeError(res?.error), tone:"warn", ms:5000 });
      fallosRef.current += 1;
      /* reintento solo, a los 5 s. Después de cinco intentos se planta y queda
         el indicador en rojo: se reintenta a mano tocándolo. */
      if (fallosRef.current <= 5) {
        reintentoRef.current = setTimeout(() => { void guardarRef.current?.(); }, 5000);
      }
    }

    if (pendienteRef.current) {
      pendienteRef.current = false;
      setTimeout(() => { void guardarRef.current?.(); }, 0);
    }
  }, [toast, esAdmin]);

  /* El envoltorio publica la promesa en vuelo para que `flush()` la espere. */
  const guardarAhora = useCallback(() => {
    const p = guardarInterno();
    enVueloRef.current = p;
    void p.catch(() => {}).finally(() => {
      if (enVueloRef.current === p) enVueloRef.current = null;
    });
    return p;
  }, [guardarInterno]);
  guardarRef.current = guardarAhora;

  /* el debounce: 1.500 ms desde la última tecla */
  useEffect(() => {
    if (pantalla !== "editor") return;
    if (JSON.stringify(q) === ultimoGuardadoRef.current) return;
    setGuardado((g) => (g === "error" ? g : "guardando"));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void guardarAhora(); }, 1500);
    return () => clearTimeout(debounceRef.current);
  }, [q, pantalla, guardarAhora]);

  /**
   * Guarda ya mismo lo que haya pendiente. Se llama al salir del editor.
   *
   * Espera al guardado en vuelo antes de decidir: si no, "salir" recargaba la
   * grilla mientras la fila todavía se estaba escribiendo y el vendedor veía
   * el monto viejo, o directamente no veía la cotización recién creada.
   */
  const flush = useCallback(async () => {
    clearTimeout(debounceRef.current);
    clearTimeout(reintentoRef.current);
    if (enVueloRef.current) {
      try { await enVueloRef.current; } catch { /* el toast ya lo mostró */ }
    }
    if (JSON.stringify(qRef.current) !== ultimoGuardadoRef.current) {
      await guardarAhora();
    }
  }, [guardarAhora]);

  /* Cerrar la pestaña con cambios sin guardar. Best-effort: el navegador puede
     cortar la request igual. Si la cotización todavía no existe en la base NO
     se crea desde acá — un alta a medio camino, sin respuesta que leer, es
     exactamente lo que dejaba filas huérfanas con número quemado. */
  useEffect(() => {
    const h = (e) => {
      /* Solo con el editor abierto. En el listado `q` es la cotización vacía
         con la que arranca el componente y `ultimoGuardadoRef` está en "":
         nunca coinciden, así que el aviso saltaba al ir a cualquier otra
         sección del panel sin tener nada a medio escribir. */
      if (pantallaRef.current !== "editor") return;
      if (JSON.stringify(qRef.current) === ultimoGuardadoRef.current) return;
      if (presupuestoIdRef.current) void guardarAhora();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [guardarAhora]);

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    clearTimeout(reintentoRef.current);
  }, []);

  /* ── listado y plantillas ─────────────────────────────────────────────── */
  /* El `finally` no es decorativo: si la server action se cae (red, deploy en
     curso, sesión vencida) el `await` rechaza y sin él `cargandoFilas` se
     quedaba en true — la grilla girando para siempre y ningún aviso. */
  const recargar = useCallback(async () => {
    setCargandoFilas(true);
    try {
      const res = await listarPresupuestos(verComo && verComo !== "todos" ? { vendedorId: verComo } : {});
      if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
      setFilas(res.data.map(filaDesdePresupuesto));
    } catch {
      toast({ msg:"No pude traer las cotizaciones — probá de nuevo en un momento", tone:"warn" });
    } finally {
      setCargandoFilas(false);
    }
  }, [verComo, toast]);

  useEffect(() => { void recargar(); }, [recargar]);

  /* ── ?abrir=<id> ─────────────────────────────────────────────────────────
     El deep-link que usan las pantallas de Pasajeros y Pagos: desde un envío
     con referencia COT-… se vuelve a la cotización que lo pidió, con el drawer
     ya abierto. Se lee del `location` y no de `useSearchParams` (que obligaría
     a envolver esta pantalla en un Suspense por nada).

     El parámetro se lee en el inicializador del estado, NO en un efecto de
     montaje, y la URL se limpia mucho después. El motivo es concreto: Next 14
     parchea `window.history.replaceState` (client/components/app-router.js)
     para despachar ACTION_RESTORE, y la cola de acciones del router
     (shared/lib/router/action-queue.js · dispatchAction) trata un restore como
     una navegación: descarta la acción en vuelo y pisa `actionQueue.last`, con
     lo que las server actions que estaban encoladas detrás quedan huérfanas —
     no arrancan nunca y su promesa no resuelve jamás. Tocar la URL en el mismo
     commit en el que la grilla dispara su primera `listarPresupuestos()`
     dejaba ese `await` colgado y el listado en "Cargando cotizaciones…", sin
     request ni error en consola.

     Si el id no está en el scope de quien mira, la grilla no lo encuentra y no
     pasa nada: no se avisa, porque no hay nada que el vendedor pueda hacer. */
  const leerAbrir = () => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("abrir") || null;
  };
  const [abrirId, setAbrirId] = useState(leerAbrir);
  const [urlConAbrir, setUrlConAbrir] = useState(() => !!leerAbrir());
  /* estable: es dependencia del efecto que abre el drawer en el listado */
  const marcarAbierta = useCallback(() => setAbrirId(null), []);

  /* la carga de plantillas también avisa cuando terminó: es la última server
     action del montaje y la limpieza de la URL espera a que no quede ninguna */
  const [plantillasListas, setPlantillasListas] = useState(false);
  const recargarPlantillas = useCallback(async () => {
    try {
      const res = await listarPlantillas();
      if (res.ok) setPlantillas(res.data);
    } catch {
      /* sin plantillas se cotiza igual: no vale un toast */
    } finally {
      setPlantillasListas(true);
    }
  }, []);
  useEffect(() => { void recargarPlantillas(); }, [recargarPlantillas]);

  /* Recién acá se saca el `?abrir` de la barra, para que un F5 no reabra el
     drawer: con la grilla cargada, el catálogo cargado, las plantillas
     pedidas y el drawer ya resuelto, la cola del router está vacía y el
     ACTION_RESTORE del `replaceState` no tiene nada que descartar. El `data`
     va vacío a propósito: si llevara el `__NA` de Next el parche cortaría de
     largo, el router se quedaría con la URL vieja y el HistoryUpdater
     devolvería el parámetro a la barra en el próximo guardado. */
  useEffect(() => {
    if (!urlConAbrir) return;
    if (abrirId || cargandoFilas || !plantillasListas || catalogo.cargando) return;
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("abrir");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      setUrlConAbrir(false);
    }, 0);
    return () => clearTimeout(t);
  }, [urlConAbrir, abrirId, cargandoFilas, plantillasListas, catalogo.cargando]);

  /* cronómetro. El ref lo lee el autoguardado para mandar `tiempoArmadoSeg`
     sin volverse dependencia del efecto que graba. */
  useEffect(() => {
    if (pantalla !== "editor") return;
    timerRef.current = setInterval(() => setCrono((c) => c + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [pantalla]);
  useEffect(() => { cronoRef.current = crono; }, [crono]);

  /* atajos globales */
  useEffect(() => { pantallaRef.current = pantalla; }, [pantalla]);
  /* v2B · ¿el foco está en un campo de texto? la tecla "?" no debe robarlo */
  const enCampo = () => {
    const a = typeof document !== "undefined" ? document.activeElement : null;
    return !!a && (a.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(a.tagName));
  };
  useEffect(() => {
    const h = (e) => {
      /* v2F · si un campo ya usó la tecla (Ctrl+Enter de la bitácora), acá no se pisa */
      if (e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaleta((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && pantallaRef.current === "editor") {
        e.preventDefault(); setCompartir(true); }
      /* v2B · Alt+1…Alt+N salta al bloque N (e.code aguanta el Alt raro de macOS) */
      if (e.altKey && !e.metaKey && !e.ctrlKey && pantallaRef.current === "editor") {
        const ids = idsRef.current;
        const tope = Math.min(ids.length, 9);
        const n = new RegExp(`^Digit[1-${tope}]$`).test(e.code || "") ? Number(e.code.slice(5))
          : new RegExp(`^[1-${tope}]$`).test(e.key) ? Number(e.key) : 0;
        if (n) { e.preventDefault(); irA(ids[n - 1]); }
      }
      /* v2B · "?" abre la hoja de atajos, salvo que estés escribiendo */
      if (e.key === "?" && !enCampo()) { e.preventDefault(); setAtajos((v) => !v); }
    };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);


  /* ── propagación de fechas ───────────────────────────────────────────
     El cálculo vive en ./_mockup/tramos.js: lo comparten el editor, la vista
     previa del drawer y el link público del pasajero. */
  const tramos = useMemo(() => calcularTramos(q), [q.destinos, q.fechaSalida]);   // eslint-disable-line react-hooks/exhaustive-deps

  const hayManual = tramos.some((t) => t.manual);
  const repropagar = () => { set((d) => { d.destinos.forEach((x) => { x.checkinManual = null; }); });
    toast({ msg:"Fechas actualizadas desde la salida", tone:"ok" }); };

  /* ── los servicios marcados `auto` siguen a lo que se carga arriba.
        En cuanto el vendedor los edita a mano pierden el flag y quedan quietos. ── */
  useEffect(() => {
    const txtNoches = lineaNoches(q.destinos);
    const txtAereo = (q.cabina || q.equipaje)
      ? "Aéreo ida y vuelta · " + [q.cabina, q.equipaje].filter(Boolean).join(" · ")
      : "Aéreo ida y vuelta con artículo personal y equipaje de mano";
    const iN = q.servicios.findIndex((s) => s.auto === "noches");
    const iA = q.servicios.findIndex((s) => s.auto === "aereo");
    const cambiaN = iN >= 0 && q.servicios[iN].texto !== txtNoches;
    const cambiaA = iA >= 0 && q.servicios[iA].texto !== txtAereo;
    if (!cambiaN && !cambiaA) return;
    set((d) => {
      if (cambiaN) d.servicios[iN].texto = txtNoches;
      if (cambiaA) d.servicios[iA].texto = txtAereo;
    });
  }, [tramos, q.destinos, q.servicios, q.cabina, q.equipaje, set]);

  /* ── progreso por bloque ───────────────────────────────────────────── */
  const bloques = [
    { id:"b-cliente",    l:"Cliente",     Icon:User,        ok: !!(q.cliente.nombre || q.cliente.email) },
    { id:"b-mensaje",    l:"Mensaje",     Icon:MessageSquare, ok: !!(q.mensajeAuto || "").trim() },
    { id:"b-encabezado", l:"Encabezado",  Icon:FileText,    ok: !!(q.titulo.destino && q.titulo.mes != null && q.fechaSalida) },
    { id:"b-servicios",  l:"Servicios",   Icon:LayoutGrid,  ok: q.servicios.length > 0 },
    { id:"b-vuelos",     l:"Vuelos",      Icon:Plane,
      ok: q.soloVuelos ? (q.vuelos.length > 0 && !!Number(q.precioVuelo?.adulto)) : q.vuelos.length > 0 },
    { id:"b-alojamiento", l:"Alojamiento", Icon:Building2,  ok: q.destinos.length > 0 && q.opciones.length > 0 },
    { id:"b-notascliente", l:"Notas pasajero", Icon:StickyNote,
      ok: !!(q.notasCliente || "").replace(/<[^>]*>/g, "").trim() },
  ].filter((b) => IDS_BLOQUES.includes(b.id));
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
  }, [pantalla, q.destinos.length, q.soloVuelos]);

  /* ── Tab recorre solo los campos: los botones del formulario salen del orden ──
     (pedido explícito del cliente; el MutationObserver cubre lo que se re-renderiza) */
  useEffect(() => {
    if (pantalla !== "editor") return;
    const zona = document.querySelector(".ed-main");
    if (!zona) return;
    const marcar = () => zona.querySelectorAll("button").forEach((b) => { b.tabIndex = -1; });
    marcar();
    const obs = new MutationObserver(marcar);
    obs.observe(zona, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pantalla]);

  /**
   * Abre una cotización en el editor.
   *
   * `id` es la fila en la base: viene con id cuando se abre algo que ya existe
   * (edición total, duplicado) y en null cuando arranca de cero. En los dos
   * casos el contenido que se abre queda anotado como "ya guardado", así el
   * autosave recién dispara con el primer cambio real del vendedor y una
   * cotización que se abre y se abandona no gasta un número.
   */
  const abrir = useCallback((nueva, {
    id = null, origenTipo = null, origenRef: refOrigen = null, updatedAt = null,
  } = {}) => {
    clearTimeout(debounceRef.current);
    clearTimeout(reintentoRef.current);
    /* corta con lo anterior: un guardado en vuelo que vuelva después de esto
       se descarta solo al ver que la época cambió */
    epocaRef.current += 1;
    guardandoRef.current = false;
    pendienteRef.current = false;
    fallosRef.current = 0;
    presupuestoIdRef.current = id;
    setPresupuestoId(id);
    /* la clave de idempotencia es solo para las que todavía no existen */
    claveEdicionRef.current = id ? null : nuevaClaveEdicion();
    updatedAtRef.current = updatedAt ? new Date(updatedAt).toISOString() : null;
    origenRef.current = { tipo: origenTipo, ref: refOrigen };
    ultimoGuardadoRef.current = JSON.stringify(nueva);
    qRef.current = nueva;
    cronoRef.current = 0;
    setQ(nueva); setCrono(0); setGuardado(id ? "ok" : "sin cambios");
    setPantalla("editor"); setActivo("b-cliente");
    requestAnimationFrame(scrollArriba);
  }, []);

  /** Sale del editor guardando lo que quede pendiente y refresca la grilla. */
  const salirDelEditor = useCallback(async (tab = "cotizar") => {
    setHomeTab(tab);
    setPantalla("inicio");
    /* primero el guardado, después la grilla: al revés la lista se arma con la
       versión anterior de la fila que se acaba de tocar */
    await flush();
    /* refs alineadas al salir: fuera del editor nadie más compara contra
       `ultimoGuardadoRef`, y dejarlas desfasadas es lo que hacía que cualquier
       navegación posterior pareciera tener cambios sin guardar. Si el último
       guardado falló NO se tocan: ahí sí quedó contenido sin persistir. */
    if (fallosRef.current === 0) ultimoGuardadoRef.current = JSON.stringify(qRef.current);
    await recargar();
  }, [flush, recargar]);

  /* ?imprimir=demo · deja una cotización de ejemplo lista en la vista de impresión,
     así se prueba el PDF sin clickear nada. Espera a que el catálogo termine de
     cargar: el primer paquete real es el que se precarga. */
  const demoHecha = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || demoHecha.current) return;
    if (new URLSearchParams(window.location.search).get("imprimir") !== "demo") return;
    if (catalogo.cargando) return;
    demoHecha.current = true;
    const p0 = catalogo.paquetes[0];
    if (!p0) return;                       // sin paquetes activos no hay demo que mostrar
    const q0 = desdePaquete(p0, ajustes, catalogo);
    q0.cliente.nombre = "Sonia";
    q0.pnrRaw = PNR_DEMO;
    q0.vuelos = parsePNR(PNR_DEMO, mapaAerolineas);
    abrir(q0);
    setImprimir(true);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [catalogo]);

  /* ── lo que abre el editor desde afuera ─────────────────────────────── */

  /* "Edición total": la misma cotización, con su número y su fila. */
  const editarFila = useCallback(async (r) => {
    const res = await obtenerPresupuesto(r.id);
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    abrir(res.data.contenido, { id: res.data.id, updatedAt: res.data.updatedAt });
    toast({ msg:`${r.num} abierta en edición total`, tone:"ok" });
  }, [abrir, toast]);

  /* Duplicar: copia con número nuevo, en borrador, ya existente en la base. */
  const duplicarFila = useCallback(async (r) => {
    const res = await duplicarPresupuesto(r.id);
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    abrir(res.data.contenido, { id: res.data.id, updatedAt: res.data.updatedAt });
    toast({ msg:`Duplicada desde ${r.num} — cambiá las fechas y listo`, tone:"ok" });
    void recargar();
  }, [abrir, toast, recargar]);

  /* "Usar como base": el contenido de otra cotización arranca una nueva.
     No hereda ni el número ni la fila: es una cotización distinta. */
  const usarBase = useCallback(async (fila) => {
    const res = await obtenerPresupuesto(fila.id);
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    const base = { ...res.data.contenido, numero:"", estado:"borrador",
      origen:`Base de ${res.data.numero}` };
    abrir(base, { origenTipo:"base", origenRef: res.data.numero });
    setActivo("b-encabezado");
    requestAnimationFrame(() => document.getElementById("b-encabezado")
      ?.scrollIntoView({ behavior:"smooth", block:"start" }));
    toast({ msg:`Base cargada desde ${res.data.numero} — ajustá lo que cambie`, tone:"ok" });
  }, [abrir, toast]);

  /* Duplicar la que está abierta: primero se guarda, después se copia. */
  const duplicarActual = useCallback(async () => {
    await flush();
    if (!presupuestoIdRef.current) {
      toast({ msg:"Escribí algo primero: la copia sale de lo que ya está guardado", tone:"warn" });
      return;
    }
    const res = await duplicarPresupuesto(presupuestoIdRef.current);
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    abrir(res.data.contenido, { id: res.data.id, updatedAt: res.data.updatedAt });
    toast({ msg:"Cotización duplicada — cambiá las fechas y listo", tone:"ok" });
  }, [flush, abrir, toast]);

  /* Guardar la cotización abierta como plantilla del equipo. */
  const guardarComoPlantilla = useCallback(async () => {
    const nombre = q.titulo.destino ? `${q.titulo.destino} · plantilla` : "Plantilla sin nombre";
    const res = await crearPlantilla({
      nombre, destino: q.titulo.destino || "General",
      detalle: `${q.servicios.length} servicios · ${q.opciones.length} opciones`,
      contenido: q,
    });
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    setPlantillas((l) => [...l, res.data]);
    toast({ msg:`Guardada como plantilla “${nombre}”`, tone:"ok" });
  }, [q, toast]);

  /* Arrancar desde una plantilla: el contenido sale del server y el uso queda contado. */
  const abrirPlantilla = useCallback(async (t) => {
    const res = await usarPlantilla(t.id);
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    abrir({ ...res.data.contenido, numero:"", estado:"borrador", origen:`Plantilla · ${res.data.nombre}` },
      { origenTipo:"plantilla", origenRef: res.data.nombre });
    void recargarPlantillas();
  }, [abrir, toast, recargarPlantillas]);

  const acciones = [
    ...bloques.map((b) => ({ label:`Ir a ${b.l}`, grupo:"bloque", Icon:b.Icon, run:() => irA(b.id) })),
    /* clona la última opción: casi siempre la nueva es una variante de la anterior */
    { label:"Nueva opción hotelera", grupo:"acción", Icon:Plus, run:() => { set((d) => {
        const ult = d.opciones[d.opciones.length - 1];
        if (ult) {
          const c = JSON.parse(JSON.stringify(ult));
          c.id = uid("op");
          c.nombre = `Opción ${d.opciones.length + 1}`;
          (c.habitaciones || []).forEach((h) => { h.id = uid("hab");
            (h.tarifas || []).forEach((t) => { t.id = uid("tf"); }); });
          d.opciones.push(c);
        } else {
          d.opciones.push({ id:uid("op"), nombre:`Opción ${d.opciones.length + 1}`,
            hoteles:d.destinos.map((x) => ({ hotelId:null, libre:"", cat:0,
              regimen: x.regimen || "Desayuno incluido" })),
            regimen: d.destinos[0]?.regimen || "Desayuno incluido", factor:factorDefault,
            habitaciones:[habitacionNueva("Doble", factorDefault)] });
        }
      }); irA("b-alojamiento"); } },
    { label:"Compartir cotización", grupo:"acción", Icon:Send, run:() => setCompartir(true) },
    { label: vistaPasajero ? "Volver a la vista del vendedor" : "Ver como pasajero (sin márgenes ni notas)",
      grupo:"acción", Icon: vistaPasajero ? EyeOff : Eye, run:() => setVistaPasajero((v) => !v) },
    { label:"Ver los atajos de teclado", grupo:"acción", Icon:Keyboard, run:() => setAtajos(true) },
    { label:"Duplicar esta cotización", grupo:"acción", Icon:Copy, run:() => { void duplicarActual(); } },
    { label:"Ver cotizaciones", grupo:"ir", Icon:ListChecks, run:() => { void salirDelEditor("cotizar"); } },
    { label:"Volver al inicio", grupo:"ir", Icon:ArrowLeft, run:() => { void salirDelEditor(); } },
  ];

  /* Plantilla nueva desde el tab: nace con el destino cargado y nada más. */
  const crearPlantillaVacia = useCallback(async (nombre, destino) => {
    const contenido = cotizacionVacia(ajustes);
    contenido.titulo.destino = destino === "General" ? "" : destino;
    if (contenido.titulo.destino) {
      contenido.destinos = [{ id:uid("dst"), ciudad:contenido.titulo.destino, noches:7,
        checkinManual:null, regimen:"" }];
    }
    const res = await crearPlantilla({ nombre, destino, detalle:"Creada a mano — sin servicios aún", contenido });
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    setPlantillas((l) => [...l, res.data]);
    toast({ msg:`Plantilla “${nombre}” creada`, tone:"ok" });
  }, [ajustes, toast]);

  const duplicarPlantilla = useCallback(async (t) => {
    /* `leerPlantilla` y no `usarPlantilla`: copiar una plantilla no es haberla
       usado, y el contador ordena el listado */
    const leida = await leerPlantilla(t.id);
    if (!leida.ok) { toast({ msg:leida.error, tone:"warn" }); return; }
    const res = await crearPlantilla({ nombre:`${t.nombre} (copia)`, destino:t.destino || "",
      detalle:t.detalle || "", contenido: leida.data.contenido });
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    setPlantillas((l) => [...l, res.data]);
    toast({ msg:"Plantilla duplicada", tone:"ok" });
  }, [toast]);

  /* Sin deshacer: la baja es real. Por eso pregunta antes. */
  const borrarPlantilla = useCallback(async (t) => {
    if (typeof window !== "undefined" &&
        !window.confirm(`¿Eliminar la plantilla “${t.nombre}”? No se puede deshacer.`)) return;
    const res = await eliminarPlantilla(t.id);
    if (!res.ok) { toast({ msg:res.error, tone:"warn" }); return; }
    setPlantillas((l) => l.filter((x) => x.id !== t.id));
    toast({ msg:`Plantilla “${t.nombre}” eliminada`, tone:"warn" });
  }, [toast]);

  /* Borrador armado desde una consulta de WhatsApp. Si la consulta trae un
     teléfono y esa persona ya está en el historial, se completa su ficha. */
  const arrancarConIA = useCallback(async (det) => {
    const nueva = desdeIA(det, ajustes, catalogo);
    if (det.telefono) {
      const res = await buscarEnHistorial(det.telefono);
      const previo = res.ok ? res.data[0] : null;
      if (previo) {
        nueva.cliente = {
          nombre: det.cliente || previo.clienteNombre || "",
          apellido: previo.clienteApellido || "",
          email: previo.clienteEmail || "",
          telefono: previo.clienteTelefono || det.telefono,
        };
      }
    }
    abrir(nueva, { origenTipo:"ia", origenRef: det.paquete ? det.paquete.nombre : det.destino || null });
    toast({ msg: det.paquete
      ? `Borrador armado desde “${det.paquete.nombre}” — revisalo y ajustá`
      : "No encontré un paquete que coincida — la armé en blanco con lo que entendí",
      tone: det.paquete ? "ok" : "warn" });
  }, [ajustes, catalogo, abrir, toast]);

  const G = ["#F43E55","#785AE5"];
  const mm = String(Math.floor(crono / 60)); const ss = String(crono % 60).padStart(2, "0");
  const meta = q.origen ? 60 : 240;

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <CotizadorCtx.Provider value={ctx}>
    <div className={`ctz${oscuro ? " dark" : ""}${imprimir ? " imprimiendo" : ""}`} data-brand={marca} style={{ minHeight:"100%" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {pantalla === "inicio" && (
        <Inicio
          onPaquete={(p) => abrir(desdePaquete(p, ajustes, catalogo),
            { origenTipo:"paquete", origenRef:p.nombre })}
          onBlanco={() => abrir(cotizacionVacia(ajustes), { origenTipo:"blanco" })}
          onSoloVuelos={() => {
            const q2 = cotizacionVacia(ajustes);
            q2.soloVuelos = true;
            q2.servicios = [];
            abrir(q2, { origenTipo:"solo_vuelos" });
            toast({ msg:"Cotización de solo vuelos — itinerario, equipaje y precio", tone:"ok" });
          }}
          onPlantilla={(t) => { void abrirPlantilla(t); }}
          onIA={(det) => { void arrancarConIA(det); }}
          onDuplicarFila={(r) => { void duplicarFila(r); }}
          onEditarFila={(r) => { void editarFila(r); }}
          toast={toast}
          tab={homeTab} setTab={setHomeTab}
          filas={filas} cargandoFilas={cargandoFilas} recargar={recargar}
          abrirId={abrirId} onAbierta={marcarAbierta}
          verComo={verComo} setVerComo={setVerComo}
          plantillas={plantillas}
          onCrearPlantilla={(nombre, destino) => { void crearPlantillaVacia(nombre, destino); }}
          onDuplicarPlantilla={(t) => { void duplicarPlantilla(t); }}
          onBorrarPlantilla={(t) => { void borrarPlantilla(t); }} />
      )}

      {pantalla === "editor" && (
        <>
          {/* ── barra superior ────────────────────────────────────────── */}
          <header className="ed-head" style={{ position:"sticky", top:0, zIndex:50, background:"var(--glass)",
            backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", borderBottom:"1px solid var(--hair-soft)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 18px", maxWidth:1460, margin:"0 auto" }}>
              <button className="btn btn-g btn-ico" onClick={() => { void salirDelEditor(); }}
                title="Volver — se guarda lo que quede pendiente"><ArrowLeft size={16} /></button>
              <div style={{ width:30, height:30, borderRadius:10, background:`linear-gradient(87deg,${G[0]},${G[1]})`,
                display:"grid", placeItems:"center", color:"#fff", flexShrink:0 }}><Ticket size={15} /></div>
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  {/* el número lo asigna la base en el primer guardado */}
                  <span className={q.numero ? "mono" : ""} style={{ fontSize:12, fontWeight:500,
                    color: q.numero ? undefined : "var(--n400)" }}>
                    {q.numero || "Nueva cotización"}</span>
                  <Pill tone={ESTADOS[q.estado]?.tone || "n"}>{ESTADOS[q.estado]?.l || "Borrador"}</Pill>
                </div>
                {q.origen && <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden",
                  textOverflow:"ellipsis", maxWidth:220 }}>desde {q.origen}</div>}
              </div>

              {/* cronómetro */}
              <div className="mono" title="Tiempo de armado" style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8,
                padding:"5px 10px", borderRadius:9, background:"var(--sunk)", fontSize:11.5,
                color: crono > meta ? "var(--coral)" : "var(--n500)" }}>
                <Gauge size={12} /> {mm}:{ss}
                <span style={{ opacity:.5 }}>/ meta {meta === 60 ? "1:00" : "4:00"}</span>
              </div>

              <div style={{ flex:1 }} />

              {/* autoguardado: el error se puede reintentar tocándolo */}
              <button style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5,
                  color: guardado === "error" ? "var(--coral)" : "var(--n400)",
                  cursor: guardado === "error" ? "pointer" : "default" }}
                title={guardado === "error" ? "Reintentar el guardado" : undefined}
                onClick={() => { if (guardado === "error") { fallosRef.current = 0; void guardarAhora(); } }}>
                {guardado === "guardando" ? <><Loader2 size={12} className="spin" /> Guardando…</>
                  : guardado === "error" ? <><AlertCircle size={12} /> Sin guardar — reintentar</>
                  : guardado === "sin cambios" ? <><CheckCheck size={12} style={{ opacity:.5 }} /> Sin cambios</>
                  : <><CheckCheck size={12} style={{ color:"var(--teal-2)" }} /> Guardado</>}
              </button>

              {/* firmar como otro es cosa del admin: el vendedor firma siempre él */}
              {esAdmin && (
                <select className="in" style={{ width:150, height:34, fontSize:12 }} value={vendedor ?? ""}
                  onChange={(e) => setVendedor(e.target.value)} title="Vendedor que firma la cotización">
                  {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              )}

              {/* v2B · ver la pantalla sin nada interno */}
              <button className={`btn btn-sm ${vistaPasajero ? "btn-v" : "btn-s"}`}
                onClick={() => setVistaPasajero((v) => !v)}
                title={vistaPasajero ? "Volver a la vista del vendedor" : "Ver la pantalla sin márgenes ni notas internas"}>
                {vistaPasajero ? <EyeOff size={13} /> : <Eye size={13} />}
                <span className="only-ancho">{vistaPasajero ? "Vista pasajero" : "Ver como pasajero"}</span>
              </button>

              <button className="btn btn-s btn-sm" onClick={() => setAtajos(true)} title="Atajos de teclado">
                <Keyboard size={13} /><span className="kbd" style={{ marginLeft:-2 }}>?</span>
              </button>
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
            <aside className="rail-col ed-rail" style={{ width:196, flexShrink:0, position:"sticky", top:74 }}>
              <div className="card" style={{ padding:9 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"3px 7px 8px" }}>
                  <span className="lbl">Bloques</span>
                  <span className="mono" style={{ fontSize:10.5, color:"var(--n400)" }}>{listos}/{bloques.length}</span>
                </div>
                <div style={{ height:3, borderRadius:9, background:"var(--sunk)", margin:"0 7px 9px", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:9, width:`${(listos / bloques.length) * 100}%`,
                    background:"linear-gradient(90deg,#45D4C0,#2A9E8E)", transition:"width .5s cubic-bezier(.2,.8,.2,1)" }} />
                </div>
                {bloques.map((b, i) => (
                  <button key={b.id} className="rail-i" data-on={activo === b.id ? "1" : "0"} onClick={() => irA(b.id)}
                    title={`Ir a ${b.l} · Alt+${i + 1}`}>
                    <span className="rail-dot" data-ok={b.ok ? "1" : "0"} />
                    <b.Icon size={13} style={{ opacity:.75, flexShrink:0 }} />
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.l}</span>
                    <span className="rail-k mono">alt {i + 1}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding:"11px 9px 0", fontSize:10.5, color:"var(--n300)", lineHeight:1.5 }}>
                Un solo scroll. El rail es para saltar, no un asistente por pasos.
                <button className="rail-help" onClick={() => setAtajos(true)}>
                  Ver todos los atajos <span className="kbd">?</span>
                </button>
              </div>

              {/* bitácora interna: fija acá, nunca en el flujo de la cotización */}
              <NotasRail q={q} set={set} vistaPasajero={vistaPasajero} toast={toast} vendedor={vendedor} />
            </aside>

            {/* formulario */}
            <main ref={scroller} className="ed-main" style={{ flex:1, minWidth:0 }}>
              {vistaPasajero && <BannerPasajero onSalir={() => setVistaPasajero(false)} />}
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

              <BloqueCliente q={q} set={set} refEl={primerCampo} onUsarBase={(fila) => { void usarBase(fila); }} />
              <BloqueMensaje q={q} set={set} toast={toast} />
              <BloqueEncabezado q={q} set={set} tramos={tramos} hayManual={hayManual} onRepropagar={repropagar} />
              {!q.soloVuelos && <BloqueServicios q={q} set={set} toast={toast} />}
              <BloqueVuelos q={q} set={set} toast={toast} />
              {!q.soloVuelos && (
                <BloqueAlojamiento q={q} set={set} tramos={tramos} toast={toast} vistaPasajero={vistaPasajero} />
              )}
              <BloqueNotasCliente q={q} set={set} toast={toast} />

              <div style={{ display:"flex", gap:9, marginTop:18, flexWrap:"wrap" }}>
                <Btn variant="p" style={{ height:44, paddingInline:22 }} onClick={() => setCompartir(true)}>
                  <Send size={15} /> Compartir cotización
                </Btn>
                <Btn variant="tv" style={{ height:44 }} onClick={() => { void duplicarActual(); }}>
                  <Copy size={15} /> Duplicar cotización
                </Btn>
                <Btn variant="ta" style={{ height:44 }} onClick={() => { void guardarComoPlantilla(); }}>
                  <Files size={15} /> Guardar como plantilla</Btn>
                <Btn variant="v" style={{ height:44 }} onClick={() => { void salirDelEditor("cotizar"); }}>
                  <ListChecks size={15} /> Cotizaciones</Btn>
              </div>
            </main>

            {/* teléfono */}
            <aside className="phone-col" style={{ width:336, flexShrink:0, position:"sticky", top:74 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10, paddingLeft:4 }}>
                <span className="lbl" style={{ whiteSpace:"nowrap" }}>Lo que ve el pasajero</span>
                <span title="Las notas internas no aparecen acá" style={{ display:"grid", placeItems:"center",
                  width:20, height:20, borderRadius:7, background:"rgba(244,62,85,.12)", color:"var(--ink-coral)" }}>
                  <Lock size={10} /></span>
                <div style={{ marginLeft:"auto", display:"flex", gap:3, padding:3, background:"var(--sunk)", borderRadius:9 }}>
                  <button title="Vista celular" style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center",
                    background:"var(--pop)", color:"var(--ink)", boxShadow:"0 1px 3px rgba(26,26,46,.12)" }}>
                    <Smartphone size={12} /></button>
                  <button title="Ver en tablet" onClick={() => setPrev("tab")}
                    style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center", color:"var(--n400)" }}>
                    <Smartphone size={14} style={{ transform:"rotate(90deg)" }} /></button>
                  <button title="Ver en escritorio" onClick={() => setPrev("desk")}
                    style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center", color:"var(--n400)" }}>
                    <Monitor size={12} /></button>
                </div>
              </div>
              <div className="phone ed-phone">
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
                        color: prev === k ? "#1A1A2E" : "rgba(255,255,255,.75)",
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
                        traveloz.com.uy/c/{(q.numero || "nueva").toLowerCase()}
                      </div>
                    </div>
                    <div style={{ height:"min(560px,66vh)", overflowY:"auto" }}>
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} modo="desk" />
                    </div>
                  </div>
                )}

                <Btn onClick={() => setPrev(null)}><X size={14} /> Cerrar vista previa</Btn>
              </div>
            </div>
          )}
        </>
      )}

      {compartir && (
        <ModalCompartir q={q} presupuestoId={presupuestoId} vendedor={vendedor} toast={toast}
          onClose={() => setCompartir(false)}
          onPreview={() => { setCompartir(false); setPrev("cel"); }}
          onImprimir={() => { setCompartir(false); setImprimir(true); }}
          onIr={(id) => { setCompartir(false); irA(id); }}
          onVigencia={(h) => set((d) => { d.vigencia = h; })}
          onEnviada={() => { set((d) => { d.estado = "enviada"; }); void recargar(); }} />
      )}
      {imprimir && (
        <div className="print-root">
          <div className="print-tools">
            <FileText size={15} style={{ color:"var(--coral)", flexShrink:0 }} />
            <span style={{ fontSize:12.5, color:"var(--n600)", flex:1 }}>
              Así sale impresa: las opciones van una debajo de la otra, sin cortes en el medio.
            </span>
            <Btn variant="p" size="sm" onClick={() => window.print()}>Imprimir o guardar PDF</Btn>
            <Btn size="sm" onClick={() => setImprimir(false)}>Cerrar</Btn>
          </div>
          <div className="print-hoja">
            <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} modo="print" />
          </div>
        </div>
      )}
      {paleta && <Paleta acciones={acciones} onClose={() => setPaleta(false)} />}
      {atajos && <HojaAtajos onClose={() => setAtajos(false)} />}

      <Toasts items={toasts} onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))}
        onUndo={(t) => { t.undo?.(); setToasts((l) => l.filter((x) => x.id !== t.id)); }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width:1320px){ .ctz .phone-col{ display:none } }
        @media (min-width:1321px){ .ctz .only-wide{ display:none } }
        @media (max-width:900px){ .ctz .rail-col{ display:none } }
        @media (max-width:1240px){ .ctz .only-ancho{ display:none } }
      `}} />
    </div>
    </CotizadorCtx.Provider>
  );
}
