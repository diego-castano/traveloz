"use client";

// ---------------------------------------------------------------------------
// HeroVideo — autoplay de video con fallback a gesto del usuario.
//
// En iOS Safari con "Modo de bajo consumo" el sistema operativo bloquea el
// autoplay aunque el video tenga autoPlay+muted+playsInline (no hay forma de
// forzarlo vía JS). El patrón oficial de WebKit es: intentar video.play(), y
// si la promesa rechaza, arrancar la reproducción recién en el próximo gesto
// del usuario. Acá lo generalizamos para no exigir que el usuario encuentre
// un botón de play: cualquier scroll, touch, click o tecla arranca el video.
// ---------------------------------------------------------------------------

import { useEffect, useRef, type RefObject } from "react";

const RESUME_EVENTS = [
  "touchstart",
  "pointerdown",
  "click",
  "keydown",
  "scroll",
] as const;

export function useVideoAutoplay(
  ref: RefObject<HTMLVideoElement>,
  dep?: unknown,
): void {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let removed = false;
    const removeListeners = () => {
      if (removed) return;
      removed = true;
      RESUME_EVENTS.forEach((event) => {
        window.removeEventListener(event, resume);
      });
    };

    const resume = () => {
      video.play().catch(() => {
        // Si vuelve a fallar (p. ej. el gesto no cuenta para el browser),
        // los listeners ya se sacaron: no insistimos para no ensuciar los
        // eventos de la página con reintentos infinitos.
      });
      removeListeners();
    };

    let playPromise: Promise<void> | undefined;
    try {
      playPromise = video.play();
    } catch {
      // Algunos browsers viejos tiran de forma síncrona en vez de rechazar
      // la promesa; lo tratamos igual que un autoplay bloqueado.
      RESUME_EVENTS.forEach((event) => {
        window.addEventListener(event, resume, { passive: true });
      });
      return removeListeners;
    }

    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          // Autoplay OK, nada más que hacer.
        })
        .catch(() => {
          // Autoplay bloqueado (típico de Modo de bajo consumo en iOS):
          // arrancamos en el primer gesto del usuario, sea cual sea.
          RESUME_EVENTS.forEach((event) => {
            window.addEventListener(event, resume, { passive: true });
          });
        });
    }

    return removeListeners;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}

type HeroVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  preload?: "auto" | "metadata" | "none";
};

export function HeroVideo({
  src,
  poster,
  className = "hero-video",
  preload = "auto",
}: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useVideoAutoplay(ref, src);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      poster={poster}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
