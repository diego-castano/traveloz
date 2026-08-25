// ---------------------------------------------------------------------------
// Lo que se ve mientras el server resuelve el link.
//
// La página es `force-dynamic` y toca la base tres veces (link, hoteles,
// ajustes): en una conexión de celular eso son unas décimas en las que antes
// no había nada. Un spinner centrado no dice nada; esto dibuja la forma de lo
// que viene — la banda de marca y los primeros renglones — así el salto al
// contenido real es un relevo y no una aparición.
// ---------------------------------------------------------------------------

export default function CargandoCotizacion() {
  return (
    <div className="pub-sk" aria-hidden>
      <div className="pub-sk-h" />
      <div className="pub-sk-b">
        <div className="pub-sk-l" style={{ width: "46%", height: 15 }} />
        <div className="pub-sk-l" style={{ width: "88%" }} />
        <div className="pub-sk-l" style={{ width: "72%" }} />
        <div className="pub-sk-l" style={{ width: "30%", marginTop: 26 }} />
        <div className="pub-sk-l" style={{ width: "100%", height: 88, borderRadius: 18 }} />
        <div className="pub-sk-l" style={{ width: "100%", height: 88, borderRadius: 18 }} />
      </div>
    </div>
  );
}
