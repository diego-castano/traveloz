"use client";

import { AnimatePresence } from "motion/react";
import { ColaSubidas } from "@/components/collection/biblioteca/ColaSubidas";
import { TarjetaSubida, ZonaSubida } from "@/components/collection/biblioteca/ZonaSubida";
import type { Subida } from "@/components/collection/biblioteca/useSubidas";
import { EncabezadoPagina } from "@/components/collection/ui";
import { DevShell } from "../DevShell";

const color = (c: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="${c}"/></svg>`)}`;

const archivo = (nombre: string, tipo: string) => new File([""], nombre, { type: tipo });

const SUBIDAS: Subida[] = [
  { id: "1", file: archivo("bacuit-lagunas.jpg", "image/jpeg"), preview: color("#3E7C86"), estado: "subiendo", progreso: 62 },
  { id: "2", file: archivo("kyoto-templo.webp", "image/webp"), preview: color("#8A6B52"), estado: "procesando", progreso: 100 },
  { id: "3", file: archivo("safari-amanecer.jpg", "image/jpeg"), preview: color("#C9A57A"), estado: "listo", progreso: 100 },
  { id: "4", file: archivo("drone-islas.mov", "video/quicktime"), preview: null, estado: "espera", progreso: 0 },
  {
    id: "5",
    file: archivo("hotel-terraza.png", "image/png"),
    preview: color("#5D7F8C"),
    estado: "error",
    progreso: 0,
    error: "Se cortó la conexión durante la subida.",
  },
];

export function SubidasDemo() {
  return (
    <DevShell lectura={false} ruta="/backend/collection/biblioteca">
      <div className="mx-auto max-w-[1100px]">
        <EncabezadoPagina eyebrow="Biblioteca" titulo="Subidas" descripcion="Zona, tarjetas y cola con estados de prueba." />
        <ZonaSubida pegar onArchivos={() => {}} />
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
          <AnimatePresence>
            {SUBIDAS.map((s) => (
              <TarjetaSubida key={s.id} s={s} onReintentar={() => {}} />
            ))}
          </AnimatePresence>
        </ul>
      </div>
      <ColaSubidas subidas={SUBIDAS} onReintentar={() => {}} onLimpiar={() => {}} />
    </DevShell>
  );
}
