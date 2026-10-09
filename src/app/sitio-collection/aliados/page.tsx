import type { Metadata } from "next";
import { BloqueAliados } from "@/components/collection/sitio/bloques";
import { CabeceraPagina, EstadoVacio, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { aliadosPublicados } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

const BAJADA = "Los proveedores que nos acompañan en la logística de cada viaje.";

export const metadata: Metadata = metaSitio({ titulo: "Aliados", descripcion: BAJADA, ruta: "/aliados" });

export default async function Aliados() {
  const aliados = await aliadosPublicados();
  return (
    <RaizSitio>
      <CabeceraPagina titulo="Aliados" bajada={BAJADA} />
      {aliados.length ? (
        <BloqueAliados
          bloque={{ id: "aliados", tipo: "aliados", oculto: false, eyebrow: "", titulo: "", bajada: "", aliados }}
          modo="sitio"
        />
      ) : (
        <EstadoVacio titulo="Muy pronto, nuestros aliados." texto="Estamos preparando esta página. Mientras tanto, escribinos y te respondemos." />
      )}
    </RaizSitio>
  );
}
