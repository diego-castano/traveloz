import { listarExperiencias } from "@/actions/collection/experiencias.actions";
import { ListaExperiencias } from "@/components/collection/experiencias/ListaExperiencias";

export default async function ExperienciasPage({ searchParams }: { searchParams: { nueva?: string } }) {
  const r = await listarExperiencias();
  return <ListaExperiencias inicial={r.ok ? r.data : { error: r.error }} nuevaAlEntrar={!!searchParams.nueva} />;
}
