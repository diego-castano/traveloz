"use client";

import { createContext, useContext } from "react";

/* Catálogo vacío: la forma que espera todo el que llama `useCatalogo()` cuando
   todavía no cargó nada — o cuando NO hay panel del que cargar.

   Vive acá y no en catalogo.js a propósito. La ficha del pasajero se monta
   también en el link público (/c/<token>), que no tiene ni PackageProvider ni
   ServiceProvider; si esta constante siguiera en catalogo.js, importarla desde
   el contexto arrastraría los tres providers del panel al bundle público. */
export const CATALOGO_VACIO = {
  paquetes: [],
  hoteles: [],
  ciudades: [],
  regionesIA: [],
  hotelById: () => undefined,
  hotelesCotizadosEn: () => [],
  registrarHotelLibre: () => null,
  esFavorito: () => false,
  toggleFavorito: () => false,
  aplicarFavoritos: () => {},
  favoritos: [],
  regimenTexto: () => "",
  cargando: true,
  progreso: "Cargando catálogo…",
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXTO DEL COTIZADOR

   Quién soy, quiénes son los vendedores del panel y con qué textos arranca
   toda cotización. Todo entra por props desde la página (server component,
   `getContextoCotizador`) y baja por acá a la firma, al "Ver como", al reporte
   por vendedor y al drawer.

   Forma de cada vendedor: la arma `vendedorDesdeUsuario` en ../tipos.ts
   → { id, nombre, inicial, cargo, tel, email, linkDatos, linkPago, foto, rol }

   `catalogo` es lo mismo pero para los datos: paquetes, hoteles, ciudades y
   regímenes reales del panel. Lo arma `useCatalogoCotizador()` (./catalogo.js)
   y lo publica el componente raíz.

   `ajustes` son los cinco textos del máster (/backend/cotizador/ajustes):
   plantillaMensaje, condiciones, vigenciaDefault, emailCopia, factorDefault.

   `aeropuertos` y `aerolineas` son el catálogo IATA de la base: reemplazan a
   las constantes AEROPUERTOS / AEROLINEAS que vivían en data.js.
   ═══════════════════════════════════════════════════════════════════════════ */

const AJUSTES_VACIO = {
  plantillaMensaje: "",
  condiciones: [],
  vigenciaDefault: 96,
  emailCopia: "",
  factorDefault: 0.88,
};

const VACIO = {
  yo: null,
  vendedores: [],
  siteBaseUrl: "",
  esAdmin: false,
  catalogo: CATALOGO_VACIO,
  ajustes: AJUSTES_VACIO,
  aeropuertos: {},
  aerolineas: {},
};

const CotizadorCtx = createContext(VACIO);

function useCtz() {
  return useContext(CotizadorCtx);
}

/* Atajo para los componentes que solo necesitan los datos. */
function useCatalogo() {
  return useContext(CotizadorCtx).catalogo || CATALOGO_VACIO;
}

/* Atajo para los textos del máster. */
function useAjustes() {
  return useContext(CotizadorCtx).ajustes || AJUSTES_VACIO;
}

/* Aeropuertos indexados por código IATA: { MVD: { codigo, ciudad, nombre, terminal } } */
function useAeropuertos() {
  return useContext(CotizadorCtx).aeropuertos || {};
}

/* Aerolíneas indexadas por código IATA: { LA: "LATAM" } */
function useAerolineas() {
  return useContext(CotizadorCtx).aerolineas || {};
}

/* Vendedor de reserva: si una fila apunta a alguien que ya no está, la pantalla
   muestra un guión en vez de romperse. */
const VENDEDOR_VACIO = {
  id: null, nombre: "—", inicial: "—", cargo: "", tel: "", email: "",
  linkDatos: null, linkPago: null, foto: null, firma: null, rol: "",
};

function buscarVendedor(vendedores, id) {
  return (vendedores || []).find((v) => v.id === id) || VENDEDOR_VACIO;
}

/* Índices listos para el editor y la ficha del pasajero. Se arman una vez en la
   raíz y viajan por el contexto: nadie recorre el array en cada render. */
function indexarAeropuertos(lista) {
  const m = {};
  for (const a of lista || []) m[a.codigo] = a;
  return m;
}
function indexarAerolineas(lista) {
  const m = {};
  for (const a of lista || []) m[a.codigo] = a.nombre;
  return m;
}

export {
  CotizadorCtx, useCtz, useCatalogo, useAjustes, useAeropuertos, useAerolineas,
  buscarVendedor, VENDEDOR_VACIO, AJUSTES_VACIO, indexarAeropuertos, indexarAerolineas,
};
