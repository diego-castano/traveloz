"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  useNochesTotales,
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
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import { validateForActivation } from "@/lib/validation";
import {
  formatStoredDate,
  parseStoredDate,
  startOfLocalDay,
} from "@/lib/date";
import { Star, Check, Circle } from "lucide-react";
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
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
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

  // -- Local form state initialized from paquete prop --
  const [titulo, setTitulo] = useState(paquete.titulo);
  const [destino, setDestino] = useState(paquete.destino ?? "");
  const [descripcion, setDescripcion] = useState(paquete.descripcion);
  const [textoVisual, setTextoVisual] = useState(paquete.textoVisual ?? "");
  // `noches` comes from the itinerary when destinos exist and falls back to
  // the initial value loaded from "Nuevo paquete" while the itinerary is empty.
  const nochesTotales = useNochesTotales(paquete.id);
  const destinos = useDestinos(paquete.id);
  const [salidas, setSalidas] = useState(paquete.salidas);
  const [temporadaId, setTemporadaId] = useState(paquete.temporadaId);
  const [tipoPaqueteId, setTipoPaqueteId] = useState(paquete.tipoPaqueteId);
  const [estado, setEstado] = useState<string>(paquete.estado);
  const [destacado, setDestacado] = useState(paquete.destacado);
  const [moneda, setMoneda] = useState(paquete.moneda);
  const [validezDesdeDate, setValidezDesdeDate] = useState<Date | undefined>(
    parseStoredDate(paquete.validezDesde),
  );
  const [validezHastaDate, setValidezHastaDate] = useState<Date | undefined>(
    parseStoredDate(paquete.validezHasta),
  );

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
  const validation = validateForActivation(paquete, assignedAereoCount, opciones);

  // -- Vigencia helper: warn if close to expiry --
  const now = startOfLocalDay(new Date()) ?? new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const hastaExpired = validezHastaDate ? validezHastaDate < now : false;
  const hastaWarning =
    validezHastaDate && !hastaExpired
      ? validezHastaDate.getTime() - now.getTime() < thirtyDaysMs
      : false;

  const persistPaquete = useCallback(
    (overrides: Partial<Paquete> = {}) => {
      return updatePaquete({
        ...paquete,
        titulo,
        destino,
        descripcion,
        textoVisual: textoVisual || null,
        salidas,
        temporadaId,
        tipoPaqueteId,
        estado: estado as EstadoPaquete,
        destacado,
        moneda,
        validezDesde: validezDesdeDate
          ? (formatStoredDate(validezDesdeDate) ?? paquete.validezDesde)
          : paquete.validezDesde,
        validezHasta: validezHastaDate
          ? (formatStoredDate(validezHastaDate) ?? paquete.validezHasta)
          : paquete.validezHasta,
        updatedAt: new Date().toISOString(),
        ...overrides,
      });
    },
    [
      paquete,
      titulo,
      destino,
      descripcion,
      textoVisual,
      salidas,
      temporadaId,
      tipoPaqueteId,
      estado,
      destacado,
      moneda,
      validezDesdeDate,
      validezHastaDate,
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
  const setDescripcionDirty = (v: string) => { setDescripcion(v); markDirty(); };
  const setTextoVisualDirty = (v: string) => { setTextoVisual(v); markDirty(); };
  // (noches is derived from destinos — no dirty setter needed)
  const setSalidasDirty = (v: string) => { setSalidas(v); markDirty(); };
  const setTemporadaIdDirty = (v: string) => { setTemporadaId(v); markDirty(); };
  const setTipoPaqueteIdDirty = (v: string) => { setTipoPaqueteId(v); markDirty(); };
  const setEstadoDirty = (v: string) => { setEstado(v); markDirty(); };
  const setDestacadoDirty = (v: boolean) => { setDestacado(v); markDirty(); };
  const setMonedaDirty = (v: string) => { setMoneda(v); markDirty(); };
  const setValidezDesdeDateDirty = (v: Date | undefined) => { setValidezDesdeDate(v); markDirty(); };
  const setValidezHastaDateDirty = (v: Date | undefined) => { setValidezHastaDate(v); markDirty(); };

  const { status: autoSaveStatus, markDirty, saveNow } = useAutoSave({
    onSave: handleAutoSave,
    enabled: canEdit,
  });

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
        {/* Estado y completitud (moved to top per client feedback)          */}
        {/* ================================================================ */}
        <FormSection
          title="Estado"
          description="Controla la visibilidad del paquete en el frontend publico. El checklist muestra los datos pendientes para activar."
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

          {/* Validation checklist (shown when BORRADOR and incomplete) */}
          {estado === "BORRADOR" && !validation.valid && (
            <div
              className="mt-4 rounded-[12px] border border-hairline bg-white p-4"
              style={{
                background: "rgba(232,168,56,0.05)",
                borderColor: "rgba(232,168,56,0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="text-[12px] font-medium text-amber-700">
                  Completitud para activar: {validation.completionPercent}%
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-amber-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${validation.completionPercent}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                {validation.missing.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-[12px]">
                    {item.completed ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span
                      className={
                        item.completed
                          ? "text-neutral-400 line-through"
                          : "text-amber-700"
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                value={titulo}
                onChange={(e) => setTituloDirty(e.target.value)}
                placeholder="Nombre del paquete"
                readOnly={isReadOnly}
                autoFocus
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
              <Select
                value={temporadaId}
                onValueChange={setTemporadaIdDirty}
                disabled={isReadOnly}
                options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
                placeholder="Seleccionar temporada..."
              />
            </Field>
            <Field>
              <FieldLabel>Tipo de paquete</FieldLabel>
              <Select
                value={tipoPaqueteId}
                onValueChange={setTipoPaqueteIdDirty}
                disabled={isReadOnly}
                options={tiposPaquete.map((t) => ({
                  value: t.id,
                  label: t.nombre,
                }))}
                placeholder="Seleccionar tipo..."
              />
            </Field>

            <Field span={2}>
              <FieldLabel>Etiquetas</FieldLabel>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {assignedEtiquetasFull.length === 0 && (
                  <span className="text-[13px] text-neutral-400 italic">
                    Sin etiquetas asignadas
                  </span>
                )}
                {assignedEtiquetasFull.map((etq) => (
                  <Tag
                    key={etq.assignmentId}
                    color={resolveTagColor(etq.color)}
                    removable={!isReadOnly}
                    onRemove={() => handleRemoveEtiqueta(etq.assignmentId)}
                  >
                    {etq.nombre}
                  </Tag>
                ))}
              </div>
              {!isReadOnly && availableEtiquetas.length > 0 && (
                <div className="mt-2 max-w-xs">
                  <Select
                    value=""
                    onValueChange={handleAddEtiqueta}
                    options={availableEtiquetas.map((e) => ({
                      value: e.id,
                      label: e.nombre,
                    }))}
                    placeholder="Agregar etiqueta..."
                  />
                </div>
              )}
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
        {/* Duracion y salidas                                               */}
        {/* ================================================================ */}
        <FormSection
          title="Duracion y salidas"
          description="Cantidad de noches y periodo de salidas del paquete."
        >
          <FieldGroup columns={2}>
            <Field>
              <FieldLabel>Noches</FieldLabel>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold text-neutral-800">
                  {nochesTotales}
                </span>
                <span className="text-xs text-neutral-400">
                  {destinos.length === 0
                    ? nochesTotales > 0
                      ? "Valor inicial cargado desde Nuevo paquete"
                      : "Agregá destinos en la pestaña Alojamientos"
                    : `Total de ${destinos.length} destino${destinos.length === 1 ? "" : "s"} — editable desde Alojamientos`}
                </span>
              </div>
            </Field>
            <Field>
              <FieldLabel>Salidas</FieldLabel>
              <Input
                value={salidas}
                onChange={(e) => setSalidasDirty(e.target.value)}
                placeholder="Septiembre a noviembre"
                readOnly={isReadOnly}
              />
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ================================================================ */}
        {/* Validez                                                          */}
        {/* ================================================================ */}
        <FormSection
          title="Validez"
          description="El paquete se auto-desactiva al llegar a la fecha de validez hasta."
        >
          <FieldGroup columns={1}>
            <Field>
              <FieldLabel>Rango de validez</FieldLabel>
              <PeriodPicker
                valueFrom={formatStoredDate(validezDesdeDate) ?? null}
                valueTo={formatStoredDate(validezHastaDate) ?? null}
                onChange={(desde, hasta) => {
                  setValidezDesdeDateDirty(parseStoredDate(desde));
                  setValidezHastaDateDirty(parseStoredDate(hasta));
                }}
                placeholder="Seleccionar rango de validez..."
                disabled={isReadOnly}
              />
              {(hastaExpired || hastaWarning) && (
                <p
                  className={`mt-1.5 text-[11.5px] font-medium ${hastaExpired ? "text-[#CC2030]" : "text-amber-600"}`}
                >
                  {hastaExpired
                    ? "Vigencia vencida"
                    : "Vence en menos de 30 días"}
                </p>
              )}
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ================================================================ */}
        {/* Contenido visual                                                 */}
        {/* ================================================================ */}
        <FormSection
          title="Contenido visual"
          description="Lo que ve el cliente en el frontend publico."
        >
          <FieldGroup columns={1}>
            <Field>
              <FieldLabel>Descripcion</FieldLabel>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcionDirty(e.target.value)}
                placeholder="Descripcion detallada del paquete..."
                rows={3}
                readOnly={isReadOnly}
                className={textareaClassName}
              />
            </Field>

            <Field>
              <FieldLabel>Texto visual</FieldLabel>
              <textarea
                value={textoVisual}
                onChange={(e) => setTextoVisualDirty(e.target.value)}
                placeholder="Texto destacado para la ficha visual..."
                rows={2}
                readOnly={isReadOnly}
                className={textareaClassName}
              />
            </Field>
          </FieldGroup>
        </FormSection>

      </FormSections>
    </div>
  );
}
