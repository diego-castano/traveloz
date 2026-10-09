import { notFound } from "next/navigation";
import { RecortesDemo } from "./RecortesDemo";
import "@/app/backend/collection/collection.css";

// Encuadres y límites de video con datos de mentira, sin login.
// ?v=editor169 | editor45 | detalle | slot | selector | subir | render

export default function DevRecortes({ searchParams }: { searchParams: { v?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <RecortesDemo v={searchParams.v ?? "render"} />;
}
