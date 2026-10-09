"use client";

import { useState } from "react";
import { Ajustes } from "@/components/collection/ajustes/Ajustes";
import { ApiProvider } from "@/components/collection/constructor/api";
import { crearApiMock } from "@/components/collection/constructor/api-mock";
import { mediosDemo } from "@/components/collection/sitio/demo-paginas";
import type { AjustesCollection } from "@/lib/collection/ajustes";

// Copia de AJUSTES_VACIOS: ese módulo lee la base y no puede ir al navegador.
const AJUSTES_VACIOS: AjustesCollection = {
  whatsapp: "",
  emailsConsultas: "",
  bitrixOrigen: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  textoFooter: "",
  seoTitulo: "",
  seoDescripcion: "",
  seoImagenId: "",
  indexar: "0",
  horario: "",
};
import { DevShell } from "../DevShell";

const INICIAL: AjustesCollection = {
  ...AJUSTES_VACIOS,
  whatsapp: "+59899412873",
  emailsConsultas: "consultas@traveloz.com.uy, amparo@traveloz.com.uy",
  horario: "Lunes a viernes de 9 a 18",
  instagram: "https://www.instagram.com/travelozcollection",
  seoTitulo: "Traveloz Collection: viajes de autor",
  seoDescripcion: "Viajes de autor diseñados por especialistas de Traveloz: hoteles elegidos uno a uno, ritmo propio y alguien que te acompaña antes, durante y después.",
  seoImagenId: mediosDemo[0]?.id ?? "",
};

const ORIGENES = [
  { id: "WEB", nombre: "Web" },
  { id: "UC_COLLECTION", nombre: "Collection - sitio web" },
  { id: "CALL", nombre: "Llamada" },
  { id: "UC_INSTAGRAM", nombre: "Instagram" },
];

export function AjustesDemo({ lectura, sinBitrix, indexa }: { lectura: boolean; sinBitrix: boolean; indexa: boolean }) {
  const [api] = useState(() => crearApiMock(mediosDemo, 0));
  return (
    <ApiProvider value={api}>
      <DevShell lectura={lectura} ruta="/backend/collection/ajustes" contarNuevas={async () => ({ ok: true, data: 3 })}>
        <Ajustes
          inicial={INICIAL}
          origenes={sinBitrix ? null : ORIGENES}
          indexa={indexa}
          guardar={async (input) => {
            await new Promise((r) => setTimeout(r, 700));
            return { ok: true, data: { ...INICIAL, ...input } as AjustesCollection };
          }}
        />
      </DevShell>
    </ApiProvider>
  );
}
