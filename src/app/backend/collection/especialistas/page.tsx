import { listarEspecialistas } from "@/actions/collection/especialistas.actions";
import { listarUsuariosTraveloz } from "@/actions/collection/catalogo.actions";
import { Especialistas } from "@/components/collection/contenido/Especialistas";

export default async function EspecialistasPage() {
  // Sin sitio.editar, la lista de usuarios falla y la hoja queda en solo lectura.
  const [r, usuarios] = await Promise.all([listarEspecialistas(), listarUsuariosTraveloz()]);
  return <Especialistas inicial={r.ok ? r.data : { error: r.error }} usuarios={usuarios.ok ? usuarios.data : []} />;
}
