"use client";

// Paso 5: día a día. Línea de tiempo de días o rangos, ordenada por el día
// de inicio. Se puede armar de una desde el recorrido.

import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CalendarRange, ChevronDown, Plus, Trash2, Wand2 } from "lucide-react";
import type { Dia } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { Boton } from "../../ui";
import { EditorTexto } from "../../editor/EditorTexto";
import { Campo, Stepper, TiraMedios, inputLinea } from "../campos";
import { useConstructor } from "../contexto";
import { nuevoId } from "../estado";

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_DIAS = 60;
const ordenar = (d: Dia[]) => [...d].sort((a, b) => a.desde - b.desde);

function etiquetaDias(desde: number, hasta: number) {
  if (hasta <= desde) return `Día ${desde}`;
  return hasta === desde + 1 ? `Días ${desde} y ${hasta}` : `Días ${desde} a ${hasta}`;
}

export function PasoDias() {
  const { borrador, setContenido, editable } = useConstructor();
  const { dias, tramos } = borrador.contenido;
  const [confirmar, setConfirmar] = useState(false);

  const armar = () => {
    let acc = 0;
    const nuevos: Dia[] = [];
    for (const t of tramos) {
      const n = Math.max(1, t.noches);
      if (acc + 1 > 90) break;
      nuevos.push({
        id: nuevoId(),
        desde: acc + 1,
        hasta: Math.min(90, acc + n),
        tramoId: t.id,
        titulo: t.ciudadNombre,
        texto: "",
        medios: [],
      });
      acc += n;
    }
    setContenido(() => ({ dias: nuevos }));
    setConfirmar(false);
  };

  const agregar = () => {
    const ultimo = dias.reduce((m, d) => Math.max(m, d.hasta, d.desde), 0);
    const desde = Math.min(90, ultimo + 1);
    setContenido((k) => ({
      dias: ordenar([...k.dias, { id: nuevoId(), desde, hasta: desde, tramoId: null, titulo: "", texto: "", medios: [] }]),
    }));
  };

  return (
    <div className="flex flex-col gap-8">
      {editable && tramos.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-sm border border-col-line bg-col-surface p-4">
          <Wand2 className="h-5 w-5 shrink-0 text-col-gold" strokeWidth={1.4} aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] text-col-slate">
            {confirmar
              ? `Esto reemplaza los ${dias.length} días cargados por uno por parada.`
              : "Un bloque por parada del recorrido, con los días según las noches."}
          </p>
          {confirmar ? (
            <div className="flex gap-2">
              <Boton variante="fantasma" tam="sm" onClick={() => setConfirmar(false)}>
                Cancelar
              </Boton>
              <Boton tam="sm" onClick={armar}>
                Reemplazar
              </Boton>
            </div>
          ) : (
            <Boton variante="secundario" tam="sm" onClick={() => (dias.length ? setConfirmar(true) : armar())}>
              Armar días desde el recorrido
            </Boton>
          )}
        </div>
      )}

      {dias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-col-slate/30 px-6 py-14 text-center">
          <CalendarRange className="h-7 w-7 text-col-gold" strokeWidth={1.2} aria-hidden />
          <p className="font-col-display text-[26px] text-col-ink">El viaje, día por día</p>
          <p className="max-w-[42ch] text-[14px] text-col-slate">
            Podés contar cada día o agrupar varios en un rango, como «Días 4 a 5: lagunas de Bacuit».
          </p>
        </div>
      ) : (
        <ol className="relative flex flex-col gap-4 pl-8">
          <span aria-hidden className="absolute bottom-6 left-[11px] top-6 w-px bg-col-line" />
          {ordenar(dias).map((d, i, lista) => {
            const previo = lista[i - 1];
            const choca = previo && d.desde <= Math.max(previo.desde, previo.hasta);
            return (
              <motion.li key={d.id} layout transition={{ duration: 0.4, ease: EASE }} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-8 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-col-gold bg-col-base font-col-display text-[12px] text-col-ink"
                >
                  {d.desde}
                </span>
                <TarjetaDia dia={d} choca={choca ? previo : null} />
              </motion.li>
            );
          })}
        </ol>
      )}

      {editable && dias.length < MAX_DIAS && (
        <button
          type="button"
          onClick={agregar}
          className="flex h-12 items-center justify-center gap-2 rounded-sm border border-dashed border-col-slate/30 text-[12px] uppercase tracking-[0.12em] text-col-slate transition-colors hover:border-col-gold hover:text-col-ink"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Sumar día
        </button>
      )}
    </div>
  );
}

