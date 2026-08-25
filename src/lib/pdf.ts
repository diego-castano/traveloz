// ---------------------------------------------------------------------------
// Render server-side del PDF de una cotización.
//
// La hoja no se dibuja acá: la dibuja la misma página que abre el pasajero,
// `/c/<token>?print=1`. Este módulo levanta un Chromium headless, la carga con
// el header `x-cotizador-pdf` (que la excluye del conteo de aperturas) y la
// imprime. Una sola definición de la cotización para la pantalla, el papel y
// el adjunto del email.
//
// Por qué puppeteer-core y no puppeteer: el paquete completo baja un Chrome de
// ~300 MB en cada build. El navegador lo pone la imagen (ver `nixpacks.toml`),
// y acá solo lo buscamos.
//
// Reglas de operación:
//   • Un navegador por render, cerrado SIEMPRE en `finally`. Reusar una
//     instancia entre requests es lo que termina dejando procesos zombies que
//     se comen la RAM del contenedor.
//   • Máximo 2 renders a la vez (`MAX_CONCURRENTES`). Chromium come ~200 MB
//     por instancia y el contenedor no da para más. El tercero espera 30 s y
//     después se va con OCUPADO, que la ruta traduce a 429.
//   • Techo duro de 45 s por render. Un PDF que tarda más está roto.
//   • Se puede apagar sin deploy: COTIZADOR_PDF_OFF=1.
//
// POR DÓNDE ENTRA EL NAVEGADOR (ver `baseDeRenderPdf`)
// En producción entra por loopback: `http://127.0.0.1:$PORT`. Antes entraba
// por la URL pública y el contenedor terminaba saliendo a Internet para
// pedirse a sí mismo, pasando por Cloudflare; un headless sin cookies ni JS
// de challenge es justo lo que ese proxy retiene, y todos los renders morían
// en el techo del `goto`. Por loopback la request no sale de la máquina.
// Lo que se pierde es poco: los assets de la hoja son relativos
// (`/api/image/...`, `/site/img/...`, `/fonts/cotizador/*.woff2`) y resuelven
// contra el mismo Next. Nada del render sale a Internet.
// El middleware no toca `/c/*` (su matcher es `/backend/:path*`) y el único
// redirect por host mira `app.traveloz.com.uy`, así que una request con
// `Host: 127.0.0.1:PORT` llega derecho a la página. `COTIZADOR_PDF_BASE_URL`
// queda como escotilla por si algún día hay que volver a la URL pública.
//
// ETAPAS
// Todo el render está partido en etapas (`lanzar`, `goto`, `hoja`, `fuentes`,
// `imagenes`, `pdf`) y cada error sale con su código y su etapa. Cuando esto
// falla en producción, el log dice dónde y el JSON de la ruta también: un 500
// genérico sobre 30 s de espera no se puede diagnosticar sin entrar al
// contenedor.
//
// Nada de lo que se loguea acá incluye el contenido de la cotización: número,
// duración y tamaño, y listo. La URL final se loguea con el token tapado — es
// la llave del link público, no un dato de diagnóstico.
// ---------------------------------------------------------------------------

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Browser, Page } from "puppeteer-core";
import { logger } from "@/lib/logger";
import { SITE_BASE_URL } from "@/lib/datos-email";

const log = logger.child({ module: "pdf" });
const ejecutar = promisify(execFile);

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/** Códigos que la UI y las rutas traducen a un status y a un texto. */
export type CodigoErrorPdf =
  | "SIN_CHROMIUM" // no hay navegador en la máquina (o COTIZADOR_PDF_OFF=1)
  | "TIMEOUT" // alguna etapa no terminó dentro de su techo
  | "PAGINA_INVALIDA" // cargó algo, pero no era la hoja de impresión
  | "OCUPADO" // los dos slots ocupados y la espera se agotó
  | "NAVEGACION" // el navegador no llegó a la página, o volvió con otro status
  | "DESCONOCIDO"; // cualquier otra cosa: es un bug, no una condición prevista

/** Dónde estaba el render cuando se rompió. */
export type EtapaPdf =
  | "lanzar" // arrancando Chromium
  | "goto" // pidiendo la página
  | "hoja" // esperando `.print-hoja`
  | "fuentes" // esperando `document.fonts.ready`
  | "imagenes" // esperando que las <img> terminen
  | "pdf"; // imprimiendo

