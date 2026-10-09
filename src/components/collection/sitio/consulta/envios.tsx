"use client";

// Lo que los formularios del sitio le piden al servidor. Por defecto, las
// server actions reales; las rutas de desarrollo lo cambian por uno en memoria
// para no mandar consultas ni suscripciones de verdad.

import { createContext, useContext } from "react";
import { enviarConsultaCollection, type ConsultaEnviada } from "@/actions/collection/consultas.actions";
import { suscribirNewsletter } from "@/actions/collection/newsletter.actions";

export interface EnviosSitio {
  enviarConsulta: typeof enviarConsultaCollection;
  suscribir: typeof suscribirNewsletter;
  /** Adónde ir después de enviar una consulta. */
  rutaGracias: (r: ConsultaEnviada, experienciaSlug?: string) => string;
}

export function rutaGraciasSitio(r: ConsultaEnviada, experienciaSlug?: string) {
  const q = new URLSearchParams({ n: r.numero });
  if (r.especialista?.nombre) q.set("e", r.especialista.nombre);
  if (experienciaSlug) q.set("x", experienciaSlug);
  return `/contacto/gracias?${q}`;
}

const EnviosCtx = createContext<EnviosSitio>({
  enviarConsulta: enviarConsultaCollection,
  suscribir: suscribirNewsletter,
  rutaGracias: rutaGraciasSitio,
});

export const ProveedorEnvios = EnviosCtx.Provider;
export const useEnvios = () => useContext(EnviosCtx);
