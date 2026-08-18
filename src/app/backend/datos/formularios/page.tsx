// ---------------------------------------------------------------------------
// /backend/datos/formularios - edición de las dos páginas públicas de datos.
//
// La lectura va en el server (getFormulariosAdmin es self-healing: crea la
// fila apagada si todavía no existe) y el editor es cliente porque el
// FormBuilder es drag & drop.
// ---------------------------------------------------------------------------

import { getFormulariosAdmin } from "@/actions/datos-admin.actions";
import { FormulariosEditor } from "../_components/FormulariosEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Formularios de datos · TravelOz" };

export default async function FormulariosPage() {
  let inicial;
  try {
    inicial = await getFormulariosAdmin();
  } catch {
    return (
      <div className="p-6">
        <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Esta pantalla es solo para administradores.
        </p>
      </div>
    );
  }

  return <FormulariosEditor inicial={inicial} />;
}
