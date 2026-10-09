import { listarDestinos, listarPaisesCatalogo } from "@/actions/collection/destinos.actions";
import { Destinos } from "@/components/collection/contenido/Destinos";

export default async function DestinosPage({ searchParams }: { searchParams: { abrir?: string; nuevo?: string } }) {
  // Sin permiso de edición, el catálogo de países falla y la hoja queda en solo lectura.
  const [r, paises] = await Promise.all([listarDestinos(), listarPaisesCatalogo()]);
  return (
    <Destinos
      inicial={r.ok ? r.data : { error: r.error }}
      paises={paises.ok ? paises.data : []}
      abrirId={searchParams.abrir ?? null}
      nuevoAlEntrar={!!searchParams.nuevo}
    />
  );
}