function TarjetaDia({ dia: d, choca }: { dia: Dia; choca: Dia | null }) {
  const { borrador, setContenido, editable } = useConstructor();
  const tramos = borrador.contenido.tramos;
  const cambiar = (c: Partial<Dia>) =>
    setContenido((k) => {
      const dias = k.dias.map((x) => {
        if (x.id !== d.id) return x;
        const n = { ...x, ...c };
        if (n.hasta < n.desde) n.hasta = n.desde;
        return n;
      });
      return { dias: "desde" in c ? ordenar(dias) : dias };
    });
  const tramo = tramos.find((t) => t.id === d.tramoId);

  return (
    <div className="rounded-sm border border-col-line bg-col-surface p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="min-w-[110px] font-col-display text-[22px] leading-none text-col-ink">{etiquetaDias(d.desde, d.hasta)}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-col-slate">Del</span>
          <Stepper valor={d.desde} min={1} max={90} label="Día de inicio" onCambio={(desde) => cambiar({ desde })} deshabilitado={!editable} />
          <span className="text-[11px] uppercase tracking-[0.12em] text-col-slate">al</span>
          <Stepper valor={d.hasta} min={d.desde} max={90} label="Día final" onCambio={(hasta) => cambiar({ hasta })} deshabilitado={!editable} />
        </div>
        {editable && (
          <button
            type="button"
            aria-label={`Quitar ${etiquetaDias(d.desde, d.hasta)}`}
            onClick={() => setContenido((k) => ({ dias: k.dias.filter((x) => x.id !== d.id) }))}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-sm text-col-slate/60 transition-colors hover:bg-col-base hover:text-col-alerta"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
      {choca && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-[#B07A2A]">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          Se superpone con {etiquetaDias(choca.desde, choca.hasta).toLowerCase()}.
        </p>
      )}
      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_200px]">
        <Campo etiqueta="Título" htmlFor={`dia-${d.id}`}>
          <input
            id={`dia-${d.id}`}
            value={d.titulo}
            maxLength={160}
            onChange={(e) => cambiar({ titulo: e.target.value })}
            placeholder={tramo?.ciudadNombre ? `Un día en ${tramo.ciudadNombre}` : "Llegada y traslado privado"}
            className={cn(inputLinea, "text-[17px]")}
          />
        </Campo>
        <Campo etiqueta="Parada" htmlFor={`dia-t-${d.id}`}>
          <div className="relative">
            <select
              id={`dia-t-${d.id}`}
              value={d.tramoId ?? ""}
              onChange={(e) => cambiar({ tramoId: e.target.value || null })}
              className={cn(inputLinea, "appearance-none pr-8")}
            >
              <option value="">Sin parada</option>
              {tramos.map((t, i) => (
                <option key={t.id} value={t.id}>
                  {t.ciudadNombre || `Parada ${i + 1}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} />
          </div>
        </Campo>
      </div>
      <div className="mt-6 flex flex-col gap-5">
        <EditorTexto
          etiqueta={`Texto de ${etiquetaDias(d.desde, d.hasta)}`}
          valor={d.texto}
          onCambio={(texto) => cambiar({ texto })}
          placeholder="Qué pasa ese día, en dos o tres líneas."
          minAlto={90}
          maxAlto={280}
          compacto
          deshabilitado={!editable}
        />
        <TiraMedios refs={d.medios} onCambio={(medios) => cambiar({ medios })} max={8} etiqueta={`Fotos de ${etiquetaDias(d.desde, d.hasta)}`} aspecto={4 / 3} />
      </div>
    </div>
  );
}
