// ---------------------------------------------------------------------------
// precioDesde — la única regla del precio "desde" de un paquete
//
// POR QUÉ RECALCULAMOS EN VEZ DE LEER EL CAMPO GUARDADO
//
// `Paquete.precioDesde` (y su hermano `precioVenta`) son una COPIA
// denormalizada que escribe el motor de precios, src/lib/recompute-prices.ts.
// La pestaña Precios del backend nunca lee esa copia: recalcula en vivo con los
// precios de servicio vigentes. El sitio público sí la leía, así que cada vez
// que la copia quedaba vieja (un recompute que no corrió, un servicio que
// cambió después) el operador veía un número y el cliente otro.
//
// La copia se queda por un solo motivo: Postgres necesita una columna concreta
// para el `ORDER BY precioDesde` de los listados, y no puede ordenar por algo
// que todavía no calculamos. O sea: la copia existe para ORDENAR, no para
// MOSTRAR. Toda superficie que muestre el precio pasa por acá.
//
// La regla, en el mismo orden en que la aplica la pestaña Precios:
//   1. Con opciones hoteleras → la más barata, con la venta de cada opción
//      CALCULADA EN VIVO: (costos fijos + alojamiento de la opción) / factor,
//      la misma cuenta que hace la pestaña Precios.
//
//      `OpcionHotelera.precioVenta` es OTRA copia denormalizada, del mismo tipo
//      que `Paquete.precioDesde`, y sólo se usa como último recurso (ver
//      ventaDeOpcion). Mientras se leyó esa copia pasaba esto: el operador
//      actualizaba una tarifa de hotel o el período de viaje, el panel mostraba
//      el número nuevo y la web seguía publicando el viejo.
//   2. Sin opciones y modalidad CIRCUITO → costos fijos vigentes / markup del
//      paquete, con `calcularVenta` (la misma función que usa el motor).
//   3. Sin nada con qué calcular → null, y la UI muestra "Consultar". Es lo
//      mismo que muestra el panel: sin opciones y sin circuito no dibuja precio.
// ---------------------------------------------------------------------------

import {
  calcularNetoFijos,
  calcularVenta,
  calcularVentaOpcion,
  computeNochesTotales,
  fechaAnclaPaquete,
  resolvePrecioEnPeriodo,
} from "@/lib/utils";

/**
 * Servicios asignados al paquete con la tarifa YA resuelta al período que
 * corresponde (misma resolución que hace el panel con `resolvePrecio*`).
 * Los tipos son estructurales a propósito: el panel pasa sus objetos del store
 * y el público los suyos de Prisma, sin que ninguno tenga que adaptarlos.
 */
export interface ServiciosResueltos {
  aereos: { precioAereo?: { precioAdulto: number } | null }[];
  traslados: { precio: number }[];
  seguros: { seguro: { costoPorDia: number }; diasCobertura?: number | null }[];
  circuitos: {
    circuito: { noches: number };
    precioCircuito?: { precio: number } | null;
  }[];
}

export interface PrecioDesdeInput {
  /** `undefined` cuando el store del admin todavía no lo trajo: no es CIRCUITO. */
  modalidad?: string | null;
  markup: number;
  /** Noches del paquete. Referencia de seguros cuando no hay circuito. */
  noches?: number | null;
  /** Suma de noches de los destinos cargados. Último fallback. */
  nochesTotales: number;
  /** Precios de venta de las opciones hoteleras (0 = sin precio cargado). */
  ventasOpciones: number[];
  servicios: ServiciosResueltos;
}

export interface PrecioDesdeResuelto {
  /** El precio a mostrar. null = "Consultar". */
  precioDesde: number | null;
  /** De dónde salió, para que la UI y los logs no tengan que adivinarlo. */
  origen: "opciones" | "circuito" | "sin-precio";
  /** Neto de los costos fijos del circuito. 0 en las otras ramas. */
  neto: number;
  /** Noches usadas para prorratear los seguros sin diasCobertura propio. */
  nochesRef: number;
}

/**
 * Núcleo de la regla. Devuelve además el neto y las noches de referencia para
 * que el panel dibuje su desglose con exactamente los mismos números que
 * publica la web, sin recalcularlos por su cuenta.
 */
export function resolverPrecioDesde(input: PrecioDesdeInput): PrecioDesdeResuelto {
  const ventas = input.ventasOpciones.filter((v) => v > 0);
  if (ventas.length > 0) {
    return {
      precioDesde: Math.min(...ventas),
      origen: "opciones",
      neto: 0,
      nochesRef: input.nochesTotales,
    };
  }

  const { aereos, traslados, seguros, circuitos } = input.servicios;

  // Modalidad CIRCUITO: no hay opciones hoteleras, el precio sale de los costos
  // fijos (circuito por persona + aéreos + traslados + seguros) sobre el markup
  // del paquete. La duración de referencia para los seguros sin diasCobertura
  // es la del circuito asignado, que es la fuente de verdad en esta modalidad.
  if (input.modalidad !== "CIRCUITO") {
    return { precioDesde: null, origen: "sin-precio", neto: 0, nochesRef: input.nochesTotales };
  }

  const nochesRef = circuitos[0]?.circuito.noches ?? input.noches ?? input.nochesTotales;
  const neto = calcularNetoFijos(aereos, traslados, seguros, circuitos, nochesRef);
  const venta = calcularVenta(neto, input.markup);
  return {
    precioDesde: venta > 0 ? venta : null,
    origen: venta > 0 ? "circuito" : "sin-precio",
    neto,
    nochesRef,
  };
}

// ---------------------------------------------------------------------------
// Adaptador para filas de Prisma (sitio público)
// ---------------------------------------------------------------------------

