"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DestinoAutocomplete } from "@/components/ui/form/DestinoAutocomplete";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import { Tag } from "@/components/ui/Tag";
import type { TagColor } from "@/components/ui/Tag";
import {
  FormSection,
  FormSections,
} from "@/components/ui/form/FormSection";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/form/Field";
import {
  usePackageActions,
  usePaqueteServices,
  useOpcionesHoteleras,
  useDestinos,
} from "@/components/providers/PackageProvider";
import {
  useTemporadas,
  useTiposPaquete,
  useEtiquetas,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedWarn } from "@/hooks/useUnsavedWarn";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import { validateForActivation } from "@/lib/validation";
import {
  formatStoredDate,
  parseStoredDate,
  addDays,
} from "@/lib/date";
import {
  Star,
  ChevronDown,
  ChevronRight,
  Hotel,
  Route,
  Check,
} from "lucide-react";
import { springs } from "@/components/lib/animations";
import { cn } from "@/components/lib/cn";
import type { Paquete, EstadoPaquete, ModalidadPaquete } from "@/lib/types";

// ---------------------------------------------------------------------------
// Salidas — texto derivado del período de viaje
// ---------------------------------------------------------------------------

// Convierte el rango "Desde y hasta" en la leyenda de Salidas que ve el
// cliente en el frontend. Ej: "Octubre - Noviembre 2026". Mismo año y mes →
// "Octubre 2026"; años distintos → "Octubre 2026 - Enero 2027".
function formatSalidasFromRange(
  desde: Date | undefined,
  hasta: Date | undefined,
): string {
  if (!desde && !hasta) return "";
  const d = desde ?? hasta!;
  const h = hasta ?? desde!;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const mes = (dt: Date) =>
    cap(new Intl.DateTimeFormat("es", { month: "long" }).format(dt));
  const mesDesde = mes(d);
  const mesHasta = mes(h);
  const anioDesde = d.getFullYear();
  const anioHasta = h.getFullYear();
  if (anioDesde === anioHasta) {
    return mesDesde === mesHasta
      ? `${mesDesde} ${anioHasta}`
      : `${mesDesde} - ${mesHasta} ${anioHasta}`;
  }
  return `${mesDesde} ${anioDesde} - ${mesHasta} ${anioHasta}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DatosTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Textarea styling — flat, hairline, no glass
// ---------------------------------------------------------------------------

const textareaClassName =
  "w-full rounded-[8px] border border-[rgba(17,17,36,0.14)] bg-white px-3 py-2 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_3px_rgba(59,191,173,0.18)] transition-colors disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed";

// ---------------------------------------------------------------------------
// Estado options
// ---------------------------------------------------------------------------

const estadoOptions = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "ACTIVO", label: "Activo" },
  { value: "ARCHIVADO", label: "Archivado" },
];

const monedaOptions = [{ value: "USD", label: "USD" }];

const modalidadCardOptions: Array<{
  value: ModalidadPaquete;
  label: string;
  description: string;
  icon: typeof Hotel;
}> = [
  {
    value: "CLASICO",
    label: "Paquete clásico",
    description:
      "Vuelo + hotel + extras. El precio sale de las opciones hoteleras.",
    icon: Hotel,
  },
  {
    value: "CIRCUITO",
    label: "Circuito (todo incluido)",
    description:
      "El circuito incluye alojamiento, comidas y paseos. Precio por persona cargado en el circuito.",
    icon: Route,
  },
];

// ---------------------------------------------------------------------------
// ModalidadRadioCards — accessible two-card radio group for "Modalidad".
//
// Reemplaza el Select original: la elección entre Clásico/Circuito cambia el
// motor de precios y la publicación del paquete, así que necesita ser
// visualmente inequívoca en vez de un control chico. role="radiogroup" +
// role="radio"/aria-checked en botones nativos (tab + espacio/enter
// funcionan gratis); las flechas izquierda/derecha alternan entre las dos
// tarjetas siguiendo el patrón ARIA de radiogroup.
// ---------------------------------------------------------------------------

interface ModalidadRadioCardsProps {
  value: ModalidadPaquete;
  onValueChange: (value: ModalidadPaquete) => void;
  disabled?: boolean;
}

function ModalidadRadioCards({
  value,
  onValueChange,
  disabled,
}: ModalidadRadioCardsProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowUp" &&
      e.key !== "ArrowDown"
    ) {
      return;
    }
    e.preventDefault();
    const currentIndex = modalidadCardOptions.findIndex(
      (opt) => opt.value === value,
    );
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      (currentIndex + delta + modalidadCardOptions.length) %
      modalidadCardOptions.length;
    onValueChange(modalidadCardOptions[nextIndex].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Modalidad del paquete"
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      {modalidadCardOptions.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onValueChange(opt.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-[14px] border px-4 py-3.5 text-left transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              active
                ? "border-teal-600 bg-teal-50 shadow-[0_10px_22px_rgba(15,118,110,0.12)] focus-visible:ring-teal-500"
                : "border-hairline bg-white hover:border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-400",
            )}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <Icon
              className={cn(
                "h-5 w-5",
                active ? "text-teal-600" : "text-neutral-400",
              )}
            />
            <span
              className={cn(
                "text-[13.5px] font-semibold pr-6",
                active ? "text-teal-700" : "text-neutral-800",
              )}
            >
              {opt.label}
            </span>
            <span
              className={cn(
                "text-[11.5px] leading-snug",
                active ? "text-teal-700/80" : "text-neutral-500",
              )}
            >
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Etiqueta color mapping helper
// ---------------------------------------------------------------------------

const etiquetaColorMap: Record<string, TagColor> = {
  "#14b8a6": "teal",
  "#8b5cf6": "violet",
  "#ef4444": "red",
  "#f97316": "orange",
  "#22c55e": "green",
  "#3b82f6": "blue",
};

function resolveTagColor(hex: string): TagColor {
  return etiquetaColorMap[hex.toLowerCase()] ?? "teal";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DatosTab({ paquete }: DatosTabProps) {
  const { updatePaquete, assignEtiqueta, removeEtiqueta } = usePackageActions();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
  const allEtiquetas = useEtiquetas();
  const services = usePaqueteServices(paquete.id);
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isNew = searchParams?.get("new") === "1";
  const tituloRef = useRef<HTMLInputElement>(null);

  // When the operator just created a paquete and lands here, focus + select
  // the auto-generated title so they can overwrite it without clicking.
  useEffect(() => {
    if (!isNew) return;
    const id = requestAnimationFrame(() => {
      tituloRef.current?.focus();
      tituloRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [isNew]);

  // -- Local form state initialized from paquete prop --
  const [titulo, setTitulo] = useState(paquete.titulo);
  const [destino, setDestino] = useState(paquete.destino ?? "");
  // descripcion y textoVisual ya NO se editan acá: el contenido del frontend
  // (incluida la descripción interna) se administra desde la pestaña
  // Publicación. Sus valores actuales se preservan via el spread de `paquete`
  // en persistPaquete para no pisarlos al guardar otros campos.
  // `destinos` still needed for the publish-readiness validation below;
  // the visible noches counter moved into DestinosMiniEditor.
  const destinos = useDestinos(paquete.id);
  const [viajeDesdeDate, setViajeDesdeDate] = useState<Date | undefined>(
    parseStoredDate(paquete.viajeDesde),
  );
  const [viajeHastaDate, setViajeHastaDate] = useState<Date | undefined>(
    parseStoredDate(paquete.viajeHasta),
  );
  // Vigencia: ya NO la gestiona el operador. El paquete se da de baja
  // automáticamente 15 días antes del inicio del viaje (validezHasta =
  // viajeDesde − 15d). La regla la aplica el server al guardar; acá sólo
  // mostramos la fecha resultante como línea informativa de solo lectura.
  // Salidas: leyenda libre que se muestra bajo el título en el frontend
  // (ej. "Salidas semanales todo el año"). Vive junto al período del viaje.
  // Se autocompleta desde "Desde y hasta" salvo que el operador la edite a mano.
  const [salidas, setSalidas] = useState(paquete.salidas ?? "");
  // "Modo manual": cuando el operador escribe algo propio en Salidas dejamos de
  // pisarlo al cambiar las fechas. Arranca en manual solo si el valor guardado
  // ya es un texto libre (no vacío, no "Consultar" y distinto del auto-generado
  // por el rango actual). Si borra el campo, vuelve al modo automático.
  const salidasManualRef = useRef(
    (() => {
      const v = (paquete.salidas ?? "").trim();
      if (v === "" || v === "Consultar") return false;
      const auto = formatSalidasFromRange(
        parseStoredDate(paquete.viajeDesde),
        parseStoredDate(paquete.viajeHasta),
      );
      return v !== auto;
    })(),
  );
  const [temporadaId, setTemporadaId] = useState(paquete.temporadaId);
  const [tipoPaqueteId, setTipoPaqueteId] = useState(paquete.tipoPaqueteId);
  const [estado, setEstado] = useState<string>(paquete.estado);
  const [modalidad, setModalidad] = useState<ModalidadPaquete>(
    (paquete.modalidad ?? "CLASICO") as ModalidadPaquete,
  );
  const [destacado, setDestacado] = useState(paquete.destacado);
  const [moneda, setMoneda] = useState(paquete.moneda);

  // Datos operativos (legacy fields) — collapsed by default to keep the
  // Datos tab focused on what the operator edits day-to-day.
  const [legacyOpen, setLegacyOpen] = useState(false);

  // -- Etiquetas --
  const assignedEtiquetaIds = useMemo(
    () => new Set(services.etiquetas.map((pe) => pe.etiquetaId)),
    [services.etiquetas],
  );

  const availableEtiquetas = useMemo(
    () => allEtiquetas.filter((e) => !assignedEtiquetaIds.has(e.id)),
    [allEtiquetas, assignedEtiquetaIds],
  );

  const assignedEtiquetasFull = useMemo(
    () =>
      services.etiquetas
        .map((pe) => {
          const etq = allEtiquetas.find((e) => e.id === pe.etiquetaId);
          return etq ? { ...etq, assignmentId: pe.id } : null;
        })
        .filter(Boolean) as Array<
        (typeof allEtiquetas)[number] & { assignmentId: string }
      >,
    [services.etiquetas, allEtiquetas],
  );

  // -- Validation data --
  const opciones = useOpcionesHoteleras(paquete.id);
  const assignedAereoCount = services.aereos.length;
  const validation = validateForActivation(
    paquete,
    assignedAereoCount,
    opciones,
    destinos,
  );

  // -- Fecha de baja automática: viajeDesde − 15 días (solo lectura) --
  // Si no hay período de viaje cargado, no hay fecha de baja (activo indefinido).
  const bajaDate = viajeDesdeDate ? addDays(viajeDesdeDate, -15) : undefined;

  const persistPaquete = useCallback(
    (overrides: Partial<Paquete> = {}) => {
      // Período de viaje: cuándo viaja el cliente (matchea servicios y precios).
      // Vigencia: el paquete se da de baja 15 días antes del inicio del viaje.
      // validezHasta lo deriva el server de forma autoritativa; lo enviamos ya
      // calculado para que la cache del cliente quede coherente al instante.
      // validezDesde no se gestiona: se conserva el valor existente.
      const viajeDesdeStr = viajeDesdeDate
        ? formatStoredDate(viajeDesdeDate)
        : null;
      const viajeHastaStr = viajeHastaDate
        ? formatStoredDate(viajeHastaDate)
        : null;
      const validezHastaStr = viajeDesdeDate
        ? formatStoredDate(addDays(viajeDesdeDate, -15))!
        : null;
      return updatePaquete({
        ...paquete,
        titulo,
        destino,
        salidas,
        // descripcion / textoVisual: se conservan tal cual vienen en `paquete`
        // (cache mantenida en sync por la pestaña Publicación).
        temporadaId,
        tipoPaqueteId,
        estado: estado as EstadoPaquete,
        modalidad,
        destacado,
        moneda,
        // validezDesde se conserva (no se gestiona); validezHasta se deriva.
        validezHasta: validezHastaStr,
        viajeDesde: viajeDesdeStr,
        viajeHasta: viajeHastaStr,
        updatedAt: new Date().toISOString(),
        ...overrides,
      });
    },
    [
      paquete,
      titulo,
      destino,
      salidas,
      temporadaId,
      tipoPaqueteId,
      estado,
      modalidad,
      destacado,
      moneda,
      viajeDesdeDate,
      viajeHastaDate,
      updatePaquete,
    ],
  );

  // -- Auto-save handler --
  const handleAutoSave = useCallback(() => {
    return persistPaquete();
  }, [persistPaquete]);

  const handleDestinoCommit = useCallback(
    async (nextDestino: string) => {
      if (!canEdit) return;
      await persistPaquete({ destino: nextDestino });
    },
    [canEdit, persistPaquete],
  );

  const handleSave = async () => {
    const ok = await saveNow();
    if (ok) {
      toast(
        "success",
        "Paquete actualizado",
        "Los cambios fueron guardados correctamente.",
      );
    } else {
      toast(
        "error",
        "No se pudo guardar",
        "Revisá los datos e intentá de nuevo.",
      );
    }
  };

  // -- Etiqueta handlers --
  const handleAddEtiqueta = async (etiquetaId: string) => {
    await assignEtiqueta({ paqueteId: paquete.id, etiquetaId });
  };

  const handleRemoveEtiqueta = async (assignmentId: string) => {
    await removeEtiqueta(assignmentId);
  };

  const isReadOnly = !canEdit;

  // -- Wrapped setters that also mark dirty --
  const setTituloDirty = (v: string) => { setTitulo(v); markDirty(); };
  const setDestinoDirty = (v: string) => { setDestino(v); markDirty(); };
  const setSalidasDirty = (v: string) => {
    setSalidas(v);
    // Texto propio → modo manual; campo vacío → reactiva el autocompletado.
    salidasManualRef.current = v.trim() !== "";
    markDirty();
  };
  // (noches is derived from destinos — no dirty setter needed)
  const setTemporadaIdDirty = (v: string) => { setTemporadaId(v); markDirty(); };
  const setTipoPaqueteIdDirty = (v: string) => { setTipoPaqueteId(v); markDirty(); };
  const setEstadoDirty = (v: string) => { setEstado(v); markDirty(); };
  const setModalidadDirty = (v: string) => { setModalidad(v as ModalidadPaquete); markDirty(); };
  const setDestacadoDirty = (v: boolean) => { setDestacado(v); markDirty(); };
  const setMonedaDirty = (v: string) => { setMoneda(v); markDirty(); };
  const setViajeDates = (desde: Date | undefined, hasta: Date | undefined) => {
    setViajeDesdeDate(desde);
    setViajeHastaDate(hasta);
    // Autocompleta la leyenda de Salidas salvo que el operador la haya editado.
    if (!salidasManualRef.current) {
      const auto = formatSalidasFromRange(desde, hasta);
      if (auto) setSalidas(auto);
    }
    // La fecha de baja (validezHasta = viajeDesde − 15d) se deriva sola en el
    // render (bajaDate) y en el guardado (server + persistPaquete). No hay
    // estado de vigencia que actualizar acá.
    markDirty();
  };

  const { status: autoSaveStatus, markDirty, saveNow } = useAutoSave({
    onSave: handleAutoSave,
    enabled: canEdit,
  });

  // Block tab close while autosave is mid-flight or dirty.
  useUnsavedWarn(autoSaveStatus);

  return (
    <div className="relative">
      {canEdit && (
        <div className="sticky top-2 z-20 mb-4 flex justify-end">
          <div className="flex items-center gap-2 rounded-full bg-white/70 px-2 py-1 backdrop-blur-sm">
            <AutoSaveIndicator status={autoSaveStatus} onRetry={() => void saveNow()} />
            <Button variant="secondary" size="sm" onClick={handleSave}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}

      <FormSections>
        {/* ================================================================ */}
        {/* Período del viaje, baja automática y estado.                      */}
        {/* El viaje es la fuente de la baja automática: el paquete se da de   */}
        {/* baja 15 días antes de su inicio. La vigencia ya no la gestiona el  */}
        {/* operador (regla del negocio); acá sólo se informa la fecha.        */}
        {/* ================================================================ */}
        <FormSection
          title="Período del viaje y estado"
          description="Fechas en que viaja el cliente (matchean servicios y tarifas). La baja del paquete se calcula sola: 15 días antes del inicio del viaje."
        >
          <FieldGroup columns={2}>
            {/* 1) Período del viaje — la fuente de la baja automática. */}
            <Field span={2}>
              <FieldLabel>Período del viaje (desde y hasta)</FieldLabel>
              <PeriodPicker
                valueFrom={formatStoredDate(viajeDesdeDate) ?? null}
                valueTo={formatStoredDate(viajeHastaDate) ?? null}
                onChange={(desde, hasta) => {
                  setViajeDates(parseStoredDate(desde), parseStoredDate(hasta));
                }}
                placeholder="Seleccionar período de viaje..."
                disabled={isReadOnly}
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Define qué servicios y tarifas aplican. También fija la baja
                automática: el paquete se da de baja 15 días antes del inicio
                del viaje.
              </p>
            </Field>

            {/* 2-3) Baja automática (solo lectura) + Salidas — misma fila, con
                un hairline vertical entre ambos en desktop. En mobile quedan
                apiladas sin separador, como el resto de FieldGroup. */}
            <div className="md:col-span-2 flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-0">
              {/* 2) Baja automática — informativa, derivada del viaje. */}
              <Field className="md:pr-6">
                <FieldLabel>Baja automática</FieldLabel>
                <div className="rounded-[8px] border border-[rgba(17,17,36,0.14)] bg-neutral-50 px-3 py-2.5">
                  {bajaDate ? (
                    <>
                      <p className="text-[13.5px] font-medium text-neutral-800">
                        {bajaDate.toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        15 días antes del inicio del viaje.
                      </p>
                    </>
                  ) : (
                    <p className="text-[13px] text-neutral-500">
                      Se define al cargar el período del viaje.
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  El paquete queda activo desde que se crea. La baja la calcula
                  el sistema; no se edita a mano.
                </p>
              </Field>

              {/* 3) Salidas — separada por el hairline en desktop. El span
                  invisible alinea el input con el baseline de Baja automática. */}
              <Field className="md:border-l md:border-hairline md:pl-6">
                <FieldLabel>Salidas</FieldLabel>
                <Input
                  value={salidas}
                  onChange={(e) => setSalidasDirty(e.target.value)}
                  placeholder="Ej. Salidas semanales todo el año / Consultar"
                  readOnly={isReadOnly}
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Se muestra bajo el título en el frontend. Se autocompleta
                  con el período de arriba (ej. &ldquo;Octubre - Noviembre 2026&rdquo;).
                  Para volver al automático, borrá el campo.
                </p>
              </Field>
            </div>

            {/* 4) Estado — etapa del flujo interno (no publica el paquete). */}
            <Field span={2}>
              <FieldLabel className="flex items-center gap-2">
                <span>Estado</span>
                {!paquete.publicado && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-medium text-neutral-500">
                    No publicado
                  </span>
                )}
              </FieldLabel>
              <Select
                value={estado}
                onValueChange={setEstadoDirty}
                disabled={isReadOnly}
                options={estadoOptions}
                placeholder="Seleccionar estado..."
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                El estado no publica el paquete: para mostrarlo en el sitio usá{" "}
                <a
                  href="?tab=publicacion"
                  className="text-violet-600 hover:underline"
                >
                  «Publicar en el sitio»
                </a>{" "}
                en la pestaña Publicación.
              </p>
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ================================================================ */}
        {/* Modalidad de armado                                              */}
        {/* ================================================================ */}
        <FormSection
          title="Modalidad del paquete"
          description="Cómo se arma y se cotiza. «Clásico» deriva el precio de las opciones hoteleras. «Circuito (todo incluido)» toma el precio por persona del circuito asignado (hotel, comidas y paseos van dentro del circuito); no se cargan opciones hoteleras ni destinos."
        >
          <FieldGroup columns={1}>
            <Field>
              <FieldLabel>Modalidad</FieldLabel>
              <ModalidadRadioCards
                value={modalidad}
                onValueChange={setModalidadDirty}
                disabled={isReadOnly}
              />
              {paquete.publicado && (
                <p className="mt-1.5 text-[11.5px] font-medium text-amber-600">
                  Cambiar la modalidad afecta el cálculo de precio y la
                  publicación de este paquete.
                </p>
              )}
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ================================================================ */}
        {/* Identificacion                                                   */}
        {/* ================================================================ */}
        <FormSection
          title="Identificacion"
          description="Datos principales que identifican al paquete en el listado y en el frontend publico."
        >
          <FieldGroup columns={2}>
            <Field span={2}>
              <FieldLabel required>Titulo</FieldLabel>
              <Input
                ref={tituloRef}
                value={titulo}
                onChange={(e) => setTituloDirty(e.target.value)}
                placeholder="Nombre del paquete"
                readOnly={isReadOnly}
              />
            </Field>

            <Field>
              <FieldLabel>Destino</FieldLabel>
              <DestinoAutocomplete
                value={destino}
                onChange={setDestinoDirty}
                onCommit={handleDestinoCommit}
                placeholder="Buscar region, pais o ciudad..."
                readOnly={isReadOnly}
              />
            </Field>

            <Field>
              <FieldLabel>Moneda</FieldLabel>
              <Select
                value={moneda}
                onValueChange={setMonedaDirty}
                disabled={isReadOnly}
                options={monedaOptions}
                placeholder="Seleccionar moneda..."
              />
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ================================================================ */}
        {/* Clasificacion                                                    */}
        {/* ================================================================ */}
        <FormSection
          title="Clasificacion"
          description="Temporada, tipo y etiquetas usadas para filtros y campanas."
        >
          <FieldGroup columns={2}>
            <Field>
              <FieldLabel>Temporada</FieldLabel>
              <SearchableSelect
                value={temporadaId}
                onValueChange={setTemporadaIdDirty}
                disabled={isReadOnly}
                options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
                placeholder="Seleccionar temporada..."
                searchPlaceholder="Buscar temporada..."
              />
            </Field>
            <Field>
              <FieldLabel>Tipo de paquete</FieldLabel>
              <SearchableSelect
                value={tipoPaqueteId}
                onValueChange={setTipoPaqueteIdDirty}
                disabled={isReadOnly}
                options={tiposPaquete.map((t) => ({
                  value: t.id,
                  label: t.nombre,
                }))}
                placeholder="Seleccionar tipo..."
                searchPlaceholder="Buscar tipo..."
              />
            </Field>

            <Field span={2}>
              <FieldLabel>Etiquetas</FieldLabel>
              <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
                {assignedEtiquetasFull.length === 0 ? (
                  <span className="text-[13px] text-neutral-400 italic">
                    Sin etiquetas asignadas
                  </span>
                ) : (
                  assignedEtiquetasFull.map((etq) => (
                    // Read-only: removing/adding etiquetas lives in the
                    // Publicación tab (single source of truth). Showing them
                    // here keeps the operator informed when reviewing Datos
                    // without giving two competing editors that can drift.
                    <Tag
                      key={etq.assignmentId}
                      color={resolveTagColor(etq.color)}
                    >
                      {etq.nombre}
                    </Tag>
                  ))
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Las etiquetas se administran desde la pestaña{" "}
                <a
                  href="?tab=publicacion"
                  className="text-violet-600 hover:underline"
                >
                  Publicación
                </a>
                .
              </p>
            </Field>

            <Field span={2} orientation="horizontal">
              <Toggle
                checked={destacado}
                onCheckedChange={setDestacadoDirty}
                disabled={isReadOnly}
              />
              <span className="text-[13px] text-neutral-600">
                Paquete destacado
              </span>
              {destacado && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springs.bouncy}
                >
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </motion.div>
              )}
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ================================================================ */}
        {/* Datos operativos (read-only legacy) — collapsed by default       */}
        {/* ================================================================ */}
        {(paquete.webId || paquete.campana || paquete.itinerarioAmadeus) && (
          <div className="rounded-[12px] border border-neutral-200/80 bg-white">
            <button
              type="button"
              onClick={() => setLegacyOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-neutral-50/50 transition-colors rounded-t-[12px]"
              aria-expanded={legacyOpen}
            >
              {legacyOpen ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )}
              <span className="text-[13px] font-semibold text-neutral-700">
                Datos operativos
              </span>
              <span className="text-[11px] text-neutral-400">
                (sistema legacy · sólo lectura)
              </span>
            </button>
            {legacyOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-neutral-100">
                <FieldGroup columns={2}>
                  {paquete.webId && (
                    <Field>
                      <FieldLabel>Web ID</FieldLabel>
                      <Input
                        value={paquete.webId}
                        readOnly
                        className="font-mono text-[12px] bg-neutral-50 text-neutral-600 cursor-default"
                      />
                    </Field>
                  )}
                  {paquete.campana && (
                    <Field>
                      <FieldLabel>Campaña</FieldLabel>
                      <Input
                        value={paquete.campana}
                        readOnly
                        className="bg-neutral-50 text-neutral-600 cursor-default"
                      />
                    </Field>
                  )}
                  {paquete.itinerarioAmadeus && (
                    <Field span={2}>
                      <FieldLabel>Itinerario Amadeus</FieldLabel>
                      <textarea
                        value={paquete.itinerarioAmadeus}
                        readOnly
                        rows={Math.min(
                          10,
                          paquete.itinerarioAmadeus.split("\n").length,
                        )}
                        className={`${textareaClassName} font-mono text-[12px] bg-neutral-50 text-neutral-600 whitespace-pre cursor-default`}
                      />
                    </Field>
                  )}
                </FieldGroup>
              </div>
            )}
          </div>
        )}

      </FormSections>
    </div>
  );
}
