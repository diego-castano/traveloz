// ---------------------------------------------------------------------------
// Tipos del cotizador — puente entre el usuario de la DB y la forma que espera
// el mockup. El mockup nació con datos falsos (`VENDEDORES` en _mockup/data.js)
// y toda su firma, su "Ver como" y su reporte por vendedor leen esta forma.
// ---------------------------------------------------------------------------

/**
 * ¿Esta ruta es el cotizador?
 *
 * Los dos shells del panel apagan su chrome (padding, fondo, transición) para
 * el cotizador, que se dibuja a pantalla completa. Con un `startsWith` pelado
 * `/backend/cotizadores` —o cualquier ruta futura que arranque igual— se
 * quedaba sin shell. La comparación exacta más el separador es lo que evita
 * ese falso positivo, y vive acá para que los dos shells usen la misma regla.
 */
export function esRutaCotizador(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return p === "/backend/cotizador" || p.startsWith("/backend/cotizador/");
}

/** Lo que el cotizador necesita saber de un vendedor. */
export interface VendedorCotizador {
  id: string;
  nombre: string;
  /** Iniciales para el avatar cuando no hay foto. */
  inicial: string;
  cargo: string;
  /** WhatsApp si lo cargó, si no el teléfono. Puede venir vacío. */
  tel: string;
  email: string;
  /** Link público de datos de pasajeros. `null` si no tiene slug o lo apagó. */
  linkDatos: string | null;
  /** Link público de datos de tarjeta. Mismo criterio que `linkDatos`. */
  linkPago: string | null;
  /** URL de la foto de perfil. `null` cae al avatar con iniciales. */
  foto: string | null;
  /**
   * URL de la firma de email en GIF (pedido del cliente 28/08). Con firma la
   * hoja imprime la imagen tal cual; `null` cae a la firma HTML.
   */
  firma: string | null;
  /**
   * Último frame de esa firma, en WebP. Lo usa SOLO el papel: el PDF sale de
   * un Chromium headless que congela el GIF en un frame cualquiera.
   */
  firmaEstatica: string | null;
  rol: string;
}

/** Los campos del `User` que carga la página. */
export interface UsuarioParaCotizador {
  id: string;
  name: string;
  email: string;
  role: string;
  slug: string | null;
  fotoUrl: string | null;
  firmaUrl: string | null;
  firmaEstaticaUrl: string | null;
  telefono: string | null;
  whatsapp: string | null;
  cargo: string | null;
  linkActivo: boolean;
}

function iniciales(nombre: string): string {
  return (
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Adapta un usuario del panel a la firma que imprime el cotizador.
 *
 * `cargo` sale de Perfiles; si el usuario todavía no lo cargó, la firma dice
 * "Ejecutivo/a de ventas", que es lo que corresponde en el 90% de los casos.
 */
export function vendedorDesdeUsuario(
  u: UsuarioParaCotizador,
  siteBaseUrl: string,
): VendedorCotizador {
  return {
    id: u.id,
    nombre: u.name,
    inicial: iniciales(u.name),
    cargo: u.cargo?.trim() || "Ejecutivo/a de ventas",
    tel: (u.whatsapp || u.telefono || "").trim(),
    email: u.email,
    // Los dos links de "Pasajeros y Pagos" viajan juntos: el cotizador los
    // ofrece en la misma pestaña y la ficha del pasajero los pinta uno abajo
    // del otro. Si el vendedor no tiene slug o apagó el link, van los dos en
    // null y la UI dice por qué en vez de mostrar una URL rota.
    linkDatos:
      u.slug && u.linkActivo ? `${siteBaseUrl}/datos-de-pasajeros/${u.slug}` : null,
    linkPago:
      u.slug && u.linkActivo ? `${siteBaseUrl}/datos-de-pago/${u.slug}` : null,
    // Mismo criterio que VendedorCard en los formularios públicos: la url del
    // storage se usa tal cual, sin proxy.
    foto: u.fotoUrl?.trim() || null,
    firma: u.firmaUrl?.trim() || null,
    firmaEstatica: u.firmaEstaticaUrl?.trim() || null,
    rol: u.role,
  };
}
