// Pie del sitio: banda azul noche con la marca, el menú, el contacto (de los
// ajustes: WhatsApp, horario y redes), los legales y el endoso de Traveloz.

import Link from "next/link";
import { MarcaCollection } from "@/components/collection/shell/MarcaCollection";
import type { AjustesCollection } from "@/lib/collection/ajustes";
import { CONTACTO_SITIO, LEGALES_SITIO, MENU_SITIO } from "./menu";

const titulo = "text-[12px] uppercase tracking-[0.14em] text-white/50";
const enlace = "text-[15px] font-light text-white/85 transition-colors duration-200 ease-col hover:text-col-gold";

const FRASE = "Viajes de autor, diseñados a tu medida por un especialista.";

/** "+59899123456" → "+598 99 123 456" (solo para leer; el link usa los dígitos). */
const telLegible = (t: string) => t.replace(/^\+(598)(\d{2})(\d{3})(\d{3})$/, "+$1 $2 $3 $4");

export function PieSitio({ ajustes }: { ajustes: AjustesCollection }) {
  const redes = [
    { nombre: "Instagram", href: ajustes.instagram },
    { nombre: "Facebook", href: ajustes.facebook },
    { nombre: "LinkedIn", href: ajustes.linkedin },
  ].filter((r) => /^https?:\/\//.test(r.href));
  const wa = ajustes.whatsapp.replace(/\D/g, "");
  const hayContacto = wa.length >= 8 || !!ajustes.horario || redes.length > 0;
  return (
    <footer className="border-t border-col-noche-linea bg-col-noche text-white">
      <div
        className={
          hayContacto
            ? "sitio-ancho grid gap-14 py-16 sm:grid-cols-2 md:py-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
            : "sitio-ancho grid gap-14 py-16 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:py-20"
        }
      >
        <div className="flex flex-col items-start gap-7">
          <Link href="/" aria-label="Traveloz Collection, inicio">
            <MarcaCollection tono="oscuro" />
          </Link>
          <p className="max-w-[34ch] font-col-display text-[24px] font-light leading-[1.3] text-white/85">
            {ajustes.textoFooter.trim() || FRASE}
          </p>
          <Link
            href={CONTACTO_SITIO.href}
            className="inline-flex h-12 items-center rounded-sm border border-white/30 px-6 text-[12px] uppercase tracking-[0.14em] transition-colors duration-200 ease-col hover:border-col-gold hover:text-col-gold"
          >
            {CONTACTO_SITIO.nombre}
          </Link>
        </div>

        <nav aria-label="Sitio" className="flex flex-col gap-4">
          <span className={titulo}>Explorar</span>
          {MENU_SITIO.map((i) => (
            <Link key={i.href} href={i.href} className={enlace}>
              {i.nombre}
            </Link>
          ))}
          <Link href="/journal" className={enlace}>
            Journal
          </Link>
        </nav>

        {hayContacto && (
          <div className="flex flex-col gap-4">
            <span className={titulo}>Contacto</span>
            {wa.length >= 8 && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={enlace}>
                WhatsApp {telLegible(ajustes.whatsapp)}
              </a>
            )}
            {ajustes.horario && <span className="text-[14px] font-light leading-relaxed text-white/60">{ajustes.horario}</span>}
            {redes.map((r) => (
              <a key={r.nombre} href={r.href} target="_blank" rel="noopener noreferrer" className={enlace}>
                {r.nombre}
              </a>
            ))}
          </div>
        )}

        <nav aria-label="Legales" className="flex flex-col gap-4">
          <span className={titulo}>Legales</span>
          {LEGALES_SITIO.map((i) => (
            <Link key={i.href} href={i.href} className={enlace}>
              {i.nombre}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-col-noche-linea">
        <div className="sitio-ancho flex flex-col gap-3 py-6 text-[13px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Una propuesta de{" "}
            <a
              href="https://www.traveloz.com.uy"
              className="text-white/85 underline decoration-white/30 underline-offset-4 transition-colors duration-200 ease-col hover:text-col-gold"
            >
              Traveloz
            </a>
          </p>
          <p>© {new Date().getFullYear()} Traveloz. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
