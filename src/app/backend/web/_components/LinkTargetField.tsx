"use client";

// ---------------------------------------------------------------------------
// LinkTargetField — selector de destino para los links del CMS.
//
// Reemplaza el input de texto libre donde el admin tenía que adivinar
// "/destinos?tipo=cruceros". Ahora elige "Categoría de paquete" → "Cruceros" y
// la URL se arma sola. "URL personalizada" queda como escape hatch para links
// raros y para no romper lo ya cargado.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import {
  LINK_TARGET_KINDS,
  buildLinkTarget,
  optionsForKind,
  parseLinkTarget,
  type LinkTargetKind,
  type LinkTargetOptions,
} from "@/lib/link-target";

const SELECT_CLASS =
  "w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20";

const PLACEHOLDER_BY_KIND: Record<string, string> = {
  tipo: "Elegí una categoría…",
  etiqueta: "Elegí una etiqueta…",
  region: "Elegí una región…",
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: LinkTargetOptions;
};

export function LinkTargetField({ value, onChange, options }: Props) {
  // El tipo vive en estado propio (el valor guardado es solo la URL). Se
  // inicializa deduciéndolo del link existente al abrir el editor.
  const [kind, setKind] = useState<LinkTargetKind>(
    () => parseLinkTarget(value, options).kind,
  );

  const parsed = parseLinkTarget(value, options);
  // El slug sale del valor actual, no de un estado paralelo: así nunca se
  // desincronizan. Si el valor todavía no corresponde al tipo elegido (recién
  // cambiado), el segundo desplegable arranca vacío.
  const slug = parsed.kind === kind ? parsed.slug : "";
  const list = optionsForKind(kind, options);

  const changeKind = (next: LinkTargetKind) => {
    setKind(next);
    if (next === "todos") onChange(buildLinkTarget("todos", ""));
    // "custom" conserva el valor actual como punto de partida editable.
    else if (next !== "custom") onChange("");
  };

  return (
    <div className="space-y-2">
      <select
        className={SELECT_CLASS}
        value={kind}
        onChange={(e) => changeKind(e.target.value as LinkTargetKind)}
        aria-label="Tipo de destino"
      >
        {LINK_TARGET_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>

      {(kind === "tipo" || kind === "etiqueta" || kind === "region") && (
        <select
          className={SELECT_CLASS}
          value={slug}
          onChange={(e) => onChange(buildLinkTarget(kind, e.target.value))}
          aria-label="Destino"
        >
          <option value="">{PLACEHOLDER_BY_KIND[kind]}</option>
          {list.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.nombre}
            </option>
          ))}
        </select>
      )}

      {kind === "custom" && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/destinos?tipo=cruceros o https://…"
          aria-label="URL personalizada"
        />
      )}

      {value && kind !== "custom" && (
        <p className="text-[11.5px] text-neutral-500">
          Se guardará: <span className="font-mono text-neutral-700">{value}</span>
        </p>
      )}

      {kind === "tipo" && list.length === 0 && (
        <p className="text-[11.5px] text-neutral-500">
          No hay categorías de paquete cargadas. Creálas en Catálogos → Tipos de
          paquete.
        </p>
      )}
    </div>
  );
}
