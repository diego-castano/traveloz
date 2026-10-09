import { listarPaginas, obtenerPagina } from "@/actions/collection/paginas.actions";
import { armarVistaPagina } from "@/lib/collection/paginas/contenido";
import { ListaPaginas, type TarjetaPagina } from "@/components/collection/paginas/ListaPaginas";

const LEGALES = ["terminos", "privacidad", "cookies"];

export default async function PaginasPage() {
  const r = await listarPaginas();
  if (!r.ok) return <ListaPaginas inicial={{ error: r.error }} />;
  // La miniatura es el primer bloque visible, resuelto acá para no mandar la página entera.
  const tarjetas = await Promise.all(
    r.data.map(async (item): Promise<TarjetaPagina> => {
      const legal = LEGALES.includes(item.slug);
      const d = await obtenerPagina(item.slug);
      const primero = d.ok ? d.data.contenido.bloques.filter((b) => !b.oculto).slice(0, legal ? 3 : 1) : [];
      const vista = d.ok
        ? armarVistaPagina(
            { slug: item.slug, titulo: item.titulo, actualizadaEn: item.publicadaEn },
            { version: 1, bloques: primero },
            { ...d.data.mapas, medios: new Map(d.data.mapas.medios.map((m) => [m.id, m])) },
          )
        : { slug: item.slug, titulo: item.titulo, bloques: [], actualizadaEn: item.publicadaEn };
      return { item, vista, legal };
    }),
  );
  return <ListaPaginas inicial={tarjetas} />;
}
