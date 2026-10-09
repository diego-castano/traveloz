import Link from "next/link";
import { obtenerExperiencia } from "@/actions/collection/experiencias.actions";
import { listarProveedoresCatalogo } from "@/actions/collection/catalogo.actions";
import { Constructor } from "@/components/collection/constructor/Constructor";

export default async function ConstructorPage({ params }: { params: { id: string } }) {
  const [r, proveedores] = await Promise.all([obtenerExperiencia(params.id), listarProveedoresCatalogo()]);
  if (!r.ok) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-col-display text-col-3xl text-col-ink">{r.error}</p>
        <Link
          href="/backend/collection/experiencias"
          className="text-col-sm font-medium text-col-slate underline decoration-col-gold underline-offset-4 hover:text-col-ink"
        >
          Volver a experiencias
        </Link>
      </div>
    );
  }
  return (
    <Constructor
      key={r.data.id}
      detalle={r.data}
      proveedores={proveedores.ok ? proveedores.data : []}
      className="h-[calc(100dvh-4rem)]"
    />
  );
}
