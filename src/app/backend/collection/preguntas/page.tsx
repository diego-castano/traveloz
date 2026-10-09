import { listarCategorias, listarPreguntas } from "@/actions/collection/preguntas.actions";
import { Preguntas } from "@/components/collection/preguntas/Preguntas";

export default async function PreguntasPage() {
  const [r, cats] = await Promise.all([listarPreguntas(), listarCategorias()]);
  return <Preguntas inicial={r.ok ? r.data : { error: r.error }} categorias={cats.ok ? cats.data : ["General"]} />;
}
