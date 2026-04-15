"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  usePackageLoading,
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

  // Wait for every dataset the dashboards depend on before deciding which
  // variant to render — otherwise stats animate from 0 twice as data streams in.
  const loading = packageLoading || serviceLoading || catalogLoading || !user;

  if (loading) return <PageSkeleton variant="dashboard" />;

  return isAdmin ? <AdminDashboard /> : <VendedorDashboard />;
}
