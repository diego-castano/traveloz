"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePackageActions } from "@/components/providers/PackageProvider";
import {
  useTemporadas,
  useTiposPaquete,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatStoredDate } from "@/lib/date";

// ---------------------------------------------------------------------------
// NuevoPaquetePage — auto-create a BORRADOR and jump to the detail page.
//
// We used to render a two-step flow: fill basic info → save → land on the
// detail page with all the tabs. The intermediate form duplicated the Datos
// tab, so users were filling the same data twice. Now we create a draft with
// safe defaults on mount and redirect — the user edits everything in one
// place (Datos / Servicios / Alojamientos / Precios / Fotos / Frontend).
// ---------------------------------------------------------------------------

export default function NuevoPaquetePage() {
  const router = useRouter();
  const { createPaquete } = usePackageActions();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
  const catalogLoading = useCatalogLoading();
  const { activeBrandId } = useBrand();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- VENDEDOR guard --
  useEffect(() => {
    if (!canEdit) router.push("/backend/paquetes");
  }, [canEdit, router]);

  // Guard against StrictMode double-mount + React 18 re-runs. The ref keeps
  // exactly one create call in flight per page load.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!canEdit) return;
    if (catalogLoading) return;
    startedRef.current = true;

    (async () => {
      try {
        const now = formatStoredDate(new Date()) ?? "";
        const oneYearLater =
          formatStoredDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) ?? "";

        // Date stamp (no hour) — date-only is enough to disambiguate drafts
        // in the list, and hides the embarrassing exact-minute leak when an
        // operator forgets to rename their draft.
        const stamp = new Intl.DateTimeFormat("es-AR", {
          day: "2-digit",
          month: "2-digit",
        }).format(new Date());

        const newPaquete = await createPaquete({
          brandId: activeBrandId,
          titulo: `Paquete sin título (${stamp})`,
          destino: "",
          descripcion: "",
          textoVisual: null,
          // Noches starts at 0 — the value gets auto-synced from
          // sum(PaqueteDestino.noches) the moment the operator adds destinos.
          // Starting at 7 used to trip the publish-gate validator before the
          // itinerary was even built.
          noches: 0,
          salidas: "Consultar",
          temporadaId: temporadas[0]?.id ?? undefined,
          tipoPaqueteId: tiposPaquete[0]?.id ?? undefined,
          estado: "BORRADOR",
          destacado: false,
          netoCalculado: 0,
          markup: 0.8,
          precioVenta: 0,
          moneda: "USD",
          validezDesde: now,
          validezHasta: oneYearLater,
          ordenServicios: [],
        });

        // `new=1` lets DatosTab focus + select the auto-generated title so the
        // operator can overwrite it without clicking — fastest path to rename.
        router.replace(`/backend/paquetes/${newPaquete.id}?tab=datos&new=1`);
      } catch (error) {
        console.error("Error creating paquete:", error);
        toast(
          "error",
          "No se pudo crear el paquete",
          "Revisá la conexión e intentá nuevamente.",
        );
        startedRef.current = false;
        router.push("/backend/paquetes");
      }
    })();
  }, [
    activeBrandId,
    canEdit,
    catalogLoading,
    createPaquete,
    router,
    temporadas,
    tiposPaquete,
    toast,
  ]);

  if (!canEdit) return null;
  if (catalogLoading) return <PageSkeleton variant="detail" />;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-neutral-500">
      <Loader2 className="h-6 w-6 animate-spin text-[#3BBFAD]" />
      <p className="text-sm">Creando borrador…</p>
    </div>
  );
}
