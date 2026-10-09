import { notFound } from "next/navigation";
import { SubidasDemo } from "./SubidasDemo";
import "@/app/backend/collection/collection.css";

// Zona de subida, tarjetas y cola con estados de mentira, sin login.

export default function DevSubidas() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SubidasDemo />;
}
