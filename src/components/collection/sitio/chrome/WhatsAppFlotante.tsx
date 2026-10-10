"use client";

// Botón flotante de WhatsApp (mockup P08). Va en todo el sitio cuando el
// ajuste tiene número. La página de una experiencia le cuenta de qué trata con
// useAsuntoWhatsApp, así el mensaje sale armado y el botón sube por encima de
// la barra de consulta del celular.

import { createContext, useContext, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/components/lib/cn";

const AsuntoCtx = createContext<(asunto: string | null) => void>(() => {});

export function useAsuntoWhatsApp(asunto: string) {
  const fijar = useContext(AsuntoCtx);
  useEffect(() => {
    fijar(asunto);
    return () => fijar(null);
  }, [asunto, fijar]);
}

export function ProveedorWhatsApp({ numero, children }: { numero: string; children: React.ReactNode }) {
  const [asunto, setAsunto] = useState<string | null>(null);
  const digitos = numero.replace(/\D/g, "");
  const texto = asunto ? `Hola, quiero consultar por ${asunto}.` : "Hola, quiero consultar por un viaje de Traveloz Collection.";
  return (
    <AsuntoCtx.Provider value={setAsunto}>
      {children}
      {digitos.length >= 8 && (
        <a
          href={`https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className={cn(
            "group fixed right-4 z-40 flex h-14 max-w-14 items-center gap-3 overflow-hidden whitespace-nowrap rounded-full bg-col-noche pl-[17px] pr-5 text-[12px] uppercase tracking-[0.14em] text-white shadow-[0_14px_36px_-12px_rgba(4,7,31,0.6)] ring-1 ring-col-gold/50 transition-[max-width,box-shadow] duration-[400ms] ease-col hover:max-w-[260px] hover:ring-col-gold focus-visible:max-w-[260px] sm:right-6",
            // Sobre la barra de consulta, el aviso de cookies y la zona segura del iPhone.
            asunto
              ? "bottom-[calc(92px+var(--sitio-aviso,0px)+env(safe-area-inset-bottom))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(1rem+var(--sitio-aviso,0px)+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <span className="relative shrink-0">
            <MessageCircle aria-hidden className="h-[22px] w-[22px]" strokeWidth={1.25} />
            <span aria-hidden className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-col-gold" />
          </span>
          <span aria-hidden className="opacity-0 transition-opacity duration-300 ease-col group-hover:opacity-100 group-focus-visible:opacity-100">
            Escribinos por WhatsApp
          </span>
        </a>
      )}
    </AsuntoCtx.Provider>
  );
}