interface TarifaPorPeriodo {
  periodoDesde: string;
  periodoHasta: string;
}

/**
 * Forma mínima que tiene que traer una fila de `Paquete` para que se le pueda
 * calcular el precio. Las tarifas vienen crudas (todos los períodos): la
 * resolución al período que viaja el pasajero la hace el adaptador con el mismo
 * `resolvePrecioEnPeriodo` que usa el panel.
 */
export interface PaqueteConServicios {
  modalidad?: string | null;
  markup: number;
  noches?: number | null;
  viajeDesde?: string | null;
  validezDesde?: string | null;
  /**
   * `factor` y `hoteles` son opcionales para no romper a quien consulte sólo
   * la copia guardada: sin ellos se cae a `precioVenta`. Con ellos, la venta se
   * calcula en vivo igual que en el panel.
   */
  opcionesHoteleras: {
    precioVenta: number;
    factor?: number;
    hoteles?: {
      destinoId: string;
      alojamiento: {
        precios: (TarifaPorPeriodo & { precioPorNoche: number })[];
      };
    }[];
  }[];
  destinos: { id?: string; noches: number }[];
  aereos: {
    aereo: {
      deletedAt?: Date | null;
      precios: (TarifaPorPeriodo & { precioAdulto: number })[];
    };
  }[];
  traslados: { traslado: { deletedAt?: Date | null; precio: number } }[];
  seguros: {
    diasCobertura?: number | null;
    seguro: { deletedAt?: Date | null; costoPorDia: number };
  }[];
  circuitos: {
    circuito: {
      deletedAt?: Date | null;
      noches: number;
      precios: (TarifaPorPeriodo & { precio: number })[];
    };
  }[];
}

/**
 * Precio "desde" de una fila de paquete con sus servicios. Descarta los
 * servicios dados de baja, igual que el panel: el store del backend sólo carga
 * los que tienen `deletedAt: null`, así que un servicio borrado no suma costo
 * ni allá ni acá.
 */
export function precioDesdeDePaquete(paquete: PaqueteConServicios): number | null {
  return resolverPrecioDesdePaquete(paquete).precioDesde;
}

/**
 * Venta de UNA opción hotelera, con la misma cuenta que la pestaña Precios:
 * (costos fijos + neto de alojamiento de esa opción) / factor.
 *
 * Devuelve `null` cuando la consulta no trajo con qué calcular (sin `hoteles`
 * o sin `factor`): ahí el llamador cae a la copia guardada. Si los datos SÍ
 * están, se calcula aunque alguna tarifa no resuelva para el período — es
 * exactamente lo que hace `computePaquetePrecios` en el panel, y el objetivo es
 * que los dos números no puedan discrepar.
 */
function ventaDeOpcion(
  opcion: PaqueteConServicios["opcionesHoteleras"][number],
  destinos: PaqueteConServicios["destinos"],
  netoFijos: number,
  fecha: string | null | undefined,
): number | null {
  if (!opcion.hoteles || !opcion.factor) return null;

  const nochesPorDestino = new Map(
    destinos.filter((d) => d.id).map((d) => [d.id as string, d.noches]),
  );
  let netoAlojamiento = 0;
  for (const hotel of opcion.hoteles) {
    const noches = nochesPorDestino.get(hotel.destinoId);
    if (noches === undefined) continue;
    const tarifa = resolvePrecioEnPeriodo(hotel.alojamiento.precios, fecha);
    if (!tarifa) continue;
    netoAlojamiento += tarifa.precioPorNoche * noches;
  }
  return calcularVentaOpcion(netoFijos, netoAlojamiento, opcion.factor);
}

/** Igual que {@link precioDesdeDePaquete} pero con el detalle del cálculo. */
export function resolverPrecioDesdePaquete(
  paquete: PaqueteConServicios,
): PrecioDesdeResuelto {
  const fecha = fechaAnclaPaquete(paquete);

  const serviciosResueltos: ServiciosResueltos = {
    aereos: paquete.aereos
      .filter((pa) => !pa.aereo.deletedAt)
      .map((pa) => ({ precioAereo: resolvePrecioEnPeriodo(pa.aereo.precios, fecha) })),
    traslados: paquete.traslados
      .filter((pt) => !pt.traslado.deletedAt)
      .map((pt) => pt.traslado),
    seguros: paquete.seguros
      .filter((ps) => !ps.seguro.deletedAt)
      .map((ps) => ({ seguro: ps.seguro, diasCobertura: ps.diasCobertura })),
    circuitos: paquete.circuitos
      .filter((pc) => !pc.circuito.deletedAt)
      .map((pc) => ({
        circuito: pc.circuito,
        precioCircuito: resolvePrecioEnPeriodo(pc.circuito.precios, fecha),
      })),
  };

  // Costos fijos compartidos por todas las opciones. Las noches de referencia
  // son las de los destinos, igual que en `computePaquetePrecios` para la rama
  // con opciones (la rama CIRCUITO recalcula con las noches del circuito).
  const nochesTotales = computeNochesTotales(paquete.destinos);
  const netoFijos = calcularNetoFijos(
    serviciosResueltos.aereos,
    serviciosResueltos.traslados,
    serviciosResueltos.seguros,
    serviciosResueltos.circuitos,
    nochesTotales,
  );

  return resolverPrecioDesde({
    modalidad: paquete.modalidad,
    markup: paquete.markup,
    noches: paquete.noches,
    nochesTotales,
    ventasOpciones: paquete.opcionesHoteleras.map(
      (o) => ventaDeOpcion(o, paquete.destinos, netoFijos, fecha) ?? o.precioVenta,
    ),
    servicios: serviciosResueltos,
  });
}
