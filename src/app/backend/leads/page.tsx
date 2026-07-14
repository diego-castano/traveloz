import { redirect } from "next/navigation";

export default function LeadsIndexPage() {
  // Leads (interesados en un paquete) es la primera pestaña del módulo Contactos.
  redirect("/backend/leads/paquetes");
}
