/**
 * POC · Lector de itinerarios con Gemini (reemplazo de PNR Converter)
 *
 * Lee un itinerario de vuelo desde un código GDS (texto) o una captura de
 * pantalla (imagen) y lo devuelve en el JSON estructurado que consume el
 * cotizador. Mismo prompt y schema que va a usar el endpoint real.
 *
 * Uso:
 *   source .env.local
 *   node scripts/poc-lector-itinerarios.mjs --texto docs/pnr-ejemplos/copa-amadeus.txt
 *   node scripts/poc-lector-itinerarios.mjs --imagen docs/pnr-ejemplos/copa-ndc.png
 *
 * Con --esperado <json> compara el resultado contra el archivo esperado y
 * reporta diferencias campo a campo (el set de pruebas del prompt).
 */

import { readFileSync } from "node:fs";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("Falta GEMINI_API_KEY (corré `source .env.local` antes)"); process.exit(1); }

const MODELO = process.env.GEMINI_MODELO || "gemini-3.1-flash-lite";

/* El schema es el contrato con el cotizador: trayectos → segmentos */
const SCHEMA = {
  type: "OBJECT",
  properties: {
    trayectos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          etiqueta: { type: "STRING", description: "Ida, Vuelta o Tramo N" },
          fecha: { type: "STRING", description: "Fecha de salida del trayecto, YYYY-MM-DD" },
          segmentos: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                aerolinea: { type: "STRING", description: "Código IATA de 2 caracteres, ej. CM" },
                vuelo: { type: "STRING", description: "Número de vuelo sin la aerolínea, ej. 284" },
                origen: { type: "STRING", description: "Código IATA del aeropuerto de salida" },
                destino: { type: "STRING", description: "Código IATA del aeropuerto de llegada" },
                fecha: { type: "STRING", description: "Fecha de salida del segmento, YYYY-MM-DD" },
                salida: { type: "STRING", description: "Hora local de salida, HH:MM" },
                llegada: { type: "STRING", description: "Hora local de llegada, HH:MM" },
                llegaDiaSiguiente: { type: "BOOLEAN", description: "true si aterriza al día siguiente de su salida" },
              },
              required: ["aerolinea","vuelo","origen","destino","fecha","salida","llegada","llegaDiaSiguiente"],
            },
          },
        },
        required: ["etiqueta","fecha","segmentos"],
      },
    },
  },
  required: ["trayectos"],
};

const PROMPT = `Sos el lector de itinerarios de una agencia de viajes uruguaya.
Te llega un itinerario de vuelos en cualquiera de estos formatos: código crudo de un GDS
(Amadeus, Sabre), captura de pantalla de una herramienta NDC de aerolínea, o texto pegado
de una web de vuelos. Extraé TODOS los segmentos de vuelo y devolvé SOLO el JSON pedido.

Reglas:
- Ignorá líneas de ruido del GDS: DUPLICATE, ETKT ELIGIBLE, SEE RTSVC, RP/…, comentarios.
- Agrupá los segmentos en trayectos: un trayecto nuevo arranca cuando se corta la cadena
  de aeropuertos (el origen no es el destino anterior) o cuando pasa más de un día entre
  segmentos. El primero se etiqueta "Ida", el segundo "Vuelta", los siguientes "Tramo N".
- El año: si el itinerario no lo trae, asumí la próxima ocurrencia futura de esa fecha
  (hoy es ${new Date().toISOString().slice(0, 10)}).
- llegaDiaSiguiente: true cuando la hora de llegada es menor que la de salida o el texto
  marca el día siguiente (ej. "09OCT" en un vuelo del 08OCT, o "+1").
- Horarios SIEMPRE en formato HH:MM de 24 horas (0043 → "00:43").
- Si algo no se puede leer con certeza, omití el segmento antes que inventarlo.`;

function argumento(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const rutaTexto = argumento("--texto");
const rutaImagen = argumento("--imagen");
const rutaEsperado = argumento("--esperado");
if (!rutaTexto && !rutaImagen) {
  console.error("Uso: --texto <archivo> | --imagen <archivo> [--esperado <json>]");
  process.exit(1);
}

const parts = [{ text: PROMPT }];
if (rutaTexto) parts.push({ text: `\n\nItinerario a leer:\n${readFileSync(rutaTexto, "utf8")}` });
if (rutaImagen) {
  const ext = rutaImagen.split(".").pop().toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  parts.push({ inline_data: { mime_type: mime, data: readFileSync(rutaImagen).toString("base64") } });
}

const inicio = Date.now();
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
    }),
  }
);
const data = await res.json();
if (!res.ok) { console.error("Error de la API:", JSON.stringify(data.error || data, null, 2)); process.exit(1); }

const texto = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
const uso = data.usageMetadata || {};
let resultado;
try { resultado = JSON.parse(texto); }
catch { console.error("La respuesta no fue JSON válido:\n", texto); process.exit(1); }

console.log(JSON.stringify(resultado, null, 2));
console.log(`\n— ${MODELO} · ${Date.now() - inicio} ms · tokens in ${uso.promptTokenCount ?? "?"} / out ${uso.candidatesTokenCount ?? "?"}`);

/* ── comparación contra el esperado: el set de pruebas del prompt ──────── */
if (rutaEsperado) {
  const esperado = JSON.parse(readFileSync(rutaEsperado, "utf8"));
  const plano = (r) => (r.trayectos || []).flatMap((t) =>
    (t.segmentos || []).map((s) => ({ ...s, etiqueta: t.etiqueta })));
  const a = plano(esperado), b = plano(resultado);
  const errores = [];
  if (a.length !== b.length) errores.push(`cantidad de segmentos: esperaba ${a.length}, vino ${b.length}`);
  a.forEach((e, i) => {
    const v = b[i]; if (!v) return;
    for (const k of ["aerolinea","vuelo","origen","destino","salida","llegada","llegaDiaSiguiente","etiqueta"]) {
      if (String(e[k]) !== String(v[k])) errores.push(`segmento ${i + 1} · ${k}: esperaba "${e[k]}", vino "${v[k]}"`);
    }
  });
  if (errores.length) { console.log("\n✗ DIFERENCIAS:"); errores.forEach((e) => console.log("  ·", e)); process.exit(2); }
  console.log("\n✓ Coincide con el esperado, segmento por segmento.");
}
