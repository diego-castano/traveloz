// ---------------------------------------------------------------------------
// TravelOz Domain Entity Types
// Interfaces match the Prisma schema but use string for DateTime fields
// (server action serialization converts Date → string automatically).
// Enums re-exported from @prisma/client for single source of truth.
// ---------------------------------------------------------------------------

export type { AuthUser as User } from './auth';

// ---------------------------------------------------------------------------
// Enums -- keep as string literal unions for backward compatibility.
// These match the Prisma enum values exactly.
// ---------------------------------------------------------------------------

export type EstadoPaquete = 'BORRADOR' | 'ACTIVO' | 'INACTIVO';
export type TipoTraslado = 'REGULAR' | 'PRIVADO';
export type CategoriaServicio = 'TRASLADOS' | 'SEGUROS' | 'CIRCUITOS';

// ---------------------------------------------------------------------------
// Primary Entities (14 interfaces)
// ---------------------------------------------------------------------------

/** Travel package -- the central entity that aggregates flights, hotels, transfers, insurance, and circuits. */
export interface Paquete {
  id: string;
  brandId: string;
  titulo: string;
  destino: string;
  descripcion: string;
  textoVisual: string | null;
  noches: number;
  salidas: string;
  temporadaId: string;
  tipoPaqueteId: string;
  validezDesde: string;
  validezHasta: string;
  estado: EstadoPaquete;
  destacado: boolean;
  netoCalculado: number;
  /** Factor divisor (0.01-1.00). Precio venta = neto / factor. Ej: 0.88 = ~13.6% margen */
  markup: number;
  precioVenta: number;
  moneda: string;
  ordenServicios: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Flight route operated by an airline, with associated price periods. */
export interface Aereo {
  id: string;
  brandId: string;
  ruta: string;
  destino: string;
  aerolinea: string;
  equipaje: string;
  itinerario: string;
  escalas: number;
  codigoVueloIda: string;
  codigoVueloVuelta: string;
  duracionIda: string;
  duracionVuelta: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Hotel or accommodation property with star rating and price periods. */
export interface Alojamiento {
  id: string;
  brandId: string;
  nombre: string;
  ciudadId: string;
  paisId: string;
  categoria: number;
  sitioWeb: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Airport or intercity transfer service, either regular (shared) or private. */
export interface Traslado {
  id: string;
  brandId: string;
  nombre: string;
  tipo: TipoTraslado;
  ciudadId: string;
  paisId: string;
  proveedorId: string;
  precio: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Travel insurance plan with daily cost and coverage amount. */
export interface Seguro {
  id: string;
  brandId: string;
  proveedorId: string;
  plan: string;
  cobertura: string;
  costoPorDia: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Multi-day guided circuit/tour with day-by-day itinerary and price periods. */
export interface Circuito {
  id: string;
  brandId: string;
  nombre: string;
  noches: number;
  proveedorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Service provider (for transfers, insurance, and circuits). */
export interface Proveedor {
  id: string;
  brandId: string;
  nombre: string;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  servicio: CategoriaServicio;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Travel season label used to group packages (e.g., "Baja 2026", "Alta 2026"). */
export interface Temporada {
  id: string;
  brandId: string;
  nombre: string;
  orden: number;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Package type classification (e.g., "Lunas de miel", "Salidas grupales"). */
export interface TipoPaquete {
  id: string;
  brandId: string;
  nombre: string;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Tag/label for campaigns and frontend URL slugs (e.g., "Black Week", "Promo Nordeste"). */
export interface Etiqueta {
  id: string;
  brandId: string;
  nombre: string;
  slug: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/** Country with ISO code. Contains cities as children. */
export interface Pais {
  id: string;
  brandId: string;
  nombre: string;
  codigo: string;
  createdAt: string;
  updatedAt: string;
}

/** City within a country. Inherits brand scope through its parent Pais. */
export interface Ciudad {
  id: string;
  paisId: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

/** Meal plan regime for hotel pricing (e.g., "All Inclusive", "Desayuno"). */
export interface Regimen {
  id: string;
  brandId: string;
  nombre: string;
  abrev: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Junction / Sub-Entities (8 interfaces)
// ---------------------------------------------------------------------------

/** Price period for a flight route (adult and minor pricing). */
export interface PrecioAereo {
  id: string;
  aereoId: string;
  periodoDesde: string;
  periodoHasta: string;
  precioAdulto: number;
}

/** Price period for a hotel (nightly rate under a specific meal regime). */
export interface PrecioAlojamiento {
  id: string;
  alojamientoId: string;
  periodoDesde: string;
  periodoHasta: string;
  precioPorNoche: number;
  regimenId: string;
}

/** Price period for a guided circuit. */
export interface PrecioCircuito {
  id: string;
  circuitoId: string;
  periodoDesde: string;
  periodoHasta: string;
  precio: number;
}

/** Single day entry in a circuit's itinerary. */
export interface CircuitoDia {
  id: string;
  circuitoId: string;
  numeroDia: number;
  titulo: string;
  descripcion: string;
  orden: number;
}

/** Photo associated with a hotel/accommodation. */
export interface AlojamientoFoto {
  id: string;
  alojamientoId: string;
  url: string;
  alt: string;
  orden: number;
}

/** Photo associated with a travel package. */
export interface PaqueteFoto {
  id: string;
  paqueteId: string;
  url: string;
  alt: string;
  orden: number;
}

/** Many-to-many join between a package and a tag. */
export interface PaqueteEtiqueta {
  id: string;
  paqueteId: string;
  etiquetaId: string;
}

/** Hotel option grouping for a package — each option has its own hotel combination, factor and sale price. */
export interface OpcionHotelera {
  id: string;
  paqueteId: string;
  nombre: string;
  alojamientoIds: string[];
  factor: number;
  precioVenta: number;
  orden: number;
}

// ---------------------------------------------------------------------------
// Package-Service Assignment Types (5 specific join types)
// ---------------------------------------------------------------------------

/** Flight assigned to a package with display order. */
export interface PaqueteAereo {
  id: string;
  paqueteId: string;
  aereoId: string;
  textoDisplay: string | null;
  orden: number;
}

/** Hotel assigned to a package with optional nights override. */
export interface PaqueteAlojamiento {
  id: string;
  paqueteId: string;
  alojamientoId: string;
  nochesEnEste: number | null;
  textoDisplay: string | null;
  orden: number;
}

/** Transfer assigned to a package with display order. */
export interface PaqueteTraslado {
  id: string;
  paqueteId: string;
  trasladoId: string;
  textoDisplay: string | null;
  orden: number;
}

/** Insurance assigned to a package with optional coverage days override. */
export interface PaqueteSeguro {
  id: string;
  paqueteId: string;
  seguroId: string;
  diasCobertura: number | null;
  textoDisplay: string | null;
  orden: number;
}

/** Circuit assigned to a package with display order. */
export interface PaqueteCircuito {
  id: string;
  paqueteId: string;
  circuitoId: string;
  textoDisplay: string | null;
  orden: number;
}
