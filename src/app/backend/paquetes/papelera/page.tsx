// ---------------------------------------------------------------------------
// /backend/paquetes/papelera - paquetes con borrado suave.
//
// Server component: trae las filas una sola vez y se las pasa al cliente, que
// se encarga de la búsqueda, el quick view y la recuperación. Se lee en cada
// navegación (son pocas filas y la pantalla se visita poco), y `router.refresh()`
// después de recuperar la vuelve a pedir para que la fila desaparezca.
// ---------------------------------------------------------------------------

import {
  getPaquetesEliminados,
  type PaqueteEliminado,
} from "@/actions/package.actions";
import { PapeleraClient } from "./_components/PapeleraClient";

export const metadata = { title: "Papelera de paquetes - TravelOz" };

export default async function PapeleraPage() {
  let paquetes: PaqueteEliminado[] = [];
  let error: string | null = null;
  try {
    paquetes = await getPaquetesEliminados();
  } catch (e) {
    // `getPaquetesEliminados` pide permisos de edición: un rol de sólo lectura
    // que entre por URL directa cae acá y ve el cartel en vez de un 500.
    error =
      e instanceof Error && /permisos|autorizado/i.test(e.message)
        ? e.message
        : "No se pudieron cargar los paquetes eliminados. Probá de nuevo en un rato.";
  }

  return <PapeleraClient paquetes={paquetes} error={error} />;
}
