import { Skeleton } from "./SkeletonClient";

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
  const img =
    paquete.heroImage ??
    paquete.fotos[0]?.url ??
    "/site/img/slider-1.webp";
  const href = paquete.slug
    ? `/destinos/${regionSlug}/${paquete.slug}`
    : "#";
  const ciudades = paquete.destinos.map((d) => d.ciudad.nombre).join(" · ");

  return (
    <Skeleton name="package-card" loading={false}>
      <a
        href={href}
        className="package-card"
        style={{
          display: "block",
          margin: "0 10px",
          borderRadius: 10,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <img
          src={img}
          alt={paquete.titulo}
          loading="lazy"
          decoding="async"
          style={{
            display: "block",
            width: "100%",
            height: 220,
            objectFit: "cover",
          }}
        />
        <div style={{ padding: 16 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#222",
              margin: "0 0 8px",
              lineHeight: 1.25,
            }}
          >
            {paquete.titulo}
          </h3>
          {ciudades && (
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 6px" }}>
              {ciudades}
            </p>
          )}
          {paquete.salidas && (
            <p style={{ fontSize: 12, color: "#999", margin: "0 0 6px" }}>
              {paquete.salidas}
            </p>
          )}
          <ul
            style={{
              display: "flex",
              gap: 8,
              fontSize: 11,
              color: "#785AE5",
              margin: "0 0 10px",
              padding: 0,
              listStyle: "none",
            }}
          >
            <li>✈ Pasaje</li>
            <li>🌙 {paquete.noches} noches</li>
            <li>🍽 Régimen</li>
          </ul>
          {paquete.precioDesde !== null && (
            <p style={{ fontSize: 13, color: "#222", margin: 0 }}>
              Desde{" "}
              <strong style={{ color: "#785AE5", fontSize: 18 }}>
                {paquete.precioDesdeMoneda} {paquete.precioDesde}
              </strong>
            </p>
          )}
        </div>
      </a>
    </Skeleton>
  );
}
