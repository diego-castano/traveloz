// ---------------------------------------------------------------------------
// Lo ÚNICO que puede cruzar al navegador del pasajero.
//
// `contenido` es el JSON entero del cotizador: netos, factores de markup,
// costos fijos internos (`notas`), el bloc del vendedor (`notasLibres`), lo que
// entendió la IA, el PNR crudo y los datos de contacto del cliente. Si ese
// objeto se le pasa a un componente cliente, Next lo serializa COMPLETO dentro
// del payload RSC del HTML: no importa que la ficha del pasajero no lo pinte,
// alcanza con abrir "ver código fuente" para leer cuánto ganamos.
//
// De ahí que esto se construya por LISTA BLANCA, campo por campo, y nunca
// borrando lo que molesta. `contenidoSchema` es `looseObject` a propósito (el
// editor agrega campos casi todas las semanas): con una lista negra, el campo
// nuevo de mañana viaja solo y nadie se entera.
//
// El precio ya viene resuelto: cada tarifa sale con `venta` numérica y sin
// `neto` ni `factor`. La aritmética es la misma de derivados.ts / data.js
// (`venta` pisada a mano ?? neto ÷ factor), redondeada igual que `money()`, así
// que el pasajero ve exactamente el mismo número que el vendedor aprobó.
//
// Módulo de servidor: lo importa el server component de /c/<token> y nada más.
// ---------------------------------------------------------------------------

import type { ContenidoPresupuesto } from "./schema";
import { precioOpcion, ventaTarifa } from "./derivados";
import { sanitizarHtmlNotas } from "./sanitizar";
import { destinoFinal } from "./destino";

/** Texto plano tal cual está guardado (ya normalizado por el schema). */
function txt(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

/**
 * HTML que no dice nada → cadena vacía.
 *
 * Cuenta como contenido el texto que queda al sacar las etiquetas y los
 * espacios duros, o una imagen/tabla incrustada. Es la misma cuenta que hace
 * `hayNotasReales` en la ficha (telefono.jsx): acá corta antes, así el bloc
 * vacío ni siquiera cruza al navegador del pasajero.
 */
function soloMarcado(html: string): string {
  if (!html) return "";
  if (/<(img|table|hr)\b/i.test(html)) return html;
  const texto = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/[\s\u00a0\u200b]+/g, " ")
    .trim();
  return texto ? html : "";
}

