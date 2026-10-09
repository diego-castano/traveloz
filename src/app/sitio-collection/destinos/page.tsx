import type { Metadata } from "next";
import { BloqueDestinos } from "@/components/collection/sitio/bloques";
import { CabeceraPagina, EstadoVacio, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { destinosPublicados } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

const BAJADA = "Regiones y rutas que conocemos de cerca. Elegí por dónde empezar.";

export const metadata: Metadata = metaSitio({ titulo: "Destinos", descripcion: BAJADA, ruta: "/destinos" });

export default async function Destinos() {
  const destinos = await destinosPublicados();
  return (
    <RaizSitio>
      <CabeceraPagina titulo="Destinos" bajada={BAJADA} />
      {destinos.length ? (
        <BloqueDestinos
          bloque={{ id: "destinos", tipo: "destinos", oculto: false, eyebrow: "", titulo: "", bajada: "", modo: "todos", destinoIds: [], destinos }}
          modo="sitio"
        />
      ) : (
        <EstadoVacio
          titulo="Estamos trazando los primeros destinos."
          texto="Muy pronto vas a poder recorrerlos acá. Si ya sabés a dónde querés ir, contanos y lo diseñamos juntos."
        />
      )}
    </RaizSitio>
  );
}
