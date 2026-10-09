import { redirect } from "next/navigation";
import { getMiAccesoCollection } from "@/actions/collection/equipo.actions";

export default async function CollectionLayout({ children }: { children: React.ReactNode }) {
  const acceso = await getMiAccesoCollection();
  if (!acceso) redirect("/backend/dashboard");
  return <div data-collection-shell>{children}</div>;
}
