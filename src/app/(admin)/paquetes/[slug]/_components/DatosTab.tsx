"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tag } from "@/components/ui/Tag";
import type { TagColor } from "@/components/ui/Tag";
import {
  usePackageActions,
  usePaqueteServices,
  useOpcionesHoteleras,
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
  MapPin,
  Settings,
  Tags,
  Calendar,
  Star,
  Info,
  Check,
  Circle,
} from "lucide-react";
import { springs } from "@/components/lib/animations";
import type { Paquete, EstadoPaquete } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DatosTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Textarea glass styling (consistent with Input glass pattern)
// ---------------------------------------------------------------------------

const textareaClassName =
  "w-full rounded-clay border border-neutral-150/50 bg-white/70 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm disabled:bg-neutral-100/50 disabled:text-neutral-400 disabled:cursor-not-allowed";

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
      <div
        className="flex items-center justify-center w-7 h-7 rounded-lg"
        style={{
          background:
            "linear-gradient(135deg, rgba(59,191,173,0.15), rgba(139,92,246,0.1))",
        }}
      >
        <Icon className="w-3.5 h-3.5 text-brand-teal-500" />
      </div>
      <span
        className="text-[13px] font-semibold tracking-wide uppercase"
        style={{ color: "#2D2F4D" }}
      >
        {title}
      </span>
      <div
        className="flex-1 h-px"
        style={{
          background: "linear-gradient(90deg, rgba(59,191,173,0.3), transparent)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estado options
// ---------------------------------------------------------------------------

const estadoOptions = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

const monedaOptions = [
  { value: "USD", label: "USD" },
  { value: "UYU", label: "UYU" },
];

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
  const [noches, setNoches] = useState(paquete.noches);
  const [salidas, setSalidas] = useState(paquete.salidas);
  const [temporadaId, setTemporadaId] = useState(paquete.temporadaId);
  const [tipoPaqueteId, setTipoPaqueteId] = useState(paquete.tipoPaqueteId);
  const [estado, setEstado] = useState<string>(paquete.estado);
  const [destacado, setDestacado] = useState(paquete.destacado);
  const [moneda, setMoneda] = useState(paquete.moneda);
  const [validezDesdeDate, setValidezDesdeDate] = useState<Date | undefined>(
    paquete.validezDesde ? new Date(paquete.validezDesde) : undefined,
  );
  const [validezHastaDate, setValidezHastaDate] = useState<Date | undefined>(
    paquete.validezHasta ? new Date(paquete.validezHasta) : undefined,
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
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const hastaExpired = validezHastaDate ? validezHastaDate < now : false;
  const hastaWarning =
    validezHastaDate && !hastaExpired
      ? validezHastaDate.getTime() - now.getTime() < thirtyDaysMs
      : false;

  // -- Auto-save handler --
  const handleAutoSave = useCallback(() => {
    updatePaquete({
      ...paquete,
      titulo,
      destino,
      descripcion,
      textoVisual: textoVisual || null,
      noches,
      salidas,
      temporadaId,
      tipoPaqueteId,
      estado: estado as EstadoPaquete,
      destacado,
      moneda,
      validezDesde: validezDesdeDate
        ? validezDesdeDate.toISOString().split("T")[0]
        : paquete.validezDesde,
      validezHasta: validezHastaDate
        ? validezHastaDate.toISOString().split("T")[0]
        : paquete.validezHasta,
      updatedAt: new Date().toISOString(),
    });
  }, [
    paquete, titulo, destino, descripcion, textoVisual, noches, salidas,
    temporadaId, tipoPaqueteId, estado, destacado, moneda,
    validezDesdeDate, validezHastaDate, updatePaquete,
  ]);

  const { status: autoSaveStatus, markDirty, saveNow } = useAutoSave({
    onSave: handleAutoSave,
    enabled: canEdit,
  });

  // -- Save handler (manual fallback) --
  const handleSave = () => {
    saveNow();
    toast(
      "success",
      "Paquete actualizado",
      "Los cambios fueron guardados correctamente.",
    );
  };

  // -- Etiqueta handlers --
  const handleAddEtiqueta = (etiquetaId: string) => {
    assignEtiqueta({ paqueteId: paquete.id, etiquetaId });
  };

  const handleRemoveEtiqueta = (assignmentId: string) => {
    removeEtiqueta(assignmentId);
  };

  const isReadOnly = !canEdit;

  // -- Wrapped setters that also mark dirty --
  const setTituloDirty = (v: string) => { setTitulo(v); markDirty(); };
  const setDestinoDirty = (v: string) => { setDestino(v); markDirty(); };
  const setDescripcionDirty = (v: string) => { setDescripcion(v); markDirty(); };
  const setTextoVisualDirty = (v: string) => { setTextoVisual(v); markDirty(); };
  const setNochesDirty = (v: number) => { setNoches(v); markDirty(); };
  const setSalidasDirty = (v: string) => { setSalidas(v); markDirty(); };
  const setTemporadaIdDirty = (v: string) => { setTemporadaId(v); markDirty(); };
  const setTipoPaqueteIdDirty = (v: string) => { setTipoPaqueteId(v); markDirty(); };
  const setEstadoDirty = (v: string) => { setEstado(v); markDirty(); };
  const setDestacadoDirty = (v: boolean) => { setDestacado(v); markDirty(); };
  const setMonedaDirty = (v: string) => { setMoneda(v); markDirty(); };
  const setValidezDesdeDateDirty = (v: Date | undefined) => { setValidezDesdeDate(v); markDirty(); };
  const setValidezHastaDateDirty = (v: Date | undefined) => { setValidezHastaDate(v); markDirty(); };

  return (
    <Card className="p-0 relative">
      {/* Auto-save indicator */}
      {canEdit && (
        <div className="absolute top-3 right-3 z-10">
          <AutoSaveIndicator status={autoSaveStatus} />
        </div>
      )}
      <div className="p-6 space-y-2">
        {/* ============================================================= */}
        {/* INFORMACION GENERAL                                           */}
        {/* ============================================================= */}
        <SectionHeader icon={Info} title="Informacion General" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Titulo -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Titulo"
              value={titulo}
              onChange={(e) => setTituloDirty(e.target.value)}
              placeholder="Nombre del paquete"
              readOnly={isReadOnly}
            />
          </div>

          {/* Destino + Noches */}
          <Input
            label="Destino"
            value={destino}
            onChange={(e) => setDestinoDirty(e.target.value)}
            placeholder="Ciudad o region de destino"
            readOnly={isReadOnly}
            leftIcon={<MapPin className="w-4 h-4" />}
          />
          <Input
            label="Noches"
            type="number"
            value={noches}
            onChange={(e) => setNochesDirty(Number(e.target.value))}
            placeholder="7"
            readOnly={isReadOnly}
          />

          {/* Salidas -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Salidas"
              value={salidas}
              onChange={(e) => setSalidasDirty(e.target.value)}
              placeholder="Consultar"
              readOnly={isReadOnly}
            />
          </div>

          {/* Descripcion -- full width textarea */}
          <div className="col-span-1 md:col-span-2 flex flex-col">
            <label
              htmlFor="descripcion"
              className="mb-1.5 text-[12.5px] font-medium"
              style={{ color: "#2D2F4D" }}
            >
              Descripcion
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcionDirty(e.target.value)}
              placeholder="Descripcion detallada del paquete..."
              rows={3}
              readOnly={isReadOnly}
              className={textareaClassName}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          {/* Texto Visual -- full width textarea */}
          <div className="col-span-1 md:col-span-2 flex flex-col">
            <label
              htmlFor="texto-visual"
              className="mb-1.5 text-[12.5px] font-medium"
              style={{ color: "#2D2F4D" }}
            >
              Texto Visual
            </label>
            <textarea
              id="texto-visual"
              value={textoVisual}
              onChange={(e) => setTextoVisualDirty(e.target.value)}
              placeholder="Texto destacado para la ficha visual..."
              rows={2}
              readOnly={isReadOnly}
              className={textareaClassName}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>
        </div>

        {/* ============================================================= */}
        {/* CONFIGURACION                                                 */}
        {/* ============================================================= */}
        <SectionHeader icon={Settings} title="Configuracion" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Temporada"
            value={temporadaId}
            onValueChange={setTemporadaIdDirty}
            disabled={isReadOnly}
            options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
            placeholder="Seleccionar temporada..."
          />
          <Select
            label="Tipo de Paquete"
            value={tipoPaqueteId}
            onValueChange={setTipoPaqueteIdDirty}
            disabled={isReadOnly}
            options={tiposPaquete.map((t) => ({
              value: t.id,
              label: t.nombre,
            }))}
            placeholder="Seleccionar tipo..."
          />
          <Select
            label="Moneda"
            value={moneda}
            onValueChange={setMonedaDirty}
            disabled={isReadOnly}
            options={monedaOptions}
            placeholder="Seleccionar moneda..."
          />
          <Select
            label="Estado"
            value={estado}
            onValueChange={setEstadoDirty}
            disabled={isReadOnly}
            options={estadoOptions}
            placeholder="Seleccionar estado..."
          />

          {/* Validation checklist (shown when BORRADOR and incomplete) */}
          {estado === "BORRADOR" && !validation.valid && (
            <div className="col-span-1 md:col-span-2">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(232,168,56,0.08)",
                  border: "1px solid rgba(232,168,56,0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-medium text-amber-700">
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
                    <div key={item.key} className="flex items-center gap-2 text-xs">
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
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* CLASIFICACION                                                 */}
        {/* ============================================================= */}
        <SectionHeader icon={Tags} title="Clasificacion" />

        <div className="space-y-4">
          {/* Etiquetas chips + add dropdown */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[12.5px] font-medium"
              style={{ color: "#2D2F4D" }}
            >
              Etiquetas
            </label>

            {/* Assigned tags */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {assignedEtiquetasFull.length === 0 && (
                <span className="text-sm text-neutral-400 italic">
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

            {/* Add dropdown */}
            {!isReadOnly && availableEtiquetas.length > 0 && (
              <div className="max-w-xs">
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
          </div>

          {/* Destacado toggle */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[12.5px] font-medium"
              style={{ color: "#2D2F4D" }}
            >
              Destacado
            </label>
            <div className="flex items-center gap-3">
              <Toggle
                checked={destacado}
                onCheckedChange={setDestacadoDirty}
                disabled={isReadOnly}
              />
              <span className="text-sm text-neutral-600">
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
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* VIGENCIA                                                      */}
        {/* ============================================================= */}
        <SectionHeader icon={Calendar} title="Vigencia" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Validez Desde"
            value={validezDesdeDate}
            onChange={setValidezDesdeDateDirty}
            placeholder="Seleccionar fecha..."
            disabled={isReadOnly}
          />
          <DatePicker
            label="Validez Hasta"
            value={validezHastaDate}
            onChange={setValidezHastaDateDirty}
            placeholder="Seleccionar fecha..."
            disabled={isReadOnly}
            error={
              hastaExpired
                ? "Vigencia vencida"
                : hastaWarning
                  ? "Vence en menos de 30 dias"
                  : undefined
            }
          />
        </div>

        {/* ============================================================= */}
        {/* Save button                                                   */}
        {/* ============================================================= */}
        {canEdit && (
          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={handleSave}>Guardar Cambios</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
