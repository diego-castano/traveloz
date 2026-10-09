import { notFound } from "next/navigation";
import { AjustesDemo } from "./AjustesDemo";
import "@/app/backend/collection/collection.css";

// Ajustes con guardado de mentira, sin login. ?lectura=1&sinBitrix=1&indexa=1

export default function DevAjustes({ searchParams }: { searchParams: { lectura?: string; sinBitrix?: string; indexa?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <AjustesDemo lectura={!!searchParams.lectura} sinBitrix={!!searchParams.sinBitrix} indexa={!!searchParams.indexa} />;
}
