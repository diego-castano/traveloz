import type { Metadata } from "next";
import { BloqueJournal } from "@/components/collection/sitio/bloques";
import { CabeceraPagina, EstadoVacio, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { articulosPublicados } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

const BAJADA = "Guías, relatos y consejos de nuestros especialistas.";

export const metadata: Metadata = metaSitio({ titulo: "Journal", descripcion: BAJADA, ruta: "/journal" });

export default async function Journal() {
  const articulos = await articulosPublicados();
  return (
    <RaizSitio>
      <CabeceraPagina titulo="Journal" bajada={BAJADA} />
      {articulos.length ? (
        <BloqueJournal
          bloque={{ id: "journal", tipo: "journal", oculto: false, eyebrow: "", titulo: "", modo: "recientes", articuloIds: [], articulos }}
          modo="sitio"
        />
      ) : (
        <EstadoVacio titulo="Los primeros relatos están en camino." texto="Muy pronto vas a poder leerlos acá." />
      )}
    </RaizSitio>
  );
}
