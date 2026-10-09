import { listarConsultas } from "@/actions/collection/consultas-admin.actions";
import { Consultas } from "@/components/collection/consultas/Consultas";

export default async function ConsultasPage() {
  const r = await listarConsultas();
  if (!r.ok) {
    return (
      <p role="alert" className="mx-auto max-w-[1080px] py-20 text-center text-col-cuerpo text-col-alerta">
        {r.error}
      </p>
    );
  }
  return <Consultas inicial={r.data} />;
}
