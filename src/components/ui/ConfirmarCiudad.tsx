"use client";

// ---------------------------------------------------------------------------
// useConfirmarCiudad — paso de confirmación obligatorio antes de dar de alta
// una ciudad desde cualquier atajo del panel.
//
// Contexto (pedido del cliente): crear una ciudad era escribir cualquier cosa y
// apretar Enter. Sin fricción, sin lectura, sin vuelta atrás — así aparecieron
// "ciudades" como "nas" al lado de "Nassau". Ahora los tres atajos
// (árbol de Catálogos, CiudadPicker del paquete, alta de hotel) pasan por este
// mismo modal, que además avisa si en ese país ya hay una ciudad parecida.
//
// Se expone como hook y no como componente suelto porque los tres call sites
// necesitan lo mismo: `await confirmarCiudad(...)` en medio de un handler async
// y un nodo para renderizar. Uso:
//
//   const { confirmarCiudad, confirmarCiudadUI } = useConfirmarCiudad();
//   ...
//   const nombre = await confirmarCiudad({ nombre: draft, paisNombre, ciudadesDelPais });
//   if (!nombre) return;              // canceló o el nombre no pasa validación
//   await createCiudad({ paisId, nombre });
//   ...
//   return <>{...}{confirmarCiudadUI}</>;
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  ciudadKey,
  ciudadesParecidas,
  normalizeCiudadNombre,
  validarCiudadNombre,
} from "@/lib/ciudad-nombre";

export interface ConfirmarCiudadRequest {
  /** Lo tipeado por el operador, tal cual. Se normaliza acá adentro. */
  nombre: string;
  /** País donde va a quedar colgada la ciudad. */
  paisNombre: string;
  /** Ciudades que ese país ya tiene, para el aviso de parecidas. */
  ciudadesDelPais: string[];
}

interface PendingConfirm extends ConfirmarCiudadRequest {
  nombreNormalizado: string;
  parecidas: string[];
  resolve: (nombreConfirmado: string | null) => void;
}

/**
 * Ventana muerta al abrir. A este modal se llega apretando Enter, y ese mismo
 * Enter le llega después al botón que Radix acaba de enfocar adentro del
 * diálogo: el modal se abría y se cerraba solo en el mismo tecleo. Durante
 * estos milisegundos ignoramos cualquier confirmación o cierre — nadie decide
 * de verdad en menos de un cuarto de segundo, que es justamente el punto de
 * este paso.
 */
const MS_IGNORAR_AL_ABRIR = 250;

