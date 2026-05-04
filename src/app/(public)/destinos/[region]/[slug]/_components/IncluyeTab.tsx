type Servicio = {
  id: string;
  textoCustom: string | null;
  servicio: { nombre: string; icon: string };
};

export function IncluyeTab({
  textoIncluye,
  servicios,
}: {
  textoIncluye: string | null;
  servicios: Servicio[];
}) {
  return (
    <div>
      <h2 style={{ fontSize: 28, marginBottom: 16 }}>Incluye</h2>
      {textoIncluye && (
        <p style={{ color: "#666", marginBottom: 20 }}>{textoIncluye}</p>
      )}
      {servicios.length === 0 ? (
        <p style={{ color: "#999" }}>
          Próximamente cargaremos los servicios de este paquete.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {servicios.map((s) => (
            <li
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                background: "#f7f4ff",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <img
                src={`/site/img/p-${s.servicio.icon}-icon.png`}
                alt=""
                style={{ width: 24, height: 24 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {s.textoCustom ?? s.servicio.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
