"use client";

// Editor de encuadres de una foto: un recorte de aspecto fijo (16:9, 4:5...)
// con react-easy-crop. Se guarda en la foto y vale en cada lugar que use ese
// aspecto. Desde un lugar crítico se abre recién elegida la foto; "Usar
// automático" lo saltea y queda el recorte por punto de foco. Solo fotos: los
// videos siguen con el foco.

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import { AlertCircle, Crop, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import {
  USO_ASPECTO,
  VALOR_ASPECTO,
  recortePorFoco,
  type Aspecto,
  type CambioRecortes,
  type Recorte,
} from "@/lib/collection/recortes";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useApi } from "../constructor/api";
import { Boton, BotonIcono, Segmentado } from "../ui";
import { transiciones } from "../movimiento";
import { MedioImagen, aspectoMedio, srcDe } from "../sitio/medios";

/** Devuelve el error para mostrar, o null si guardó. */
type Guardar = (cambio: CambioRecortes) => Promise<string | null>;

export function EditorEncuadre({
  medio,
  aspectos,
  inicial,
  saltable,
  onGuardar,
  onCerrar,
}: {
  /** null = cerrado. */
  medio: MedioVista | null;
  aspectos: readonly Aspecto[];
  inicial?: Aspecto;
  /** Recién elegida para un lugar: "Usar automático" sigue sin guardar. */
  saltable?: boolean;
  onGuardar: Guardar;
  onCerrar: () => void;
}) {
  const { raiz } = useCollection();
  const abierto = !!medio && medio.tipo === "FOTO" && aspectos.length > 0;
  return (
    <Dialog.Root open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount container={raiz}>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[70] bg-col-noche/55 backdrop-blur-[3px]" {...transiciones.velo} />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // El foco va al panel y no al botón de cerrar, así no se abre su globo.
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.target as HTMLElement | null)?.focus();
              }}
            >
              <motion.div
                // data-foco: las flechas mueven el encuadre y no pasan de medio en la biblioteca.
                data-foco
                className="col-anillo fixed inset-0 z-[70] m-auto flex h-[min(760px,calc(100dvh-24px))] w-[min(1040px,calc(100vw-24px))] flex-col overflow-hidden rounded-md bg-col-surface shadow-col-3 focus:outline-none"
                {...transiciones.dialogo}
              >
                <Cuerpo medio={medio} aspectos={aspectos} inicial={inicial} saltable={saltable} onGuardar={onGuardar} onCerrar={onCerrar} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Cuerpo({
  medio,
  aspectos,
  inicial,
  saltable,
  onGuardar,
  onCerrar,
}: {
  medio: MedioVista;
  aspectos: readonly Aspecto[];
  inicial?: Aspecto;
  saltable?: boolean;
  onGuardar: Guardar;
  onCerrar: () => void;
}) {
  const [actual, setActual] = useState<Aspecto>(inicial && aspectos.includes(inicial) ? inicial : aspectos[0]);
  const i = aspectos.indexOf(actual);
  const ultimo = i === aspectos.length - 1;
  const avanzar = () => (ultimo ? onCerrar() : setActual(aspectos[i + 1]));
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-col-line px-5 py-3.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-col-display text-col-2xl font-normal leading-tight text-col-ink">Encuadre {actual}</Dialog.Title>
          <p className="text-col-sm text-col-slate">
            {USO_ASPECTO[actual]}
            {aspectos.length > 1 && ` · ${i + 1} de ${aspectos.length}`}
          </p>
        </div>
        {aspectos.length > 1 && (
          <Segmentado
            etiqueta="Aspecto"
            valor={actual}
            onCambio={setActual}
            opciones={aspectos.map((a) => ({ id: a, label: a }))}
            className="order-last w-full sm:order-none sm:w-auto"
          />
        )}
        <Dialog.Close asChild>
          <BotonIcono etiqueta="Cerrar" lado="left" className="-mr-1">
            <X strokeWidth={1.5} />
          </BotonIcono>
        </Dialog.Close>
      </header>
      <Paso
        key={`${medio.id}-${actual}`}
        medio={medio}
        aspecto={actual}
        saltable={saltable}
        ultimo={ultimo}
        onGuardar={onGuardar}
        onListo={avanzar}
        onCerrar={onCerrar}
      />
    </>
  );
}

const redondear = (n: number) => Math.round(n * 10000) / 10000;

/** Área de react-easy-crop (porcentajes) a un recorte 0..1 que no se sale de la foto. */
function aRecorte(p: Area): Recorte {
  const x = redondear(Math.min(1, Math.max(0, p.x / 100)));
  const y = redondear(Math.min(1, Math.max(0, p.y / 100)));
  return {
    x,
    y,
    w: Math.floor(Math.min(1 - x, p.width / 100) * 10000) / 10000,
    h: Math.floor(Math.min(1 - y, p.height / 100) * 10000) / 10000,
  };
}

