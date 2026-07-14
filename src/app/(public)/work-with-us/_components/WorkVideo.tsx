// ---------------------------------------------------------------------------
// Client island para el video de /work-with-us. Reproduce el video sin poster
// (el poster estático mostraba una foto con "delay" mientras el video buffea)
// y en su lugar muestra un spinner hasta que el video puede reproducirse.
// ---------------------------------------------------------------------------

"use client";

import { useEffect, useRef, useState } from "react";

export function WorkVideo({ videoUrl, imagen }: { videoUrl: string; imagen: string }) {
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Si el video ya está bufferizado (p. ej. en caché) el evento canPlay pudo
  // dispararse antes de montar el listener; lo chequeamos al montar.
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 3) setReady(true);
  }, []);

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
      {!ready && (
        <div className="work-with-video__loading" aria-hidden="true">
          <span className="work-with-video__spinner" />
        </div>
      )}
      <video
        key={videoUrl}
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Equipo TravelOz"
        onCanPlay={() => setReady(true)}
        onPlaying={() => setReady(true)}
        style={{ width: "100%", borderRadius: 12 }}
      />
    </div>
  );
}
