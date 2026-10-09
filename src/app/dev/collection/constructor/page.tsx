import { notFound } from "next/navigation";
import { PASOS, type PasoId } from "@/lib/collection/experiencia/contenido";
import { ConstructorDemo } from "./ConstructorDemo";
import "@/app/backend/collection/collection.css";

// Constructor con el adaptador en memoria, sin login. ?vacia=1&paso=recorrido&lectura=1&sinmedios=1

export default function DevConstructor({
  searchParams,
}: {
  searchParams: { vacia?: string; paso?: string; lectura?: string; sinmedios?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const paso = PASOS.some((p) => p.id === searchParams.paso) ? (searchParams.paso as PasoId) : "esencial";
  return <ConstructorDemo vacia={!!searchParams.vacia} paso={paso} lectura={!!searchParams.lectura} sinMedios={!!searchParams.sinmedios} />;
}
