"use client";

// Adaptador de prueba del journal: todo en memoria, con demora falsa, sobre
// el artículo de muestra. Solo para /dev/collection/journal-editor.

import type { ArticuloDetalle, ArticuloItem } from "@/actions/collection/journal.actions";
import { demoArticulo, mapasDemo, articulosDemo } from "../sitio/demo-paginas";
import type { ApiJournal, EstadoArticulo } from "./api";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.5));

export function articuloDemo(vacio = false): ArticuloDetalle {
  const a = demoArticulo;
  const especialistas = [...(a.autor ? [a.autor] : []), ...mapasDemo.especialistas.filter((e) => e.id !== a.autor?.id)];
  const experiencias = mapasDemo.experiencias.map(({ destacada: _d, ...e }) => e);
  if (vacio) {
    return {
      id: "nuevo",
      estado: "BORRADOR",
      revision: 0,
      publicadoRevision: null,
      publicadoEn: null,
      campos: { slug: "", tipo: "GUIA", titulo: "", bajada: "", portadaId: null, autorId: null, seoTitulo: "", seoDescripcion: "", experienciaIds: [] },
      contenido: { version: 1, cuerpo: "", galeria: [] },
      medios: [],
      especialistas,
      experiencias,
    };
  }
  return {
    id: a.id,
    estado: "PUBLICADO",
    revision: 4,
    publicadoRevision: 3,
    publicadoEn: a.publicadoEn,
    campos: {
      slug: a.slug,
      tipo: a.tipo,
      titulo: a.titulo,
      bajada: a.bajada,
      portadaId: a.portada?.id ?? null,
      autorId: a.autor?.id ?? null,
      seoTitulo: "Kioto en otoño: guía de templos y horarios",
      seoDescripcion: "Qué templos ver en Kioto durante la temporada de arces, a qué hora llegar y dónde comer después.",
      experienciaIds: a.experiencias.map((e) => e.id),
    },
    contenido: { version: 1, cuerpo: a.cuerpo, galeria: a.galeria.map((m) => ({ medioId: m.id })) },
    medios: [...(a.portada ? [a.portada] : []), ...a.galeria],
    especialistas,
    experiencias,
  };
}

export function articulosListaDemo(): ArticuloItem[] {
  const estados: [EstadoArticulo, boolean][] = [
    ["PUBLICADO", true],
    ["PUBLICADO", false],
    ["PUBLICADO", false],
  ];
  return [
    ...articulosDemo.map((a, i) => ({
      ...a,
      estado: estados[i][0],
      hayCambiosSinPublicar: estados[i][1],
      updatedAt: "2026-10-08T12:00:00.000Z",
    })),
    {
      id: "j4",
      slug: "",
      tipo: "RELATO" as const,
      titulo: "Tres días en un ryokan de Hakone",
      bajada: "",
      minutos: 3,
      portada: mapasDemo.medios.get("s-bienestar") ?? null,
      publicadoEn: null,
      estado: "BORRADOR" as const,
      hayCambiosSinPublicar: false,
      updatedAt: "2026-10-09T10:00:00.000Z",
    },
    {
      id: "j5",
      slug: "",
      tipo: "GUIA" as const,
      titulo: "",
      bajada: "",
      minutos: 1,
      portada: null,
      publicadoEn: null,
      estado: "BORRADOR" as const,
      hayCambiosSinPublicar: false,
      updatedAt: "2026-10-09T11:00:00.000Z",
    },
  ];
}

export function crearApiJournalMock(revisionInicial: number, estadoInicial: EstadoArticulo): ApiJournal {
  let revision = revisionInicial;
  let estado = estadoInicial;
  return {
    async guardar(_id, input) {
      await esperar(400);
      if (input.revision !== revision) {
        return { ok: false, error: "Alguien más guardó cambios en este artículo.", conflicto: true };
      }
      revision += 1;
      return { ok: true, data: { revision } };
    },
    async cambiarEstado(_id, accion) {
      await esperar(500);
      estado = accion === "publicar" ? "PUBLICADO" : accion === "archivar" ? "ARCHIVADO" : "BORRADOR";
      return { ok: true, data: { estado } };
    },
  };
}