function numOnulo(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export interface TarifaPublica {
  id: string;
  tipo: string;
  tipoLibre: string;
  /** Precio de venta ya calculado. Nunca viaja el neto ni el factor. */
  venta: number;
}

export interface HabitacionPublica {
  id: string;
  ocupacion: string;
  tipo: string;
  tarifas: TarifaPublica[];
}

export interface HotelPublico {
  hotelId: string | null;
  libre: string;
  cat: number | null;
  regimen: string;
}

export interface OpcionPublica {
  id: string;
  nombre: string;
  hoteles: HotelPublico[];
  regimen: string;
  habitaciones: HabitacionPublica[];
  /** Precio de la opción, para las (viejas) que no tienen habitaciones. */
  venta: number;
}

export interface ContenidoPublico {
  numero: string;
  titulo: { destino: string; mes: number | null; anio: number | null };
  fechaSalida: string;
  mensajeAuto: string;
  mensaje: string;
  mensajeHtml: string;
  soloVuelos: boolean;
  precioVuelo: { adulto: string; menor: string; infante: string };
  fotosHotel: boolean;
  vuelos: Array<{
    id: string;
    cia: string;
    nro: string;
    aerolinea: string;
    dia: number | null;
    mes: number | null;
    origen: string;
    destino: string;
    salida: string;
    llegada: string;
    /** Días entre salida y llegada: 0 el mismo día, 1 el siguiente. null si no
     *  se sabe (cotización vieja o GDS que no imprime la fecha de llegada). */
    masDias: number | null;
  }>;
  cabina: string | null;
  equipaje: string | null;
  destinos: Array<{
    id: string;
    ciudad: string;
    noches: number;
    regimen: string;
    checkinManual: string | null;
  }>;
  servicios: Array<{
    id: string;
    categoria: string;
    texto: string;
    ciudad: string | null;
    modalidad: string | null;
  }>;
  notasCliente: string;
  vigencia: number | null;
  cliente: { nombre: string };
  opciones: OpcionPublica[];
}

/**
 * El contenido recortado a lo que la ficha del pasajero necesita para dibujarse.
 *
 * Todo lo que no está en esta función NO existe del otro lado. Antes de agregar
 * un campo acá: si el vendedor no se lo mostraría al pasajero por WhatsApp,
 * tampoco va.
 */
export function contenidoPublico(q: ContenidoPresupuesto): ContenidoPublico {
  return {
    numero: txt(q.numero),

    titulo: {
      // El pasajero ve solo el destino final; el camino "Región › País › Ciudad"
      // es del panel y no cruza a la ficha (pedido del cliente, 26/08).
      destino: destinoFinal(q.titulo?.destino),
      mes: q.titulo?.mes ?? null,
      anio: q.titulo?.anio ?? null,
    },
    fechaSalida: txt(q.fechaSalida),

    mensajeAuto: txt(q.mensajeAuto),
    // `mensaje` es el respaldo de `mensajeHtml` y la ficha lo pinta con
    // dangerouslySetInnerHTML igual (`q.mensajeHtml || q.mensaje`), así que
    // pasa por el mismo filtro aunque hoy nadie lo edite.
    mensaje: sanitizarHtmlNotas(q.mensaje),
    mensajeHtml: sanitizarHtmlNotas(q.mensajeHtml),

    soloVuelos: q.soloVuelos === true,
    precioVuelo: {
      adulto: txt(q.precioVuelo?.adulto),
      menor: txt(q.precioVuelo?.menor),
      infante: txt(q.precioVuelo?.infante),
    },
    fotosHotel: q.fotosHotel === true,

    vuelos: (q.vuelos ?? []).map((v) => ({
      id: txt(v?.id),
      cia: txt(v?.cia),
      nro: txt(v?.nro),
      aerolinea: txt(v?.aerolinea),
      dia: v?.dia ?? null,
      mes: v?.mes ?? null,
      origen: txt(v?.origen),
      destino: txt(v?.destino),
      salida: txt(v?.salida),
      llegada: txt(v?.llegada),
      masDias: v?.masDias ?? null,
    })),
    cabina: q.cabina ?? null,
    equipaje: q.equipaje ?? null,

    destinos: (q.destinos ?? []).map((d) => ({
      id: txt(d?.id),
      ciudad: txt(d?.ciudad),
      noches: Number(d?.noches) || 0,
      regimen: txt(d?.regimen),
      checkinManual: d?.checkinManual ?? null,
    })),

    servicios: (q.servicios ?? []).map((s) => ({
      id: txt(s?.id),
      categoria: txt(s?.categoria),
      texto: txt(s?.texto),
      ciudad: s?.ciudad ?? null,
      modalidad: s?.modalidad ?? null,
    })),

    // HTML libre que escribe el vendedor. Se sanea también acá y no solo al
    // guardar: lo que ya está en la base viene de antes de que existiera el
    // saneo de la action.
    //
    // Un bloc vaciado en el editor no queda en "": queda en `<div><br></div>`
    // o en un `<p>&nbsp;</p>`. Eso viaja igual y del otro lado dibuja el
    // título "Notas" arriba de la nada, en pantalla y en el PDF. Lo que no
    // tiene contenido sale como cadena vacía y no llega ni al payload.
    notasCliente: soloMarcado(sanitizarHtmlNotas(q.notasCliente)),

    vigencia: q.vigencia ?? null,

    // Del cliente, solo el nombre: es lo que usa el saludo. El email y el
    // teléfono son datos de contacto que el pasajero ya tiene y que no hacen
    // falta del lado del navegador.
    cliente: { nombre: txt(q.cliente?.nombre) },

    opciones: (q.opciones ?? []).map((o) => ({
      id: txt(o?.id),
      nombre: txt(o?.nombre),
      hoteles: (o?.hoteles ?? []).map((h) => ({
        hotelId: h?.hotelId ?? null,
        libre: txt(h?.libre),
        cat: numOnulo(h?.cat),
        regimen: txt(h?.regimen),
      })),
      regimen: txt(o?.regimen),
      habitaciones: (o?.habitaciones ?? []).map((hab) => ({
        id: txt(hab?.id),
        ocupacion: txt(hab?.ocupacion),
        tipo: txt(hab?.tipo),
        tarifas: (hab?.tarifas ?? []).map((t) => ({
          id: txt(t?.id),
          tipo: txt(t?.tipo),
          tipoLibre: txt(t?.tipoLibre),
          // Misma cuenta y mismo redondeo que money(): el número que se pinta.
          venta: Math.round(ventaTarifa(t, o?.factor)),
        })),
      })),
      // Respaldo del modelo viejo (opciones sin habitaciones, importadas de un
      // paquete): sin neto ni factor del otro lado, el precio tiene que llegar
      // resuelto o la tarjeta muestra USD 0.
      venta: Math.round(precioOpcion(o)),
    })),
  };
}
