// ---------------------------------------------------------------------------
// Client island para el video de /work-with-us. Con poster configurado, el
// primer frame aparece al instante y el video arranca encima cuando buffea.
// Sin poster, cae al spinner hasta que el video puede reproducirse.
// ---------------------------------------------------------------------------

"use client";

import { useEffect, useRef, useState } from "react";
import { useVideoAutoplay } from "@/components/public/HeroVideo";

export function WorkVideo({
  videoUrl,
  imagen,
  poster,
}: {
  videoUrl: string;
  imagen: string;
  poster?: string;
}) {
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Si el video ya está bufferizado (p. ej. en caché) los eventos loadedData /
  // canPlay pudieron dispararse antes de montar el listener; chequeo al montar.
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) setReady(true);
  }, []);

  // Fallback para Modo de bajo consumo de iOS: si el autoplay queda
  // bloqueado, arranca en el primer scroll/toque de la página.
  useVideoAutoplay(videoRef, videoUrl);

  if (!videoUrl) {
    // Sin video configurado: se mantiene la imagen de fallback.
    return (
      <div className="content-img work-with-img video-placeholder">
        <img src={imagen} alt="Equipo TravelOz" decoding="async" />
      </div>
    );
  }

  return (
    <div className={`content-img work-with-img work-with-video${ready ? " is-ready" : ""}`}>
      {!ready && !poster && (
        <div className="work-with-video__loading" aria-hidden="true">
          <span className="work-with-video__spinner" />
        </div>
      )}
      <video
        key={videoUrl}
        ref={videoRef}
        src={videoUrl}
        poster={poster || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Equipo TravelOz"
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        onPlaying={() => setReady(true)}
        style={{ width: "100%", borderRadius: 12 }}
      />
    </div>
  );
}