export function useConfirmarCiudad() {
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const abiertoEnRef = useRef(0);
  // Espejo de `pending` para poder resolver la promesa desde `cerrar` sin
  // meter el efecto adentro de un updater de estado (React lo invoca dos veces
  // en dev y resolvería de a dos).
  const pendingRef = useRef<PendingConfirm | null>(null);

  // El foco arranca en "Cancelar" a propósito: si cayera en el botón de
  // confirmar, un Enter por inercia crearía la ciudad igual y el paso de
  // confirmación no serviría de nada. Va después de la ventana muerta para
  // que el Enter que abrió el modal tampoco lo apriete.
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(
      () => cancelRef.current?.focus(),
      MS_IGNORAR_AL_ABRIR + 20,
    );
    return () => window.clearTimeout(id);
  }, [pending]);

  const confirmarCiudad = useCallback(
    ({ nombre, paisNombre, ciudadesDelPais }: ConfirmarCiudadRequest) => {
      const nombreNormalizado = normalizeCiudadNombre(nombre);
      const error = validarCiudadNombre(nombreNormalizado);
      if (error) {
        toast("error", "Revisá el nombre de la ciudad", error);
        return Promise.resolve(null);
      }

      // Repetida exacta: no tiene sentido preguntar "¿la creo?" si ya está. El
      // servidor la rechaza igual, pero acá el mensaje llega inmediato y dice
      // cuál es la que ya existe.
      const clave = ciudadKey(nombreNormalizado);
      const yaExiste = ciudadesDelPais.find((c) => ciudadKey(c) === clave);
      if (yaExiste) {
        toast(
          "error",
          "Esa ciudad ya existe",
          `«${yaExiste}» ya está cargada en ${paisNombre}. Elegila de la lista en vez de duplicarla.`,
        );
        return Promise.resolve(null);
      }

      return new Promise<string | null>((resolve) => {
        const solicitud: PendingConfirm = {
          nombre,
          paisNombre,
          ciudadesDelPais,
          nombreNormalizado,
          parecidas: ciudadesParecidas(nombreNormalizado, ciudadesDelPais),
          resolve,
        };
        abiertoEnRef.current = performance.now();
        pendingRef.current = solicitud;
        setPending(solicitud);
      });
    },
    [toast],
  );

  // Un único camino de salida: cerrar por Escape, por la X, por click afuera o
  // por "Cancelar" tiene que resolver la promesa igual, o el handler que está
  // esperando queda colgado para siempre.
  const cerrar = useCallback((confirmado: boolean) => {
    if (performance.now() - abiertoEnRef.current < MS_IGNORAR_AL_ABRIR) return;
    const actual = pendingRef.current;
    if (!actual) return;
    pendingRef.current = null;
    setPending(null);
    actual.resolve(confirmado ? actual.nombreNormalizado : null);
  }, []);

  const confirmarCiudadUI = (
    <Modal
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) cerrar(false);
      }}
      size="sm"
    >
      <ModalHeader
        title="¿Agregar esta ciudad al sistema?"
        description="Se crea en el catálogo global: queda disponible para todos los paquetes, hoteles y traslados."
        icon={<MapPin className="h-5 w-5" strokeWidth={2.2} />}
      />
      <ModalBody>
        <p className="text-[14px] leading-relaxed text-neutral-700">
          ¿Estás seguro de que querés agregar la ciudad{" "}
          <span className="font-semibold text-neutral-900">
            «{pending?.nombreNormalizado}»
          </span>{" "}
          en{" "}
          <span className="font-semibold text-neutral-900">
            {pending?.paisNombre}
          </span>
          ?
        </p>

        {/* Vista previa de cómo va a quedar en el árbol del catálogo: el
            operador ve el nombre exacto que se guarda antes de guardarlo. */}
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2.5"
          style={{
            background: "rgba(59,191,173,0.07)",
            border: "1px solid rgba(59,191,173,0.22)",
            borderRadius: "10px",
          }}
        >
          <MapPin
            className="h-3.5 w-3.5 shrink-0 text-brand-teal-500"
            strokeWidth={2.2}
          />
          <span className="truncate text-[13px] text-neutral-500">
            {pending?.paisNombre}
          </span>
          <span className="text-neutral-300">›</span>
          <span className="truncate text-[13px] font-semibold text-neutral-900">
            {pending?.nombreNormalizado}
          </span>
        </div>

        {pending && pending.parecidas.length > 0 && (
          <div
            className="mt-3 flex items-start gap-2.5 px-3 py-2.5"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.28)",
              borderRadius: "10px",
            }}
          >
            <AlertTriangle
              className="mt-[1px] h-4 w-4 shrink-0 text-amber-600"
              strokeWidth={2.2}
            />
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-amber-800">
                En {pending.paisNombre} ya hay{" "}
                {pending.parecidas.length === 1
                  ? "una ciudad parecida"
                  : "ciudades parecidas"}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-amber-700">
                {pending.parecidas.map((c) => `«${c}»`).join(", ")}. Si es la
                misma, cancelá y elegí la que ya existe en vez de duplicarla.
              </p>
            </div>
          </div>
        )}

        <p className="mt-3 text-[12.5px] leading-snug text-neutral-500">
          Revisá que esté escrita completa y sin abreviar. Las ciudades mal
          cargadas quedan a la vista en el buscador del sitio y hay que
          limpiarlas a mano.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button
          ref={cancelRef}
          type="button"
          variant="ghost"
          onClick={() => cerrar(false)}
        >
          Cancelar
        </Button>
        <Button type="button" variant="primary" onClick={() => cerrar(true)}>
          Sí, agregar ciudad
        </Button>
      </ModalFooter>
    </Modal>
  );

  return { confirmarCiudad, confirmarCiudadUI };
}
