"use client";

// Arma el contexto del shell con adaptadores en memoria para ver Destinos y
// Especialistas sin base de datos. Nada de esto toca el servidor.

import { useState } from "react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { DestinoItem } from "@/actions/collection/destinos.actions";
import type { EspecialistaItem } from "@/actions/collection/especialistas.actions";
import { ApiProvider } from "@/components/collection/constructor/api";
import { crearApiMock, datosDemo } from "@/components/collection/constructor/api-mock";
import { Destinos, type ApiDestinos } from "@/components/collection/contenido/Destinos";
import { Especialistas, type ApiEspecialistas } from "@/components/collection/contenido/Especialistas";
import { DevShell } from "../DevShell";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = <T,>(data: T) => ({ ok: true as const, data });

function foto(id: string, color: string, ancho: number, alto: number, alt: string, focoY = 0.5): MedioVista {
  return {
    id,
    tipo: "FOTO",
    url: "",
    variantes: [],
    ancho,
    alto,
    colorDominante: color,
    placeholder: null,
    alt,
    leyenda: "",
    credito: "",
    focoX: 0.5,
    focoY,
    posterUrl: null,
    duracion: null,
  };
}

const PAISES = [
  ["p-fil", "Filipinas", "Asia"],
  ["p-jap", "Japón", "Asia"],
  ["p-vie", "Vietnam", "Asia"],
  ["p-tai", "Tailandia", "Asia"],
  ["p-mar", "Marruecos", "África"],
  ["p-jor", "Jordania", "Medio Oriente"],
  ["p-nor", "Noruega", "Europa"],
  ["p-por", "Portugal", "Europa"],
  ["p-ita", "Italia", "Europa"],
  ["p-mal", "Maldivas", "Asia"],
].map(([id, nombre, regionNombre]) => ({ id, nombre, regionNombre }));

function destino(
  id: string,
  nombre: string,
  bajada: string,
  estado: DestinoItem["estado"],
  experiencias: number,
  portada: MedioVista | null,
  paises: string[],
): DestinoItem {
  return {
    id,
    slug: nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
    nombre,
    bajada,
    relato: "<p>Templos al amanecer, mercados que no duermen y trenes que cruzan arrozales.</p>",
    portada,
    estado,
    orden: 0,
    seoTitulo: "",
    seoDescripcion: "",
    paises: PAISES.filter((p) => paises.includes(p.id)).map(({ id, nombre }) => ({ id, nombre })),
    experiencias,
  };
}

const DESTINOS: DestinoItem[] = [
  destino("d-1", "Misterios de Oriente", "Templos, mercados y trenes nocturnos.", "PUBLICADO", 6, foto("f-1", "#5D7F8C", 1600, 1067, "Templo entre la niebla", 0.35), ["p-jap", "p-vie"]),
  destino("d-2", "Islas del Pacífico", "Lagunas turquesa y casas sobre el agua.", "PUBLICADO", 4, foto("f-2", "#2F6E73", 1600, 2000, "Lagunas de Bacuit"), ["p-fil", "p-mal"]),
  destino("d-3", "Desiertos y medinas", "Dunas al amanecer y patios con fuentes.", "PUBLICADO", 5, foto("f-3", "#C2A27C", 1200, 1500, "Dunas en Wadi Rum"), ["p-mar", "p-jor"]),
  destino("d-4", "Islas privadas", "Estamos eligiendo cada isla, una por una.", "PROXIMAMENTE", 0, foto("f-4", "#3F6D7A", 1600, 900, "Lancha sobre aguas turquesa"), []),
  destino("d-5", "Fiordos del norte", "Agua quieta, luz larga y cabañas de madera.", "BORRADOR", 0, foto("f-5", "#4C6B5E", 1600, 1067, "Fiordo en calma"), ["p-nor"]),
  destino("d-6", "Viñedos del Atlántico", "", "BORRADOR", 1, null, ["p-por"]),
  destino("d-7", "Costa Amalfitana", "Limones, terrazas y barcos de madera.", "ARCHIVADO", 0, foto("f-7", "#A6785E", 1600, 1067, "Terraza de piedra"), ["p-ita"]),
];

