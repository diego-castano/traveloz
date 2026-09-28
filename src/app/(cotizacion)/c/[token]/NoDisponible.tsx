// ---------------------------------------------------------------------------
// La pantalla que ve el pasajero cuando el link ya no abre.
//
// No es un error: es una conversación que sigue. Los links no vencen: esto
// solo aparece cuando el vendedor revocó el link (reenvió la cotización), y lo
// que corresponde es ponerlo en contacto con su asesor en un toque.
//
// Vive aparte de `NoDisponible` de los formularios porque el remate es otro: acá
// el CTA es el WhatsApp del vendedor concreto, no un texto genérico.
//
// Comparte la identidad de la hoja: misma tarjeta blanca sobre el fondo
// tintado del route group, mismo Playfair en el título, misma sombra violeta.
// Antes escribía en blanco sobre la banda violeta del layout de formularios,
// que ya no existe: sin ese fondo el texto quedaba invisible.
// ---------------------------------------------------------------------------

import { telefonoWa } from "@/lib/telefono";

export interface VendedorDelLink {
  nombre: string;
  tel: string;
  email: string;
  foto: string | null;
  inicial: string;
  cargo: string;
}

export function CotizacionNoDisponible({ vendedor }: { vendedor: VendedorDelLink }) {
  const primerNombre = vendedor.nombre.split(" ")[0] || "tu asesor";
  // wa.me sin código de país no abre ningún chat: lo agrega el helper.
  const wa = telefonoWa(vendedor.tel);
  const texto = encodeURIComponent(
    `Hola ${primerNombre}, no me abre el link de la cotización. ¿Me la podés volver a mandar?`,
  );
  const href = wa ? `https://wa.me/${wa}?text=${texto}` : `mailto:${vendedor.email}`;

  return (
    <div className="cot-vencida">
      <section>
        <span className="cv-rule" />
        <h1 className="disp cv-t">Esta cotización no está disponible</h1>
        <p className="cv-p">No pudimos abrirla. Escribile a tu asesor y te la manda de nuevo.</p>

        <div className="cv-vend">
          {vendedor.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendedor.foto} alt="" className="cv-foto" />
          ) : (
            <span className="cv-foto cv-ini">{vendedor.inicial}</span>
          )}
          <div>
            <div className="cv-vend-n">{vendedor.nombre}</div>
            <div className="cv-vend-c">{vendedor.cargo} · TravelOz</div>
          </div>
        </div>

        <a href={href} target={wa ? "_blank" : undefined} rel={wa ? "noreferrer" : undefined} className="cv-cta">
          {wa ? "Pedirle una cotización nueva" : "Escribirle por email"}
        </a>
      </section>
    </div>
  );
}
