"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Tooltip } from "radix-ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePaqueteById, usePackageLoading } from "@/components/providers/PackageProvider";
import { DetailPageSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/data/EmptyState";
import { ArrowLeft, PackageOpen } from "lucide-react";

// ---------------------------------------------------------------------------
// Code-split each tab. The detail page used to import ~5,000 lines of tab
// components eagerly (AlojamientosTab alone is 2,400+). With dynamic imports
// only the active tab's code is parsed/compiled, so:
//   • cold dev navigations to /backend/paquetes/[slug] no longer trigger
//     the full bundle compile,
//   • prod first-paint is faster (less JS to parse on hydration),
//   • switching tabs gets a tiny suspense fallback while its chunk loads —
//     usually invisible on local network.
// `ssr: false` is safe because the entire detail page is "use client" already.
// ---------------------------------------------------------------------------

const TabFallback = () => (
  <div className="mt-4 h-32 animate-pulse rounded-[12px] bg-neutral-100/60" />
);

const DatosTab = dynamic(() => import("./_components/DatosTab"), { loading: TabFallback, ssr: false });
const ServiciosTab = dynamic(() => import("./_components/ServiciosTab"), { loading: TabFallback, ssr: false });
const AlojamientosTab = dynamic(() => import("./_components/AlojamientosTab"), { loading: TabFallback, ssr: false });
const PreciosTab = dynamic(() => import("./_components/PreciosTab"), { loading: TabFallback, ssr: false });
const PublicacionTab = dynamic(
  () => import("./_components/PublicacionTab").then((m) => ({ default: m.PublicacionTab })),
  { loading: TabFallback, ssr: false },
);
const PaquetePreviewButton = dynamic(
  () =>
    import("./_components/PaquetePreviewButton").then((m) => ({
      default: m.PaquetePreviewButton,
    })),
  { ssr: false },
);
// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

const TABS = [
  "datos",
  "servicios",
  "alojamientos",
  "precios",
  "publicacion",
] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  datos: "Datos",
  servicios: "Servicios",
  alojamientos: "Alojamientos",
  precios: "Precios",
  publicacion: "Publicación",
};

// ---------------------------------------------------------------------------
// Estado badge variant mapping
// ---------------------------------------------------------------------------

const estadoBadgeVariant: Record<string, "active" | "draft" | "archived"> = {
  ACTIVO: "active",
  BORRADOR: "draft",
  EN_REVISION: "draft",
  ARCHIVADO: "archived",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaqueteDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug;
  const paquete = usePaqueteById(slug);
  const loading = usePackageLoading();

  const activeTab = searchParams.get("tab") ?? "datos";

  const handleTabChange = (tab: string) => {
    router.replace(`/backend/paquetes/${slug}?tab=${tab}`, { scroll: false });
  };

  if (loading || !paquete) {
    if (loading) return <DetailPageSkeleton />;

    // -- Not found state --
    return (
      <EmptyState
        icon={PackageOpen}
        title="Paquete no encontrado"
        description="El paquete que buscas no existe o fue eliminado."
        action={
          <Button
            variant="secondary"
            onClick={() => router.push("/backend/paquetes")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a Paquetes
          </Button>
        }
      />
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
    <div className="space-y-6">
      {/* Header */}
      <DataTablePageHeader
        title={paquete.titulo}
        subtitle={paquete.estado}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={estadoBadgeVariant[paquete.estado] ?? "draft"} size="md">
              {paquete.estado}
            </Badge>
            <PaquetePreviewButton paqueteId={paquete.id} />
            <Button
              variant="ghost"
              onClick={() => router.push("/backend/paquetes")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver a Paquetes
            </Button>
          </div>
        }
      />

      {/* Tab layout */}
      <Tabs value={activeTab} onValueChange={handleTabChange} layoutId="paqueteDetailTab">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="datos">
          <DatosTab paquete={paquete} />
        </TabsContent>

        <TabsContent value="servicios">
          <ServiciosTab paquete={paquete} />
        </TabsContent>

        <TabsContent value="alojamientos">
          <AlojamientosTab paquete={paquete} />
        </TabsContent>

        <TabsContent value="precios">
          <PreciosTab paquete={paquete} />
        </TabsContent>

        <TabsContent value="publicacion">
          <PublicacionTab paqueteId={paquete.id} />
        </TabsContent>
      </Tabs>
    </div>
    </Tooltip.Provider>
  );
}