function Paso({
  medio,
  aspecto,
  saltable,
  ultimo,
  onGuardar,
  onListo,
  onCerrar,
}: {
  medio: MedioVista;
  aspecto: Aspecto;
  saltable?: boolean;
  ultimo: boolean;
  onGuardar: Guardar;
  onListo: () => void;
  onCerrar: () => void;
}) {
  const imgAspect = aspectoMedio(medio);
  const guardado = medio.recortes?.[aspecto];
  const porFoco = () => recortePorFoco(aspecto, imgAspect, medio.focoX, medio.focoY);
  const [inicio, setInicio] = useState<Recorte>(() => guardado ?? porFoco());
  const [vuelta, setVuelta] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Recorte>(inicio);
  const [guardando, setGuardando] = useState<null | "guardar" | "auto">(null);
  const [error, setError] = useState<string | null>(null);
  const valor = VALOR_ASPECTO[aspecto];

  const alMover = useCallback((p: Area) => setArea(aRecorte(p)), []);

  const restablecer = () => {
    const r = porFoco();
    setInicio(r);
    setArea(r);
    setVuelta((v) => v + 1);
  };

  const enviar = async (cual: "guardar" | "auto") => {
    // Automático sin nada guardado: no hay qué borrar.
    if (cual === "auto" && !guardado) return onListo();
    setGuardando(cual);
    setError(null);
    const e = await onGuardar({ [aspecto]: cual === "auto" ? null : area });
    setGuardando(null);
    if (e) setError(e);
    else onListo();
  };

  const vista: MedioVista = { ...medio, recortes: { ...medio.recortes, [aspecto]: area } };
  // La vista previa entra en 240 × 200 como mucho.
  const anchoVista = Math.round(Math.min(240, 200 * valor));

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="relative h-[46dvh] min-h-[240px] shrink-0 bg-col-noche lg:h-auto lg:flex-1">
          <Cropper
            key={vuelta}
            image={srcDe(medio, 1600)}
            aspect={valor}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={5}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropAreaChange={alMover}
            onCropComplete={alMover}
            initialCroppedAreaPercentages={{ x: inicio.x * 100, y: inicio.y * 100, width: inicio.w * 100, height: inicio.h * 100 }}
            cropperProps={{ "aria-label": `Encuadre ${aspecto}. Arrastrá la foto o usá las flechas para moverla.` }}
            style={{ cropAreaStyle: { border: "1.5px solid #F4B860", color: "rgba(4, 7, 31, 0.6)" } }}
          />
        </div>
        <aside className="flex shrink-0 flex-col gap-6 border-t border-col-line p-5 lg:w-[300px] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div>
            <p className="mb-2 text-col-sm font-medium text-col-ink">Así se ve</p>
            <div style={{ width: `min(100%, ${anchoVista}px)` }}>
              <MedioImagen medio={vista} encuadre={aspecto} aspecto={valor} sizes={`${anchoVista}px`} className="rounded-col-sm" />
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-col-sm font-medium text-col-ink">Zoom</span>
            <input
              type="range"
              min={1}
              max={5}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-col-gold"
            />
          </label>
          <p className="text-col-sm leading-relaxed text-col-slate">
            Arrastrá la foto para elegir qué queda adentro. Con el teclado, las flechas la mueven. Vale para cada lugar que use{" "}
            {aspecto}.
          </p>
          {error && (
            <p role="alert" className="flex items-start gap-2 text-col-sm text-col-alerta">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              {error}
            </p>
          )}
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-col-line px-5 py-3 sm:px-6">
        <Boton variante="fantasma" tam="sm" onClick={restablecer} disabled={!!guardando}>
          Restablecer
        </Boton>
        {(saltable || guardado) && (
          <Boton variante="fantasma" tam="sm" onClick={() => void enviar("auto")} cargando={guardando === "auto"} disabled={!!guardando}>
            Usar automático
          </Boton>
        )}
        <span className="ml-auto flex gap-2">
          <Boton variante="secundario" tam="sm" onClick={onCerrar} disabled={!!guardando}>
            Cancelar
          </Boton>
          <Boton tam="sm" onClick={() => void enviar("guardar")} cargando={guardando === "guardar"} disabled={!!guardando}>
            {ultimo ? "Guardar" : "Guardar y seguir"}
          </Boton>
        </span>
      </footer>
    </>
  );
}

/** Enlace "Ajustar encuadre" de un lugar con foto. */
export function BotonEncuadre({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-col-sm font-medium text-col-ink underline decoration-col-gold underline-offset-4 hover:decoration-2",
        className,
      )}
    >
      <Crop className="h-3.5 w-3.5 text-col-gold" strokeWidth={1.5} aria-hidden /> Ajustar encuadre
    </button>
  );
}

/**
 * Para los lugares críticos: `abrir(m, true)` justo después de elegir o
 * soltar una foto (se puede saltear) y `abrir(m)` desde "Ajustar encuadre".
 * Al guardar avisa con el medio actualizado para refrescar la vista.
 */
export function useEditorEncuadre(aspectos: readonly Aspecto[] | undefined, onActualizado: (m: MedioVista) => void) {
  const api = useApi();
  const [estado, setEstado] = useState<{ medio: MedioVista; saltable: boolean } | null>(null);

  const abrir = useCallback(
    (m: MedioVista | null | undefined, saltable = false) => {
      if (m && m.tipo === "FOTO" && aspectos?.length) setEstado({ medio: m, saltable });
    },
    [aspectos],
  );

  const guardar: Guardar = async (cambio) => {
    if (!estado) return null;
    const r = await api
      .actualizarMedio(estado.medio.id, { recortes: cambio })
      .catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    if (!r.ok) return r.error;
    const m = { ...estado.medio, recortes: r.data.recortes };
    setEstado((e) => e && { ...e, medio: m });
    onActualizado(m);
    return null;
  };

  const editor = aspectos?.length ? (
    <EditorEncuadre
      medio={estado?.medio ?? null}
      aspectos={aspectos}
      saltable={estado?.saltable}
      onGuardar={guardar}
      onCerrar={() => setEstado(null)}
    />
  ) : null;

  return { abrir, editor };
}
