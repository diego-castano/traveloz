"use client";

// La experiencia en el sitio: "Consultar" lleva a Contactanos con el slug.

import { useRouter } from "next/navigation";
import type { ExperienciaVista } from "@/lib/collection/experiencia/contenido";
import { ExperienciaPagina } from "../experiencia/ExperienciaPagina";
import { rutaConsulta } from "./menu";

export function ExperienciaSitio({ vista }: { vista: ExperienciaVista }) {
  const router = useRouter();
  return <ExperienciaPagina vista={vista} modo="sitio" onConsultar={() => router.push(rutaConsulta(vista.slug))} />;
}
