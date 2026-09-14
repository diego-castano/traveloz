// ---------------------------------------------------------------------------
// Negrita en el mensaje al pasajero
//
// El mensaje automático (`mensajeAuto`) es texto plano y tiene que seguir
// siéndolo: el mismo texto sale por WhatsApp, por email y en la ficha, y el
// máster escribe la plantilla por defecto en Ajustes. Para que el vendedor
// pueda destacar una palabra sin convertir ese campo en un editor de HTML se
// usa la marca que ya conoce de WhatsApp: *asteriscos*.
//
// Ventaja de elegir esa y no otra: en WhatsApp el texto viaja tal cual y la
// app lo pinta en negrita sola. Acá lo pintamos nosotros, en la ficha del
// pasajero y en el email, con el mismo criterio.
//
// Qué cuenta como negrita: un par de asteriscos en el mismo renglón, con algo
// adentro que no arranque ni termine en espacio. Así un asterisco suelto
// ("2 * 3", "Hotel 4*") queda como está y no se come media frase.
// ---------------------------------------------------------------------------

/** Un par de asteriscos, sin saltos de línea y sin otro asterisco adentro.
 *  Se crea uno nuevo por llamada: un regex global guarda `lastIndex` y
 *  compartirlo entre funciones deja saltos intermitentes. */
const marca = () => /\*([^*\n]+)\*/g;

/** El contenido sirve si no está vacío y no se apoya en espacios. */
function esNegrita(dentro: string): boolean {
  return dentro.trim().length > 0 && !/^\s|\s$/.test(dentro);
}

export type TrozoNegrita = { texto: string; fuerte: boolean };

/**
 * Parte un texto en trozos normales y trozos en negrita, para pintarlos en
 * React sin pasar por HTML. Siempre devuelve al menos un trozo.
 */
export function partirNegritas(texto: unknown): TrozoNegrita[] {
  const s = typeof texto === "string" ? texto : texto == null ? "" : String(texto);
  const trozos: TrozoNegrita[] = [];
  const re = marca();
  let desde = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const dentro = m[1];
    const i = m.index;
    // Un asterisco que no abre negrita se queda en el texto: no movemos
    // `desde`, así el trozo siguiente se lo lleva puesto.
    if (!esNegrita(dentro)) continue;
    if (i > desde) trozos.push({ texto: s.slice(desde, i), fuerte: false });
    trozos.push({ texto: dentro, fuerte: true });
    desde = i + m[0].length;
  }
  if (desde < s.length) trozos.push({ texto: s.slice(desde), fuerte: false });
  return trozos.length ? trozos : [{ texto: s, fuerte: false }];
}

/**
 * La misma marca, para un texto QUE YA VIENE ESCAPADO como HTML (el email).
 * `escapeHtml` no toca los asteriscos, así que la marca sigue entera acá.
 */
export function negritasEnHtml(escapado: string): string {
  return escapado.replace(marca(), (todo, dentro: string) =>
    esNegrita(dentro) ? `<strong>${dentro}</strong>` : todo,
  );
}

/** Saca las marcas sin pintar nada: para asuntos, previews y textos planos. */
export function sinMarcasDeNegrita(texto: unknown): string {
  return partirNegritas(texto)
    .map((t) => t.texto)
    .join("");
}
