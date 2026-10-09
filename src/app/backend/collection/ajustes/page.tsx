import { obtenerAjustesCollection } from "@/actions/collection/ajustes.actions";
import { getBitrixOrigenes } from "@/actions/cotizador.actions";
import { Ajustes } from "@/components/collection/ajustes/Ajustes";
import { sitioIndexable } from "@/lib/collection/sitio";

export default async function AjustesPage() {
  const [r, origenes] = await Promise.all([
    obtenerAjustesCollection(),
    // Solo admins de Traveloz la pueden leer; si falla, el origen se escribe a mano.
    getBitrixOrigenes().catch(() => null),
  ]);
  if (!r.ok) {
    return (
      <p role="alert" className="mx-auto max-w-[1080px] py-20 text-center text-col-cuerpo text-col-alerta">
        {r.error}
      </p>
    );
  }
  return <Ajustes inicial={r.data} origenes={origenes} indexa={sitioIndexable()} />;
}
