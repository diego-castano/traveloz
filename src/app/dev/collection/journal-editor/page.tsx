import { notFound } from "next/navigation";
import { JournalEditorDemo } from "./JournalEditorDemo";
import "@/app/backend/collection/collection.css";

// Journal con el adaptador en memoria, sin login. ?vista=lista&vacio=1&lectura=1

export default function DevJournalEditor({
  searchParams,
}: {
  searchParams: { vista?: string; vacio?: string; lectura?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return <JournalEditorDemo vista={searchParams.vista ?? "editor"} vacio={!!searchParams.vacio} lectura={!!searchParams.lectura} />;
}
