import Link from "next/link";
import { obtenerPagina } from "@/actions/collection/paginas.actions";
import { EditorPagina } from "@/components/collection/paginas/EditorPagina";

export default async function EditorPaginaPage({ params }: { params: { slug: string } }) {
  const r = await obtenerPagina(params.slug);
  if (!r.ok) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-col-display text-col-3xl text-col-ink">{r.error}</p>
        <Link
          href="/backend/collection/paginas"
          className="text-col-sm font-medium text-col-slate underline decoration-col-gold underline-offset-4 hover:text-col-ink"
        >
          Volver a páginas
        </Link>
      </div>
    );
  }
  return <EditorPagina key={r.data.slug} detalle={r.data} className="h-[calc(100dvh-4rem)]" />;
}
