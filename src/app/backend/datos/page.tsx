import { redirect } from "next/navigation";

// El módulo no tiene índice propio: la bandeja de pasajeros es la home.
export default function DatosIndexPage() {
  redirect("/backend/datos/pasajeros");
}
