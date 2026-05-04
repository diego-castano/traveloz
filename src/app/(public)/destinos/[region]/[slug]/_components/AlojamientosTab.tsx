type Opciones = Array<{
  id: string;
  nombre: string;
  hoteles: Array<{
    id: string;
    alojamiento: {
      nombre: string;
      categoria: number | null;
      precios: Array<{
        precioPorNoche: number;
        periodoDesde: string;
        periodoHasta: string;
        regimen: { nombre: string; abrev: string } | null;
      }>;
    };
  }>;
}>;

export function AlojamientosTab({ opciones }: { opciones: Opciones }) {
  if (opciones.length === 0) {
    return (
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 16 }}>Alojamientos</h2>
        <p style={{ color: "#999" }}>
          Próximamente cargaremos las opciones de alojamiento.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 28, marginBottom: 16 }}>Alojamientos</h2>
      {opciones.map((opt) => (
        <div key={opt.id} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 20, marginBottom: 12, color: "#785AE5" }}>
            {opt.nombre}
          </h3>
          {opt.hoteles.map((h) => (
            <div
              key={h.id}
              style={{
                padding: 16,
                background: "#f7f4ff",
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              <h4 style={{ fontSize: 16, marginBottom: 6 }}>
                {h.alojamiento.nombre}
                {h.alojamiento.categoria && (
                  <span style={{ marginLeft: 8, color: "#f59e0b" }}>
                    {"★".repeat(h.alojamiento.categoria)}
                  </span>
                )}
              </h4>
              {h.alojamiento.precios.length > 0 && (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    fontSize: 13,
                    color: "#555",
                  }}
                >
                  {h.alojamiento.precios.slice(0, 3).map((p, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {p.regimen?.abrev ?? "—"} · {p.periodoDesde} a{" "}
                      {p.periodoHasta} · USD {p.precioPorNoche} / noche
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
