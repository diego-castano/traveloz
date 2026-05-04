"use client";

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

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
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

  return isAdmin ? <AdminDashboard /> : <VendedorDashboard />;
}
