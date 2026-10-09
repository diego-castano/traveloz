import Link from "next/link";
import { obtenerArticulo } from "@/actions/collection/journal.actions";
import { EditorArticulo } from "@/components/collection/journal/EditorArticulo";

export default async function EditorArticuloPage({ params }: { params: { id: string } }) {
  const r = await obtenerArticulo(params.id);
  if (!r.ok) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-col-display text-col-3xl text-col-ink">{r.error}</p>
        <Link
          href="/backend/collection/journal"
          className="text-col-sm font-medium text-col-slate underline decoration-col-gold underline-offset-4 hover:text-col-ink"
        >
          Volver al journal
        </Link>
      </div>
    );
  }
  return <EditorArticulo key={r.data.id} detalle={r.data} className="h-[calc(100dvh-4rem)]" />;
}
