import { notFound } from "next/navigation";
import { ContenidoDemo } from "./ContenidoDemo";
import "@/app/backend/collection/collection.css";

// Destinos y Especialistas con datos en memoria, sin login.
// ?vista=especialistas&abrir=<id>&lectura=1

export default function DevContenido({
  searchParams,
}: {
  searchParams: { vista?: string; abrir?: string; lectura?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ContenidoDemo
      vista={searchParams.vista === "especialistas" ? "especialistas" : "destinos"}
      abrir={searchParams.abrir ?? null}
      lectura={!!searchParams.lectura}
    />
  );
}