function especialista(
  id: string,
  nombre: string,
  region: string,
  frase: string,
  idiomas: string[],
  retrato: MedioVista | null,
  experiencias: number,
  publicado = true,
): EspecialistaItem {
  return {
    id,
    nombre,
    region,
    frase,
    idiomas,
    retrato,
    whatsapp: "+598 99 123 456",
    email: `${nombre.split(" ")[0].toLowerCase()}@traveloz.com.uy`,
    telefono: "+598 2900 0000",
    publicado,
    orden: 0,
    userId: null,
    bio: "<p>Vivió dos años en Kioto y volvió con una libreta llena de direcciones que no salen en las guías.</p>",
    experiencias,
  };
}

const ESPECIALISTAS: EspecialistaItem[] = [
  especialista("e-1", "Lucía Fernández", "Asia", "Asia se entiende despacio. Te armo el viaje para que tengas tiempo de mirarla.", ["Español", "Inglés", "Japonés"], foto("r-1", "#8E7F74", 800, 1000, "Lucía Fernández"), 6),
  especialista("e-2", "Martín Olivera", "Medio Oriente y África", "El desierto no se cruza: se escucha.", ["Español", "Francés"], foto("r-2", "#7B6A58", 800, 1000, "Martín Olivera"), 4),
  especialista("e-3", "Agustina Pereira", "Europa", "Los mejores hoteles son los que parecen casas.", ["Español", "Italiano", "Portugués"], foto("r-3", "#9C8770", 800, 1000, "Agustina Pereira"), 3),
  especialista("e-4", "Sofía Méndez", "Islas y cruceros", "", ["Español", "Inglés"], null, 0, false),
  especialista("e-5", "Diego Castaño", "Japón", "Japón en tren, de punta a punta.", ["Español"], foto("r-5", "#55707A", 800, 1000, "Diego Castaño"), 1),
];

const USUARIOS = [
  { id: "u-1", name: "Amparo Ruiz" },
  { id: "u-2", name: "Agustina Pereira" },
  { id: "u-3", name: "Diego Castaño" },
];

const apiDestinos: ApiDestinos = {
  async crear({ nombre }) {
    await esperar(300);
    return ok({ id: `d-${Date.now()}`, slug: nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
  },
  async actualizar() {
    await esperar(400);
    return ok(null);
  },
  async reordenar() {
    await esperar(200);
    return ok(null);
  },
  async eliminar(id) {
    await esperar(300);
    const d = DESTINOS.find((x) => x.id === id);
    if (d && d.experiencias > 0) {
      return { ok: false, error: `Este destino tiene ${d.experiencias} experiencias. Archivalo en vez de eliminarlo.` };
    }
    return ok(null);
  },
};

const apiEspecialistas: ApiEspecialistas = {
  async crear() {
    await esperar(300);
    return ok({ id: `e-${Date.now()}` });
  },
  async actualizar() {
    await esperar(400);
    return ok(null);
  },
  async reordenar() {
    await esperar(200);
    return ok(null);
  },
  async eliminar() {
    await esperar(300);
    return ok(null);
  },
};

export function ContenidoDemo({
  vista,
  abrir,
  lectura,
}: {
  vista: "destinos" | "especialistas";
  abrir: string | null;
  lectura: boolean;
}) {
  const [api] = useState(() => {
    const d = datosDemo();
    return crearApiMock(d.biblioteca, d.detalle.revision);
  });
  return (
    <DevShell lectura={lectura} ruta={`/backend/collection/${vista}`}>
      <ApiProvider value={api}>
        {vista === "destinos" ? (
          <Destinos inicial={DESTINOS} paises={PAISES} api={apiDestinos} abrirId={abrir} />
        ) : (
          <Especialistas inicial={ESPECIALISTAS} usuarios={USUARIOS} api={apiEspecialistas} abrirId={abrir} />
        )}
      </ApiProvider>
    </DevShell>
  );
}
