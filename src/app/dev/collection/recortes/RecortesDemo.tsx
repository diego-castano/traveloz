"use client";

// Foto de prueba: grilla de 16 × 10 celdas de 100 px con un color por celda
// (rojo = columna × 15, verde = fila × 25), así se puede verificar por píxel
// qué región se ve en cada caja.

import { useEffect, useMemo, useState } from "react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { ApiProvider, type ApiConstructor } from "@/components/collection/constructor/api";
import { crearApiMock } from "@/components/collection/constructor/api-mock";
import { EditorEncuadre } from "@/components/collection/biblioteca/EditorEncuadre";
import { DetalleMedio } from "@/components/collection/biblioteca/DetalleMedio";
import { ZonaSubida } from "@/components/collection/biblioteca/ZonaSubida";
import { SelectorMedios } from "@/components/collection/pickers/SelectorMedios";
import { MediosCtx, SlotMedio } from "@/components/collection/constructor/campos";
import { MedioImagen } from "@/components/collection/sitio/medios";
import { DevShell } from "../DevShell";
import { RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { BloqueCierre } from "@/components/collection/sitio/bloques/editoriales";
import { MedioBloque, type BloqueDeVista } from "@/components/collection/sitio/bloques/comun";

function grilla() {
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 1000;
  const g = c.getContext("2d")!;
  for (let col = 0; col < 16; col++)
    for (let fila = 0; fila < 10; fila++) {
      g.fillStyle = `rgb(${col * 15}, ${fila * 25}, 100)`;
      g.fillRect(col * 100, fila * 100, 100, 100);
    }
  return c.toDataURL("image/png");
}

export const RECORTE_45 = { x: 0.5, y: 0.2, w: 0.25, h: 0.5 };

function medios(url: string) {
  const base = (id: string, extra: Partial<MedioVista> = {}): MedioVista => ({
    id,
    tipo: "FOTO",
    url,
    variantes: [{ w: 1600, h: 1000, url }],
    ancho: 1600,
    alto: 1000,
    colorDominante: "#6E7F8C",
    placeholder: null,
    alt: "Grilla de prueba",
    leyenda: "",
    credito: "",
    focoX: 0.5,
    focoY: 0.5,
    posterUrl: null,
    duracion: null,
    ...extra,
  });
  const video = (id: string, duracion: number): MedioVista => ({
    ...base(id),
    tipo: "VIDEO",
    variantes: [],
    ancho: 1920,
    alto: 1080,
    posterUrl: url,
    duracion,
    alt: id === "v-largo" ? "Video largo" : "Video corto",
  });
  return [
    base("f1", { recortes: { "4:5": RECORTE_45, "16:9": { x: 0.1, y: 0.1, w: 0.5, h: 0.45 }, "4:3": { x: 0.25, y: 0.2, w: 0.5, h: 0.6 } } }),
    base("f2", { focoX: 0.3, focoY: 0.4 }),
    video("v-largo", 45),
    video("v-ok", 10),
  ];
}

export function RecortesDemo({ v }: { v: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(grilla()), []);
  if (!url) return null;
  return <Contenido v={v} url={url} />;
}

function Contenido({ v, url }: { v: string; url: string }) {
  const lista = useMemo(() => medios(url), [url]);
  const api = useMemo<ApiConstructor>(() => {
    const m = crearApiMock(lista, 1);
    return {
      ...m,
      // El mock pesa todo ~1,4 MB: el video largo pesa 31 MB.
      async listarMedios(i) {
        const r = await m.listarMedios(i);
        if (r.ok) r.data.items = r.data.items.map((x) => (x.id === "v-largo" ? { ...x, peso: 31 * 1048576 } : x));
        return r;
      },
    };
  }, [lista]);
  const [mapa, setMapa] = useState(() => new Map(lista.map((m) => [m.id, m])));
  const [slot, setSlot] = useState<string | null>("f1");
  const [f1] = lista;
  const dto: ColMedioDto = {
    ...f1,
    recortes: f1.recortes ?? {},
    nombre: "grilla-de-prueba.png",
    key: "collection/originales/grilla.png",
    contentType: "image/png",
    peso: 2_400_000,
    etiquetas: [],
    subidoPorId: null,
    createdAt: new Date(Date.UTC(2026, 9, 9, 12)).toISOString(),
  };

  if (v === "cierre" || v === "articulo")
    return (
      <RaizSitio>
        {v === "articulo" ? (
          <div className="cs-envolvente" data-prueba="articulo">
            <div className="cs-articulo-portada">
              <MedioBloque medio={f1} preview={false} relleno prioridad encuadre={["4:3", "1:1", "16:9"]} sizes="100vw" />
            </div>
          </div>
        ) : (
          <div data-prueba="cierre">
            <BloqueCierre
              modo="sitio"
              bloque={
                {
                  id: "c1",
                  tipo: "cierre",
                  eyebrow: "Tu próximo viaje",
                  titulo: "Este viaje se arma a tu medida.",
                  texto: "Escribinos y lo armamos juntos.",
                  ctaTexto: "Consultar",
                  ctaHref: "/contacto",
                  medio: { medioId: "f1" },
                  medioVista: f1,
                } as unknown as BloqueDeVista<"cierre">
              }
            />
          </div>
        )}
      </RaizSitio>
    );
  return (
    <ApiProvider value={api}>
      <DevShell lectura={false} ruta="/backend/collection/biblioteca">
        <MediosCtx.Provider
          value={{
            medios: mapa,
            editable: true,
            agregarMedios: (ms) => setMapa((x) => new Map([...Array.from(x), ...ms.map((m) => [m.id, m] as const)])),
          }}
        >
          {v === "editor169" && (
            <EditorEncuadre medio={lista[1]} aspectos={["16:9"]} saltable onGuardar={async () => null} onCerrar={() => {}} />
          )}
          {v === "editor45" && (
            <EditorEncuadre medio={f1} aspectos={["16:9", "4:5"]} inicial="4:5" onGuardar={async () => null} onCerrar={() => {}} />
          )}
          {v === "detalle" && (
            <DetalleMedio
              medio={dto}
              posicion="1 de 4"
              subidoPor={{}}
              onCerrar={() => {}}
              onAnterior={null}
              onSiguiente={null}
              onCambio={() => {}}
              onEliminado={() => {}}
            />
          )}
          {v === "slot" && (
            <div className="max-w-[420px] p-6">
              <SlotMedio medioId={slot} aspecto={16 / 9} encuadres={["16:9", "4:5"]} portada etiqueta="portada" onCambio={(m) => setSlot(m?.id ?? null)} />
            </div>
          )}
          {v === "selector" && <SelectorMedios abierto portada titulo="Portada" onCerrar={() => {}} onElegir={() => {}} />}
          {v === "subir" && (
            <div className="p-6">
              <ZonaSubida onArchivos={() => {}} />
            </div>
          )}
          {v === "render" && (
            <div className="flex flex-wrap items-start gap-8 p-6">
              <div data-prueba="exacto-45" style={{ width: 400 }}>
                <MedioImagen medio={f1} aspecto={4 / 5} encuadre="4:5" sizes="400px" />
              </div>
              <div data-prueba="exacto-169" style={{ width: 480 }}>
                <MedioImagen medio={f1} aspecto={16 / 9} encuadre={["16:9", "4:5"]} sizes="480px" />
              </div>
              <div data-prueba="relleno-45" className="relative" style={{ width: 320, height: 400 }}>
                <MedioImagen medio={f1} relleno encuadre={["16:9", "4:5"]} sizes="320px" />
              </div>
              <div data-prueba="otro-aspecto" className="relative" style={{ width: 300, height: 600 }}>
                <MedioImagen medio={f1} relleno encuadre="4:5" sizes="300px" />
              </div>
            </div>
          )}
        </MediosCtx.Provider>
      </DevShell>
    </ApiProvider>
  );
}
