// ---------------------------------------------------------------------------
// La pantalla que ve el pasajero cuando el link ya no abre.
//
// No es un error: es una conversación que sigue. Un link vencido significa que
// la cotización tiene precios de hace días, y lo que corresponde no es
// mostrarlos igual sino ponerlo en contacto con su asesor en un toque.
//
// Vive aparte de `NoDisponible` de los formularios porque el remate es otro: acá
// el CTA es el WhatsApp del vendedor concreto, no un texto genérico.
// ---------------------------------------------------------------------------

import { Clock3 } from "lucide-react";
import { telefonoWa } from "@/lib/telefono";

export interface VendedorDelLink {
  nombre: string;
  tel: string;
  email: string;
  foto: string | null;
  inicial: string;
  cargo: string;
}

export function CotizacionNoDisponible({
  vendedor,
  vencida = false,
}: {
  vendedor: VendedorDelLink;
  vencida?: boolean;
}) {
  const primerNombre = vendedor.nombre.split(" ")[0] || "tu asesor";
  // wa.me sin código de país no abre ningún chat: lo agrega el helper.
  const wa = telefonoWa(vendedor.tel);
  const texto = encodeURIComponent(
    `Hola ${primerNombre}, se me venció el link de la cotización. ¿Me la podés volver a mandar?`,
  );

  return (
    <div className="px-4 pb-16 pt-10 sm:px-5 sm:pt-16">
      <section className="mx-auto max-w-xl text-center">
        <h1 className="formularios-title text-[28px] leading-tight text-white sm:text-[34px]">
          {vencida ? "Esta cotización venció" : "Esta cotización no está disponible"}
        </h1>
        <p className="mx-auto mt-3.5 max-w-md text-[15px] leading-relaxed text-white/90">
          {vencida
            ? "Los precios de aéreos y hoteles cambian todos los días, así que los links tienen fecha de vencimiento. La vigencia se cuenta en horas hábiles: no corren sábados ni domingos. Pedile a tu asesor uno nuevo y lo tenés en minutos."
            : "No pudimos abrirla. Escribile a tu asesor y te la manda de nuevo."}
        </p>
      </section>

      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-lg shadow-neutral-900/5">
        <div className="flex items-center justify-center gap-3">
          {vendedor.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendedor.foto}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#A05ED3] to-[#785AE5] text-lg font-bold text-white">
              {vendedor.inicial}
            </span>
          )}
          <div className="text-left">
            <div className="text-[16px] font-bold text-neutral-900">{vendedor.nombre}</div>
            <div className="text-[13px] text-neutral-500">{vendedor.cargo} · TravelOz</div>
          </div>
        </div>

        {wa ? (
          <a
            href={`https://wa.me/${wa}?text=${texto}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#F43E55] to-[#785AE5] text-[15px] font-bold text-white"
          >
            Pedirle una cotización nueva
          </a>
        ) : (
          <a
            href={`mailto:${vendedor.email}`}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#F43E55] to-[#785AE5] text-[15px] font-bold text-white"
          >
            Escribirle por email
          </a>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-neutral-400">
          <Clock3 size={13} /> Los links valen unas horas hábiles: el fin de semana no cuenta.
        </p>
      </div>
    </div>
  );
}
