"use client";

// Adaptador de prueba del editor de páginas: todo en memoria, con demora
// falsa, sobre las páginas de muestra. Solo para /dev/collection/paginas-editor.

import { armarVistaPagina, bloqueSchema, PAGINAS, type PaginaVista } from "@/lib/collection/paginas/contenido";
import type { PaginaDetalle, PaginaItem } from "@/actions/collection/paginas.actions";
import { demoInicio, demoLegalVacia, demoNosotros, demoTerminos, mapasDemo } from "../sitio/demo-paginas";
import type { ApiPaginas } from "./api";
import type { TarjetaPagina } from "./ListaPaginas";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.5));
const LEGALES = ["terminos", "privacidad", "cookies"];
const DEMO: Record<string, () => PaginaVista> = {
  inicio: () => demoInicio,
  nosotros: () => demoNosotros,
  terminos: () => demoTerminos,
  privacidad: demoLegalVacia,
  cookies: demoLegalVacia,
};

export function detalleDemo(slug: string): PaginaDetalle {
  const info = PAGINAS.find((p) => p.slug === slug) ?? PAGINAS[0];
  const vista = DEMO[info.slug]();
  return {
    slug: info.slug,
    titulo: info.titulo,
    revision: 7,
    publicadoRevision: info.slug === "inicio" ? 5 : 7,
    publicadaEn: info.slug === "privacidad" || info.slug === "cookies" ? null : "2026-10-02T15:00:00.000Z",
    // Las vistas traen lo editable más lo resuelto: el esquema se queda con lo editable.
    contenido: { version: 1, bloques: vista.bloques.map((b) => bloqueSchema.parse(b)) },
    mapas: { ...mapasDemo, medios: Array.from(mapasDemo.medios.values()) },
  };
}

export function tarjetasDemo(): TarjetaPagina[] {
  return PAGINAS.map((p) => {
    const d = detalleDemo(p.slug);
    const legal = LEGALES.includes(p.slug);
    const item: PaginaItem = {
      slug: p.slug,
      titulo: p.titulo,
      ruta: p.ruta,
      hayCambiosSinPublicar: d.revision !== d.publicadoRevision,
      publicadaEn: d.publicadaEn,
      updatedAt: "2026-10-09T15:00:00.000Z",
      bloques: d.contenido.bloques.length,
    };
    const vista = armarVistaPagina(
      { slug: p.slug, titulo: p.titulo, actualizadaEn: d.publicadaEn },
      { version: 1, bloques: d.contenido.bloques.filter((b) => !b.oculto).slice(0, legal ? 3 : 1) },
      mapasDemo,
    );
    return { item, vista, legal };
  });
}

export function crearApiPaginasMock(revisionInicial: number): ApiPaginas {
  let revision = revisionInicial;
  return {
    async guardar(_slug, input) {
      await esperar(400);
      if (input.revision !== revision) {
        return { ok: false, error: "Alguien más guardó cambios en esta página.", conflicto: true };
      }
      revision += 1;
      return { ok: true, data: { revision } };
    },
    async publicar() {
      await esperar(500);
      return { ok: true, data: { publicadaEn: new Date().toISOString() } };
    },
  };
}
