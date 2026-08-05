"use client";

import { Skeleton } from "./SkeletonClient";
import { stripNochesSuffix } from "@/lib/format-paquete";
import { cardImage, CARD_SIZES } from "@/lib/image-src";

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
  /**
   * Renglones ya resueltos de la tarjeta (lista "Incluye" curada del operador,
   * completada con derivados clásicos). Se arma server-side con
   * `buildCardBullets` — reemplaza los 4 bullets hardcodeados de antes.
   */
  bullets: string[];
  /**
   * Histórico: el RegionExplorer viejo proyectaba las ciudades del paquete
   * acá para los chips de país/ciudad. Quedó opcional — los otros dos
   * consumidores (RelatedPackages, /destinos?tipo=) no lo pasan y no lo
   * necesitan.
   */
  destinos?: { ciudad: { nombre: string } }[];
};

export function PackageCard({
  paquete,
  regionSlug,
  variant = "default",
  priority = false,
}: {
  paquete: P;
  regionSlug: string;
  /**
   * "alt" = tarjeta con imagen a 240px y `height:100%` (referencia de
   * destination-listing.html, usada en grids de 3-4 columnas en
   * RegionExplorer). "default" = tarjeta de 280px, usada en el slider del
   * detalle y en /destinos?tipo=.
   */
  variant?: "default" | "alt";
  /**
   * Cards above-the-fold (las primeras del grid): cargan eager + fetchpriority
   * high para que la imagen aparezca ya, sin esperar al scroll. El resto del
   * grid queda lazy (default).
   */
  priority?: boolean;
}) {
  // heroImage → primera foto → placeholder. Nunca caemos a una foto de otro
  // destino: una tarjeta sin imagen muestra el placeholder, no slider-1.webp.
  const img = pickImage(paquete.heroImage, paquete.fotos);
  // Servimos el thumbnail al tamaño de la card (?w=…) en vez del original de
  // 1-3 MB. cardImage solo toca URLs /api/image; el placeholder pasa igual.
  const { src, srcSet } = cardImage(img);
  const href = paquete.slug
    ? `/destinos/${regionSlug}/${paquete.slug}`
    : "#";

  return (
    <Skeleton name="package-card" loading={false}>
      <a href={href} className={`box-card${variant === "alt" ? " alt" : ""}`}>
        <img
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? CARD_SIZES : undefined}
          alt={paquete.titulo}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          // Red de seguridad: si la URL existe pero falla (bucket movido, 404),
          // cambiamos al placeholder en vez de mostrar el ícono de imagen rota.
          // Limpiamos srcset para que el navegador no reintente una variante ?w=.
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src.endsWith(PLACEHOLDER_IMG)) return;
            el.srcset = "";
            el.src = PLACEHOLDER_IMG;
          }}
        />
        <div className="text">
          <h3 className="title">{stripNochesSuffix(paquete.titulo)}</h3>
          {paquete.salidas && <p>{paquete.salidas}</p>}
          <div className="row">
            <div className="col-6">
              <ul className="card-bullets">
                {paquete.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
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
                  {/* .price-note distingue la bajada del precio del fallback
                      "Consultar precio" de abajo, que también es .text-end pero
                      hace las veces del monto y conserva su cuerpo. */}
                  <span className="d-block text-end price-note">
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
