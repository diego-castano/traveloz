import { notFound } from "next/navigation";
import { ContenidosSitioDemo, type VistaDemo } from "./ContenidosSitioDemo";
import "@/app/backend/collection/collection.css";

// Aliados, Testimonios y Preguntas con datos en memoria, sin login.
// ?vista=aliados|testimonios|preguntas&abrir=<id>&lectura=1

const VISTAS: VistaDemo[] = ["aliados", "testimonios", "preguntas"];

export default function DevContenidosSitio({
  searchParams,
}: {
  searchParams: { vista?: string; abrir?: string; lectura?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const vista = VISTAS.find((v) => v === searchParams.vista) ?? "aliados";
  return <ContenidosSitioDemo vista={vista} abrir={searchParams.abrir ?? null} lectura={!!searchParams.lectura} />;
}
