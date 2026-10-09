import { listarArticulos } from "@/actions/collection/journal.actions";
import { ListaArticulos } from "@/components/collection/journal/ListaArticulos";

export default async function JournalPage() {
  const r = await listarArticulos();
  return <ListaArticulos inicial={r.ok ? r.data : { error: r.error }} />;
}
