import { listarTestimonios } from "@/actions/collection/testimonios.actions";
import { listarExperiencias } from "@/actions/collection/experiencias.actions";
import { Testimonios } from "@/components/collection/testimonios/Testimonios";

export default async function TestimoniosPage() {
  const [r, exps] = await Promise.all([listarTestimonios(), listarExperiencias()]);
  return (
    <Testimonios
      inicial={r.ok ? r.data : { error: r.error }}
      experiencias={exps.ok ? exps.data.map((e) => ({ id: e.id, titulo: e.titulo || "Sin título" })) : []}
    />
  );
}
