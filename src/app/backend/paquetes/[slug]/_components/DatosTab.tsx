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
  addDays,
} from "@/lib/date";
import { Star, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { springs } from "@/components/lib/animations";
import type { Paquete, EstadoPaquete } from "@/lib/types";

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
  // Vigencia: hasta cuándo el paquete sigue visible/activo en el frontend.
  // Por defecto se ata al período de viaje (validezDesde = viajeDesde − 15d,
  // validezHasta = viajeHasta). Si el operador edita validezDesde/Hasta a
  // mano, se rompe el vínculo y ya no se recalcula al tocar el viaje.
  const [validezDesdeDate, setValidezDesdeDate] = useState<Date | undefined>(
    parseStoredDate(paquete.validezDesde),
  );
  const [validezHastaDate, setValidezHastaDate] = useState<Date | undefined>(
    parseStoredDate(paquete.validezHasta),
  );
  // Override manual: queda en true apenas el operador toca validezDesde o
  // validezHasta con el toggle "vincular" apagado. Mientras esté en true, los
  // cambios al período de viaje no pisan la vigencia.
  const [vigenciaManual, setVigenciaManual] = useState(false);
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

  // -- Vigencia helper: warn if close to expiry (sobre la validez, no el viaje) --
  const now = startOfLocalDay(new Date()) ?? new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const hastaExpired = validezHastaDate ? validezHastaDate < now : false;
  const hastaWarning =
    validezHastaDate && !hastaExpired
      ? validezHastaDate.getTime() - now.getTime() < thirtyDaysMs
      : false;

  // Detecta si la vigencia mostrada en la UI está desincronizada del
  // período de viaje. Caso típico: paquetes viejos donde la vigencia quedó
  // con los defaults del alta (hoy / hoy+1año) y después se configuró el
  // período de viaje a mano. La UI muestra un banner con un botón para
  // aplicar el recálculo.
  const localValidezDesdeStr = validezDesdeDate
    ? formatStoredDate(validezDesdeDate)
    : null;
  const localValidezHastaStr = validezHastaDate
    ? formatStoredDate(validezHastaDate)
    : null;
  const derivedValidezDesde = viajeDesdeDate
    ? formatStoredDate(addDays(viajeDesdeDate, -15))
    : null;
  const derivedValidezHasta = viajeHastaDate
    ? formatStoredDate(viajeHastaDate)
    : null;
  const vigenciaDesincronizada =
    !vigenciaManual &&
    (localValidezDesdeStr !== derivedValidezDesde ||
      localValidezHastaStr !== derivedValidezHasta);

  const handleAplicarVigenciaAlViaje = () => {
    setValidezDesdeDate(
      viajeDesdeDate ? addDays(viajeDesdeDate, -15) : undefined,
    );
    setValidezHastaDate(viajeHastaDate);
    markDirty();
  };

  const persistPaquete = useCallback(
    (overrides: Partial<Paquete> = {}) => {
      // Período de viaje: cuándo viaja el cliente (matchea servicios y precios).
      // Vigencia: hasta cuándo el paquete sigue activo en el frontend.
      //  • Si vigenciaManual es false, validezDesde se deriva de viajeDesde
      //    (15 días antes) y validezHasta se iguala a viajeHasta.
      //  • Si vigenciaManual es true, se respetan los valores manuales de
      //    validezDesde/Hasta. validezDesde sigue siendo el ancla del resolver
      //    de precios.
      const viajeDesdeStr = viajeDesdeDate
        ? formatStoredDate(viajeDesdeDate)
        : null;
      const viajeHastaStr = viajeHastaDate
        ? formatStoredDate(viajeHastaDate)
        : null;
      let validezDesdeStr: string;
      let validezHastaStr: string;
      if (vigenciaManual) {
        validezDesdeStr = validezDesdeDate
          ? formatStoredDate(validezDesdeDate)!
          : paquete.validezDesde;
        validezHastaStr = validezHastaDate
          ? formatStoredDate(validezHastaDate)!
          : paquete.validezHasta;
      } else if (viajeDesdeDate) {
        validezDesdeStr = formatStoredDate(addDays(viajeDesdeDate, -15))!;
        validezHastaStr = viajeHastaDate
          ? formatStoredDate(viajeHastaDate)!
          : paquete.validezHasta;
      } else {
        validezDesdeStr = paquete.validezDesde;
        validezHastaStr = paquete.validezHasta;
      }
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
        validezDesde: validezDesdeStr,
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
      destacado,
      moneda,
      viajeDesdeDate,
      viajeHastaDate,
      validezDesdeDate,
      validezHastaDate,
      vigenciaManual,
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
    // Si la vigencia NO está en modo manual, reflejar el cambio del viaje
    // inmediatamente en la UI para que el operador vea el recálculo sin tener
    // que esperar al autosave + refresh. El persistPaquete ya hace lo mismo en
    // el guardado.
    if (!vigenciaManual) {
      setValidezDesdeDate(desde ? addDays(desde, -15) : undefined);
      setValidezHastaDate(hasta);
    }
    markDirty();
  };
  const setValidezDesdeDateDirty = (v: Date | undefined) => {
    setValidezDesdeDate(v);
    setVigenciaManual(true);
    markDirty();
  };
  const setValidezHastaDateDirty = (v: Date | undefined) => {
    setValidezHastaDate(v);
    setVigenciaManual(true);
    markDirty();
  };
  // Re-vincula la vigencia al período de viaje: borra validezDesde/Hasta y
  // deja que el próximo render del autosave los derive del viaje.
  const handleVincularVigencia = () => {
    setVigenciaManual(false);
    setValidezDesdeDate(undefined);
    setValidezHastaDate(undefined);
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
        {/* Período y vigencia — fechas de viaje, vigencia derivada y estado. */}
        {/* El orden sigue el flujo de configuración: primero el viaje         */}
        {/* (de dónde sale la vigencia), después la vigencia editable,         */}
        {/* después el estado interno.                                         */}
        {/* ================================================================ */}
        <FormSection
          title="Período y vigencia"
          description="Fechas en que viaja el cliente (de donde se deriva la vigencia), vigencia editable del paquete en el frontend, y estado interno del flujo."
        >
          {vigenciaDesincronizada && !isReadOnly && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 text-[12px] text-amber-900 leading-snug">
                <p className="font-semibold mb-0.5">
                  La vigencia guardada no coincide con el período de viaje.
                </p>
                <p>
                  {viajeDesdeDate && derivedValidezDesde && derivedValidezHasta
                    ? `Cálculo automático: ${derivedValidezDesde} → ${derivedValidezHasta}.`
                    : "Definí las fechas del viaje para calcular la vigencia automática."}
                </p>
                <button
                  type="button"
                  onClick={handleAplicarVigenciaAlViaje}
                  disabled={!viajeDesdeDate}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-amber-800 hover:text-amber-950 underline disabled:opacity-50 disabled:no-underline"
                >
                  Aplicar al período de viaje
                </button>
              </div>
            </div>
          )}
          <FieldGroup columns={2}>
            {/* 1) Período del viaje — la fuente de la vigencia automática. */}
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
                Define qué servicios y tarifas aplican, y se usa como ancla
                para calcular la vigencia automática (15 días antes del
                inicio, hasta la fecha de fin).
              </p>
            </Field>

            {/* 2) Vigencia — editable, atada al viaje por defecto. */}
            <Field>
              <FieldLabel className="flex items-center justify-between">
                <span>Vigencia</span>
                {!vigenciaManual ? (
                  <span className="text-[10.5px] font-normal text-neutral-400">
                    Vinculada al período de viaje
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleVincularVigencia}
                    disabled={isReadOnly}
                    className="text-[10.5px] font-medium text-violet-600 hover:underline disabled:text-neutral-300 disabled:no-underline"
                  >
                    Volver a vincular al viaje
                  </button>
                )}
              </FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10.5px] uppercase tracking-wide text-neutral-400 mb-1">
                    Desde
                  </span>
                  <DatePicker
                    value={validezDesdeDate}
                    onChange={setValidezDesdeDateDirty}
                    placeholder={
                      viajeDesdeDate
                        ? `Auto: ${formatStoredDate(
                            addDays(viajeDesdeDate, -15),
                          )}`
                        : "Elegir fecha..."
                    }
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <span className="block text-[10.5px] uppercase tracking-wide text-neutral-400 mb-1">
                    Hasta
                  </span>
                  <DatePicker
                    value={validezHastaDate}
                    onChange={setValidezHastaDateDirty}
                    placeholder={
                      viajeHastaDate
                        ? `Auto: ${formatStoredDate(viajeHastaDate)}`
                        : "Elegir fecha..."
                    }
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              {vigenciaManual ? (
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Vigencia manual: no se actualiza al cambiar el período de
                  viaje.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Calculada como <span className="font-medium">viaje desde − 15 días</span>{" "}
                  hasta <span className="font-medium">viaje hasta</span>.
                  Tocá cualquier fecha para personalizarla.
                </p>
              )}
              {hastaExpired ? (
                <p className="mt-1.5 text-[11.5px] font-medium text-[#CC2030]">
                  Vigencia vencida — el paquete ya no se muestra en el
                  frontend.
                </p>
              ) : hastaWarning ? (
                <p className="mt-1.5 text-[11.5px] font-medium text-amber-600">
                  Vence en menos de 30 días.
                </p>
              ) : validezHastaDate ? (
                <p className="mt-1 text-[11px] text-neutral-400">
                  Se dará de baja automáticamente el{" "}
                  {validezHastaDate.toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              ) : null}
            </Field>

            {/* 3) Salidas — vive junto al período del viaje, no en la sección */}
            {/*    de identificación. Se autocompleta con el rango.            */}
            <Field>
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

            {/* 4) Estado — etapa del flujo interno. */}
            <Field span={2}>
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
