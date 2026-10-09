"use client";

// La experiencia en el sitio: "Consultar" abre la hoja para hablar con un
// especialista, ya sabiendo de qué experiencia viene.

import { useCallback, useState } from "react";
import type { ExperienciaVista } from "@/lib/collection/experiencia/contenido";
import { ExperienciaPagina } from "../experiencia/ExperienciaPagina";
import { HojaConsulta } from "../consulta/HojaConsulta";
import { useAsuntoWhatsApp } from "./WhatsAppFlotante";

export function ExperienciaSitio({ vista, consultaAbierta = false }: { vista: ExperienciaVista; consultaAbierta?: boolean }) {
  const [abierta, setAbierta] = useState(consultaAbierta);
  const abrir = useCallback(() => setAbierta(true), []);
  useAsuntoWhatsApp(vista.titulo);
  return (
    <>
      <ExperienciaPagina vista={vista} modo="sitio" onConsultar={abrir} />
      <HojaConsulta
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        experiencia={{ slug: vista.slug, titulo: vista.titulo, especialista: vista.especialista }}
      />
    </>
  );
}
