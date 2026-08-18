// ---------------------------------------------------------------------------
// Tarjeta del asesor. Va debajo del hero en las dos pantallas.
//
// Razón de ser: el pasajero está por mandar el documento de su familia o los
// datos de su tarjeta. Tiene que ver la cara y el nombre de la persona que los
// va a recibir, y tener un canal directo para preguntar antes de completar.
// ---------------------------------------------------------------------------

import { MessageCircle, Phone } from "lucide-react";
import type { VendedorPublicoView } from "@/actions/datos-publico.actions";

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function VendedorCard({ vendedor }: { vendedor: VendedorPublicoView }) {
  // wa.me solo acepta dígitos con código de país, sin + ni separadores.
  const whatsapp = (vendedor.whatsapp ?? "").replace(/\D/g, "");
  // tel: tolera el + inicial, así el discado internacional funciona.
  const telefono = (vendedor.telefono ?? "").replace(/[^\d+]/g, "");

  return (
    <div className="mx-auto flex max-w-xl flex-wrap items-center gap-4 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:p-5">
      {vendedor.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={vendedor.fotoUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg font-semibold text-neutral-500">
          {iniciales(vendedor.nombre)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Tu asesor
        </p>
        <p className="truncate text-[17px] font-semibold leading-tight text-neutral-900">
          {vendedor.nombre}
        </p>
      </div>

      {(whatsapp || telefono) && (
        <div className="flex w-full gap-2 sm:w-auto">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] hover:brightness-105 sm:flex-none"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {telefono && (
            <a
              href={`tel:${telefono}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition active:scale-[0.98] hover:border-neutral-500 sm:flex-none"
            >
              <Phone className="h-4 w-4" />
              Llamar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
