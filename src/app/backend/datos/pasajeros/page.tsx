// ---------------------------------------------------------------------------
// /backend/datos/pasajeros — bandeja global de envíos (ADMIN).
// La página es una cáscara: todo el estado (filtros, paginación, drawer) vive
// en el cliente porque la tabla se refiltra sin recargar.
// ---------------------------------------------------------------------------

import { EnviosBandeja } from "../_components/EnviosBandeja";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pasajeros — TravelOz" };

export default function PasajerosPage() {
  return <EnviosBandeja />;
}
