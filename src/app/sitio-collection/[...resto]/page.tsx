import { notFound } from "next/navigation";

// Cualquier ruta que no existe cae acá para mostrar el 404 de Collection (sin
// esto Next usaría el 404 de la raíz, sin el menú ni la marca).
export default function NoExiste() {
  notFound();
}
