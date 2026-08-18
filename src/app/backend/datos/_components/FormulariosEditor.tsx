"use client";

// ---------------------------------------------------------------------------
// Editor de los DOS formularios públicos de datos.
//
// Lo que se edita acá:
//   • el título y el texto que ve el pasajero,
//   • los campos EXTRA (los duros son columnas tipadas y no se tocan),
//   • el toggle `publicado`, que es la llave del go-live: con él apagado, los
//     links de TODOS los vendedores devuelven "todavía no está disponible".
//
// Por eso el toggle no se guarda con el resto: confirma aparte, en un modal
// que dice exactamente qué pasa al encenderlo y al apagarlo.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Info, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { FormBuilder } from "@/app/backend/cotizadores/_components/FormBuilder";
import type { FormField } from "@/lib/cotizador-form";
import type { FormularioDatoView } from "@/lib/datos-form";
import {
  updateFormularioDato,
  type FormulariosAdmin,
} from "@/actions/datos-admin.actions";
import type { TipoFormularioDato } from "@prisma/client";

/**
 * Los campos duros de cada formulario. No son editables (son columnas tipadas
 * en la base), pero el admin necesita verlos para no duplicarlos con un campo
 * extra.
 */
const CAMPOS_BASE: Record<TipoFormularioDato, string[]> = {
  PASAJEROS: [
    "Nombres y apellidos",
    "Fecha de nacimiento",
    "Documento + foto del documento",
    "Pasaporte + foto (opcional)",
    "Email y teléfono",
    "Dirección, ciudad y país",
    "Destino y referencia del viaje",
    "Facturación con RUT (opcional)",
  ],
  PAGO: [
    "Titular y su documento",
    "Número de tarjeta",
    "Vencimiento y código de seguridad",
    "Cuotas",
    "Autorización de uso",
  ],
};

const RUTA_PUBLICA: Record<TipoFormularioDato, string> = {
  PASAJEROS: "/datos-de-pasajeros/<vendedor>",
  PAGO: "/datos-de-pago/<vendedor>",
};

export function FormulariosEditor({ inicial }: { inicial: FormulariosAdmin }) {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Formularios</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Estas son las dos páginas que completan los pasajeros. Hay una sola de cada una
          para toda la agencia: lo que cambies acá lo ven todos los links de todos los
          vendedores.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FormularioCard inicial={inicial.pasajeros} />
        <FormularioCard inicial={inicial.pago} />
      </div>
    </div>
  );
}