export class ErrorPdf extends Error {
  readonly codigo: CodigoErrorPdf;
  /** null cuando el error es anterior al render (OCUPADO, apagado). */
  readonly etapa: EtapaPdf | null;
  constructor(codigo: CodigoErrorPdf, mensaje: string, etapa: EtapaPdf | null = null) {
    super(mensaje);
    this.name = "ErrorPdf";
    this.codigo = codigo;
    this.etapa = etapa;
  }
}

/** Código del error si es nuestro; si no, null (un bug distinto). */
export function codigoDeError(err: unknown): CodigoErrorPdf | null {
  return err instanceof ErrorPdf ? err.codigo : null;
}

/** Etapa en la que se rompió, si la sabemos. */
export function etapaDeError(err: unknown): EtapaPdf | null {
  return err instanceof ErrorPdf ? err.etapa : null;
}

/** Primera línea del error, recortada: alcanza para el log y no lo inunda. */
function mensajeCorto(err: unknown): string {
  const texto = err instanceof Error ? err.message : String(err);
  return texto.split("\n")[0]!.slice(0, 200);
}

/** ¿Es un vencimiento de reloj (nuestro o de puppeteer)? */
function esTimeout(err: unknown): boolean {
  if (err instanceof ErrorPdf) return err.codigo === "TIMEOUT";
  const nombre = (err as { name?: string } | null)?.name ?? "";
  if (nombre === "TimeoutError") return true;
  return /timeout|timed out|exceeded/i.test(mensajeCorto(err));
}

/**
 * La URL con el token del link tapado. `/c/abcd1234?print=1` queda
 * `/c/***?print=1`: el host, la ruta y el query siguen sirviendo para ver si
 * hubo un redirect, y la llave del link no queda escrita en ningún log.
 */
