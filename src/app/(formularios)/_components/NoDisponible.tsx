// ---------------------------------------------------------------------------
// Pantalla de cortesía: el slug existe, pero el link está apagado
// (User.linkActivo = false) o el formulario todavía no está publicado.
//
// A propósito NO es un 404 seco. Del otro lado hay alguien que recibió un link
// de su agencia de viajes y necesita saber que el problema no es suyo y a
// quién escribirle. El 404 queda reservado para un slug que nunca existió.
// ---------------------------------------------------------------------------

import { Clock, Mail, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/public-data";

export async function NoDisponible({
  titulo = "Este enlace no está disponible",
  detalle = "Puede que tu asesor lo haya pausado o que todavía no esté habilitado. Escribinos y lo resolvemos enseguida.",
}: {
  titulo?: string;
  detalle?: string;
}) {
  const general = await getSiteSettings("general");
  const email = general.general_email?.trim();
  const telefono = general.general_phone?.trim();
  const horarios = general.general_hours?.trim();

  return (
    <div className="px-4 pb-16 pt-10 sm:px-5 sm:pt-14">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="formularios-title text-[30px] leading-tight text-white sm:text-[38px]">
          {titulo}
        </h1>
        <p className="mx-auto mt-3.5 max-w-lg text-[16px] leading-relaxed text-white/90">
          {detalle}
        </p>
      </div>

      <div className="mx-auto mt-7 max-w-xl rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.06)] sm:p-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Contacto TravelOz
        </p>
        <div className="mt-4 space-y-3 text-[15px] text-neutral-700">
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-3 hover:text-neutral-900">
              <Mail className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="break-all">{email}</span>
            </a>
          )}
          {telefono && (
            <a
              href={`tel:${telefono.replace(/\s/g, "")}`}
              className="flex items-center gap-3 hover:text-neutral-900"
            >
              <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>{telefono}</span>
            </a>
          )}
          {horarios && (
            <p className="flex items-center gap-3 text-neutral-500">
              <Clock className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>{horarios}</span>
            </p>
          )}
          {!email && !telefono && (
            <p className="text-neutral-500">
              Escribile directamente a tu asesor por WhatsApp y te pasa un link nuevo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
