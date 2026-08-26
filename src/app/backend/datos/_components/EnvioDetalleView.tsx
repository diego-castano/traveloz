"use client";

// ---------------------------------------------------------------------------
// Detalle de un envío de pasajeros: TODOS los datos del grupo, los adjuntos y
// la facturación.
//
// Vive suelto (y no adentro del drawer) porque lo consumen dos pantallas: el
// drawer de la bandeja y la página /backend/datos/pasajeros/[id], que es el
// deep-link de los emails. Un solo render, dos entradas.
//
// El tipo de las props es estructural a propósito: encaja tanto con
// EnvioAdminDetalle (bandeja global) como con EnvioDetalle del vendedor.
// ---------------------------------------------------------------------------

import { FileText, Paperclip, ReceiptText, UserRound } from "lucide-react";
import type { Respuesta } from "@/lib/cotizador-form";
import { nombreCompleto } from "@/lib/datos-nombre";

export interface PasajeroVista {
  id: string;
  /** "Nombre y apellido" completo en los envíos nuevos. */
  nombres: string;
  /** "" en los nuevos; los viejos lo traen cargado. */
  apellidos: string;
  fechaNacimiento: Date | null;
  documento: string;
  pasaporte: string | null;
  email: string;
  telefono: string;
  direccion: string | null;
  pais: string | null;
  ciudad: string | null;
  documentoArchivoUrl: string | null;
  pasaporteArchivoUrl: string | null;
  respuestas: Respuesta[];
}

export interface EnvioVista {
  id: string;
  createdAt: Date;
  destino: string | null;
  referencia: string | null;
  vistoAt: Date | null;
  factura: {
    rut: string;
    razonSocial: string | null;
    email: string | null;
    direccion: string | null;
  } | null;
  pasajeros: PasajeroVista[];
}

const fechaHora = new Intl.DateTimeFormat("es-UY", {
  dateStyle: "medium",
  timeStyle: "short",
});
const soloFecha = new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" });

export function EnvioDetalleView({
  envio,
  vendedor,
}: {
  envio: EnvioVista;
  /** Quién es el dueño del link por el que entró el grupo. */
  vendedor?: { nombre: string; email: string } | null;
}) {
  return (
    <div className="space-y-4">
      {/* Cabecera del envío: contexto antes que datos personales. */}
      <div className="rounded-[12px] border border-neutral-200 bg-white p-4">
        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <Dato label="Recibido" valor={fechaHora.format(new Date(envio.createdAt))} />
          <Dato label="Destino" valor={envio.destino} />
          <Dato label="Referencia" valor={envio.referencia} />
          <Dato label="Pasajeros" valor={String(envio.pasajeros.length)} />
        </dl>
        {vendedor && (
          <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
              Vendedor
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-800">
              {vendedor.nombre}
            </span>
            <a
              href={`mailto:${vendedor.email}`}
              className="shrink-0 truncate text-[12px] text-violet-700 hover:underline"
            >
              {vendedor.email}
            </a>
          </div>
        )}
      </div>

      {envio.pasajeros.map((p, i) => (
        <div
          key={p.id}
          className="rounded-[12px] border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(26,26,46,0.04)]"
        >
          <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Pasajero {i + 1}
            </span>
            <span className="text-[15px] font-bold text-neutral-900">
              {nombreCompleto(p)}
            </span>
          </div>

          {/* `Dato` omite los vacíos: pasaporte, dirección, ciudad y país
              solo salen en los envíos VIEJOS, que son los únicos que los
              tienen cargados. El formulario dejó de pedirlos el 26/08/2026. */}
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <Dato label="Documento de viaje" valor={p.documento} />
            <Dato
              label="Nacimiento"
              valor={
                p.fechaNacimiento ? soloFecha.format(new Date(p.fechaNacimiento)) : null
              }
            />
            <Dato label="Email" valor={p.email} href={`mailto:${p.email}`} />
            <Dato label="Teléfono" valor={p.telefono} href={`tel:${p.telefono}`} />
            <Dato label="Pasaporte" valor={p.pasaporte} />
            <Dato label="Dirección" valor={p.direccion} />
            <Dato label="Ciudad" valor={p.ciudad} />
            <Dato label="País" valor={p.pais} />
            {/* Campos EXTRA del formulario, con la etiqueta que tenían al enviarse. */}
            {p.respuestas.map((r) => (
              <Dato key={r.id || r.etiqueta} label={r.etiqueta} valor={r.valor} />
            ))}
          </dl>

          {(p.documentoArchivoUrl || p.pasaporteArchivoUrl) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
                <Paperclip className="h-3 w-3" /> Archivos
              </span>
              {p.documentoArchivoUrl && (
                <Adjunto url={p.documentoArchivoUrl} label="Foto del documento" />
              )}
              {p.pasaporteArchivoUrl && (
                <Adjunto url={p.pasaporteArchivoUrl} label="Archivo adicional" />
              )}
            </div>
          )}
        </div>
      ))}

      {envio.factura && (
        <div className="rounded-[12px] border border-neutral-200 bg-white p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
            <ReceiptText className="h-3 w-3" /> Facturación con RUT
          </p>
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <Dato label="RUT" valor={envio.factura.rut} />
            <Dato label="Razón social" valor={envio.factura.razonSocial} />
            <Dato label="Email" valor={envio.factura.email} />
            <Dato label="Dirección" valor={envio.factura.direccion} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Dato({
  label,
  valor,
  href,
}: {
  label: string;
  valor: string | null | undefined;
  href?: string;
}) {
  if (!valor || !String(valor).trim()) return null;
  return (
    <div className="flex gap-2 text-[12.5px]">
      <dt className="shrink-0 text-neutral-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-neutral-800">
        {href ? (
          <a href={href} className="text-violet-700 hover:underline">
            {valor}
          </a>
        ) : (
          valor
        )}
      </dd>
    </div>
  );
}

/**
 * Los adjuntos pasan por /api/image, que exige sesión: el link no sirve fuera
 * del panel. Se abren en pestaña nueva para no perder la bandeja.
 */
function Adjunto({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-[8px] border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
    >
      <FileText className="h-3 w-3" />
      {label}
    </a>
  );
}
