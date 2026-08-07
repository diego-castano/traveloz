// ---------------------------------------------------------------------------
// Nombres de ciudad — normalización, validación y detección de parecidos.
//
// El alta rápida de ciudades (árbol de Catálogos, CiudadPicker del paquete y
// CreatableSelect del alta de hotel) era "escribo cualquier cosa + Enter", sin
// confirmación ni chequeo, y el catálogo se llenó de basura: bajo Bahamas
// terminaron conviviendo "nas" y "Nassau". Estas funciones son la fuente única
// de verdad de las tres pantallas Y de la server action, así que cliente y
// servidor coinciden en qué es un nombre válido y en qué cuenta como repetido.
// ---------------------------------------------------------------------------

export const CIUDAD_NOMBRE_MIN = 2;
export const CIUDAD_NOMBRE_MAX = 80;

/**
 * Lo que efectivamente se guarda: sin espacios en los bordes y sin espacios
 * dobles adentro. NO toca mayúsculas ni tildes — el operador escribe el nombre
 * propio, nosotros no lo "corregimos" a sus espaldas.
 */
export function normalizeCiudadNombre(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Clave de comparación para detectar repetidos: sin tildes, sin puntuación ni
 * espacios, en minúsculas. Así "Río de Janeiro", "rio de janeiro" y
 * "Rio  De   Janeiro" son la misma ciudad. Un UNIQUE de Postgres no alcanza
 * para esto (es case y accent sensitive), por eso la comparación vive acá.
 */
export function ciudadKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Latín (con acentos y extendido), griego y cirílico. Va con rangos explícitos
// y no con `\p{L}/u` porque el tsconfig del proyecto no fija `target` y tsc
// rechaza las property escapes cuando asume ES5.
const TIENE_LETRA = /[A-Za-z\u00C0-\u024F\u0386-\u03FF\u0400-\u04FF]/;

/**
 * Valida lo tipeado. Devuelve `null` si está bien, o el motivo del rechazo ya
 * redactado para mostrarle al operador.
 *
 * A propósito NO hay un mínimo alto: hay ciudades reales de 3 letras (Ica,
 * Ubá, Bath). Contra la basura tipo "nas" juega la confirmación explícita más
 * el aviso de ciudades parecidas, no un largo mínimo que rompa casos legítimos.
 */
export function validarCiudadNombre(raw: string): string | null {
  const nombre = normalizeCiudadNombre(raw);
  if (!nombre) return "Escribí el nombre de la ciudad.";
  if (nombre.length < CIUDAD_NOMBRE_MIN) {
    return `El nombre es demasiado corto (mínimo ${CIUDAD_NOMBRE_MIN} caracteres).`;
  }
  if (nombre.length > CIUDAD_NOMBRE_MAX) {
    return `El nombre es demasiado largo (máximo ${CIUDAD_NOMBRE_MAX} caracteres).`;
  }
  // Sin una sola letra no es un nombre: atrapa "123", "---", "...".
  if (!TIENE_LETRA.test(nombre)) {
    return "El nombre tiene que incluir letras.";
  }
  return null;
}

// Distancia de edición acotada: si supera `max` cortamos y devolvemos max + 1.
// Alcanza para "¿se parecen?" y evita recorrer matrices grandes al pedo.
function distanciaEdicion(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let mejorFila = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + costo);
      curr.push(valor);
      if (valor < mejorFila) mejorFila = valor;
    }
    if (mejorFila > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Ciudades ya cargadas en ese país que se parecen a lo que el operador está por
 * crear. Dos criterios:
 *
 *  1. Prefijo — el caso real del cliente: "nas" contra "Nassau". Pedimos 3
 *     caracteres para que un "la" no marque media Latinoamérica.
 *  2. Distancia de edición chica — errores de tipeo ("Nassao", "Buens Aires").
 *
 * El nombre idéntico no entra: ese lo bloquea la validación de repetidos, no
 * es un "parecido".
 */
export function ciudadesParecidas(
  nombre: string,
  existentes: string[],
  limite = 4,
): string[] {
  const clave = ciudadKey(nombre);
  if (!clave) return [];

  const vistas = new Set<string>();
  const hits: string[] = [];

  for (const existente of existentes) {
    const claveExistente = ciudadKey(existente);
    if (!claveExistente || claveExistente === clave) continue;
    if (vistas.has(claveExistente)) continue;

    const corta = clave.length <= claveExistente.length ? clave : claveExistente;
    const larga = corta === clave ? claveExistente : clave;
    const esPrefijo = corta.length >= 3 && larga.startsWith(corta);

    // Un tipeo sobre nombres cortos, dos sobre nombres largos.
    const tolerancia = Math.max(clave.length, claveExistente.length) <= 5 ? 1 : 2;
    const esTipeo = distanciaEdicion(clave, claveExistente, tolerancia) <= tolerancia;

    if (esPrefijo || esTipeo) {
      vistas.add(claveExistente);
      hits.push(existente);
      if (hits.length >= limite) break;
    }
  }

  return hits;
}
