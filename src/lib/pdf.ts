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
// El navegador entra por la URL pública (`SITE_BASE_URL`), o sea que el
// contenedor se pide a sí mismo pasando por el proxy de Railway. Es a
// propósito: así imprime exactamente lo que ve el pasajero, con el mismo
// middleware, los mismos headers y el mismo CSS. Si algún día el contenedor no
// puede salir a su propio dominio, el síntoma es TIMEOUT en todos los renders.
//
// Nada de lo que se loguea acá incluye el contenido de la cotización: número,
// duración y tamaño, y listo.
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
  | "TIMEOUT" // la página no terminó de cargar dentro del techo
  | "PAGINA_INVALIDA" // cargó algo, pero no era la hoja de impresión
  | "OCUPADO"; // los dos slots ocupados y la espera se agotó

export class ErrorPdf extends Error {
  readonly codigo: CodigoErrorPdf;
  constructor(codigo: CodigoErrorPdf, mensaje: string) {
    super(mensaje);
    this.name = "ErrorPdf";
    this.codigo = codigo;
  }
}

/** Código del error si es nuestro; si no, null (un bug distinto). */
export function codigoDeError(err: unknown): CodigoErrorPdf | null {
  return err instanceof ErrorPdf ? err.codigo : null;
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
/** Techo del `goto`. */
const NAVEGAR_MS = 30_000;
/** Cuánto esperamos la hoja y las imágenes ya con el HTML cargado. */
const HOJA_MS = 10_000;

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

function conTiempo<T>(p: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reloj = setTimeout(() => reject(new ErrorPdf("TIMEOUT", mensaje)), ms);
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

async function abrirNavegador(): Promise<Browser> {
  const ejecutable = await resolverChromium();
  if (!ejecutable) {
    throw new ErrorPdf(
      "SIN_CHROMIUM",
      "Este servidor no tiene Chromium instalado, así que no puede generar el PDF.",
    );
  }

  const { default: puppeteer } = await import("puppeteer-core");
  const lanzando = puppeteer.launch({
    executablePath: ejecutable,
    headless: true,
    args: ARGS,
  });

  try {
    return await conTiempo(lanzando, LANZAR_MS, "Chromium no llegó a arrancar.");
  } catch (err) {
    // Si el launch resuelve tarde, el navegador quedaría suelto: lo cerramos.
    void lanzando.then((n) => n.close()).catch(() => {});
    throw err;
  }
}

/** Espera a que la hoja esté realmente lista: fuentes e imágenes incluidas. */
async function esperarPintado(page: Page, requiereHoja: boolean): Promise<void> {
  if (requiereHoja) {
    try {
      await page.waitForSelector(".print-hoja", { timeout: HOJA_MS });
    } catch {
      throw new ErrorPdf(
        "PAGINA_INVALIDA",
        "La página de la cotización no devolvió la hoja de impresión.",
      );
    }
  }

  // Las fuentes vienen de Google Fonts (@import del CSS del cotizador).
  // Imprimir antes de que carguen deja la cotización en la tipografía del
  // sistema, que es exactamente lo que el vendedor no aprobó.
  await page
    .evaluate(() => (document.fonts ? document.fonts.ready.then(() => undefined) : undefined))
    .catch(() => {});

  // `networkidle0` no garantiza que las <img> hayan decodificado.
  await page
    .waitForFunction(
      () => Array.from(document.images).every((i) => i.complete),
      { timeout: HOJA_MS },
    )
    .catch(() => {});
}

async function imprimir(url: string, requiereHoja: boolean): Promise<Buffer> {
  const navegador = await abrirNavegador();
  try {
    return await conTiempo(
      (async () => {
        const page = await navegador.newPage();
        await page.setViewport({ width: 1280, height: 1696, deviceScaleFactor: 1 });
        // El beacon de aperturas descarta las visitas con este header: el
        // render del PDF no es el pasajero leyendo la cotización.
        await page.setExtraHTTPHeaders({ "x-cotizador-pdf": "1" });

        const resp = await page.goto(url, {
          waitUntil: "networkidle0",
          timeout: NAVEGAR_MS,
        });
        if (requiereHoja && resp && !resp.ok()) {
          throw new ErrorPdf(
            "PAGINA_INVALIDA",
            `La cotización respondió ${resp.status()} en vez de la hoja.`,
          );
        }

        await esperarPintado(page, requiereHoja);
        await page.emulateMediaType("print");

        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        return Buffer.from(pdf);
      })(),
      TOTAL_MS,
      "El PDF tardó demasiado en generarse.",
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
 * Tira `ErrorPdf` con código; el caller decide si eso es un 503, un 504 o un
 * email sin adjunto.
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
  try {
    const url = `${SITE_BASE_URL}/c/${encodeURIComponent(token)}?print=1`;
    const buffer = await imprimir(url, true);
    log.info("cotizador.pdf.ok", {
      numero,
      ms: Date.now() - arranque,
      bytes: buffer.length,
    });
    return buffer;
  } catch (err) {
    log.error("cotizador.pdf.fail", {
      numero,
      ms: Date.now() - arranque,
      codigo: codigoDeError(err) ?? "DESCONOCIDO",
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
  try {
    const buffer = await imprimir(url, opts.requiereHoja === true);
    log.info("pdf.url.ok", { ms: Date.now() - arranque, bytes: buffer.length });
    return buffer;
  } finally {
    soltar();
  }
}

/**
 * Chequeo de salud: arranca el navegador, pide la versión y lo cierra. No
 * navega a ningún lado, así que no depende de la base ni de la red.
 */
export async function saludPdf(): Promise<{
  ok: boolean;
  chromium: string | null;
  version?: string;
  ms: number;
  error?: string;
}> {
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
    return { ok: true, chromium, version, ms: Date.now() - arranque };
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
