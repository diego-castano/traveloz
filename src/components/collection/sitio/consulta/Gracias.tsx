// Página de gracias (propuesta 5.8 y mockup P06): confirma el envío, dice qué
// pasa ahora y deja tres experiencias para seguir mirando. Sin estado: la usan
// la ruta real y la de desarrollo.

import Link from "next/link";
import type { ExperienciaCardVista } from "@/lib/collection/paginas/contenido";
import { TarjetaExperiencia } from "../tarjetas";

const etiqueta = "text-[12px] uppercase tracking-[0.14em]";

export function GraciasConsulta({
  numero,
  especialista,
  sugeridas,
}: {
  numero: string | null;
  especialista: string | null;
  sugeridas: ExperienciaCardVista[];
}) {
  const nombre = especialista?.split(" ")[0];
  const pasos = [
    { t: "Hoy", d: nombre ? `${nombre} lee tu consulta y empieza a imaginar el viaje.` : "Leemos tu consulta y la asignamos al especialista del destino." },
    { t: "En el día hábil", d: `${nombre ?? "Tu especialista"} te escribe por el canal que elegiste, para conocerte y afinar lo que te imaginás.` },
    { t: "En pocos días", d: "Recibís una primera propuesta, sin compromiso." },
  ];
  return (
    <>
      <section className="bg-col-noche text-white">
        <div className="cs-envolvente grid gap-14 py-20 md:py-28 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <div className="flex flex-col items-start gap-6">
            <span aria-hidden className="h-px w-12 bg-col-gold" />
            <h1 className="font-col-display text-[44px] font-light leading-[1.08] md:text-[60px]">Recibimos tu consulta</h1>
            <p className="max-w-[46ch] text-[18px] font-light leading-[1.6] text-white/80">
              {especialista
                ? `${especialista} te va a escribir en las próximas horas hábiles.`
                : "Un especialista de Collection te va a escribir en las próximas horas hábiles."}{" "}
              Te mandamos una copia por mail.
            </p>
            {numero && (
              <p className="flex items-baseline gap-3 text-[14px] text-white/60">
                Tu número de consulta
                <span className="font-col-display text-[26px] tracking-wide text-col-gold">{numero}</span>
              </p>
            )}
          </div>
          <ol className="flex flex-col">
            {pasos.map((p, i) => (
              <li key={p.t} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-t border-col-noche-linea py-6 first:border-t-0 first:pt-0">
                <span className="font-mono text-[12px] leading-6 text-col-gold">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-1.5">
                  <span className="font-col-display text-[24px] leading-tight">{p.t}</span>
                  <span className="text-[15px] font-light leading-[1.6] text-white/70">{p.d}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sugeridas.length > 0 && (
        <section className="cs-bloque">
          <div className="cs-envolvente flex flex-col gap-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="cs-h2 max-w-[22ch]">Mientras tanto, para seguir mirando</h2>
              <Link
                href="/experiencias"
                className={`${etiqueta} text-col-ink underline decoration-col-line underline-offset-8 transition-colors duration-200 ease-col hover:decoration-col-gold`}
              >
                Ver todas las experiencias
              </Link>
            </div>
            <div className="cs-tarjetas">
              {sugeridas.map((e) => (
                <TarjetaExperiencia key={e.id} e={e} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
