import { notFound } from "next/navigation";
import { InicioDemo } from "./InicioDemo";
import "@/app/backend/collection/collection.css";

// Inicio con datos en memoria, sin login. ?vacia=1&sinConsultas=1

export default function DevInicio({ searchParams }: { searchParams: { vacia?: string; sinConsultas?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <InicioDemo vacia={!!searchParams.vacia} sinConsultas={!!searchParams.sinConsultas} />;
}
