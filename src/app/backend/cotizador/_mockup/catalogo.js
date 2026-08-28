"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  usePaquetes,
  usePackageState,
  useAllOpcionesHoteleras,
  usePackageLoading,
  usePackageProgress,
} from "@/components/providers/PackageProvider";
import {
  useServiceState,
  useAlojamientos,
  useServiceLoading,
  useServiceProgress,
  useServiceDispatch,
} from "@/components/providers/ServiceProvider";
import { notifyServiceMutation } from "@/lib/services-broadcast";
import { crearAlojamientoRapido } from "@/actions/alojamiento-rapido.actions";
import {
  usePaises,
  useRegiones,
  useRegimenes,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import {
  buildPaquetePreciosIndex,
  computePaquetePreciosIndexed,
  calcularNetoAlojamientosPorOpcion,
  resolvePrecioAereo,
  resolvePrecioAlojamiento,
  resolvePrecioCircuito,
  fechaAnclaPaquete,
} from "@/lib/utils";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import { destinoLimpio, norm, uid } from "./data";

/* ═══════════════════════════════════════════════════════════════════════════
   CATÁLOGO REAL DEL COTIZADOR

   El mockup nació con PAQUETES / HOTELES / CIUDADES inventados en data.js.
   Acá se arman esas mismas formas con lo que el panel ya tiene en memoria:
   PackageProvider, ServiceProvider y CatalogProvider. Nada de fetch propio.

   El precio NO se reimplementa. Sale de los mismos helpers que usan el listado
   de paquetes y el dashboard del vendedor (src/lib/utils.ts), que a su vez son
   el espejo en cliente del motor server (src/lib/recompute-prices.ts):

     netoFijos = calcularNetoFijos(aéreos, traslados, seguros, circuitos, noches)
     netoAloj  = calcularNetoAlojamientosPorOpcion(opción, hoteles, destinos, precios, fechaAncla)
     venta     = round((netoFijos + netoAloj) / opcion.factor)

   Esa venta tiene que dar igual que `OpcionHotelera.precioVenta`, que es lo que
   el motor dejó persistido. Cuando no coincide, el paquete tiene precios
   desactualizados: mostramos el calculado y avisamos por consola en desarrollo.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Los textos exactos que pidió el cliente viven en REGIMENES (data.js). Acá se
   mapea la abreviatura del catálogo real a cada uno. Un régimen sin equivalente
   (UAI y cualquiera que se agregue después) se muestra con su nombre del ABM. */
const REGIMEN_POR_ABREV = {
  SA: "Solo alojamiento (sin comidas incluidas)",
  DES: "Desayuno incluido",
  MP: "Media pensión (sin bebidas)",
  PC: "Pensión completa (sin bebidas)",
  AI: "All Inclusive",
};

/* Ancho de thumbnail que le pedimos al proxy de imágenes del admin. Está en la
   whitelist del route handler ([160,320,480,640,960,1280]) y alcanza para la
   card del inicio (226px) y para la foto del teléfono (336px) en retina. */
const THUMB_W = 640;

/* El gradiente de respaldo necesita un número estable por entidad: los ids son
   cuid, así que se hashean. Mismo id ⇒ mismo gradiente, siempre. */
function seedDe(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* "2026-10-01" → { mes:9, anio:2026 }. Sin fecha ancla el paquete no tiene mes:
   el vendedor lo elige en el encabezado. */
function mesAnioDe(fecha) {
  const t = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return { mes: null, anio: new Date().getFullYear() };
  }
  return { mes: Number(t.slice(5, 7)) - 1, anio: Number(t.slice(0, 4)) };
}

function porOrden(a, b) {
  return (a.orden ?? 0) - (b.orden ?? 0);
}

function agrupar(filas, clave) {
  const m = new Map();
  for (const f of filas) {
    const k = clave(f);
    const l = m.get(k);
    if (l) l.push(f);
    else m.set(k, [f]);
  }
  return m;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {{ favoritosIniciales?: string[],
 *           onToggleFavorito?: (alojamientoId: string, activo: boolean) => void }} [opciones]
 *   `favoritosIniciales` son los del vendedor, tal como los devolvió
 *   `getContextoCotizador`. `onToggleFavorito` se dispara después de mover la
 *   estrella en pantalla: la raíz llama a la server action y confirma (o
 *   revierte) con `aplicarFavoritos`.
 */
export function useCatalogoCotizador({ favoritosIniciales, onToggleFavorito } = {}) {
  const paquetesRaw = usePaquetes();
  const packageState = usePackageState();
  const opcionesTodas = useAllOpcionesHoteleras();
  const serviceState = useServiceState();
  const alojamientos = useAlojamientos();
  const paises = usePaises();
  const regiones = useRegiones();
  const regimenes = useRegimenes();
  const serviceDispatch = useServiceDispatch();

  const cargandoPaquetes = usePackageLoading();
  const cargandoServicios = useServiceLoading();
  const cargandoCatalogo = useCatalogLoading();
  const progresoPaquetes = usePackageProgress();
  const progresoServicios = useServiceProgress();

  /* ── hoteles escritos a mano y favoritos ────────────────────────────────
     Los libres viven solo en la sesión (el vendedor los escribe a mano y los
     vuelve a elegir mientras no recargue). Los favoritos, en cambio, son de la
     base: arrancan con los del vendedor y cada estrella va a HotelFavorito. */
  const libresRef = useRef([]);
  const favoritosRef = useRef(null);
  if (favoritosRef.current === null) {
    favoritosRef.current = new Set(favoritosIniciales || []);
  }
  const toggleRef = useRef(onToggleFavorito);
  toggleRef.current = onToggleFavorito;
  const [tick, setTick] = useState(0);

  /* ── ciudades ───────────────────────────────────────────────────────── */
  const ciudadPorId = useMemo(() => {
    const m = new Map();
    for (const p of paises) for (const c of p.ciudades) m.set(c.id, c);
    return m;
  }, [paises]);

  const ciudades = useMemo(() => {
    const vistas = new Set();
    for (const c of ciudadPorId.values()) if (c.nombre) vistas.add(c.nombre);
    return [...vistas].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base", numeric: true }),
    );
  }, [ciudadPorId]);

  const nombreCiudad = useCallback(
    (ciudadId) => ciudadPorId.get(ciudadId)?.nombre ?? "",
    [ciudadPorId],
  );

  /* El camino inverso: del nombre que se ve en pantalla al id que pide la
     base. `ciudades` es una lista de nombres —así la consumen el autocompletar
     del editor y el buscador de hoteles— y el alta rápida necesita el id.
     Si dos países tienen una ciudad con el mismo nombre gana la primera; el
     alta rápida es para el hotel que el vendedor está mirando, no para
     desambiguar geografía. */
  const ciudadIdDeNombre = useCallback(
    (nombre) => {
      const buscado = norm(nombre || "");
      if (!buscado) return null;
      for (const c of ciudadPorId.values()) if (norm(c.nombre) === buscado) return c.id;
      return null;
    },
    [ciudadPorId],
  );

  /* ── regímenes ──────────────────────────────────────────────────────── */
  const regimenPorId = useMemo(() => {
    const m = new Map();
    for (const r of regimenes) {
      const texto = REGIMEN_POR_ABREV[String(r.abrev || "").toUpperCase()] || r.nombre;
      m.set(r.id, texto);
    }
    return m;
  }, [regimenes]);

  const regimenPorAbrev = useMemo(() => {
    const m = new Map();
    for (const r of regimenes) {
      const abrev = String(r.abrev || "").toUpperCase();
      if (abrev) m.set(abrev, REGIMEN_POR_ABREV[abrev] || r.nombre);
    }
    return m;
  }, [regimenes]);

  /** Texto largo del régimen a partir de su id o de su abreviatura. */
  const regimenTexto = useCallback(
    (idOAbrev) => {
      if (!idOAbrev) return "";
      const clave = String(idOAbrev);
      return (
        regimenPorId.get(clave) ||
        regimenPorAbrev.get(clave.toUpperCase()) ||
        REGIMEN_POR_ABREV[clave.toUpperCase()] ||
        ""
      );
    },
    [regimenPorId, regimenPorAbrev],
  );

  /* ── hoteles ────────────────────────────────────────────────────────── */
  const fotoPorAlojamiento = useMemo(() => {
    const m = new Map();
    const orden = new Map();
    for (const f of serviceState.alojamientoFotos) {
      if (!f.url) continue;
      const previo = orden.get(f.alojamientoId);
      if (previo !== undefined && previo <= f.orden) continue;
      orden.set(f.alojamientoId, f.orden);
      m.set(f.alojamientoId, f.url);
    }
    return m;
  }, [serviceState.alojamientoFotos]);

  const hotelesCatalogo = useMemo(
    () =>
      alojamientos.map((a) => {
        const url = fotoPorAlojamiento.get(a.id) || null;
        return {
          id: a.id,
          nombre: a.nombre,
          ciudad: a.ciudad?.nombre ?? nombreCiudad(a.ciudadId),
          cat: a.categoria ?? 0,
          foto: url ? proxyThumbUrl(url, THUMB_W) : null,
          seed: seedDe(a.id),
        };
      }),
    [alojamientos, fotoPorAlojamiento, nombreCiudad],
  );

  /* Los libres se suman al final: el buscador los muestra con la píldora
     "propio" y el vendedor los vuelve a elegir en la próxima cotización.
     En el medio van los que se acaban de crear en el catálogo: el dispatch al
     ServiceProvider ya los deja en `alojamientos`, pero este puente cubre el
     tramo en que todavía no llegó el re-render (y el caso de que el provider
     recargue desde el server y los pise). Se filtran por id contra el
     catálogo para no listar el mismo hotel dos veces. */
  const nuevosRef = useRef([]);
  const hoteles = useMemo(() => {
    const yaEstan = new Set(hotelesCatalogo.map((h) => h.id));
    const nuevos = nuevosRef.current.filter((h) => !yaEstan.has(h.id));
    return [...hotelesCatalogo, ...nuevos, ...libresRef.current];
    // `tick` es el disparador de los libres, los nuevos y los favoritos: sin él
    // la lista no se rearma cuando el vendedor escribe o crea un hotel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelesCatalogo, tick]);

  const hotelPorId = useMemo(() => {
    const m = new Map();
    for (const h of hoteles) m.set(h.id, h);
    return m;
  }, [hoteles]);

  const hotelById = useCallback((id) => (id ? hotelPorId.get(id) : undefined), [hotelPorId]);

  const registrarHotelLibre = useCallback((nombre, ciudad, cat = 0) => {
    const n = String(nombre || "").trim();
    if (!n) return null;
    let h = libresRef.current.find((x) => norm(x.nombre) === norm(n));
    if (!h) {
      h = {
        id: uid("hc"),
        nombre: n,
        ciudad: ciudad || "",
        cat: cat || 0,
        foto: null,
        seed: 40 + libresRef.current.length,
        propio: true,
      };
      libresRef.current = [...libresRef.current, h];
    } else {
      if (ciudad) h.ciudad = ciudad;
      if (cat) h.cat = cat;
    }
    setTick((t) => t + 1);
    return h;
  }, []);

  /**
   * Mete un `Alojamiento` recién creado en la lista en memoria y lo devuelve
   * ya con la forma que consume el buscador ({ id, nombre, ciudad, cat, foto,
   * seed }). No habla con el server: es el puente para que el hotel aparezca
   * en el acto, sin esperar a que el provider re-renderice.
   */
  const agregarHotelAlCatalogo = useCallback(
    (alojamiento) => {
      if (!alojamiento?.id) return null;
      const h = {
        id: alojamiento.id,
        nombre: alojamiento.nombre,
        ciudad: alojamiento.ciudad?.nombre ?? nombreCiudad(alojamiento.ciudadId),
        cat: alojamiento.categoria ?? 0,
        foto: null,                       // recién creado: las fotos van por el ABM
        seed: seedDe(alojamiento.id),
      };
      const resto = nuevosRef.current.filter((x) => x.id !== h.id);
      nuevosRef.current = [...resto, h];
      setTick((t) => t + 1);
      return h;
    },
    [nombreCiudad],
  );

  /**
   * Alta rápida de hotel desde el buscador del cotizador.
   *
   * Hace las tres cosas de una: lo crea en la base, lo publica en el
   * `ServiceProvider` (y en las demás pestañas, por el canal de mutaciones) y
   * lo suma a la lista en memoria. Devuelve el hotel en forma de catálogo para
   * que el llamador lo seleccione en el slot como `hotelId` real.
   *
   * Vive acá y no en ui.jsx a propósito: la ficha del pasajero importa ui.jsx
   * y se monta también en el link público, que no tiene ningún provider del
   * panel. Si el alta colgara del buscador, ese bundle se llevaría el
   * ServiceProvider entero.
   *
   * → { ok:true, hotel, existente } | { ok:false, error }
   */
  const crearHotelEnCatalogo = useCallback(
    async ({ nombre, ciudad, ciudadId, cat }) => {
      const id = ciudadId || ciudadIdDeNombre(ciudad);
      if (!id) return { ok: false, error: "Elegí una ciudad del catálogo." };
      const res = await crearAlojamientoRapido({
        nombre: String(nombre || "").trim(),
        ciudadId: id,
        categoria: cat ? Number(cat) : null,
      });
      if (!res?.ok) return { ok: false, error: res?.error || "No pudimos crear el hotel." };
      serviceDispatch({ type: "ADD_ALOJAMIENTO", payload: res.alojamiento });
      notifyServiceMutation({ type: "ADD_ALOJAMIENTO", payload: res.alojamiento });
      return { ok: true, hotel: agregarHotelAlCatalogo(res.alojamiento), existente: res.existente };
    },
    [ciudadIdDeNombre, serviceDispatch, agregarHotelAlCatalogo],
  );

  const esFavorito = useCallback(
    (id) => favoritosRef.current.has(id),
    // el Set se muta en el lugar: `tick` obliga a releer después de un toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  /* Optimista: la estrella se mueve en el acto y la raíz se encarga de que el
     server acompañe. Si la action falla, vuelve con `aplicarFavoritos`. */
  const toggleFavorito = useCallback((id) => {
    const f = favoritosRef.current;
    if (f.has(id)) f.delete(id);
    else f.add(id);
    setTick((t) => t + 1);
    const activo = f.has(id);
    toggleRef.current?.(id, activo);
    return activo;
  }, []);

  /** Pisa la lista entera con la que devolvió el server (o con la anterior). */
  const aplicarFavoritos = useCallback((ids) => {
    favoritosRef.current = new Set(ids || []);
    setTick((t) => t + 1);
  }, []);

  const favoritos = useMemo(
    () => [...favoritosRef.current],
    // el Set se muta en el lugar: `tick` es el disparador de la relectura
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  /* ── índices de paquetes ────────────────────────────────────────────── */
  const preciosIndex = useMemo(
    () => buildPaquetePreciosIndex(opcionesTodas, packageState, serviceState),
    [opcionesTodas, packageState, serviceState],
  );

  const fotoPorPaquete = useMemo(() => {
    const m = new Map();
    const orden = new Map();
    for (const f of packageState.paqueteFotos) {
      if (!f.url) continue;
      const previo = orden.get(f.paqueteId);
      if (previo !== undefined && previo <= f.orden) continue;
      orden.set(f.paqueteId, f.orden);
      m.set(f.paqueteId, f.url);
    }
    return m;
  }, [packageState.paqueteFotos]);

  const aereoPorId = useMemo(
    () => new Map(serviceState.aereos.map((a) => [a.id, a])),
    [serviceState.aereos],
  );
  const trasladoPorId = useMemo(
    () => new Map(serviceState.traslados.map((t) => [t.id, t])),
    [serviceState.traslados],
  );
  const seguroPorId = useMemo(
    () => new Map(serviceState.seguros.map((s) => [s.id, s])),
    [serviceState.seguros],
  );
  const circuitoPorId = useMemo(
    () => new Map(serviceState.circuitos.map((c) => [c.id, c])),
    [serviceState.circuitos],
  );

  const destinosPorPaquete = useMemo(
    () => agrupar(packageState.destinos, (d) => d.paqueteId),
    [packageState.destinos],
  );
  const opcionesPorPaquete = useMemo(
    () => agrupar(opcionesTodas, (o) => o.paqueteId),
    [opcionesTodas],
  );
  const hotelesPorOpcion = useMemo(
    () => agrupar(packageState.opcionHoteles, (oh) => oh.opcionHoteleraId),
    [packageState.opcionHoteles],
  );
  const aereosPorPaquete = useMemo(
    () => agrupar(packageState.paqueteAereos, (r) => r.paqueteId),
    [packageState.paqueteAereos],
  );
  const trasladosPorPaquete = useMemo(
    () => agrupar(packageState.paqueteTraslados, (r) => r.paqueteId),
    [packageState.paqueteTraslados],
  );
  const segurosPorPaquete = useMemo(
    () => agrupar(packageState.paqueteSeguros, (r) => r.paqueteId),
    [packageState.paqueteSeguros],
  );
  const circuitosPorPaquete = useMemo(
    () => agrupar(packageState.paqueteCircuitos, (r) => r.paqueteId),
    [packageState.paqueteCircuitos],
  );

  /* ── paquetes ───────────────────────────────────────────────────────── */
  const paquetes = useMemo(() => {
    const activos = paquetesRaw.filter((p) => p.estado === "ACTIVO" && !p.deletedAt);

    return activos.map((p) => {
      const fechaAncla = fechaAnclaPaquete(p);
      const { mes, anio } = mesAnioDe(fechaAncla);
      const precios = computePaquetePreciosIndexed(p, preciosIndex);

      const destinosPq = [...(destinosPorPaquete.get(p.id) ?? [])].sort(porOrden);
      const destinos = destinosPq.map((d) => ({
        ciudad: nombreCiudad(d.ciudadId),
        noches: d.noches,
      }));
      const nochesTotales = destinos.reduce((a, d) => a + (Number(d.noches) || 0), 0);

      const asigAereos = [...(aereosPorPaquete.get(p.id) ?? [])].sort(porOrden);
      const asigTraslados = [...(trasladosPorPaquete.get(p.id) ?? [])].sort(porOrden);
      const asigSeguros = [...(segurosPorPaquete.get(p.id) ?? [])].sort(porOrden);
      const asigCircuitos = [...(circuitosPorPaquete.get(p.id) ?? [])].sort(porOrden);

      /* Desglose del neto fijo por concepto. Es la misma cuenta que hace
         calcularNetoFijos por dentro, abierta para la bitácora del vendedor:
         la suma tiene que dar `precios.netoFijos` (se chequea abajo en dev).
         Los seguros sin diasCobertura se cubren por las noches del itinerario,
         salvo en CIRCUITO, donde manda la duración del circuito. */
      /* El primer circuito se toma sin ordenar, igual que computePaquetePrecios:
         si acá ordenáramos por `orden` y el motor no, los seguros sin
         diasCobertura podrían caer en otra duración y el neto no cerraría. */
      const primerCircuito = (circuitosPorPaquete.get(p.id) ?? [])[0];
      /* El motor entra en la rama del circuito solo cuando NO hay opciones
         hoteleras (recompute-prices.ts: `if (opciones.length === 0)` y recién
         adentro mira la modalidad). Mirando solo la modalidad, un paquete
         CIRCUITO con opciones cargadas tomaba las noches del circuito para los
         seguros y el desglose del vendedor no cerraba contra el neto real. */
      const opcionesDelPaquete = opcionesPorPaquete.get(p.id) ?? [];
      const esCircuito = p.modalidad === "CIRCUITO" && opcionesDelPaquete.length === 0;
      const nochesSeguro = esCircuito
        ? circuitoPorId.get(primerCircuito?.circuitoId)?.noches ?? p.noches ?? nochesTotales
        : nochesTotales;

      const netoAereo = asigAereos.reduce(
        (a, pa) =>
          a + (resolvePrecioAereo(serviceState.preciosAereo, pa.aereoId, fechaAncla)?.precioAdulto ?? 0),
        0,
      );
      const netoTraslados = asigTraslados.reduce(
        (a, pt) => a + (trasladoPorId.get(pt.trasladoId)?.precio ?? 0),
        0,
      );
      const netoSeguros = asigSeguros.reduce((a, ps) => {
        const s = seguroPorId.get(ps.seguroId);
        if (!s) return a;
        return a + s.costoPorDia * (ps.diasCobertura ?? nochesSeguro);
      }, 0);
      const netoCircuitos = asigCircuitos.reduce(
        (a, pc) =>
          a + (resolvePrecioCircuito(serviceState.preciosCircuito, pc.circuitoId, fechaAncla)?.precio ?? 0),
        0,
      );
      const netos = {
        aereo: netoAereo,
        traslados: netoTraslados,
        seguros: netoSeguros,
        circuitos: netoCircuitos,
        fijos: precios.netoFijos,
      };
      if (process.env.NODE_ENV !== "production") {
        const suma = netoAereo + netoTraslados + netoSeguros + netoCircuitos;
        if (Math.round(suma) !== Math.round(precios.netoFijos)) {
          console.warn(
            "[cotizador] el desglose de netos no cierra contra calcularNetoFijos",
            { paquete: p.titulo, suma, netoFijos: precios.netoFijos },
          );
        }
      }

      /* ── servicios ─────────────────────────────────────────────────────
         Salen de los joins reales del paquete, en el orden de cada tabla.
         `textoDisplay` es lo que el operador escribió para el pasajero; si
         está vacío se cae al nombre del servicio del ABM. */
      const servicios = [];

      /* La línea de aéreo va SIN aerolínea. La agencia cotiza el aéreo por
         ruta y se reserva cambiar de compañía manteniendo el precio; con la
         aerolínea escrita en "Tu viaje incluye" quedaba atada (Gero, 26/08).
         Es la misma línea que muestra la ficha pública del paquete
         (`textoDisplay ?? ruta`); los espacios dobles del ABM se colapsan. */
      for (const pa of asigAereos) {
        const a = aereoPorId.get(pa.aereoId);
        const texto = String(pa.textoDisplay || a?.ruta || "").replace(/\s+/g, " ").trim();
        if (texto) servicios.push({ cat: "aereo", texto });
      }

      for (const pt of asigTraslados) {
        const t = trasladoPorId.get(pt.trasladoId);
        const texto = (pt.textoDisplay || t?.nombre || "").trim();
        if (!texto) continue;
        servicios.push({
          cat: "traslado",
          texto,
          ciudad: t?.ciudadId ? nombreCiudad(t.ciudadId) || null : null,
          modalidad: t?.tipo === "PRIVADO" ? "Privado" : t?.tipo === "REGULAR" ? "Regular" : null,
        });
      }

      /* La línea de alojamiento no sale de una tabla: la arma el cotizador con
         las noches y el régimen de cada destino. Va con `auto:"noches"` para
         que siga al itinerario mientras el vendedor no la toque a mano. */
      servicios.push({ cat: "alojamiento", texto: "", auto: "noches" });

      /* El seguro se guarda por PLAN ("Master", "Total", "Platinum"): es el
         nombre comercial de la cobertura para el operador, no algo que el
         pasajero tenga que leer. Decisión del 27/08: la línea dice siempre
         "Seguro de asistencia al viajero", sin plan, salvo que el operador
         haya escrito su propio `textoDisplay`. */
      for (const ps of asigSeguros) {
        if (!seguroPorId.has(ps.seguroId)) continue;
        const propio = String(ps.textoDisplay || "").replace(/\s+/g, " ").trim();
        servicios.push({ cat: "seguro", texto: propio || "Seguro de asistencia al viajero" });
      }

      for (const pc of asigCircuitos) {
        const c = circuitoPorId.get(pc.circuitoId);
        const texto = (pc.textoDisplay || c?.nombre || "").trim();
        if (texto) servicios.push({ cat: "opcionales", texto });
      }

      /* ── opciones ──────────────────────────────────────────────────────
         Una opción del catálogo = una fila de precio del cotizador. El neto
         que ve el vendedor es el del sistema (fijos + alojamiento de esa
         opción) y el factor es el de la opción: `ventaTarifa` reproduce
         exactamente `calcularVentaOpcion`. */
      const opcionesPq = [...opcionesDelPaquete].sort(porOrden);
      const opciones = opcionesPq.map((o) => {
        const asignados = hotelesPorOpcion.get(o.id) ?? [];
        const porDestino = new Map(asignados.map((oh) => [oh.destinoId, oh.alojamientoId]));

        const hotelesOp = destinosPq.map((d) => porDestino.get(d.id) ?? null);
        const regimenesOp = destinosPq.map((d) => {
          const alojamientoId = porDestino.get(d.id);
          if (!alojamientoId) return "";
          const precio = resolvePrecioAlojamiento(
            serviceState.preciosAlojamiento,
            alojamientoId,
            fechaAncla,
          );
          return regimenTexto(precio?.regimenId);
        });

        const netoAloj = calcularNetoAlojamientosPorOpcion(
          o.id,
          packageState.opcionHoteles,
          destinosPq,
          serviceState.preciosAlojamiento,
          fechaAncla,
        );

        return {
          id: o.id,
          nombre: o.nombre,
          hoteles: hotelesOp,
          regimenes: regimenesOp,
          neto: precios.netoFijos + netoAloj,
          factor: o.factor,
          ventaSistema: o.precioVenta > 0 ? o.precioVenta : null,
        };
      });

      /* Modalidad CIRCUITO: no hay opciones hoteleras. El neto son los fijos
         (con las noches del circuito para los seguros, ya resueltas por
         computePaquetePreciosIndexed) y el factor es el markup del paquete —
         misma rama que recompute-prices.ts. */
      if (!opciones.length && p.modalidad === "CIRCUITO") {
        opciones.push({
          id: `${p.id}::circuito`,
          nombre: "Circuito",
          hoteles: destinosPq.map(() => null),
          regimenes: destinosPq.map(() => ""),
          neto: precios.netoFijos,
          factor: p.markup,
          ventaSistema: p.precioVenta > 0 ? p.precioVenta : null,
        });
      }

      const urlFoto = p.heroImage || fotoPorPaquete.get(p.id) || null;

      return {
        id: p.id,
        nombre: p.titulo,
        mes,
        anio,
        /* Solo el período de viaje sirve como fecha de salida sugerida: la
           validez es cuándo se publica el paquete, no cuándo vuela el pasajero. */
        fechaViaje: p.viajeDesde ? String(p.viajeDesde).slice(0, 10) : null,
        foto: urlFoto ? proxyThumbUrl(urlFoto, THUMB_W) : null,
        seed: seedDe(p.id),
        /* "Caribe › Jamaica › Jamaica" se muestra como "Caribe › Jamaica": la
           card del paquete y el título de la cotización dicen lo mismo. */
        resumen: [destinoLimpio(p.destino), nochesTotales ? `${nochesTotales} noches` : ""]
          .filter(Boolean)
          .join(" · "),
        destino: destinoLimpio(p.destino),
        destinos,
        servicios,
        opciones,
        netos,
        modalidad: p.modalidad ?? "CLASICO",
      };
    });
  }, [
    paquetesRaw,
    preciosIndex,
    destinosPorPaquete,
    opcionesPorPaquete,
    hotelesPorOpcion,
    aereosPorPaquete,
    trasladosPorPaquete,
    segurosPorPaquete,
    circuitosPorPaquete,
    aereoPorId,
    trasladoPorId,
    seguroPorId,
    circuitoPorId,
    fotoPorPaquete,
    nombreCiudad,
    regimenTexto,
    packageState.opcionHoteles,
    serviceState.preciosAereo,
    serviceState.preciosAlojamiento,
    serviceState.preciosCircuito,
  ]);

  /* ── "Cotizados antes en X" ─────────────────────────────────────────── */
  const hotelesCotizadosEn = useCallback(
    (ciudad, max = 3) => {
      const c = norm(ciudad || "");
      if (!c) return [];
      const ids = [];
      for (const p of paquetes) {
        if (!p.destinos.some((d) => norm(d.ciudad) === c)) continue;
        for (const o of p.opciones) {
          for (const id of o.hoteles) if (id && !ids.includes(id)) ids.push(id);
        }
      }
      return ids
        .map((id) => hotelPorId.get(id))
        .filter((h) => h && norm(h.ciudad) === c)
        .slice(0, max);
    },
    [paquetes, hotelPorId],
  );

  /* ── regiones para la lectura de consultas ──────────────────────────────
     "Brasil" o "el Caribe" no eligen un paquete solo: suman puntaje a todos
     los de esa región. Los alias salen de la geografía real (nombre de región
     y nombre de país), no de una lista escrita a mano. */
  const regionesIA = useMemo(() => {
    const filas = [];
    for (const r of regiones) {
      const ciudadesRegion = r.paises.flatMap((pa) => pa.ciudades.map((c) => c.nombre));
      if (ciudadesRegion.length) filas.push({ alias: [norm(r.nombre)], ciudades: ciudadesRegion });
      for (const pa of r.paises) {
        if (pa.ciudades.length) {
          filas.push({ alias: [norm(pa.nombre)], ciudades: pa.ciudades.map((c) => c.nombre) });
        }
      }
    }
    return filas;
  }, [regiones]);

  /* ── estado de carga ────────────────────────────────────────────────── */
  const cargando = cargandoPaquetes || cargandoServicios || cargandoCatalogo;
  const progreso = useMemo(() => {
    if (progresoServicios.hydratingAlojamientos && progresoServicios.totalAlojamientos) {
      return `Hoteles ${progresoServicios.loadedAlojamientos}/${progresoServicios.totalAlojamientos}`;
    }
    if (progresoPaquetes.hydratingPaquetes && progresoPaquetes.totalPaquetes) {
      return `Paquetes ${progresoPaquetes.loadedPaquetes}/${progresoPaquetes.totalPaquetes}`;
    }
    return cargando ? "Cargando catálogo…" : "";
  }, [progresoServicios, progresoPaquetes, cargando]);

  return useMemo(
    () => ({
      paquetes,
      hoteles,
      ciudades,
      regionesIA,
      hotelById,
      hotelesCotizadosEn,
      registrarHotelLibre,
      /* alta rápida de hotel: lo crea en la base, lo publica en el provider y
         lo devuelve ya en forma de catálogo */
      crearHotelEnCatalogo,
      agregarHotelAlCatalogo,
      ciudadIdDeNombre,
      esFavorito,
      toggleFavorito,
      aplicarFavoritos,
      favoritos,
      regimenTexto,
      cargando,
      progreso,
    }),
    [
      paquetes,
      hoteles,
      ciudades,
      regionesIA,
      hotelById,
      hotelesCotizadosEn,
      registrarHotelLibre,
      crearHotelEnCatalogo,
      agregarHotelAlCatalogo,
      ciudadIdDeNombre,
      esFavorito,
      toggleFavorito,
      aplicarFavoritos,
      favoritos,
      regimenTexto,
      cargando,
      progreso,
    ],
  );
}

/* Catálogo vacío: lo usa el contexto antes de que el provider monte, así
   ningún consumidor tiene que chequear `catalogo &&` en cada línea. */
/* Se mudó a ./contexto.js (el link público lo necesita sin arrastrar los
   providers del panel). Se re-exporta acá para no romper a quien ya lo
   importaba desde este módulo. */
export { CATALOGO_VACIO } from "./contexto";
