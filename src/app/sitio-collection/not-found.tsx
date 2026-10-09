import Link from "next/link";
import { RaizSitio } from "@/components/collection/sitio/chrome/piezas";

export default function NoEncontrada() {
  return (
    <RaizSitio>
      <section className="cs-envolvente flex min-h-[70dvh] flex-col items-start justify-center gap-7 py-24">
        <span className="font-col-display text-[96px] font-light leading-none text-col-line">404</span>
        <h1 className="cs-h1 max-w-[18ch]">Este camino no lleva a ningún lado.</h1>
        <p className="max-w-[48ch] text-[17px] font-light leading-[1.65] text-col-slate">
          La página que buscás no existe o ya no está publicada. Te proponemos seguir por acá.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/experiencias"
            className="inline-flex h-12 items-center rounded-sm bg-col-ink px-6 text-[12px] uppercase tracking-[0.14em] text-col-base transition-colors duration-200 ease-col hover:bg-col-slate"
          >
            Ver experiencias
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-sm border border-col-ink/25 px-6 text-[12px] uppercase tracking-[0.14em] text-col-ink transition-colors duration-200 ease-col hover:border-col-ink"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    </RaizSitio>
  );
}
