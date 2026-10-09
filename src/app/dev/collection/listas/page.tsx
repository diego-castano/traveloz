import { notFound } from "next/navigation";
import { ListasDemo } from "./ListasDemo";
import "@/app/backend/collection/collection.css";

// Experiencias y Biblioteca dentro del shell con datos en memoria, sin login.
// ?vista=experiencias|biblioteca&vacia=1&lectura=1

export default function DevListas({ searchParams }: { searchParams: { vista?: string; vacia?: string; lectura?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ListasDemo
      vista={searchParams.vista === "biblioteca" ? "biblioteca" : "experiencias"}
      vacia={!!searchParams.vacia}
      lectura={!!searchParams.lectura}
    />
  );
}