function sinToken(url: string): string {
  return url.replace(/\/c\/[^/?#]+/, "/c/***");
}

// ---------------------------------------------------------------------------
// Por dónde entra el navegador
// ---------------------------------------------------------------------------

/**
 * Base contra la que se pide la hoja.
 *
 *   1. `COTIZADOR_PDF_BASE_URL` — manda siempre. Sirve para probar contra el
 *      dominio real desde una máquina de desarrollo y para volver atrás en
 *      producción sin tocar código.
 *   2. Producción sin esa env → loopback (`http://127.0.0.1:$PORT`). Ver el
 *      encabezado del archivo.
 *   3. Desarrollo → `SITE_BASE_URL`, como siempre.
 *
 * Es una función y no una constante a propósito: `PORT` la pone Railway al
 * arrancar el proceso y queremos leerla en cada render, no en el import.
 */
export function baseDeRenderPdf(): string {
  const forzada = process.env.COTIZADOR_PDF_BASE_URL?.trim();
  if (forzada) return forzada.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    return `http://127.0.0.1:${process.env.PORT || "3000"}`;
  }
  return SITE_BASE_URL;
}

// ---------------------------------------------------------------------------
// Dónde está el navegador
// ---------------------------------------------------------------------------

/** Candidatos por nombre de binario, en orden de preferencia. */
const BINARIOS = ["chromium", "chromium-browser", "google-chrome"] as const;

/** Resultado memoizado: buscar el binario en cada request no tiene sentido. */
let cacheBinario: { valor: string | null } | null = null;

async function which(binario: string): Promise<string | null> {
  try {
    const { stdout } = await ejecutar("which", [binario]);
    const ruta = stdout.trim().split("\n")[0]?.trim();
    return ruta || null;
  } catch {
    return null;
  }
}

/**
 * El ejecutable de Chromium, o null si esta máquina no tiene ninguno.
 *
 * Orden:
 *   1. PUPPETEER_EXECUTABLE_PATH — la escotilla de escape: si mañana la imagen
 *      cambia de base y el binario queda en otro lado, se arregla con una env.
 *   2. `which chromium` / `chromium-browser` / `google-chrome` — lo que pone
 *      `nixpacks.toml` en producción y lo que ya tiene la mayoría de los Linux.
 *   3. Solo en desarrollo: el Chromium que bajó Playwright. En la Mac de un
 *      desarrollador no hay `chromium` en el PATH y no vamos a pedirle que lo
 *      instale a mano para tocar el cotizador.
 *
 * El import de Playwright va con el especificador en una variable a propósito:
 * así el bundler no lo resuelve en build (Playwright no está en
 * `dependencies`) y en producción esta rama ni se pisa.
 */
export async function resolverChromium(): Promise<string | null> {
  if (cacheBinario) return cacheBinario.valor;

  const forzado = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (forzado) {
    cacheBinario = { valor: forzado };
    return forzado;
  }

  for (const bin of BINARIOS) {
    const ruta = await which(bin);
    if (ruta) {
      cacheBinario = { valor: ruta };
      return ruta;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const modulo = "playwright";
      const { chromium } = (await import(/* webpackIgnore: true */ modulo)) as {
        chromium: { executablePath(): string };
      };
      const ruta = chromium.executablePath();
      if (ruta) {
        cacheBinario = { valor: ruta };
        return ruta;
      }
    } catch {
      // Playwright no está instalado: seguimos sin navegador.
    }
  }

  cacheBinario = { valor: null };
  return null;
}

/** ¿Se puede generar PDF en esta máquina y en este momento? */
export async function pdfDisponible(): Promise<boolean> {
  if (process.env.COTIZADOR_PDF_OFF === "1") return false;
  return (await resolverChromium()) !== null;
}

// ---------------------------------------------------------------------------
// Semáforo
// ---------------------------------------------------------------------------

const MAX_CONCURRENTES = 2;
const ESPERA_MAX_MS = 30_000;

let enVuelo = 0;
const cola: Array<{ seguir: () => void; reloj: NodeJS.Timeout }> = [];

function liberarTurno(): void {
  const siguiente = cola.shift();
  if (siguiente) {
    clearTimeout(siguiente.reloj);
    siguiente.seguir();
    return;
  }
  enVuelo = Math.max(0, enVuelo - 1);
}

/** Reserva uno de los dos slots. Devuelve la función que lo suelta. */
async function tomarTurno(): Promise<() => void> {
  if (enVuelo < MAX_CONCURRENTES) {
    enVuelo += 1;
    return liberarTurno;
  }

  await new Promise<void>((resolve, reject) => {
    const entrada = {
      seguir: resolve,
      reloj: setTimeout(() => {
        const i = cola.indexOf(entrada);
        if (i >= 0) cola.splice(i, 1);
        reject(
          new ErrorPdf(
            "OCUPADO",
            "Hay varios PDF generándose al mismo tiempo. Probá de nuevo en un minuto.",
          ),
        );
      }, ESPERA_MAX_MS),
    };
    cola.push(entrada);
  });

  // El slot no se incrementa: se hereda del render que acaba de terminar.
  return liberarTurno;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/** Techo duro del render entero, desde que hay navegador hasta el Buffer. */
const TOTAL_MS = 45_000;
/** Techo del `launch`. Si Chromium no arranca en 20 s, no arranca. */
const LANZAR_MS = 20_000;
/** Techo del `goto`. Corta en `domcontentloaded`, así que 20 s sobran. */
const NAVEGAR_MS = 20_000;
/** Techo para que aparezca `.print-hoja` (la pinta React tras hidratar). */
const HOJA_MS = 15_000;
/** Las fuentes salen del mismo Next: si igual tardan, se imprime sin ellas. */
const FUENTES_MS = 8_000;
/** Ídem las imágenes: mejor una foto faltante que un PDF que nunca sale. */
const IMAGENES_MS = 8_000;
/** Respiro con el layout de impresión puesto, antes de disparar el print. */
const ASENTAR_MS = 300;

const ARGS = [
  // El contenedor corre como root y sin namespaces de usuario: el sandbox de
  // Chromium no puede levantarse ahí. La superficie que abrimos es acotada —
  // el navegador solo carga nuestra propia página.
  "--no-sandbox",
  "--disable-setuid-sandbox",
  // /dev/shm en el contenedor es de 64 MB; sin esto Chromium se cae solo.
  "--disable-dev-shm-usage",
  "--disable-gpu",
  // Sin hinting el texto sale igual en el server que en la Mac del vendedor.
  "--font-render-hinting=none",
];

function conTiempo<T>(
  p: Promise<T>,
  ms: number,
  mensaje: string,
  etapa: EtapaPdf | null | (() => EtapaPdf | null) = null,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reloj = setTimeout(() => {
      const donde = typeof etapa === "function" ? etapa() : etapa;
      reject(new ErrorPdf("TIMEOUT", mensaje, donde));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(reloj);
        resolve(v);
      },
      (e) => {
        clearTimeout(reloj);
        reject(e);
      },
    );
  });
}

