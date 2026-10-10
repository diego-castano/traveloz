import { notFound } from "next/navigation";
import { ContactoDemo } from "./ContactoDemo";
import "@/components/collection/sitio/chrome/chrome.css";

// Formularios del sitio con envíos de mentira (no llama a las actions reales).
// ?vista=form|gracias|hoja|experiencia|newsletter|inicio|nosotros|terminos|articulo&paso=1..4&exp=1&falla=1

export default function DevContacto({
  searchParams,
}: {
  searchParams: { vista?: string; paso?: string; exp?: string; falla?: string; n?: string; e?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ContactoDemo
      vista={searchParams.vista ?? "form"}
      paso={Math.min(Math.max(Number(searchParams.paso) || 1, 1), 4)}
      conExperiencia={!!searchParams.exp}
      falla={!!searchParams.falla}
      numero={searchParams.n ?? "TC-0412"}
      especialista={searchParams.e ?? null}
    />
  );
}
