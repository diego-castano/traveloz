"use client";

import { Skeleton } from "./SkeletonClient";

// ---------------------------------------------------------------------------
// PackageCard — tarjeta del slider "Descubrí más destinos". Replica 1:1 el
// markup .box-card de la referencia html_inicial/destinos-detalle.html para que
// el CSS del template (site.css: .box-card, .box-card .title, .large-price…)
// aplique sin estilos inline. Cuando el paquete no tiene foto cae a un
// placeholder branded (no a una foto genérica de otro destino).
// ---------------------------------------------------------------------------

const PLACEHOLDER_IMG = "/site/img/placeholder-package.svg";

// Primera URL no vacía. heroImage puede venir como "" (no null) en borradores,
// y el ?? no atrapa el string vacío; por eso filtramos por contenido real.
function pickImage(heroImage: string | null, fotos: { url: string }[]): string {
  const candidates = [heroImage, fotos[0]?.url];
  return candidates.find((u) => u && u.trim().length > 0) ?? PLACEHOLDER_IMG;
}

type P = {
  id: string;
  slug: string | null;
  titulo: string;
  destino: string;
  noches: number;
  salidas: string | null;
  precioDesde: number | null;
  precioDesdeMoneda: string | null;
  heroImage: string | null;
  fotos: { url: string; alt: string }[];
  destinos: { ciudad: { nombre: string } }[];
};

export function PackageCard({
  paquete,
  regionSlug,
}: {
  paquete: P;
  regionSlug: string;
}) {
  // heroImage → primera foto → placeholder. Nunca caemos a una foto de otro
  // destino: una tarjeta sin imagen muestra el placeholder, no slider-1.webp.
  const img = pickImage(paquete.heroImage, paquete.fotos);
  const href = paquete.slug
    ? `/destinos/${regionSlug}/${paquete.slug}`
    : "#";

  return (
    <Skeleton name="package-card" loading={false}>
      <a href={href} className="box-card">
        <img
          src={img}
          alt={paquete.titulo}
          loading="lazy"
          decoding="async"
          // Red de seguridad: si la URL existe pero falla (bucket movido, 404),
          // cambiamos al placeholder en vez de mostrar el ícono de imagen rota.
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src.endsWith(PLACEHOLDER_IMG)) return;
            el.src = PLACEHOLDER_IMG;
          }}
        />
        <div className="text">
          <h3 className="title">{paquete.titulo}</h3>
          {paquete.salidas && <p>{paquete.salidas}</p>}
          <div className="row">
            <div className="col-6">
              <ul>
                <li>Pasaje</li>
                <li>{paquete.noches} noches</li>
                <li>Traslados</li>
                <li>Régimen incluido</li>
              </ul>
            </div>
            <div className="col-6">
              {paquete.precioDesde !== null ? (
                <>
                  <div className="large-price">
                    <div className="price-left">
                      <span className="d-block title">DESDE</span>
                      <span className="d-block title2">
                        {paquete.precioDesdeMoneda ?? "USD"}
                      </span>
                    </div>
                    <div className="price-right">
                      <span className="main-price d-block">
                        {paquete.precioDesde}
                      </span>
                    </div>
                  </div>
                  <span className="d-block text-end">
                    Precio por persona <br className="keep" /> en base doble
                  </span>
                </>
              ) : (
                <span className="d-block text-end">Consultar precio</span>
              )}
            </div>
          </div>
        </div>
      </a>
    </Skeleton>
  );
}
