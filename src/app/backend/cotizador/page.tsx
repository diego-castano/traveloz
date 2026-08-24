import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SITE_BASE_URL } from "@/lib/datos-email";
import { getContextoCotizador } from "@/actions/presupuesto.actions";
import Cotizador from "./CotizadorMockup";
import { vendedorDesdeUsuario, type VendedorCotizador } from "./tipos";

export const metadata: Metadata = {
  title: "Cotizador | TravelOz",
  robots: { index: false, follow: false, nocache: true },
};

// Todo el arranque del cotizador (quién soy, el equipo, los ajustes del máster,
// mis favoritos y el catálogo IATA) sale de la DB en cada request: un alta en
// Perfiles o un cambio de texto en Ajustes tiene que verse sin revalidación.
export const dynamic = "force-dynamic";

function AccesoRestringido() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      <ShieldCheck className="mb-3 h-12 w-12 opacity-40" />
      <p className="text-sm">Acceso restringido</p>
    </div>
  );
}

export default async function CotizadorPage() {
  // La action resuelve el rol por su cuenta: MARKETING y los deslogueados
  // vuelven con { ok:false } y acá termina el asunto.
  const res = await getContextoCotizador();
  if (!res.ok) return <AccesoRestringido />;

  const { yo: usuario, vendedores: equipo, ajustes, favoritos, aeropuertos, aerolineas } = res.data;

  const yo: VendedorCotizador = vendedorDesdeUsuario(usuario, SITE_BASE_URL);
  const vendedores: VendedorCotizador[] = equipo.map((u) =>
    vendedorDesdeUsuario(u, SITE_BASE_URL),
  );
  // Un ADMIN inactivo o recién creado puede no estar en la lista del equipo:
  // igual tiene que poder firmar sus propias cotizaciones.
  if (!vendedores.some((v) => v.id === yo.id)) vendedores.unshift(yo);

  return (
    <Cotizador
      yo={yo}
      vendedores={vendedores}
      siteBaseUrl={SITE_BASE_URL}
      ajustes={ajustes}
      favoritos={favoritos}
      aeropuertos={aeropuertos}
      aerolineas={aerolineas}
    />
  );
}
