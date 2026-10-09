import { listarAliados } from "@/actions/collection/aliados.actions";
import { listarProveedoresCatalogo } from "@/actions/collection/catalogo.actions";
import { Aliados } from "@/components/collection/aliados/Aliados";

export default async function AliadosPage() {
  const [r, proveedores] = await Promise.all([listarAliados(), listarProveedoresCatalogo()]);
  return <Aliados inicial={r.ok ? r.data : { error: r.error }} proveedores={proveedores.ok ? proveedores.data : []} />;
}
