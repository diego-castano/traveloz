"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DestinoAutocomplete } from "@/components/ui/form/DestinoAutocomplete";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { DatePicker } from "@/components/ui/DatePicker";
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
  startOfLocalDay,
} from "@/lib/date";
import { Star, ChevronDown, ChevronRight } from "lucide-react";
import { springs } from "@/components/lib/animations";
import type { Paquete, EstadoPaquete } from "@/lib/types";

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
  // Salidas: leyenda libre que se muestra bajo el título en el frontend
  // (ej. "Salidas semanales todo el año"). Vive junto al período del viaje.
  const [salidas, setSalidas] = useState(paquete.salidas ?? "");
  const [temporadaId, setTemporadaId] = useState(paquete.temporadaId);
  const [tipoPaqueteId, setTipoPaqueteId] = useState(paquete.tipoPaqueteId);
  const [estado, setEstado] = useState<string>(paquete.estado);
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

  // -- Vigencia helper: warn if close to expiry --
  const now = startOfLocalDay(new Date()) ?? new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const hastaExpired = viajeHastaDate ? viajeHastaDate < now : false;
  const hastaWarning =
    viajeHastaDate && !hastaExpired
      ? viajeHastaDate.getTime() - now.getTime() < thirtyDaysMs
      : false;

  const persistPaquete = useCallback(
    (overrides: Partial<Paquete> = {}) => {
      // Viaje y validez ahora son el mismo período: el operador edita uno
      // solo y se replica en validez para que los filtros del frontend (lista
      // por vencer, listing activo, etc.) sigan funcionando sin duplicar UI.
      const viajeDesdeStr = viajeDesdeDate
        ? formatStoredDate(viajeDesdeDate)
        : null;
      const viajeHastaStr = viajeHastaDate
        ? formatStoredDate(viajeHastaDate)
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
        destacado,
        moneda,
        validezDesde: viajeDesdeStr ?? paquete.validezDesde,
        validezHasta: viajeHastaStr ?? paquete.validezHasta,
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

  const handleSave = () => {
    saveNow();
    toast(
      "success",
      "Paquete actualizado",
      "Los cambios fueron guardados correctamente.",
    );
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
  const setSalidasDirty = (v: string) => { setSalidas(v); markDirty(); };
  // (noches is derived from destinos — no dirty setter needed)
  const setTemporadaIdDirty = (v: string) => { setTemporadaId(v); markDirty(); };
  const setTipoPaqueteIdDirty = (v: string) => { setTipoPaqueteId(v); markDirty(); };
  const setEstadoDirty = (v: string) => { setEstado(v); markDirty(); };
  const setDestacadoDirty = (v: boolean) => { setDestacado(v); markDirty(); };
  const setMonedaDirty = (v: string) => { setMoneda(v); markDirty(); };
  const setViajeDates = (desde: Date | undefined, hasta: Date | undefined) => {
    setViajeDesdeDate(desde);
    setViajeHastaDate(hasta);
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
            <AutoSaveIndicator status={autoSaveStatus} />
            <Button variant="secondary" size="sm" onClick={handleSave}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}

      <FormSections>
        {/* ================================================================ */}
        {/* Estado                                                           */}
        {/* ================================================================ */}
        <FormSection
          title="Estado"
          description="Controla la visibilidad del paquete en el frontend público."
        >
          <FieldGroup columns={2}>
            <Field>
              <FieldLabel>Estado</FieldLabel>
              <Select
                value={estado}
                onValueChange={setEstadoDirty}
                disabled={isReadOnly}
                options={estadoOptions}
                placeholder="Seleccionar estado..."
              />
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
        {/* Período del viaje — usado para matchear servicios y sus precios   */}
        {/* ================================================================ */}
        <FormSection
          title="Período del viaje"
          description="Fechas en las que el cliente viaja. Define qué servicios y tarifas aplican, y también controla la vigencia del paquete en el frontend público."
        >
          <FieldGroup columns={1}>
            <Field>
              <FieldLabel>Desde y hasta</FieldLabel>
              <PeriodPicker
                valueFrom={formatStoredDate(viajeDesdeDate) ?? null}
                valueTo={formatStoredDate(viajeHastaDate) ?? null}
                onChange={(desde, hasta) => {
                  setViajeDates(parseStoredDate(desde), parseStoredDate(hasta));
                }}
                placeholder="Seleccionar período de viaje..."
                disabled={isReadOnly}
              />
              {(hastaExpired || hastaWarning) && (
                <p
                  className={`mt-1.5 text-[11.5px] font-medium ${hastaExpired ? "text-[#CC2030]" : "text-amber-600"}`}
                >
                  {hastaExpired
                    ? "Vigencia vencida — el paquete ya no se muestra en el frontend"
                    : "Vence en menos de 30 días"}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel>Salidas</FieldLabel>
              <Input
                value={salidas}
                onChange={(e) => setSalidasDirty(e.target.value)}
                placeholder="Ej. Salidas semanales todo el año / Consultar"
                readOnly={isReadOnly}
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Leyenda que se muestra bajo el título en el frontend, junto al
                ícono de calendario.
              </p>
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