/** Lo que el render va anotando por el camino, para el log y para el error. */
interface DetalleRender {
  /** Etapa en curso: si vence el techo total, dice dónde estábamos. */
  paso: EtapaPdf;
  /** Status HTTP del `goto`. */
  status: number | null;
  /** URL final tras redirects, con el token tapado. */
  urlFinal: string | null;
  /** Milisegundos por etapa. */
  tiempos: Partial<Record<EtapaPdf, number>>;
  /** Familias que el navegador terminó de cargar, para el log. */
  familias: string[] | null;
  /**
   * "HeadlessChrome/137.0.7151.55" — el motor que imprimió.
   *
   * Va al log de cada PDF porque la paginación depende de la versión: las
   * margin boxes del `@page` con `counter(page)` (el pie con el número de
   * página, en _mockup/styles.js) las dibuja Chromium 131 o más nuevo. Si
   * mañana un PDF sale sin pie, esto dice en una línea si el contenedor se
   * quedó atrás en vez de mandarnos a adivinar.
   */
  chromium: string | null;
}

function nuevoDetalle(): DetalleRender {
  return {
    paso: "lanzar", status: null, urlFinal: null, tiempos: {},
    familias: null, chromium: null,
  };
}

async function abrirNavegador(): Promise<Browser> {
  const ejecutable = await resolverChromium();
  if (!ejecutable) {
    throw new ErrorPdf(
      "SIN_CHROMIUM",
      "Este servidor no tiene Chromium instalado, así que no puede generar el PDF.",
      "lanzar",
    );
  }

  const { default: puppeteer } = await import("puppeteer-core");
  const lanzando = puppeteer.launch({
    executablePath: ejecutable,
    headless: true,
    args: ARGS,
  });

  try {
    return await conTiempo(lanzando, LANZAR_MS, "Chromium no llegó a arrancar.", "lanzar");
  } catch (err) {
    // Si el launch resuelve tarde, el navegador quedaría suelto: lo cerramos.
    void lanzando.then((n) => n.close()).catch(() => {});
    if (err instanceof ErrorPdf) throw err;
    throw new ErrorPdf("DESCONOCIDO", `Chromium no arrancó: ${mensajeCorto(err)}`, "lanzar");
  }
}

/**
 * Deja todas las animaciones en su fotograma final.
 *
 * La hoja usa `.a-slide { animation: slideDown .22s both }` para que las
 * tarjetas entren deslizándose. Ese `both` significa que, ANTES del primer
 * fotograma, el elemento se queda en el keyframe inicial: `opacity: 0`. Y este
 * Chromium headless, sin GPU y sin ventana, no dibuja fotogramas: el reloj de
 * la animación no avanza nunca. Resultado: el PDF salía sin el hotel ni las
 * tarifas —un recuadro blanco donde el pasajero ve la tarjeta en pantalla— y
 * el vendedor mandaba eso por email sin enterarse.
 *
 * Dos cinturones: la hoja de estilos aplasta duraciones y transiciones (todo
 * arranca ya terminado) y `finish()` cierra lo que hubiera quedado corriendo.
 */
async function congelarAnimaciones(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      const estilo = document.createElement("style");
      estilo.textContent =
        "*,*::before,*::after{animation-delay:0s !important;" +
        "animation-duration:0s !important;animation-fill-mode:forwards !important;" +
        "transition:none !important;}";
      document.head.appendChild(estilo);
      for (const anim of document.getAnimations?.() ?? []) {
        try {
          anim.finish();
        } catch {
          // Una animación infinita no se puede terminar; el CSS de arriba ya la
          // dejó en su estado final.
        }
      }
    })
    .catch(() => {});
}