function FormularioCard({ inicial }: { inicial: FormularioDatoView }) {
  const { toast } = useToast();
  const tipo = inicial.tipo;

  const [titulo, setTitulo] = useState(inicial.titulo);
  const [texto, setTexto] = useState(inicial.texto ?? "");
  const [campos, setCampos] = useState<FormField[]>(inicial.campos);
  const [publicado, setPublicado] = useState(inicial.publicado);

  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await updateFormularioDato(tipo, {
        titulo,
        texto: texto.trim() === "" ? null : texto,
        campos,
      });
      if (r.ok) {
        toast("success", "Formulario guardado", r.formulario.titulo);
      } else {
        setError(r.message);
        toast("error", "No se pudo guardar", r.message);
      }
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast("error", "No se pudo guardar", msg);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarPublicado() {
    if (cambiandoEstado) return;
    const siguiente = !publicado;
    setCambiandoEstado(true);
    try {
      const r = await updateFormularioDato(tipo, { publicado: siguiente });
      if (r.ok) {
        setPublicado(siguiente);
        setConfirmando(false);
        toast(
          "success",
          siguiente ? "Formulario publicado" : "Formulario despublicado",
          siguiente
            ? "Los links de los vendedores ya responden."
            : "Los links dejaron de responder para todos.",
        );
      } else {
        toast("error", "No se pudo cambiar el estado", r.message);
      }
    } catch (e) {
      toast("error", "No se pudo cambiar el estado", (e as Error).message);
    } finally {
      setCambiandoEstado(false);
    }
  }

  return (
    <section className="flex flex-col rounded-[14px] border border-neutral-200 bg-white">
      <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-neutral-900">
            {tipo === "PASAJEROS" ? "Datos de pasajeros" : "Datos de pago"}
          </h3>
          <p className="mt-0.5 font-mono text-[11.5px] text-neutral-400">
            {RUTA_PUBLICA[tipo]}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Toggle
            checked={publicado}
            // El toggle no escribe directo: abre la confirmación y la escritura
            // pasa por ahí. Encender esto es el go-live del formulario.
            onCheckedChange={() => setConfirmando(true)}
            disabled={cambiandoEstado}
          />
          <span
            className={`text-[11px] font-semibold ${publicado ? "text-emerald-600" : "text-neutral-400"}`}
          >
            {publicado ? "Publicado" : "Apagado"}
          </span>
        </div>
      </header>

      <div className="space-y-4 px-5 py-4">
        <Campo label="Título" ayuda="El encabezado grande que ve el pasajero.">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={160}
            className={inputClass}
          />
        </Campo>

        <Campo
          label="Texto de bienvenida"
          ayuda="El párrafo bajo el título. Dejalo vacío si no querés ninguno."
        >
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            maxLength={2000}
            className={inputClass}
          />
        </Campo>

        {/* Campos duros: informativos, para que nadie los repita como extra. */}
        <div className="rounded-[12px] border border-neutral-200 bg-neutral-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
            <Lock className="h-3 w-3" /> Campos fijos del formulario
          </p>
          <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {CAMPOS_BASE[tipo].map((c) => (
              <li key={c} className="text-[12px] text-neutral-600">
                · {c}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] leading-relaxed text-neutral-500">
            Se piden siempre y no se pueden sacar ni renombrar: van a columnas propias en la
            base para poder buscarlos y exportarlos.
          </p>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
            <Info className="h-3 w-3" /> Campos adicionales
          </p>
          <p className="mb-3 mt-1 text-[11.5px] leading-relaxed text-neutral-500">
            Todo lo que agregues acá se suma <strong>además</strong> de los fijos de arriba.
            Se guarda con la etiqueta que tenga en el momento del envío, así que renombrar un
            campo no cambia lo que ya llegó.
          </p>
          <FormBuilder campos={campos} onChange={setCampos} />
        </div>

        {error && (
          <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
            {error}
          </p>
        )}
      </div>

      <footer className="mt-auto flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
        <Button
          type="button"
          size="sm"
          loading={guardando}
          onClick={() => void guardar()}
          leftIcon={<Save size={14} />}
        >
          Guardar cambios
        </Button>
      </footer>

      <Modal open={confirmando} onOpenChange={setConfirmando} size="sm">
        <ModalHeader
          title={publicado ? "Apagar el formulario" : "Publicar el formulario"}
          variant={publicado ? "destructive" : "default"}
          onClose={() => setConfirmando(false)}
        />
        <ModalBody>
          {publicado ? (
            <div className="space-y-2.5 text-[13px] leading-relaxed text-neutral-700">
              <p>
                Al apagarlo, <strong>los links de todos los vendedores dejan de responder</strong>{" "}
                al instante. Quien entre va a ver un aviso de que el formulario no está
                disponible.
              </p>
              <p className="text-neutral-500">
                Lo que ya se envió no se pierde: sigue en la bandeja.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 text-[13px] leading-relaxed text-neutral-700">
              <p>
                Publicar hace que <strong>los links de todos los vendedores respondan</strong>.
                Cualquier persona con el link (o con el QR) va a poder cargar sus datos y el
                envío le va a llegar al vendedor dueño de ese link.
              </p>
              <p className="text-neutral-500">
                Guardá primero los cambios del título, el texto y los campos: se publica lo
                que ya está guardado.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={publicado ? "danger" : "primary"}
            loading={cambiandoEstado}
            onClick={() => void confirmarPublicado()}
          >
            {publicado ? "Sí, apagarlo" : "Sí, publicar"}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

function Campo({
  label,
  ayuda,
  children,
}: {
  label: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-neutral-700">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[11.5px] text-neutral-500">{ayuda}</span>}
    </label>
  );
}
