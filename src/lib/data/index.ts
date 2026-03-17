// ---------------------------------------------------------------------------
// Data Layer Barrel Index
// Re-exports all seed data arrays for single-path imports:
// import { SEED_PAQUETES, SEED_AEREOS, ... } from '@/lib/data'
// ---------------------------------------------------------------------------

// Catalogs
export {
  SEED_TEMPORADAS,
  SEED_TIPOS_PAQUETE,
  SEED_REGIMENES,
  SEED_PAISES,
  SEED_CIUDADES,
  SEED_ETIQUETAS,
} from './catalogos';

// Proveedores
export { SEED_PROVEEDORES } from './proveedores';

// Services -- Aereos
export { SEED_AEREOS, SEED_PRECIOS_AEREO } from './aereos';

// Services -- Alojamientos
export {
  SEED_ALOJAMIENTOS,
  SEED_PRECIOS_ALOJAMIENTO,
  SEED_ALOJAMIENTO_FOTOS,
} from './alojamientos';

// Services -- Traslados
export { SEED_TRASLADOS } from './traslados';

// Services -- Seguros
export { SEED_SEGUROS } from './seguros';

// Services -- Circuitos
export {
  SEED_CIRCUITOS,
  SEED_CIRCUITO_DIAS,
  SEED_PRECIOS_CIRCUITO,
} from './circuitos';

// Packages (central entity + all junction tables)
export {
  SEED_PAQUETES,
  SEED_PAQUETE_AEREOS,
  SEED_PAQUETE_ALOJAMIENTOS,
  SEED_PAQUETE_TRASLADOS,
  SEED_PAQUETE_SEGUROS,
  SEED_PAQUETE_CIRCUITOS,
  SEED_PAQUETE_FOTOS,
  SEED_PAQUETE_ETIQUETAS,
} from './paquetes';
