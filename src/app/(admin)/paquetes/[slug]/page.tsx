"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { usePaqueteById } from "@/components/providers/PackageProvider";
import { ArrowLeft } from "lucide-react";
import DatosTab from "./_components/DatosTab";
import ServiciosTab from "./_components/ServiciosTab";
import PreciosTab from "./_components/PreciosTab";
import FotosTab from "./_components/FotosTab";
import { PublicacionTab } from "./_components/PublicacionTab";

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

const TABS = ["datos", "servicios", "precios", "fotos", "publicacion"] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  datos: "Datos",
  servicios: "Servicios",
  precios: "Precios",
  fotos: "Fotos",
  publicacion: "Publicacion",
};

// ---------------------------------------------------------------------------
// Estado badge variant mapping
// ---------------------------------------------------------------------------

const estadoBadgeVariant: Record<string, "active" | "draft" | "inactive"> = {
  ACTIVO: "active",
  BORRADOR: "draft",
  INACTIVO: "inactive",
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

  const activeTab = searchParams.get("tab") ?? "datos";

  const handleTabChange = (tab: string) => {
    router.replace(`/paquetes/${slug}?tab=${tab}`, { scroll: false });
  };

  // -- Not found state --
  if (!paquete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-lg font-semibold text-neutral-700">
              Paquete no encontrado
            </p>
            <p className="text-sm text-neutral-400 text-center">
              El paquete que buscas no existe o fue eliminado.
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push("/paquetes")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver a Paquetes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={paquete.titulo}
        subtitle={paquete.estado}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={estadoBadgeVariant[paquete.estado] ?? "draft"} size="md">
              {paquete.estado}
            </Badge>
            <Button
              variant="ghost"
              onClick={() => router.push("/paquetes")}
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

        <TabsContent value="precios">
          <PreciosTab paquete={paquete} />
        </TabsContent>

        <TabsContent value="fotos">
          <FotosTab paquete={paquete} />
        </TabsContent>

        <TabsContent value="publicacion">
          <PublicacionTab paquete={paquete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
