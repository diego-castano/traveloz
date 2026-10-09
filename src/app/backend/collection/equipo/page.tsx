import { redirect } from "next/navigation";
import { getMiAccesoCollection, listarEquipoCollection } from "@/actions/collection/equipo.actions";
import { PERMISOS_COLLECTION, PERMISOS_INFO } from "@/lib/collection/permisos";
import { Equipo } from "@/components/collection/equipo/Equipo";

export default async function EquipoPage() {
  const acceso = await getMiAccesoCollection();
  if (!acceso?.superAdmin) redirect("/backend/collection");
  const r = await listarEquipoCollection();
  if (!r.ok) {
    return (
      <p role="alert" className="mx-auto max-w-[1080px] py-20 text-center text-[15px] text-col-alerta">
        {r.error}
      </p>
    );
  }
  return <Equipo inicial={r.data} permisos={PERMISOS_COLLECTION.map((p) => ({ id: p, ...PERMISOS_INFO[p] }))} />;
}
