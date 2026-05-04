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
    <a href={href} className="package-card image-box style1">
      <img src={img} alt={paquete.titulo} />
      <div className="content" style={{ padding: "16px" }}>
        <h3 className="title">{paquete.titulo}</h3>
        {ciudades && (
          <p style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
            {ciudades}
          </p>
        )}
        {paquete.salidas && (
          <p style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
            {paquete.salidas}
          </p>
        )}
        <ul
          style={{
            display: "flex",
            gap: 8,
            fontSize: 11,
            color: "#785AE5",
            marginBottom: 10,
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
  );
}
