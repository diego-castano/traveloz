import type { Metadata } from "next";
import { BloqueEspecialistas } from "@/components/collection/sitio/bloques";
import { CabeceraPagina, EstadoVacio, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { especialistasPublicados } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

const BAJADA = "Cada viaje lo diseña y lo acompaña una persona que conoce el destino.";

export const metadata: Metadata = metaSitio({ titulo: "Especialistas", descripcion: BAJADA, ruta: "/especialistas" });

export default async function Especialistas() {
  const especialistas = await especialistasPublicados();
  return (
    <RaizSitio>
      <CabeceraPagina titulo="Especialistas" bajada={BAJADA} />
      {especialistas.length ? (
        <BloqueEspecialistas
          bloque={{ id: "especialistas", tipo: "especialistas", oculto: false, eyebrow: "", titulo: "", bajada: "", especialistas }}
          modo="sitio"
        />
      ) : (
        <EstadoVacio titulo="Muy pronto, el equipo." texto="Estamos preparando esta página. Mientras tanto, escribinos y te respondemos." />
      )}
    </RaizSitio>
  );
}
