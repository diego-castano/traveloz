"use client";

// Paso 3: relato. La frase del hero, la intro, la mejor época y los imperdibles.

import { Plus, Trash2 } from "lucide-react";
import type { Imperdible } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { EditorTexto } from "../../editor/EditorTexto";
import { Asa, Campo, Contador, Grupo, ListaOrdenable, SlotMedio, entrada, entradaArea, entradaSelect, entradaTitulo } from "../campos";
import { useConstructor } from "../contexto";
import { nuevoId } from "../estado";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MAX_IMPERDIBLES = 8;

export function PasoRelato() {
  const { borrador, setContenido, editable } = useConstructor();
  const k = borrador.contenido;
  const m = /^(\w{3}) a (\w{3})$/.exec(k.mejorEpoca.trim());
  const desde = m && MESES.includes(m[1]) ? m[1] : "";
  const hasta = m && MESES.includes(m[2]) ? m[2] : "";
  const fijarEpoca = (d: string, h: string) => setContenido(() => ({ mejorEpoca: d && h ? `${d} a ${h}` : d || h }));

  return (
    <div className="flex flex-col gap-12">
      <Campo
        etiqueta="Frase"
        htmlFor="exp-frase"
        ayuda="Va grande, en el medio de la página. Corta y con ritmo."
        accion={<Contador n={k.frase.length} ideal={60} max={200} />}
      >
        <input
          id="exp-frase"
          value={k.frase}
          maxLength={200}
          onChange={(e) => setContenido(() => ({ frase: e.target.value }))}
          placeholder="Filipinas no se recorre: se navega."
          className={cn(entradaTitulo, "text-col-2xl italic leading-snug")}
        />
      </Campo>

      <Campo etiqueta="Intro" ayuda="Lo primero que se lee después de la portada. Contá el viaje como se lo contarías a un amigo.">
        <EditorTexto
          etiqueta="Intro"
          valor={k.intro}
          onCambio={(intro) => setContenido(() => ({ intro }))}
          placeholder="Entre acantilados de piedra caliza y lagunas que cambian de color…"
          minAlto={220}
          recomendado={200}
          deshabilitado={!editable}
        />
      </Campo>

      <Grupo titulo="Mejor época">
        <div className="grid grid-cols-2 gap-6">
          <SelectMes id="epoca-desde" etiqueta="Desde" valor={desde} onCambio={(v) => fijarEpoca(v, hasta)} />
          <SelectMes id="epoca-hasta" etiqueta="Hasta" valor={hasta} onCambio={(v) => fijarEpoca(desde, v)} />
        </div>
        <Campo
          etiqueta="O escribilo a tu manera"
          htmlFor="epoca-libre"
          accion={<Contador n={k.mejorEpoca.length} max={80} />}
        >
          <input
            id="epoca-libre"
            value={k.mejorEpoca}
            maxLength={80}
            onChange={(e) => setContenido(() => ({ mejorEpoca: e.target.value }))}
            placeholder="Todo el año"
            className={entrada}
          />
        </Campo>
      </Grupo>

      <Imperdibles />
    </div>
  );
}

function SelectMes({
  id,
  etiqueta,
  valor,
  onCambio }: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <Campo etiqueta={etiqueta} htmlFor={id}>
      <div className="relative">
        <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)} className={entradaSelect}>
          <option value="">Elegí un mes</option>
          {MESES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </Campo>
  );
}

function Imperdibles() {
  const { borrador, setContenido, editable } = useConstructor();
  const lista = borrador.contenido.imperdibles;
  const conTitulo = lista.filter((i) => i.titulo.trim()).length;
  const cambiar = (id: string, c: Partial<Imperdible>) =>
    setContenido((k) => ({ imperdibles: k.imperdibles.map((i) => (i.id === id ? { ...i, ...c } : i)) }));

  return (
    <Grupo
      titulo="Lo imperdible"
      ayuda="Entre 4 y 6 momentos que justifican el viaje."
      accion={
        <span className={cn("text-col-sm tabular-nums lining-nums", conTitulo >= 4 ? "text-col-ok" : "text-col-slate")}>
          {conTitulo} de 4 a 6
        </span>
      }
    >
      <ListaOrdenable
        items={lista}
        deshabilitado={!editable}
        onOrden={(imperdibles) => setContenido(() => ({ imperdibles }))}
        className="flex flex-col gap-3"
        render={(it, i, asa) => (
          <div
            className={cn(
              "flex gap-3 rounded-col-sm border border-col-line bg-col-surface p-3 pl-1 transition-shadow duration-col",
              asa.arrastrando && "shadow-col-2",
            )}
          >
            <div className="flex flex-col items-center gap-1 pt-1">
              {editable && <Asa asa={asa} label={`imperdible ${i + 1}`} />}
              <span className="font-col-display text-col-xl leading-none text-col-muted">{i + 1}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                aria-label={`Título del imperdible ${i + 1}`}
                value={it.titulo}
                maxLength={120}
                onChange={(e) => cambiar(it.id, { titulo: e.target.value })}
                placeholder="Navegar entre las lagunas de Bacuit"
                className={entrada}
              />
              <textarea
                aria-label={`Texto del imperdible ${i + 1}`}
                value={it.texto}
                rows={1}
                maxLength={400}
                onChange={(e) => cambiar(it.id, { texto: e.target.value })}
                placeholder="Una línea más, opcional."
                className={cn(entradaArea, "min-h-11 text-col-md text-col-slate")}
              />
            </div>
            <SlotMedio
              className="w-24 shrink-0"
              aspecto={4 / 5}
              medioId={it.medio?.medioId}
              etiqueta={`foto del imperdible ${i + 1}`}
              vacio="Foto"
              tipo="FOTO"
              onCambio={(m) => cambiar(it.id, { medio: m ? { medioId: m.id } : null })}
            />
            {editable && (
              <button
                type="button"
                aria-label={`Quitar imperdible ${i + 1}`}
                onClick={() => setContenido((k) => ({ imperdibles: k.imperdibles.filter((x) => x.id !== it.id) }))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-col-sm text-col-muted transition-colors hover:bg-col-base hover:text-col-alerta"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      />
      {editable && lista.length < MAX_IMPERDIBLES && (
        <button
          type="button"
          onClick={() =>
            setContenido((k) => ({ imperdibles: [...k.imperdibles, { id: nuevoId(), titulo: "", texto: "", medio: null }] }))
          }
          className="-mt-4 flex h-12 items-center justify-center gap-2 rounded-col-sm border border-dashed border-col-slate/30 text-col-sm font-medium text-col-slate transition-colors hover:border-col-gold hover:text-col-ink"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Sumar imperdible
        </button>
      )}
    </Grupo>
  );
}
