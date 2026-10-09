import { redirect } from "next/navigation";
import { auth } from "@/lib/auth.config";
import { getMiAccesoCollection } from "@/actions/collection/equipo.actions";
import { CollectionShell } from "@/components/collection/shell/CollectionShell";
import { fuenteDisplay, fuenteTexto } from "@/components/collection/shell/fuentes";
import "./collection.css";

export default async function CollectionLayout({ children }: { children: React.ReactNode }) {
  const acceso = await getMiAccesoCollection();
  if (!acceso) redirect("/backend/dashboard");
  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null } | undefined;
  return (
    <div
      data-collection-shell
      className={`${fuenteDisplay.variable} ${fuenteTexto.variable} min-h-screen bg-col-base font-col-text text-col-ink`}
    >
      <CollectionShell acceso={acceso} usuario={{ id: user?.id ?? "", nombre: user?.name ?? "" }}>
        {children}
      </CollectionShell>
    </div>
  );
}
