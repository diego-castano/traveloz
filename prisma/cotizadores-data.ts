// ---------------------------------------------------------------------------
// Configuración de los cotizadores de cliente (una sola fuente de verdad).
//
//   Club de Mujeres   → base de cotización + 1ra/2da compra (beneficios / voucher)
//   Hospital Británico → base de cotización + campo "Soy" (empleado / socio)
//
// La usan el seed (prisma/seed-cotizadores.ts) y la migración que las crea en el
// servidor. nombre/email son contacto fijo y no van en `campos`.
// ---------------------------------------------------------------------------

import { camposEstandar, type FormField } from "../src/lib/cotizador-form";

// Inserta campos extra justo antes de "observaciones".
function insertarAntesDeObservaciones(extra: FormField[]): FormField[] {
  const base = camposEstandar();
  const i = base.findIndex((c) => c.id === "observaciones");
  const at = i === -1 ? base.length : i;
  return [...base.slice(0, at), ...extra, ...base.slice(at)];
}

const clubDeMujeres: FormField[] = insertarAntesDeObservaciones([
  {
    id: "tipo_compra",
    tipo: "seleccion",
    etiqueta: "Tipo de compra",
    requerido: true,
    opciones: [
      { id: "1ra", label: "1ra compra" },
      { id: "2da", label: "2da compra" },
    ],
  },
  {
    id: "beneficio",
    tipo: "seleccion",
    etiqueta: "Elegí tu beneficio de bienvenida",
    ayuda: "Podés elegir una sola opción.",
    requerido: false,
    mostrarSi: { campoId: "tipo_compra", igualA: "1ra" },
    opciones: [
      { id: "equipaje", label: "Equipaje en bodega" },
      { id: "salavip", label: "Sala VIP en Aeropuerto de Carrasco" },
      { id: "traslado", label: "Traslado privado IN/OUT en destino" },
      { id: "seguro", label: "Seguro de Asistencia al Viajero" },
    ],
  },
  {
    id: "voucher",
    tipo: "nota",
    etiqueta: "Voucher de regalo",
    contenido:
      "Voucher obsequio de USD 50: aplica a paquetes de hasta USD 1500.\n" +
      "Voucher de USD 100: aplica a paquetes que superen los USD 1500 por pasajero.",
    requerido: false,
    mostrarSi: { campoId: "tipo_compra", igualA: "2da" },
  },
]);

const hospitalBritanico: FormField[] = [
  {
    id: "soy",
    tipo: "seleccion",
    etiqueta: "Soy",
    requerido: true,
    opciones: [
      { id: "empleado", label: "Empleado del Hospital Británico" },
      { id: "socio", label: "Socio del Hospital Británico" },
    ],
  },
  ...camposEstandar(),
];

export type MarcaSeed = {
  slug: string;
  nombreMarca: string;
  tituloHero: string;
  textoInstitucional: string;
  campos: FormField[];
};

export const MARCAS: MarcaSeed[] = [
  {
    slug: "club-de-mujeres",
    nombreMarca: "Club de Mujeres",
    tituloHero: "¡Bienvenidas a su próximo viaje Club de Mujeres!",
    textoInstitucional: "Completá el formulario y recibí tu presupuesto en menos de 24 horas.",
    campos: clubDeMujeres,
  },
  {
    slug: "hospital-britanico",
    nombreMarca: "Hospital Británico",
    tituloHero: "Cotizá tu viaje",
    textoInstitucional: "Completá el formulario y recibí tu presupuesto en menos de 24 horas.",
    campos: hospitalBritanico,
  },
];
