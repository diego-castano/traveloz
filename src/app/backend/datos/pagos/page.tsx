// ---------------------------------------------------------------------------
// /backend/datos/pagos — registro global de la bóveda (ADMIN).
// ---------------------------------------------------------------------------

import { PagosTabla } from "../_components/PagosTabla";

export const dynamic = "force-dynamic";
export const metadata = { title: "Datos de pago — TravelOz" };

export default function PagosPage() {
  return <PagosTabla />;
}
