import { prisma } from "@/lib/db";
import { listarMedios } from "@/actions/collection/medios.actions";
import { Biblioteca, type FiltroBiblioteca } from "@/components/collection/biblioteca/Biblioteca";

const FILTROS: FiltroBiblioteca[] = ["todo", "fotos", "videos", "sin-alt", "sin-credito"];

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: { filtro?: string; medio?: string; subir?: string };
}) {
  const filtro = FILTROS.includes(searchParams.filtro as FiltroBiblioteca)
    ? (searchParams.filtro as FiltroBiblioteca)
    : "todo";
  const r = await listarMedios({
    take: 48,
    tipo: filtro === "fotos" ? "FOTO" : filtro === "videos" ? "VIDEO" : undefined,
    filtro: filtro === "sin-alt" || filtro === "sin-credito" ? filtro : undefined,
  });
  // Nombres para "subido por" (el DTO trae solo el id). Si no hay acceso,
  // listarMedios ya falló y no hace falta buscarlos.
  const usuarios = r.ok ? await prisma.user.findMany({ select: { id: true, name: true } }) : [];

  return (
    <Biblioteca
      inicial={r.ok ? r.data : { error: r.error }}
      filtroInicial={filtro}
      abrirId={searchParams.medio ?? null}
      subirAlEntrar={!!searchParams.subir}
      subidoPor={Object.fromEntries(usuarios.map((u) => [u.id, u.name]))}
    />
  );
}