/**
 * El render propiamente dicho, etapa por etapa.
 *
 * Nada de `networkidle0`: la hoja tiene beacons y conexiones que pueden no
 * cerrarse nunca, y esperar a que la red quede quieta era exactamente lo que
 * agotaba el techo del `goto` sin decir por qué. Se corta en
 * `domcontentloaded` y después se espera lo que sí importa: la hoja, las
 * fuentes y las imágenes, cada una con su propio reloj.
 */
async function correr(
  navegador: Browser,
  url: string,
  requiereHoja: boolean,
  detalle: DetalleRender,
): Promise<Buffer> {
  const page: Page = await navegador.newPage();
  await page.setViewport({ width: 1280, height: 1696, deviceScaleFactor: 1 });
  // El beacon de aperturas descarta las visitas con este header: el render del
  // PDF no es el pasajero leyendo la cotización.
  await page.setExtraHTTPHeaders({ "x-cotizador-pdf": "1" });

  // ── goto ────────────────────────────────────────────────────────────────
  detalle.paso = "goto";
  let reloj = Date.now();
  let resp;
  try {
    resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVEGAR_MS });
  } catch (err) {
    detalle.tiempos.goto = Date.now() - reloj;
    if (esTimeout(err)) {
      throw new ErrorPdf("TIMEOUT", "La página de la cotización no cargó a tiempo.", "goto");
    }
    throw new ErrorPdf(
      "NAVEGACION",
      `El navegador no pudo abrir la página: ${mensajeCorto(err)}`,
      "goto",
    );
  }
  detalle.tiempos.goto = Date.now() - reloj;
  detalle.status = resp ? resp.status() : null;
  detalle.urlFinal = sinToken(page.url());

  if (resp && resp.status() !== 200) {
    throw new ErrorPdf(
      "NAVEGACION",
      `La página respondió ${resp.status()} en vez de la hoja.`,
      "goto",
    );
  }

  // ── hoja ────────────────────────────────────────────────────────────────
  if (requiereHoja) {
    detalle.paso = "hoja";
    reloj = Date.now();
    try {
      await page.waitForSelector(".print-hoja", { timeout: HOJA_MS });
    } catch {
      detalle.tiempos.hoja = Date.now() - reloj;
      throw new ErrorPdf(
        "PAGINA_INVALIDA",
        "La página de la cotización no devolvió la hoja de impresión.",
        "hoja",
      );
    }
    detalle.tiempos.hoja = Date.now() - reloj;
  }

  // ── fuentes ─────────────────────────────────────────────────────────────
  // Las declara el CSS del cotizador y las sirve este mismo Next desde
  // /fonts/cotizador (antes venían de Google Fonts, que este contenedor no
  // alcanza: por eso el PDF salía en DejaVu). Imprimir antes de que carguen
  // deja la cotización en la tipografía del sistema, que es exactamente lo que
  // el vendedor no aprobó. Si no llegan, se sigue igual.
  detalle.paso = "fuentes";
  reloj = Date.now();
  await conTiempo(
    page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => undefined) : undefined)),
    FUENTES_MS,
    "Las fuentes no terminaron de cargar.",
    "fuentes",
  ).catch(() => {});
  detalle.tiempos.fuentes = Date.now() - reloj;
  // Qué familias quedaron cargadas de verdad. Es la única forma de ver desde
  // afuera si el PDF salió con la tipografía buena: si acá faltan DM Sans,
  // Playfair Display o JetBrains Mono, la hoja se imprimió con el respaldo.
  detalle.familias = await page
    .evaluate(() => {
      if (!document.fonts) return [];
      const vistas: Record<string, true> = {};
      document.fonts.forEach((f) => {
        // Chromium devuelve el family entrecomillado ("DM Sans"): se limpia.
        if (f.status === "loaded") vistas[f.family.replace(/^["']|["']$/g, "")] = true;
      });
      return Object.keys(vistas).sort();
    })
    .catch(() => null);

  // ── imágenes ────────────────────────────────────────────────────────────
  // Dos trampas de este paso, las dos costaban el techo entero de la etapa en
  // CADA render:
  //
  //   1. `loading="lazy"`. El navegador no baja lo que está fuera de la
  //      ventana, y como acá nadie scrollea, esas <img> nunca se completan:
  //      la espera vencía sola y encima el PDF salía con los huecos. Se pasan
  //      todas a `eager`, que dispara la descarga en el acto.
  //   2. `polling`. El default de `waitForFunction` es `requestAnimationFrame`
  //      y en este Chromium headless (sin GPU, sin ventana) el rAF de la
  //      página NO tickea: la condición se evaluaba una sola vez, al
  //      principio, y después esperaba un frame que nunca llegaba. Con reloj
  //      propio cada 100 ms se resuelve apenas están.
  detalle.paso = "imagenes";
  reloj = Date.now();
  await page
    .evaluate(() => {
      for (const img of Array.from(document.images)) img.loading = "eager";
    })
    .catch(() => {});
  await page
    .waitForFunction(() => Array.from(document.images).every((i) => i.complete), {
      timeout: IMAGENES_MS,
      polling: 100,
    })
    .catch(() => {});
  detalle.tiempos.imagenes = Date.now() - reloj;

  // ── pdf ─────────────────────────────────────────────────────────────────
  detalle.paso = "pdf";
  reloj = Date.now();
  try {
    await congelarAnimaciones(page);
    await page.emulateMediaType("print");
    // Respiro con el layout de impresión ya aplicado.
    await new Promise<void>((r) => setTimeout(r, ASENTAR_MS));
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    detalle.tiempos.pdf = Date.now() - reloj;
    return Buffer.from(pdf);
  } catch (err) {
    detalle.tiempos.pdf = Date.now() - reloj;
    if (esTimeout(err)) {
      throw new ErrorPdf("TIMEOUT", "La impresión no terminó a tiempo.", "pdf");
    }
    throw new ErrorPdf("DESCONOCIDO", `Falló la impresión: ${mensajeCorto(err)}`, "pdf");
  }
}

async function imprimir(
  url: string,
  requiereHoja: boolean,
  detalle: DetalleRender,
): Promise<Buffer> {
  const navegador = await abrirNavegador();
  try {
    // La misma llamada que usa `saludPdf`: un CDP `Browser.getVersion`, gratis
    // al lado de lo que cuesta el render. Si falla, el PDF sigue igual.
    detalle.chromium = await navegador.version().catch(() => null);
    return await conTiempo(
      correr(navegador, url, requiereHoja, detalle),
      TOTAL_MS,
      "El PDF tardó demasiado en generarse.",
      () => detalle.paso,
    );
  } finally {
    await navegador.close().catch((err) => log.warn("pdf.cerrar.fail", { err }));
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** `COT-2026-0001.pdf`, con el número saneado por si trae algo raro. */
export function nombreArchivoPdf(numero: string): string {
  const limpio = String(numero ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${limpio || "cotizacion"}.pdf`;
}

export interface RenderPdfInput {
  /** Token del link público vivo. Es lo único que identifica la hoja. */
  token: string;
  /** Número de la cotización, solo para el log y el nombre del archivo. */
  numero: string;
}

/**
 * El PDF de una cotización, tal cual lo ve el pasajero en `/c/<token>?print=1`.
 *
 * Tira `ErrorPdf` con código y etapa; el caller decide si eso es un 503, un
 * 504 o un email sin adjunto.
 */
export async function renderizarPdfDeCotizacion({
  token,
  numero,
}: RenderPdfInput): Promise<Buffer> {
  if (process.env.COTIZADOR_PDF_OFF === "1") {
    throw new ErrorPdf("SIN_CHROMIUM", "La generación de PDF está apagada.");
  }

  const soltar = await tomarTurno();
  const arranque = Date.now();
  const base = baseDeRenderPdf();
  const detalle = nuevoDetalle();
  try {
    const url = `${base}/c/${encodeURIComponent(token)}?print=1`;
    const buffer = await imprimir(url, true, detalle);
    log.info("cotizador.pdf.ok", {
      numero,
      base,
      ms: Date.now() - arranque,
      bytes: buffer.length,
      status: detalle.status,
      chromium: detalle.chromium,
      tiempos: detalle.tiempos,
      familias: detalle.familias,
    });
    return buffer;
  } catch (err) {
    log.error("cotizador.pdf.fail", {
      numero,
      base,
      ms: Date.now() - arranque,
      codigo: codigoDeError(err) ?? "DESCONOCIDO",
      etapa: etapaDeError(err) ?? detalle.paso,
      status: detalle.status,
      urlFinal: detalle.urlFinal,
      tiempos: detalle.tiempos,
      err,
    });
    throw err;
  } finally {
    soltar();
  }
}

/**
 * Igual que el anterior pero contra una URL cualquiera y, por default, sin
 * exigir `.print-hoja`. No lo usa el producto: existe para probar el pipeline
 * (binario, semáforo, `page.pdf`, el chequeo de la hoja) sin depender de que
 * haya una cotización viva del otro lado.
 */
export async function renderizarPdfDeUrl(
  url: string,
  opts: { requiereHoja?: boolean } = {},
): Promise<Buffer> {
  const soltar = await tomarTurno();
  const arranque = Date.now();
  const detalle = nuevoDetalle();
  try {
    const buffer = await imprimir(url, opts.requiereHoja === true, detalle);
    log.info("pdf.url.ok", {
      ms: Date.now() - arranque,
      bytes: buffer.length,
      status: detalle.status,
      tiempos: detalle.tiempos,
    });
    return buffer;
  } catch (err) {
    log.error("pdf.url.fail", {
      ms: Date.now() - arranque,
      codigo: codigoDeError(err) ?? "DESCONOCIDO",
      etapa: etapaDeError(err) ?? detalle.paso,
      status: detalle.status,
      urlFinal: detalle.urlFinal,
      tiempos: detalle.tiempos,
      err,
    });
    throw err;
  } finally {
    soltar();
  }
}

/** Lo que devuelve el chequeo de salud. */
export interface SaludPdf {
  ok: boolean;
  chromium: string | null;
  version?: string;
  ms: number;
  error?: string;
  /** Solo con `{ render: true }`: la prueba de ida y vuelta por la base real. */
  render?: {
    base: string;
    url: string;
    /** El navegador recibió una respuesta HTTP: la base es alcanzable. */
    alcanzado: boolean;
    /** Además contestó 200. Un 503 acá es la base caída, no el loopback roto. */
    ok: boolean;
    status: number | null;
    ms: number;
    error?: string;
  };
}

/**
 * Chequeo de salud: arranca el navegador, pide la versión y lo cierra.
 *
 * Con `{ render: true }` además navega a `${baseDeRenderPdf()}/api/health` por
 * la MISMA base que usa el render de verdad. Eso es lo que responde, en un
 * solo request y sin tocar ninguna cotización, la pregunta que importa después
 * de un deploy: ¿el navegador del contenedor llega a nuestro propio Next?
 */
export async function saludPdf(opts: { render?: boolean } = {}): Promise<SaludPdf> {
  const arranque = Date.now();
  const chromium = await resolverChromium();
  if (!chromium || process.env.COTIZADOR_PDF_OFF === "1") {
    return {
      ok: false,
      chromium,
      ms: Date.now() - arranque,
      error: chromium ? "COTIZADOR_PDF_OFF=1" : "SIN_CHROMIUM",
    };
  }

  let navegador: Browser | null = null;
  try {
    navegador = await abrirNavegador();
    const version = await navegador.version();
    const salida: SaludPdf = { ok: true, chromium, version, ms: Date.now() - arranque };

    if (opts.render) {
      const base = baseDeRenderPdf();
      const url = `${base}/api/health`;
      const t = Date.now();
      try {
        const page = await navegador.newPage();
        await page.setExtraHTTPHeaders({ "x-cotizador-pdf": "1" });
        const resp = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: NAVEGAR_MS,
        });
        const status = resp ? resp.status() : null;
        salida.render = {
          base,
          url,
          alcanzado: status !== null,
          ok: status === 200,
          status,
          ms: Date.now() - t,
        };
      } catch (err) {
        salida.render = {
          base,
          url,
          alcanzado: false,
          ok: false,
          status: null,
          ms: Date.now() - t,
          error: mensajeCorto(err),
        };
      }
      // El `ok` de arriba se cae solo si el navegador NO llegó a nuestro Next.
      // Que /api/health conteste 503 (base o storage caídos) es otro problema,
      // y este chequeo no es el que lo tiene que gritar.
      if (!salida.render.alcanzado) salida.ok = false;
    }

    return salida;
  } catch (err) {
    return {
      ok: false,
      chromium,
      ms: Date.now() - arranque,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (navegador) await navegador.close().catch(() => {});
  }
}
