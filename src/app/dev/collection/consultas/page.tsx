import { notFound } from "next/navigation";
import { ConsultasDemo } from "./ConsultasDemo";
import "@/app/backend/collection/collection.css";

// Panel de consultas con el adaptador en memoria, sin login. ?abrir=c2&tab=newsletter&lectura=1

export default function DevConsultas({ searchParams }: { searchParams: { lectura?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <ConsultasDemo lectura={!!searchParams.lectura} />;
}
