"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  usePackageLoading,
  usePaquetes,
} from "@/components/providers/PackageProvider";
import { useServiceLoading } from "@/components/providers/ServiceProvider";
import { useCatalogLoading } from "@/components/providers/CatalogProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import AdminDashboard from "./_components/AdminDashboard";
import VendedorDashboard from "./_components/VendedorDashboard";

// Banner sticky que se muestra sólo cuando un ADMIN entra al módulo de
// vendedores vía `?vista=vendedor`. El VENDEDOR real nunca lo ve (llega sin
// query y con su propio shell). Vuelve al dashboard principal en la misma
// pestaña. Full-bleed con márgenes negativos para contrarrestar el padding
// del <main> de AdminShell.
function VendedorViewBanner() {
  return (
    <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-5 border-b border-[#8B5CF6]/25 bg-[#F5F3FF]/95 backdrop-blur md:-mx-7 md:-mt-7">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 md:px-7">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#6D40D4]">
          <Store size={15} strokeWidth={2} />
          Estás viendo el módulo de vendedores
        </span>
        <Link
          href="/backend/dashboard"
          className="ml-auto flex items-center gap-1.5 rounded-[8px] bg-[#8B5CF6] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#7B4EE6]"
        >
          <ArrowLeft size={13} strokeWidth={2.25} />
          Ir al dashboard principal
        </Link>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();

  // Un ADMIN puede previsualizar el módulo de vendedores con `?vista=vendedor`
  // (abierto en pestaña nueva desde el sidebar). La vista se decide sólo por
  // URL, sin tocar sesión ni cookies, así que funciona en múltiples pestañas.
  if (isAdmin && searchParams.get("vista") === "vendedor") {
    return (
      <>
        <VendedorViewBanner />
        <VendedorDashboard />
      </>
    );
  }

  return isAdmin ? <AdminDashboard /> : <VendedorDashboard />;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const packageLoading = usePackageLoading();
  const serviceLoading = useServiceLoading();
  const catalogLoading = useCatalogLoading();
  const paquetes = usePaquetes();

  // Cold mount: every provider is loading and we have no cached data.
  // Once any provider has data (stale-while-revalidate from a previous mount)
  // we render the dashboard immediately and let individual sections show
  // their own loading affordances.
  const isColdMount =
    !user ||
    (packageLoading && paquetes.length === 0) ||
    (serviceLoading && paquetes.length === 0) ||
    (catalogLoading && paquetes.length === 0);

  if (isColdMount) return <PageSkeleton variant="dashboard" />;

  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <DashboardContent />
    </Suspense>
  );
}
