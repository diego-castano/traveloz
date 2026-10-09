import { notFound } from "next/navigation";
import { EquipoDemo } from "./EquipoDemo";
import "@/app/backend/collection/collection.css";

// Equipo con guardado de mentira, sin login. ?abrir=<id>&falla=1

export default function DevEquipo({ searchParams }: { searchParams: { abrir?: string; falla?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <EquipoDemo falla={!!searchParams.falla} />;
}
