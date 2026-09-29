// Publica el design system de Traveloz Collection en /collection.
//
// Toma el zip que exporta Claude Design, deja la página en public/collection
// (la sirve el rewrite de next.config.mjs) y el material de contexto del
// proyecto en docs/collection/contexto (queda en el repo, no se publica).
//
// Uso: node scripts/import-collection.mjs "<ruta>/Traveloz Collection Design System.zip"
//
// Correrlo de nuevo con cada export: reemplaza lo anterior entero.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const zip = process.argv[2];
if (!zip) {
  console.error('Uso: node scripts/import-collection.mjs "<export>.zip"');
  process.exit(1);
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destino = path.join(raiz, "public/collection");
const contexto = path.join(raiz, "docs/collection/contexto");
const require = createRequire(import.meta.url);

const tmp = mkdtempSync(path.join(tmpdir(), "collection-"));
try {
  execFileSync("unzip", ["-q", zip, "-d", tmp]);

  const dc = readdirSync(tmp).find((f) => f.endsWith(".dc.html"));
  if (!dc) throw new Error("El zip no trae ningún .dc.html");

  // support.js es el runtime de Claude Design y baja React de unpkg, que la
  // CSP del sitio no deja cargar. Si ya encuentra window.React no lo pide,
  // así que se lo servimos desde vendor/, copiado de node_modules. La versión
  // tiene que ser la misma que fija el runtime.
  const runtime = readFileSync(path.join(tmp, "support.js"), "utf8");
  const reactRuntime = runtime.match(/unpkg\.com\/react@([\d.]+)\//)?.[1];
  const reactLocal = require("react/package.json").version;
  if (reactRuntime !== reactLocal) {
    throw new Error(`El runtime pide React ${reactRuntime} y node_modules tiene ${reactLocal}`);
  }

  let html = readFileSync(path.join(tmp, dc), "utf8");
  const reemplazar = (de, a) => {
    if (!html.includes(de)) throw new Error(`No encontré ${JSON.stringify(de)} en ${dc}: cambió el formato del export`);
    html = html.replaceAll(de, a);
  };

  // La página vive en /collection, sin barra final: una ruta relativa como
  // "assets/logo.png" resolvería contra la raíz del sitio. Van absolutas.
  reemplazar(
    '<script src="./support.js"></script>',
    ["vendor/react.production.min.js", "vendor/react-dom.production.min.js", "support.js"]
      .map((f) => `<script src="/collection/${f}"></script>`)
      .join("\n"),
  );
  reemplazar('"assets/', '"/collection/assets/');
  reemplazar(
    '<meta charset="utf-8">\n',
    '<meta charset="utf-8">\n<title>Traveloz Collection · Design System</title>\n<meta name="robots" content="noindex, nofollow">\n',
  );
  if (/["'(](\.\/)?assets\//.test(html)) throw new Error(`Quedó una ruta relativa a assets/ en ${dc}`);

  const umd = (pkg) => path.join(path.dirname(require.resolve(`${pkg}/package.json`)), `umd/${pkg}.production.min.js`);

  rmSync(destino, { recursive: true, force: true });
  cpSync(path.join(tmp, "assets"), path.join(destino, "assets"), { recursive: true });
  cpSync(path.join(tmp, "support.js"), path.join(destino, "support.js"));
  cpSync(path.join(tmp, "icons.json"), path.join(destino, "icons.json"));
  cpSync(umd("react"), path.join(destino, "vendor/react.production.min.js"));
  cpSync(umd("react-dom"), path.join(destino, "vendor/react-dom.production.min.js"));
  writeFileSync(path.join(destino, "index.html"), html);

  const uploads = path.join(tmp, "uploads/traveloz-collection-contexto-diseno");
  if (existsSync(uploads)) {
    rmSync(contexto, { recursive: true, force: true });
    cpSync(uploads, contexto, { recursive: true });
  }

  console.log(`Listo: ${dc} -> public/collection/index.html`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
