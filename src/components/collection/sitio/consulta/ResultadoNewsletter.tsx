// Resultado de los enlaces del mail del newsletter (confirmar y baja): la marca
// sobre el azul noche, una línea y la salida al sitio.

import Link from "next/link";
import { MarcaCollection } from "@/components/collection/shell/MarcaCollection";

export function ResultadoNewsletter({ titulo, texto, ok }: { titulo: string; texto: string; ok: boolean }) {
  return (
    <div data-portada="">
      <section className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-col-noche px-6 py-32 text-center text-white">
        <MarcaCollection tono="oscuro" className="scale-[1.4]" />
        <span aria-hidden className={ok ? "mt-6 h-px w-12 bg-col-gold" : "mt-6 h-px w-12 bg-white/30"} />
        <h1 className="max-w-[18ch] font-col-display text-[40px] font-light leading-[1.1] md:text-[56px]">{titulo}</h1>
        <p className="max-w-[44ch] text-[17px] font-light leading-[1.65] text-white/75">{texto}</p>
        <Link
          href={ok ? "/experiencias" : "/"}
          className="inline-flex h-12 items-center rounded-sm border border-white/40 px-6 text-[13px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ease-col hover:border-col-gold hover:text-col-gold"
        >
          {ok ? "Ver experiencias" : "Ir al inicio"}
        </Link>
      </section>
    </div>
  );
}
