"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePackageActions } from "@/components/providers/PackageProvider";
import { useTemporadas, useTiposPaquete } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import type { Paquete } from "@/lib/types";

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
// Component
// ---------------------------------------------------------------------------

export default function DatosTab({ paquete }: DatosTabProps) {
  const { updatePaquete } = usePackageActions();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- Local form state initialized from paquete prop --
  const [titulo, setTitulo] = useState(paquete.titulo);
  const [descripcion, setDescripcion] = useState(paquete.descripcion);
  const [textoVisual, setTextoVisual] = useState(paquete.textoVisual ?? "");
  const [noches, setNoches] = useState(paquete.noches);
  const [salidas, setSalidas] = useState(paquete.salidas);
  const [temporadaId, setTemporadaId] = useState(paquete.temporadaId);
  const [tipoPaqueteId, setTipoPaqueteId] = useState(paquete.tipoPaqueteId);

  // -- Save handler --
  const handleSave = () => {
    updatePaquete({
      ...paquete,
      titulo,
      descripcion,
      textoVisual: textoVisual || null,
      noches,
      salidas,
      temporadaId,
      tipoPaqueteId,
      updatedAt: new Date().toISOString(),
    });
    toast("success", "Paquete actualizado", "Los cambios fueron guardados correctamente.");
  };

  const isReadOnly = !canEdit;

  return (
    <Card className="p-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        {/* Row 1: Titulo -- full width */}
        <div className="col-span-1 md:col-span-2">
          <Input
            label="Titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nombre del paquete"
            readOnly={isReadOnly}
          />
        </div>

        {/* Row 2: Noches + Salidas */}
        <Input
          label="Noches"
          type="number"
          value={noches}
          onChange={(e) => setNoches(Number(e.target.value))}
          placeholder="7"
          readOnly={isReadOnly}
        />
        <Input
          label="Salidas"
          value={salidas}
          onChange={(e) => setSalidas(e.target.value)}
          placeholder="Consultar"
          readOnly={isReadOnly}
        />

        {/* Row 3: Temporada + Tipo de Paquete */}
        <Select
          label="Temporada"
          value={temporadaId}
          onValueChange={setTemporadaId}
          disabled={isReadOnly}
          options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
          placeholder="Seleccionar temporada..."
        />
        <Select
          label="Tipo de Paquete"
          value={tipoPaqueteId}
          onValueChange={setTipoPaqueteId}
          disabled={isReadOnly}
          options={tiposPaquete.map((t) => ({ value: t.id, label: t.nombre }))}
          placeholder="Seleccionar tipo..."
        />

        {/* Row 4: Descripcion -- full width textarea */}
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
            onChange={(e) => setDescripcion(e.target.value)}
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

        {/* Row 5: Texto Visual -- full width textarea */}
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
            onChange={(e) => setTextoVisual(e.target.value)}
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

        {/* Save button -- only visible to editors */}
        {canEdit && (
          <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
            <Button onClick={handleSave}>Guardar Cambios</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
