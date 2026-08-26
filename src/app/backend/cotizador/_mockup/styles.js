const CSS = `
/* ── tipografías, self-hosted ────────────────────────────────────────────
   Antes esto era un @import a fonts.googleapis.com. En el navegador andaba
   (la CSP del panel abría los dos orígenes de Google), pero el PDF lo saca
   Chromium DENTRO del contenedor de Railway y esa red no llega a gstatic:
   la hoja salía impresa en DejaVu. Los .woff2 viven ahora en public/ y los
   sirve el mismo Next por el que entra el render, así que la única familia
   que puede faltar es una que no hayamos copiado.

   Son los archivos variables que sirve gstatic, tal cual: un eje wght por
   familia (DM Sans trae además opsz, que el navegador mueve solo según el
   font-size). Van los dos subconjuntos, latin y latin-ext, con el mismo
   unicode-range que declara Google — así latin-ext solo se baja si aparece
   un nombre con caracteres del este europeo. Ojo con esto: → y ✓ no están en
   ninguno de los dos subconjuntos, ni antes ni ahora, y los dibuja la fuente
   de respaldo. */
@font-face {
  font-family:'DM Sans'; font-style:normal; font-weight:400; font-display:swap;
  src:url("/fonts/cotizador/dm-sans-v17-latin.woff2") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
@font-face {
  font-family:'DM Sans'; font-style:normal; font-weight:500; font-display:swap;
  src:url("/fonts/cotizador/dm-sans-v17-latin.woff2") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
@font-face {
  font-family:'DM Sans'; font-style:normal; font-weight:700; font-display:swap;
  src:url("/fonts/cotizador/dm-sans-v17-latin.woff2") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
@font-face {
  font-family:'DM Sans'; font-style:normal; font-weight:400; font-display:swap;
  src:url("/fonts/cotizador/dm-sans-v17-latin-ext.woff2") format("woff2");
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
}
@font-face {
  font-family:'DM Sans'; font-style:normal; font-weight:500; font-display:swap;
  src:url("/fonts/cotizador/dm-sans-v17-latin-ext.woff2") format("woff2");
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
}
@font-face {
  font-family:'DM Sans'; font-style:normal; font-weight:700; font-display:swap;
  src:url("/fonts/cotizador/dm-sans-v17-latin-ext.woff2") format("woff2");
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
}
@font-face {
  font-family:'Playfair Display'; font-style:normal; font-weight:400 900; font-display:swap;
  src:url("/fonts/cotizador/playfair-display-v40-latin.woff2") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
@font-face {
  font-family:'Playfair Display'; font-style:normal; font-weight:400 900; font-display:swap;
  src:url("/fonts/cotizador/playfair-display-v40-latin-ext.woff2") format("woff2");
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
}
@font-face {
  font-family:'JetBrains Mono'; font-style:normal; font-weight:100 800; font-display:swap;
  src:url("/fonts/cotizador/jetbrains-mono-v24-latin.woff2") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
@font-face {
  font-family:'JetBrains Mono'; font-style:normal; font-weight:100 800; font-display:swap;
  src:url("/fonts/cotizador/jetbrains-mono-v24-latin-ext.woff2") format("woff2");
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
}

.ctz *, .ctz *::before, .ctz *::after { box-sizing: border-box; }
.ctz {
  --teal-1:#45D4C0; --teal-2:#2A9E8E; --teal-3:#1F7D70;
  --violet:#785AE5; --violet-2:#A05ED3; --coral:#F43E55;
  --navy:#1A3A5C; --ink:#1A1A2E; --ink-2:#111124;
  --page:#F5F6FA; --card:#FFFFFF;
  --n300:#B0B4CD; --n400:#8A8DB5; --n500:#6B6F99; --n600:#3D4066; --n100:#ECEDF5; --n50:#F5F6FA;
  --hair:rgba(17,17,36,0.09); --hair-soft:rgba(17,17,36,0.055);
  --brand-a:#F43E55; --brand-b:#785AE5;
  /* v2D · superficies y tintas con nombre: son las que cambian en modo oscuro.
     Los gradientes de marca (coral→violeta) y la acción teal NO se tocan nunca. */
  --card-2:#FAFBFE; --card-3:#FCFCFE; --pop:#FFFFFF; --tile:#F5F6FA;
  --field:#FFFFFF; --field-brd:rgba(17,17,36,.14);
  --sunk:rgba(17,17,36,.05); --sunk-2:rgba(17,17,36,.09); --wash:rgba(17,17,36,.025);
  --glass:rgba(245,246,250,.86);
  --violet-ink:#5B3FBF; --ink-amber:#8A5A16; --ink-coral:#CC2030;
  --wa-bg:#E6F8F5; --wa-fg:#165C53;
  font-family:'DM Sans',system-ui,sans-serif;
  color:var(--ink); background:var(--page);
  font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased;
}

/* :where() deja el reset con especificidad (0,1,0): cualquier clase de botón
   definida más abajo (.btn-p, .btn-hero, .chip-on…) le gana por orden. Con
   ".ctz button" a secas, el reset pisaba el fondo de TODOS los botones. */
.ctz :where(button) { font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.ctz input,.ctz textarea,.ctz select { font-family:inherit; font-size:inherit; color:inherit; }
.ctz input:focus,.ctz textarea:focus,.ctz button:focus-visible,.ctz select:focus { outline:none; }
.ctz :focus-visible { box-shadow:0 0 0 2px #fff, 0 0 0 4px rgba(59,191,173,.45) !important; border-radius:8px; }

/* ── tipografía utilitaria ───────────────────────────────────────────── */
.lbl { font-size:10.5px; letter-spacing:.08em; line-height:1; text-transform:uppercase; font-weight:700; color:var(--n400); }
.mono { font-family:'JetBrains Mono',monospace; font-size:12px; }
.disp { font-family:'Playfair Display',Georgia,serif; }

/* ── superficies ─────────────────────────────────────────────────────── */
.card { background:var(--card); border:1px solid var(--hair-soft); border-radius:16px;
  box-shadow:0 1px 2px rgba(26,26,46,.04), 0 8px 24px -12px rgba(26,26,46,.10); }
.blk { background:var(--card); border:1px solid var(--hair-soft); border-radius:18px; margin-bottom:14px;
  box-shadow:0 1px 2px rgba(26,26,46,.035), 0 10px 30px -18px rgba(26,26,46,.14);
  transition:box-shadow .25s cubic-bezier(.2,.8,.2,1), border-color .25s; scroll-margin-top:84px; }
.blk:focus-within { border-color:rgba(120,90,229,.28);
  box-shadow:0 1px 2px rgba(26,26,46,.04), 0 14px 40px -20px rgba(120,90,229,.32); }
.blk-h { display:flex; align-items:center; gap:10px; padding:14px 18px 0; }
.blk-b { padding:14px 18px 18px; }
.blk-ico { width:28px; height:28px; border-radius:9px; display:grid; place-items:center;
  background:linear-gradient(145deg,rgba(120,90,229,.13),rgba(120,90,229,.05));
  color:var(--violet); flex-shrink:0; }
.blk-t { font-size:13.5px; font-weight:700; letter-spacing:-.01em; }

/* ── inputs ──────────────────────────────────────────────────────────── */
.in { width:100%; height:38px; padding:0 12px; background:var(--field); border:1px solid var(--field-brd);
  border-radius:9px; font-size:13.5px; box-shadow:inset 0 1px 0 rgba(17,17,36,.03);
  transition:border-color .16s, box-shadow .16s; }
.in:hover { border-color:rgba(17,17,36,.24); }
.in:focus { border-color:var(--teal-2); box-shadow:0 0 0 3px rgba(59,191,173,.15); }
.in::placeholder { color:var(--n300); }
textarea.in { height:auto; padding:10px 12px; resize:vertical; line-height:1.6; }
.in-lg { height:44px; font-size:15px; font-weight:500; }

/* ── botones ─────────────────────────────────────────────────────────── */
.btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-weight:600;
  border-radius:11px; height:38px; padding:0 16px; font-size:13px; white-space:nowrap;
  transition:transform .12s cubic-bezier(.2,.8,.2,1), box-shadow .18s, background .18s, color .18s; }
.btn:active { transform:scale(.965); }
.btn-p { color:#fff; background:linear-gradient(145deg,var(--teal-1),var(--teal-2));
  box-shadow:5px 5px 14px rgba(42,158,142,.24), -3px -3px 9px rgba(69,212,192,.26), inset 0 1px 0 rgba(255,255,255,.34); }
.btn-p:hover { box-shadow:6px 8px 20px rgba(42,158,142,.30), -3px -3px 10px rgba(69,212,192,.30), inset 0 1px 0 rgba(255,255,255,.4); }
.btn-p:active { box-shadow:2px 2px 7px rgba(42,158,142,.24), inset 0 2px 6px rgba(0,0,0,.10); }
.btn-v { color:#fff; background:linear-gradient(145deg,var(--violet-2),var(--violet));
  box-shadow:5px 5px 14px rgba(120,90,229,.24), inset 0 1px 0 rgba(255,255,255,.28); }
.btn-s { background:#fff; border:1px solid var(--hair); color:var(--n600);
  box-shadow:0 1px 2px rgba(26,26,46,.04); }
.btn-s:hover { border-color:rgba(17,17,36,.2); background:#FCFCFE; }
.btn-g { color:var(--n500); }
.btn-g:hover { background:rgba(17,17,36,.045); color:var(--ink); }
/* tintados suaves: cada acción con su color, nada de fila de botones todos blancos */
.btn-tv { background:rgba(120,90,229,.09); border:1px solid rgba(120,90,229,.3); color:var(--violet-ink); }
.btn-tv:hover { background:rgba(120,90,229,.16); border-color:rgba(120,90,229,.5); }
.btn-tt { background:rgba(59,191,173,.10); border:1px solid rgba(59,191,173,.34); color:var(--teal-3); }
.btn-tt:hover { background:rgba(59,191,173,.17); border-color:rgba(59,191,173,.55); }
.btn-ta { background:rgba(247,178,103,.14); border:1px solid rgba(247,178,103,.42); color:var(--ink-amber); }
.btn-ta:hover { background:rgba(247,178,103,.23); border-color:rgba(247,178,103,.62); }
.btn-sm { height:31px; padding:0 11px; font-size:12px; border-radius:9px; }
.btn-xs { height:26px; padding:0 9px; font-size:11px; border-radius:8px; gap:5px; }
.btn-ico { width:31px; height:31px; padding:0; border-radius:9px; }

/* ── chips / cápsulas ────────────────────────────────────────────────── */
.chip { display:inline-flex; align-items:center; gap:7px; height:31px; padding:0 11px;
  background:#fff; border:1px solid var(--hair); border-radius:9px; font-size:12.5px; font-weight:500;
  transition:border-color .16s, box-shadow .16s, transform .16s; }
.chip:hover { border-color:rgba(17,17,36,.2); box-shadow:0 2px 8px rgba(26,26,46,.06); }
.chip-on { border-color:var(--teal-2); background:rgba(59,191,173,.07); color:var(--teal-3); font-weight:600; }
.pill { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:999px; white-space:nowrap;
  font-size:10.5px; font-weight:700; letter-spacing:.03em; }
/* v2D · los tonos viven acá (y no inline) para que el modo oscuro los pueda ajustar */
.pill[data-tone="teal"]   { background:rgba(59,191,173,.13);  color:var(--teal-3); }
.pill[data-tone="violet"] { background:rgba(120,90,229,.13);  color:var(--violet-ink); }
.pill[data-tone="coral"]  { background:rgba(244,62,85,.11);   color:var(--ink-coral); }
.pill[data-tone="amber"]  { background:rgba(247,178,103,.20); color:var(--ink-amber); }
.pill[data-tone="n"]      { background:var(--sunk);           color:var(--n500); }

/* ── animaciones ─────────────────────────────────────────────────────── */
@keyframes popIn { 0%{opacity:0;transform:translateY(8px) scale(.97)} 60%{transform:translateY(-2px) scale(1.006)} 100%{opacity:1;transform:none} }
@keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes zoomIn { from{opacity:0;transform:scale(.96) translateY(10px)} to{opacity:1;transform:none} }
@keyframes flash { 0%{background:rgba(59,191,173,.22)} 100%{background:transparent} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes pop { 0%{transform:scale(1)} 45%{transform:scale(1.16)} 100%{transform:scale(1)} }
@keyframes riseUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes floatUp { 0%{opacity:0;transform:translateY(4px) scale(.6)} 25%{opacity:1;transform:translateY(-6px) scale(1.08)} 100%{opacity:0;transform:translateY(-34px) scale(.9)} }
@keyframes glowIn { 0%{box-shadow:0 0 0 0 rgba(120,90,229,0)} 50%{box-shadow:0 0 0 5px rgba(120,90,229,.14)} 100%{box-shadow:0 0 0 0 rgba(120,90,229,0)} }
@keyframes slideInR { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:none} }
@keyframes shine { from{transform:translateX(-120%) skewX(-18deg)} to{transform:translateX(240%) skewX(-18deg)} }
@keyframes tada { 0%{transform:scale(1)} 30%{transform:scale(1.12) rotate(-3deg)} 60%{transform:scale(1.06) rotate(2deg)} 100%{transform:scale(1)} }
.a-pop { animation:popIn .34s cubic-bezier(.16,1,.3,1) backwards; }
.a-slide { animation:slideDown .22s cubic-bezier(.2,.8,.2,1) both; }
.a-fade { animation:fadeIn .2s ease both; }
.a-zoom { animation:zoomIn .26s cubic-bezier(.16,1,.3,1) both; }
.a-flash { animation:flash .9s ease-out both; }
.a-rise { animation:riseUp .4s cubic-bezier(.16,1,.3,1) backwards; }
.a-pulse { animation:pop .32s cubic-bezier(.2,.8,.2,1); }
.spin { animation:spin .8s linear infinite; }
@media (prefers-reduced-motion:reduce){
  .ctz *,.ctz *::before,.ctz *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
}

/* ── scrollbars ──────────────────────────────────────────────────────── */
.ctz ::-webkit-scrollbar { width:9px; height:9px; }
.ctz ::-webkit-scrollbar-thumb { background:rgba(17,17,36,.15); border-radius:99px; border:2px solid transparent; background-clip:content-box; }
.ctz ::-webkit-scrollbar-thumb:hover { background:rgba(17,17,36,.28); background-clip:content-box; }
.ctz ::-webkit-scrollbar-track { background:transparent; }

/* ── teléfono ────────────────────────────────────────────────────────── */
.phone { width:318px; border-radius:38px; padding:9px; background:linear-gradient(160deg,#2A2A45,#14142A);
  box-shadow:0 30px 70px -22px rgba(17,17,36,.55), 0 0 0 1px rgba(255,255,255,.06) inset; }
.phone-scr { border-radius:30px; overflow:hidden; background:#fff; height:592px; overflow-y:auto; position:relative; }
.phone-scr::-webkit-scrollbar { width:0; }
.notch { position:absolute; top:0; left:50%; transform:translateX(-50%); width:104px; height:22px;
  background:#14142A; border-radius:0 0 14px 14px; z-index:20; }

/* ── rail lateral ────────────────────────────────────────────────────── */
.rail-i { display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:10px; width:100%;
  font-size:12.5px; color:var(--n500); transition:background .16s, color .16s; text-align:left; }
.rail-i:hover { background:rgba(17,17,36,.045); color:var(--ink); }
.rail-i[data-on="1"] { background:rgba(120,90,229,.09); color:var(--violet); font-weight:600; }
.rail-dot { width:7px; height:7px; border-radius:99px; background:var(--n300); flex-shrink:0; transition:background .3s, transform .3s; }
.rail-dot[data-ok="1"] { background:var(--teal-2); transform:scale(1.18); }

/* ── varios ──────────────────────────────────────────────────────────── */
.foto { border-radius:10px; overflow:hidden; position:relative; flex-shrink:0; }
.foto::after { content:''; position:absolute; inset:0; box-shadow:inset 0 0 0 1px rgba(17,17,36,.07); border-radius:10px; }
.drag-on { opacity:.35; }
.drop-line { height:2px; background:var(--teal-2); border-radius:9px; margin:3px 0;
  box-shadow:0 0 8px rgba(59,191,173,.6); animation:fadeIn .12s; }
.kbd { display:inline-flex; align-items:center; justify-content:center; min-width:19px; height:19px; padding:0 5px;
  border-radius:5px; background:rgba(17,17,36,.06); border:1px solid rgba(17,17,36,.09);
  font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--n500); font-weight:500; }
.acc-row { border-bottom:1px solid rgba(17,17,36,.07); }
.acc-row:last-child { border-bottom:none; }
.shim { background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent); background-size:200% 100%; animation:shimmer 1.8s ease-in-out infinite; }
/* ── vista de impresión: la cotización entera, lista para papel o PDF ── */
.print-root { position:fixed; inset:0; z-index:210; background:var(--page); overflow-y:auto; }
.print-tools { position:sticky; top:0; z-index:2; display:flex; gap:9px; align-items:center; flex-wrap:wrap;
  padding:11px 16px; background:var(--glass); backdrop-filter:blur(10px); border-bottom:1px solid var(--hair); }
/* La hoja de la vista previa lleva el margen que en el papel pone @page: sin
   él la banda de marca y el membrete tocaban el borde de la tarjeta y la
   pantalla mostraba algo que el PDF no hace. En impresión se saca. */
.print-hoja { max-width:800px; margin:20px auto 48px; background:#fff; border-radius:18px; overflow:hidden;
  padding:10px 30px 26px; box-shadow:0 30px 70px -30px rgba(17,17,36,.4); }
@media print {
  /* El sidebar y la topbar del panel quedan afuera del .ctz. Los sacamos del
     flujo con .print-hidden (Tailwind print:hidden en AdminShell/VendedorShell)
     y, por las dudas, apagamos todo lo demás por visibilidad: solo la hoja
     queda a la vista. */
  body.ctz-imprimiendo * { visibility:hidden !important; }
  body.ctz-imprimiendo .print-root, body.ctz-imprimiendo .print-root * { visibility:visible !important; }
  .ctz.imprimiendo > :not(.print-root) { display:none !important; }
  .ctz .print-tools { display:none !important; }
  /* Chrome del previsualizador del vendedor: el selector celular/tablet/
     escritorio, el teléfono de la columna derecha del editor y el marco de
     navegador. Son andamios para mirar la ficha, no parte del documento: si
     alguien imprime con la vista previa abierta, no salen. */
  .ctz .ov, .ctz .phone-col, .ctz .browser-bar { display:none !important; }
  .ctz .print-root { position:static !important; overflow:visible !important; background:#fff !important; }
  .ctz .print-hoja { max-width:none; margin:0; padding:0; border-radius:0; box-shadow:none; }
  html, body { background:#fff !important; }
  .ctz .print-hoja, .ctz .print-hoja * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .ctz .print-hoja img { max-width:100% !important; }

  /* ── dónde puede cortar el papel ──────────────────────────────────────
     Tres promesas, y el resto que fluya:
       · ninguna tarjeta partida al medio — vuelos, hoteles y opciones llevan
         breakInside "avoid" en telefono.jsx y esta regla les suma el alias
         viejo, que es el que entiende el motor de impresión;
       · ningún título de sección al pie de una página sin lo que titula
         (.sec-t y el renglón gris que va abajo, .sec-sub);
       · ninguna línea suelta arriba ni abajo de un corte. */
  .ctz .print-hoja { orphans:3; widows:3; }
  .ctz .print-hoja [style*="break-inside"] { page-break-inside:avoid; }
  /* mismo alias para el "no cortes acá abajo": lo usa el header de cada opción,
     que tiene que quedar pegado a su primer hotel */
  .ctz .print-hoja [style*="break-after"] { page-break-after:avoid; }
  .ctz .print-hoja .sec-t, .ctz .print-hoja .sec-sub { break-after:avoid; page-break-after:avoid; }
  /* corte deliberado: lo pide la ficha cuando el contenido lo amerita — hoy,
     una cotización sin vuelos, para que el cierre no se vaya solo a la hoja 2 */
  .ctz .print-hoja [data-print-corte="pagina"] { break-before:page; page-break-before:always; }

  /* Márgenes: 12 mm a los lados —el documento se alinea con la banda de marca
     y adentro ya no hay otro margen—, 10 arriba y 13 abajo, que es donde vive
     el pie. */
  @page {
    margin:10mm 12mm 13mm;
    /* Chromium sí dibuja las cajas de margen del @page y sí resuelve
       counter(page) y var() adentro (probado con preferCSSPageSize:true, que
       es como imprime src/lib/pdf.ts). La variable --ctz-pie la escribe la
       ficha con el número de la cotización; sin ella queda el respaldo.

       OJO CON LA VERSIÓN: las margin boxes con counter(page) las dibuja
       Chromium 131 o más nuevo. Producción imprime con el que instala
       nixpacks.toml (137 hoy; la versión exacta queda en cada log
       cotizador.pdf.ok). En un motor más viejo la regla no se aplica y el
       PDF sale sin pie: sin numerar, pero entero — el contenido no se toca. */
    @bottom-right {
      content: var(--ctz-pie, "TravelOz") " · Página " counter(page);
      /* 9 pt es el piso de todo el documento: el PDF se abre en el celular y
         abajo de eso no se lee. El pie no es la excepción. */
      font-family:'DM Sans', sans-serif; font-size:9pt; color:#B0B4CD;
    }
  }
  /* La primera hoja va sin pie: una cotización de una sola carilla no lleva
     numeración de ningún tipo, y en las largas el pie arranca recién en la 2. */
  @page :first { @bottom-right { content:""; } }
}

/* ── volver al panel: link discreto arriba del título del inicio ─────── */
.ctz-volver { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600;
  color:var(--n400); text-decoration:none; transition:color .16s; }
.ctz-volver:hover { color:var(--violet); }

/* ── botón héroe (gradiente de marca + brillo) ───────────────────────── */
.btn-hero { position:relative; overflow:hidden; color:#fff; font-weight:700;
  background:linear-gradient(87deg,#F43E55 0%,#785AE5 100%);
  box-shadow:0 10px 26px -8px rgba(120,90,229,.55), inset 0 1px 0 rgba(255,255,255,.3); }
.btn-hero::after { content:''; position:absolute; top:0; bottom:0; width:36%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);
  transform:translateX(-120%) skewX(-18deg); }
.btn-hero:hover::after { animation:shine .7s ease; }
.btn-hero:hover { box-shadow:0 14px 32px -8px rgba(120,90,229,.65), inset 0 1px 0 rgba(255,255,255,.36); }

/* ── semáforo con tooltip ────────────────────────────────────────────── */
.sem { position:relative; display:inline-flex; align-items:center; }
.sem-dot { width:10px; height:10px; border-radius:99px; box-shadow:0 0 0 3px rgba(17,17,36,.05); }
/* el texto del semáforo solo aparece en mobile, donde no hay hover que valga */
.sem-txt { display:none; }
.sem .tip { display:none; position:absolute; bottom:calc(100% + 9px); right:-10px; width:216px;
  background:rgba(26,26,46,.97); color:#fff; padding:10px 12px; border-radius:11px; font-size:11px;
  line-height:1.55; z-index:70; box-shadow:0 14px 34px -10px rgba(17,17,36,.5); text-align:left; }
.sem .tip b { display:block; font-size:11.5px; margin-bottom:2px; }
.sem .tip::after { content:''; position:absolute; top:100%; right:13px; border:5px solid transparent;
  border-top-color:rgba(26,26,46,.97); }
.sem:hover .tip { display:block; animation:fadeIn .15s; }

/* ── drawer de analytics ─────────────────────────────────────────────── */
.drawer { position:fixed; top:0; right:0; bottom:0; width:min(400px,94vw); background:#fff; z-index:191;
  box-shadow:-24px 0 60px -20px rgba(17,17,36,.35); animation:slideInR .28s cubic-bezier(.16,1,.3,1);
  display:flex; flex-direction:column; }
.drawer-bg { position:fixed; inset:0; background:rgba(17,17,36,.35); backdrop-filter:blur(3px); z-index:190; animation:fadeIn .2s; }
.tl-row { display:flex; gap:11px; }
.tl-rail { display:flex; flex-direction:column; align-items:center; width:14px; flex-shrink:0; }
.tl-dot { width:9px; height:9px; border-radius:99px; flex-shrink:0; margin-top:4px; }
.tl-line { width:2px; flex:1; background:rgba(17,17,36,.08); border-radius:9px; margin:3px 0; }

/* ── segmentos ───────────────────────────────────────────────────────── */
.seg { display:inline-flex; gap:3px; background:rgba(17,17,36,.055); border-radius:11px; padding:3px; }
.seg button { padding:6px 13px; border-radius:8px; font-size:12px; font-weight:600; color:var(--n400);
  display:inline-flex; align-items:center; gap:6px; transition:all .18s; }
.seg button[data-on="1"] { background:#fff; color:var(--ink); box-shadow:0 1px 3px rgba(26,26,46,.14); }

/* ── dropzone ────────────────────────────────────────────────────────── */
.dz { border:1.5px dashed rgba(120,90,229,.32); border-radius:14px; padding:22px 16px; text-align:center;
  background:rgba(120,90,229,.03); cursor:pointer; transition:all .2s; }
.dz:hover { border-color:rgba(120,90,229,.55); background:rgba(120,90,229,.06); transform:translateY(-1px); }

/* ── wysiwyg ─────────────────────────────────────────────────────────── */
.wys { min-height:88px; padding:11px 13px; background:var(--field); border:1px solid var(--field-brd);
  border-radius:0 0 11px 11px; font-size:13.5px; line-height:1.65; outline:none; }
.wys:focus { border-color:var(--teal-2); box-shadow:0 0 0 3px rgba(59,191,173,.13); }
.wys ul { margin:4px 0; padding-left:20px; }
.wys:empty::before { content:attr(data-ph); color:var(--n300); }
.wys-bar { display:flex; gap:3px; padding:6px 8px; background:var(--card-2); border:1px solid var(--field-brd);
  border-bottom:none; border-radius:11px 11px 0 0; }
.wys-b { width:28px; height:26px; border-radius:7px; display:grid; place-items:center; color:var(--n500);
  font-size:12.5px; font-weight:700; transition:all .14s; }
.wys-b:hover { background:rgba(120,90,229,.1); color:var(--violet); }
.wys-b:active { transform:scale(.9); }

/* ── badge volador al agregar servicio ───────────────────────────────── */
.fly { position:absolute; right:12px; top:-4px; z-index:5; pointer-events:none;
  display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px;
  background:linear-gradient(145deg,#45D4C0,#2A9E8E); color:#fff; font-size:11px; font-weight:700;
  box-shadow:0 6px 16px -4px rgba(42,158,142,.5); animation:floatUp .8s cubic-bezier(.2,.8,.2,1) both; }

.a-tada { animation:tada .5s cubic-bezier(.2,.8,.2,1); }
.a-glow { animation:glowIn .7s ease-out; }

/* ── wordmark TravelOz (replica del header-logo.webp del repo) ───────── */
.wordmark { font-weight:800; letter-spacing:-.04em; line-height:1; display:inline-flex; align-items:baseline; }
.wordmark .t { color:#9A9A9A; }
.wordmark.on-dark .t { color:#fff; }
.wordmark .oz { background:linear-gradient(87deg,#F43E55 20%,#785AE5 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
.wordmark.on-dark .oz { background:linear-gradient(87deg,#FFD0D6 0%,#E4DAFF 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
/* pildora blanca sobre el degradado del encabezado del pasajero: el gris #9A9A9A
   del logo original pierde contraste ahi, asi que "Travel" va en tinta. */
.wm-pildora .wordmark .t { color:var(--ink,#1A1A2E); }

/* ── calendario ──────────────────────────────────────────────────────── */
.cal-btn { display:flex; align-items:center; gap:9px; width:100%; text-align:left; cursor:pointer; }
.cal-pop { position:absolute; z-index:45; background:#fff; border:1px solid var(--hair); border-radius:15px;
  box-shadow:0 24px 56px -16px rgba(17,17,36,.3); padding:12px; width:262px; }
.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
.cal-dw { font-size:9.5px; font-weight:700; letter-spacing:.05em; color:var(--n300); text-align:center; padding:4px 0 6px; }
.cal-d { height:31px; border-radius:9px; font-size:12.5px; font-weight:500; color:var(--n600);
  display:grid; place-items:center; transition:background .12s, color .12s, transform .12s; }
.cal-d:hover { background:rgba(120,90,229,.09); }
.cal-d:active { transform:scale(.92); }
.cal-d[data-sel="1"] { background:linear-gradient(145deg,#45D4C0,#2A9E8E); color:#fff; font-weight:700;
  box-shadow:0 4px 12px -2px rgba(42,158,142,.5); }
.cal-d[data-hoy="1"]:not([data-sel="1"]) { box-shadow:inset 0 0 0 1.5px rgba(120,90,229,.4); color:var(--violet); }
.cal-d[data-out="1"] { color:var(--n300); }
.cal-nav { width:29px; height:29px; border-radius:9px; display:grid; place-items:center; color:var(--n400); }
.cal-nav:hover { background:rgba(17,17,36,.05); color:var(--ink); }

/* ── autocomplete ────────────────────────────────────────────────────── */
.ac-pop { position:absolute; top:calc(100% + 5px); left:0; right:0; z-index:42; background:#fff;
  border:1px solid var(--hair); border-radius:12px; overflow:hidden;
  box-shadow:0 20px 46px -14px rgba(17,17,36,.26); }
.ac-i { display:flex; align-items:center; gap:9px; width:100%; padding:8px 11px; text-align:left; font-size:13px; }
.ac-i[data-on="1"] { background:rgba(120,90,229,.08); }
.ac-i b { font-weight:700; color:var(--violet); }

/* ── browser frame para vista escritorio ─────────────────────────────── */
.browser { border-radius:16px; overflow:hidden; background:#fff;
  box-shadow:0 34px 80px -24px rgba(17,17,36,.5), 0 0 0 1px rgba(17,17,36,.08); }
.browser-bar { display:flex; align-items:center; gap:9px; padding:10px 13px; background:#ECEDF5;
  border-bottom:1px solid rgba(17,17,36,.07); }
.browser-dot { width:10px; height:10px; border-radius:99px; }
.browser-url { flex:1; height:26px; border-radius:8px; background:#fff; display:flex; align-items:center;
  gap:7px; padding:0 11px; font-size:11px; color:var(--n500); border:1px solid rgba(17,17,36,.07); }

.ov { position:fixed; inset:0; background:rgba(17,17,36,.42); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:200; display:grid; place-items:center; padding:20px; }
.hairline { height:1px; background:var(--hair-soft); }

/* ── v2: chip de IA (identificador compartido) ───────────────────────── */
.chip-ia { display:inline-flex; align-items:center; gap:5px; flex-shrink:0; padding:3px 10px; border-radius:999px;
  background:linear-gradient(90deg,var(--coral),var(--violet)); color:#fff;
  font-size:10px; font-weight:800; letter-spacing:.04em;
  box-shadow:0 4px 12px -5px rgba(120,90,229,.8); }

/* ── v2: modal "¿Cómo arrancamos?" (caminos de entrada) ──────────────── */
.cam { position:relative; display:block; width:100%; padding:14px 15px 13px; text-align:left;
  background:#fff; border:1px solid var(--hair-soft); border-radius:15px;
  box-shadow:0 1px 2px rgba(26,26,46,.04);
  transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s, border-color .18s; }
.cam:hover { transform:translateY(-2px); border-color:rgba(120,90,229,.34);
  box-shadow:0 16px 34px -18px rgba(26,26,46,.34); }
.cam-ico { width:32px; height:32px; border-radius:10px; display:grid; place-items:center; margin-bottom:8px;
  background:rgba(120,90,229,.10); color:var(--violet); transition:transform .18s; }
.cam:hover .cam-ico { transform:scale(1.06); }
.cam-t { font-size:13.5px; font-weight:700; letter-spacing:-.01em; }
.cam-d { font-size:11.5px; color:var(--n400); line-height:1.45; margin-top:2px; }
.cam-n { position:absolute; top:11px; right:11px; }
.cam-hero { border-color:transparent;
  background:linear-gradient(#fff,#fff) padding-box,
             linear-gradient(90deg,rgba(244,62,85,.55),rgba(120,90,229,.55)) border-box; }
.cam-hero:hover { border-color:transparent; box-shadow:0 18px 40px -18px rgba(120,90,229,.55); }
.cam-hero .cam-ico { background:linear-gradient(87deg,var(--coral),var(--violet)); color:#fff;
  box-shadow:0 6px 16px -6px rgba(120,90,229,.7); }

/* lista compacta del segundo paso */
.lst-i { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:11px;
  text-align:left; transition:background .14s; }
.lst-i:hover { background:rgba(120,90,229,.07); }

/* ── v2: barra "pegá la consulta" del home ───────────────────────────── */
.ia-bar { display:flex; align-items:center; gap:10px; width:100%; padding:9px 11px; text-align:left;
  border:1px solid transparent; border-radius:13px;
  background:linear-gradient(#fff,#fff) padding-box,
             linear-gradient(90deg,rgba(244,62,85,.40),rgba(120,90,229,.40)) border-box;
  box-shadow:0 1px 2px rgba(26,26,46,.04);
  transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .2s; }
.ia-bar:hover { transform:translateY(-1px); box-shadow:0 14px 30px -16px rgba(120,90,229,.5); }
.ia-bar-t { flex:1; min-width:0; font-size:12.5px; color:var(--n600); font-weight:500; }
.ia-bar-b { display:inline-flex; align-items:center; gap:5px; flex-shrink:0; padding:7px 13px; border-radius:9px;
  font-size:12px; font-weight:700; color:#fff; background:linear-gradient(87deg,var(--coral),var(--violet));
  box-shadow:0 6px 16px -8px rgba(120,90,229,.65); }

/* ── v2: loader por pasos de la IA ───────────────────────────────────── */
.ia-paso { display:flex; align-items:center; gap:10px; padding:7px 2px; font-size:13px;
  color:var(--n300); transition:color .3s; }
.ia-paso[data-on="1"] { color:var(--ink); font-weight:600; }
.ia-paso[data-on="2"] { color:var(--n500); }
.ia-dot { width:21px; height:21px; border-radius:99px; display:grid; place-items:center; flex-shrink:0;
  background:rgba(17,17,36,.05); color:var(--n300); transition:background .3s, color .3s; }
.ia-paso[data-on="1"] .ia-dot { background:rgba(120,90,229,.13); color:var(--violet); }
.ia-paso[data-on="2"] .ia-dot { background:rgba(59,191,173,.15); color:var(--teal-3); }

/* ── v2: cola de trabajo "Para hoy" ──────────────────────────────────── */
.cola-i { display:flex; align-items:center; gap:10px; padding:8px 11px; border-radius:12px;
  border:1px solid var(--hair-soft); background:#fff;
  transition:border-color .16s, box-shadow .16s, transform .16s; }
.cola-i:hover { border-color:rgba(120,90,229,.26); transform:translateX(2px);
  box-shadow:0 8px 20px -13px rgba(26,26,46,.3); }

/* ── v2: acciones rápidas al hover en las filas de seguimiento ───────── */
.fila-seg { position:relative; cursor:pointer; }
.fila-acc { position:absolute; top:50%; right:31px; transform:translateY(-50%);
  display:flex; align-items:center; gap:4px; padding-left:32px;
  opacity:0; pointer-events:none; transition:opacity .18s ease;
  background:linear-gradient(90deg,rgba(250,249,254,0),#FAF9FE 30%); }
.fila-seg:hover .fila-acc, .fila-seg:focus-within .fila-acc { opacity:1; pointer-events:auto; }

/* ══ v2B: editor ══════════════════════════════════════════════════════ */

/* ── sugerencia "su última cotización" (bloque Cliente) ──────────────── */
.sug-base { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:11px;
  padding:9px 11px; border-radius:12px;
  background:linear-gradient(90deg,rgba(120,90,229,.07),rgba(59,191,173,.06));
  border:1px solid rgba(120,90,229,.2); }
.sug-ico { width:26px; height:26px; border-radius:9px; display:grid; place-items:center; flex-shrink:0;
  background:rgba(120,90,229,.13); color:var(--violet); }

/* ── chips apagados: "ya está puesto" ────────────────────────────────── */
.chip-frec { max-width:100%; }
.chip-off { background:rgba(17,17,36,.035); border-color:transparent; color:var(--n400);
  cursor:default; font-weight:500; }
.chip-off:hover { border-color:transparent; box-shadow:none; }
.chip-mini { height:25px; padding:0 9px; font-size:11px; gap:5px; border-radius:8px; }

/* ── botón "Escribir por mí" (identidad IA) ──────────────────────────── */
/* ── bloc de notas del rail: crece con el mouse para leer mejor ───────── */
.notas-card { transition:box-shadow .3s cubic-bezier(.2,.8,.2,1), transform .3s cubic-bezier(.2,.8,.2,1); }
.notas-card:hover { box-shadow:0 14px 34px -16px rgba(26,26,46,.22); transform:translateY(-1px); }
.notas-card .notas-ta { height:118px; transition:height .38s cubic-bezier(.2,.8,.2,1); }
.notas-card:hover .notas-ta, .notas-card:focus-within .notas-ta { height:260px; }
.notas-exp svg { transition:transform .26s cubic-bezier(.34,1.56,.64,1); }
.notas-exp:hover svg { transform:scale(1.25) rotate(8deg); }
/* la bitácora expandida entra como drawer desde la izquierda */
.drawer-izq { position:fixed; top:0; left:0; bottom:0; width:min(430px,94vw); background:var(--card); z-index:191;
  box-shadow:24px 0 70px -20px rgba(17,17,36,.35); display:flex; flex-direction:column;
  animation:slideIzq .32s cubic-bezier(.16,1,.3,1); }
@keyframes slideIzq { from { transform:translateX(-100%); opacity:.4; } to { transform:none; opacity:1; } }
.btn-ia { gap:8px; padding-left:8px; border-color:rgba(120,90,229,.3); }
.btn-ia:hover:not(:disabled) { border-color:rgba(120,90,229,.55); background:rgba(120,90,229,.05); }
.btn-ia:disabled { opacity:.7; cursor:default; transform:none; }
.seg-xs { padding:2px; border-radius:9px; }
.seg-xs button { padding:4px 10px; font-size:11.5px; border-radius:7px; }

/* ── lectura del margen (solo vendedor) ──────────────────────────────── */
.mrg { position:relative; display:inline-flex; align-items:center; font-size:10.5px; line-height:1.5;
  text-align:right; border-radius:7px; padding:2px 4px; margin:-2px -4px; cursor:help;
  transition:background .15s; }
.mrg:hover, .mrg:focus-visible { background:rgba(17,17,36,.035); }
.mrg .tip { display:none; position:absolute; bottom:calc(100% + 9px); right:0; width:250px;
  background:rgba(26,26,46,.97); color:#fff; padding:10px 12px; border-radius:11px;
  font-family:'DM Sans',system-ui,sans-serif; font-size:11px; line-height:1.55; font-weight:400;
  text-align:left; z-index:70; box-shadow:0 14px 34px -10px rgba(17,17,36,.5); }
.mrg .tip b { display:block; font-size:11.5px; margin-bottom:3px; }
.mrg .tip::after { content:''; position:absolute; top:100%; right:16px; border:5px solid transparent;
  border-top-color:rgba(26,26,46,.97); }
.mrg:hover .tip, .mrg:focus-visible .tip { display:block; animation:fadeIn .15s; }

/* ── bloque escondido en "Ver como pasajero" ─────────────────────────── */
.oculto-pas { display:flex; align-items:center; gap:10px; padding:13px 14px; border-radius:12px;
  border:1px dashed rgba(17,17,36,.14); background:rgba(17,17,36,.018);
  font-size:12px; color:var(--n400); }

/* ── atajo Alt+n en el rail ──────────────────────────────────────────── */
.rail-i { position:relative; }
.rail-k { position:absolute; right:7px; top:50%; transform:translateY(-50%); font-size:9px;
  letter-spacing:.02em; color:var(--n400); opacity:0; padding-left:10px;
  background:linear-gradient(90deg,rgba(255,255,255,0),#fff 34%);
  transition:opacity .16s; pointer-events:none; }
.rail-i:hover .rail-k, .rail-i:focus-visible .rail-k { opacity:.55; }
.rail-i[data-on="1"]:hover .rail-k { background:linear-gradient(90deg,rgba(243,241,253,0),#F3F1FD 34%); }
.rail-help { display:flex; align-items:center; gap:6px; width:100%; margin-top:9px; padding:0;
  font-size:10.5px; color:var(--n400); text-align:left; transition:color .15s; }
.rail-help:hover { color:var(--violet); }

/* ── hoja de atajos ──────────────────────────────────────────────────── */
.atj-cols { display:grid; grid-template-columns:1fr 1fr; gap:0 26px; padding:15px 17px 6px; }
.atj-row { display:flex; align-items:center; gap:12px; padding:6px 0;
  border-bottom:1px solid var(--hair-soft); }
.atj-row:last-child { border-bottom:none; }
@media (max-width:640px){ .ctz .atj-cols { grid-template-columns:1fr; gap:14px; } }

/* ══ v2C: teléfono y envío ════════════════════════════════════════════ */

/* ── switcher de opciones (lo ve el pasajero, no el vendedor) ────────── */
.opt-seg { display:flex; gap:5px; padding:4px; margin-bottom:13px; border-radius:15px;
  background:#F5F6FA; border:1px solid rgba(17,17,36,.055); overflow-x:auto; }
.opt-seg::-webkit-scrollbar { height:0; width:0; }
.opt-seg > button { flex:1 1 0; min-width:76px; padding:8px 7px 9px; border-radius:12px;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px;
  color:#6B6F99; transition:background .22s, box-shadow .22s, color .22s, transform .16s; }
.opt-seg > button > span { max-width:100%; overflow:hidden; text-overflow:ellipsis; }
.opt-seg > button:active { transform:scale(.97); }
.opt-seg > button[data-on="1"] { background:#fff; color:#1A1A2E;
  box-shadow:0 2px 9px rgba(26,26,46,.13), 0 0 0 1px rgba(120,90,229,.18); }
.opt-n { font-size:10.5px; font-weight:700; letter-spacing:.01em; white-space:nowrap; }
.opt-p { font-size:13px; font-weight:800; letter-spacing:-.02em; white-space:nowrap; }
.opt-seg > button[data-on="1"] .opt-p { color:#785AE5; }
.opt-d { font-size:9.5px; font-weight:700; color:#8A8DB5; white-space:nowrap; }
.opt-seg[data-desk="1"] > button { min-width:118px; padding:10px 14px 11px; }
.opt-seg[data-desk="1"] .opt-n { font-size:11.5px; }
.opt-seg[data-desk="1"] .opt-p { font-size:15px; }
.opt-seg[data-desk="1"] .opt-d { font-size:10.5px; }

/* ── odómetro del precio: solo ruedan los dígitos ────────────────────── */
.odo { display:inline-flex; align-items:flex-end; font-variant-numeric:tabular-nums; }
.odo-s { display:inline-block; height:1.1em; line-height:1.1; }
.odo-d { display:inline-block; height:1.1em; line-height:1.1; overflow:hidden; }
.odo-col { display:block; transition:transform .35s cubic-bezier(.2,.8,.2,1); will-change:transform; }
.odo-col > span { display:block; height:1.1em; line-height:1.1; text-align:center; }
@media (prefers-reduced-motion:reduce){ .odo-col { transition:none !important; } }

/* ── pre-flight de Compartir: informa, nunca bloquea ─────────────────── */
.pref { margin:12px 17px 0; padding:10px 12px; border-radius:13px;
  background:#FBFBFE; border:1px solid var(--hair-soft); }
.pref-i { display:flex; align-items:flex-start; gap:8px; padding:3px 0; font-size:11.5px; line-height:1.55; }
.pref-i > svg { flex-shrink:0; margin-top:2px; }
.pref-i[data-t="ok"] { color:var(--teal-3); }
.pref-i[data-t="warn"] { color:#8A5A16; }
.pref-i[data-t="info"] { color:var(--n400); }
.pref-cta { flex-shrink:0; margin-left:auto; padding:2px 8px; border-radius:7px; font-size:11px; font-weight:700;
  color:#8A5A16; background:rgba(247,178,103,.22); transition:background .15s; }
.pref-cta:hover { background:rgba(247,178,103,.38); }
.pref-ok { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; color:var(--teal-3); }

/* ── vía de envío apagada (WhatsApp sin teléfono) ────────────────────── */
.via-off { opacity:.5; cursor:default; background:rgba(17,17,36,.03); border-style:dashed; }
.via-off:hover { border-color:var(--hair); box-shadow:none; }

/* ── envío por pasos: link → copiar → enviada ────────────────────────── */
.env { margin-top:14px; padding:12px 13px; border-radius:13px; background:#FBFBFE;
  border:1px solid var(--hair-soft); }
.env-p { display:flex; align-items:center; gap:9px; font-size:12.5px; font-weight:600; color:var(--n500); }
.env-p[data-on="2"] { color:var(--teal-3); }
.env-link { display:flex; align-items:center; gap:8px; margin-top:10px; padding:8px 9px 8px 12px;
  border-radius:11px; background:#fff; border:1px solid var(--hair); }
.env-link .mono { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:12px; color:var(--n600); }
.env-ok { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:11px; padding:9px;
  border-radius:11px; font-size:13px; font-weight:800; color:#fff;
  background:linear-gradient(145deg,#45D4C0,#2A9E8E);
  box-shadow:0 8px 20px -8px rgba(42,158,142,.55), inset 0 1px 0 rgba(255,255,255,.3); }

/* ── toast "lo abrieron": el momento en vivo ─────────────────────────── */
@keyframes latido { 0%{box-shadow:0 0 0 0 rgba(69,212,192,.6)} 70%{box-shadow:0 0 0 8px rgba(69,212,192,0)} 100%{box-shadow:0 0 0 0 rgba(69,212,192,0)} }
.ts-live { width:9px; height:9px; border-radius:99px; background:#45D4C0; flex-shrink:0;
  animation:latido 1.8s cubic-bezier(.2,.8,.2,1) infinite; }
.ts-vivo { box-shadow:0 18px 44px -12px rgba(17,17,36,.5), 0 0 0 1px rgba(69,212,192,.35),
  0 0 26px -8px rgba(69,212,192,.55) !important; }

/* ══ v2D: drawer — funnel de lectura e insights ═══════════════════════ */

/* mini embudo: hasta dónde llegó el pasajero leyendo la cotización */
.fun-row { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
.fun-l { width:96px; flex-shrink:0; font-size:10px; font-weight:700; letter-spacing:.02em;
  color:var(--n400); text-align:right; white-space:nowrap; transition:color .25s; }
.fun-row[data-on="1"] .fun-l { color:var(--n600); }
.fun-t { flex:1; min-width:0; height:9px; border-radius:99px; background:var(--sunk); overflow:hidden; }
.fun-b { display:block; height:100%; border-radius:99px; background:var(--sunk-2);
  transition:width .55s cubic-bezier(.2,.8,.2,1), background .3s; }
.fun-row[data-on="1"] .fun-b { background:linear-gradient(90deg,#45D4C0,#2A9E8E); }
.fun-row[data-fin="1"] .fun-b { box-shadow:0 0 0 2px rgba(69,212,192,.22); }

/* línea de insight: informa, no vende */
.ins { display:flex; align-items:flex-start; gap:8px; font-size:11.5px; line-height:1.55; }
.ins > svg { flex-shrink:0; margin-top:2px; }
.ins-lee { margin-top:10px; padding:9px 11px; border-radius:11px;
  background:rgba(120,90,229,.07); border:1px solid rgba(120,90,229,.18); color:var(--n600); }
.ins-neg { margin-top:16px; padding-top:13px; border-top:1px solid var(--hair-soft); color:var(--n400); }
.ins-neg b { color:var(--n600); font-weight:700; }

/* ══ v2D: transición paquete → editor ═════════════════════════════════ */
@keyframes edIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
@keyframes edHead { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:none} }
.ed-head { animation:edHead .34s cubic-bezier(.16,1,.3,1) both; }
.ed-main { animation:edIn .35s cubic-bezier(.16,1,.3,1) both; animation-delay:.04s; }
/* el rail y la columna del teléfono son sticky: solo opacidad, nada de transform */
.ed-rail { animation:fadeIn .4s ease both; animation-delay:.10s; }
.ed-phone { animation:edIn .42s cubic-bezier(.16,1,.3,1) both; animation-delay:.14s; }
@media (prefers-reduced-motion:reduce){
  .ctz .ed-head,.ctz .ed-main,.ctz .ed-rail,.ctz .ed-phone { animation:none !important; opacity:1 !important; transform:none !important; }
}

/* ══ v2D: modo oscuro ═════════════════════════════════════════════════
   Es el tema de la HERRAMIENTA. La vista del pasajero (el teléfono, la
   tablet y el navegador de la vista previa) queda SIEMPRE clara: es lo que
   ve el cliente, no la herramienta. Por eso acá no se toca ninguna clase
   que viva dentro de SalidaPasajero (.opt-seg, .odo, .phone-scr, .foto…).
   Los gradientes de marca y la acción teal quedan intactos.
   ══════════════════════════════════════════════════════════════════════ */
.ctz.dark {
  --ink:#F0F1FA; --ink-2:#FFFFFF;
  --page:#0F1024; --card:#191B36;
  --n600:#DDDFF2; --n500:#B6BAD9; --n400:#9095BE; --n300:#696E9B;
  --n100:#272A4C; --n50:#1E2140;
  --hair:rgba(255,255,255,.14); --hair-soft:rgba(255,255,255,.08);
  --teal-3:#63DCC7;
  --card-2:#1F2242; --card-3:#1C1F3C; --pop:#232748; --tile:#1F2242; --field:#12142C;
  --sunk:rgba(255,255,255,.06); --sunk-2:rgba(255,255,255,.13); --wash:rgba(255,255,255,.03);
  --glass:rgba(15,16,36,.82);
  --field-brd:rgba(255,255,255,.16);
  --violet-ink:#BFAEFF; --ink-amber:#F2C078; --ink-coral:#FF93A0;
  --wa-bg:rgba(69,212,192,.09); --wa-fg:#8FE3D4;
  color-scheme:dark;
}

/* superficies */
.ctz.dark .card { box-shadow:0 1px 2px rgba(0,0,0,.35), 0 14px 34px -16px rgba(0,0,0,.65); }
.ctz.dark .blk { box-shadow:0 1px 2px rgba(0,0,0,.3), 0 16px 40px -22px rgba(0,0,0,.7); }
.ctz.dark .blk:focus-within { border-color:rgba(160,94,211,.45);
  box-shadow:0 1px 2px rgba(0,0,0,.3), 0 16px 44px -20px rgba(120,90,229,.6); }
.ctz.dark .blk-ico { background:linear-gradient(145deg,rgba(160,94,211,.26),rgba(120,90,229,.12));
  color:var(--violet-ink); }
.ctz.dark .hairline { background:var(--hair-soft); }

/* campos y botones */
.ctz.dark .in { box-shadow:inset 0 1px 0 rgba(255,255,255,.03); }
.ctz.dark .in:hover { border-color:rgba(255,255,255,.28); }
.ctz.dark .in::placeholder { color:var(--n300); }
.ctz.dark .btn-s { background:var(--card-2); border-color:var(--hair); color:var(--n600);
  box-shadow:0 1px 2px rgba(0,0,0,.3); }
.ctz.dark .btn-s:hover { background:var(--pop); border-color:rgba(255,255,255,.24); }
.ctz.dark .btn-g:hover { background:rgba(255,255,255,.07); color:var(--ink); }
.ctz.dark .btn-tv { background:rgba(160,94,211,.16); border-color:rgba(160,94,211,.42); }
.ctz.dark .btn-tv:hover { background:rgba(160,94,211,.24); border-color:rgba(160,94,211,.6); }
.ctz.dark .btn-tt { background:rgba(69,212,192,.12); border-color:rgba(69,212,192,.36); }
.ctz.dark .btn-tt:hover { background:rgba(69,212,192,.19); border-color:rgba(69,212,192,.55); }
.ctz.dark .btn-ta { background:rgba(247,178,103,.13); border-color:rgba(247,178,103,.4); }
.ctz.dark .btn-ta:hover { background:rgba(247,178,103,.2); border-color:rgba(247,178,103,.58); }
.ctz.dark .notas-card:hover { box-shadow:0 14px 34px -16px rgba(0,0,0,.5); }
.ctz.dark .drawer-izq { box-shadow:24px 0 70px -20px rgba(0,0,0,.8); }
.ctz.dark .kbd { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.12); color:var(--n500); }
.ctz.dark :focus-visible { box-shadow:0 0 0 2px var(--page), 0 0 0 4px rgba(69,212,192,.55) !important; }
.ctz.dark ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); background-clip:content-box; }
.ctz.dark ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.3); background-clip:content-box; }

/* chips, píldoras y segmentos */
.ctz.dark .chip { background:var(--card-2); border-color:var(--hair); }
.ctz.dark .chip:hover { border-color:rgba(255,255,255,.26); box-shadow:0 2px 10px rgba(0,0,0,.4); }
.ctz.dark .chip-on { background:rgba(69,212,192,.14); border-color:var(--teal-2); color:var(--teal-3); }
.ctz.dark .chip-off { background:rgba(255,255,255,.05); border-color:transparent; color:var(--n400); }
.ctz.dark .pill[data-tone="teal"]   { background:rgba(69,212,192,.16); }
.ctz.dark .pill[data-tone="violet"] { background:rgba(160,94,211,.22); }
.ctz.dark .pill[data-tone="coral"]  { background:rgba(244,62,85,.20); }
.ctz.dark .pill[data-tone="amber"]  { background:rgba(247,178,103,.20); }
.ctz.dark .seg { background:rgba(255,255,255,.07); }
.ctz.dark .seg button[data-on="1"] { background:var(--pop); color:var(--ink); box-shadow:0 1px 4px rgba(0,0,0,.5); }

/* popovers, listas y autocompletes */
.ctz.dark .cal-pop, .ctz.dark .ac-pop { background:var(--pop); border-color:var(--hair);
  box-shadow:0 26px 60px -16px rgba(0,0,0,.75); }
.ctz.dark .cal-d:hover { background:rgba(160,94,211,.2); }
.ctz.dark .cal-nav:hover { background:rgba(255,255,255,.08); color:var(--ink); }
.ctz.dark .ac-i[data-on="1"] { background:rgba(160,94,211,.2); }
.ctz.dark .ac-i b { color:var(--violet-ink); }
.ctz.dark .lst-i:hover { background:rgba(160,94,211,.16); }
.ctz.dark .cam { background:var(--card-2); }
.ctz.dark .cam:hover { border-color:rgba(160,94,211,.5); box-shadow:0 18px 38px -18px rgba(0,0,0,.8); }
.ctz.dark .cam-ico { background:rgba(160,94,211,.2); color:var(--violet-ink); }
.ctz.dark .cam-hero { background:linear-gradient(var(--card-2),var(--card-2)) padding-box,
  linear-gradient(90deg,rgba(244,62,85,.75),rgba(120,90,229,.75)) border-box; }
.ctz.dark .cam-hero .cam-ico { background:linear-gradient(87deg,var(--coral),var(--violet)); color:#fff; }
.ctz.dark .ia-bar { background:linear-gradient(var(--card-2),var(--card-2)) padding-box,
  linear-gradient(90deg,rgba(244,62,85,.5),rgba(120,90,229,.5)) border-box; }
.ctz.dark .ia-dot { background:rgba(255,255,255,.07); color:var(--n300); }
.ctz.dark .ia-paso[data-on="1"] .ia-dot { background:rgba(160,94,211,.24); color:var(--violet-ink); }
.ctz.dark .ia-paso[data-on="2"] .ia-dot { background:rgba(69,212,192,.18); color:var(--teal-3); }

/* editor: rail, wysiwyg, dropzone */
.ctz.dark .rail-i:hover { background:rgba(255,255,255,.06); }
.ctz.dark .rail-i[data-on="1"] { background:rgba(160,94,211,.18); color:var(--violet-ink); }
.ctz.dark .rail-k { background:linear-gradient(90deg,rgba(25,27,54,0),var(--card) 34%); }
.ctz.dark .rail-i[data-on="1"]:hover .rail-k { background:linear-gradient(90deg,rgba(41,35,74,0),#2A2450 34%); }
.ctz.dark .rail-help:hover { color:var(--violet-ink); }
.ctz.dark .wys:focus { box-shadow:0 0 0 3px rgba(69,212,192,.18); }
.ctz.dark .wys-b:hover { background:rgba(160,94,211,.2); color:var(--violet-ink); }
.ctz.dark .dz { border-color:rgba(160,94,211,.42); background:rgba(160,94,211,.07); }
.ctz.dark .dz:hover { border-color:rgba(160,94,211,.7); background:rgba(160,94,211,.13); }
.ctz.dark .oculto-pas { border-color:rgba(255,255,255,.16); background:rgba(255,255,255,.03); }
.ctz.dark .mrg:hover, .ctz.dark .mrg:focus-visible { background:rgba(255,255,255,.06); }
.ctz.dark .acc-row { border-bottom-color:var(--hair-soft); }
.ctz.dark .sug-base { background:linear-gradient(90deg,rgba(120,90,229,.16),rgba(69,212,192,.10));
  border-color:rgba(160,94,211,.38); }
.ctz.dark .sug-ico { background:rgba(160,94,211,.24); color:var(--violet-ink); }
.ctz.dark .btn-ia { border-color:rgba(160,94,211,.45); }
.ctz.dark .btn-ia:hover:not(:disabled) { border-color:rgba(160,94,211,.7); background:rgba(160,94,211,.14); }

/* seguimiento, drawer y compartir */
.ctz.dark .cola-i { background:var(--card-2); }
.ctz.dark .cola-i:hover { border-color:rgba(160,94,211,.4); box-shadow:0 10px 24px -14px rgba(0,0,0,.9); }
.ctz.dark .fila-acc { background:linear-gradient(90deg,rgba(30,31,61,0),#1E1F3D 30%); }
.ctz.dark .drawer { background:var(--card); box-shadow:-24px 0 70px -20px rgba(0,0,0,.8); }
.ctz.dark .drawer-bg { background:rgba(5,6,18,.6); }
.ctz.dark .tl-line { background:rgba(255,255,255,.13); }
.ctz.dark .pref { background:var(--card-2); border-color:var(--hair-soft); }
.ctz.dark .pref-cta { background:rgba(247,178,103,.22); color:var(--ink-amber); }
.ctz.dark .pref-cta:hover { background:rgba(247,178,103,.34); }
.ctz.dark .env { background:var(--card-2); }
.ctz.dark .env-link { background:var(--pop); border-color:var(--hair); }
.ctz.dark .via-off { background:rgba(255,255,255,.04); }
.ctz.dark .ov { background:rgba(5,6,18,.6); }
.ctz.dark .sem .tip, .ctz.dark .mrg .tip { background:#2B2E52; box-shadow:0 16px 38px -10px rgba(0,0,0,.8),
  0 0 0 1px rgba(255,255,255,.09); }
.ctz.dark .sem .tip::after { border-top-color:#2B2E52; }
.ctz.dark .mrg .tip::after { border-top-color:#2B2E52; }
.ctz.dark .sem-dot { box-shadow:0 0 0 3px rgba(255,255,255,.06); }

/* marco del navegador de la vista previa: el CROMO oscurece, el contenido no */
.ctz.dark .browser-bar { background:#22254A; border-bottom-color:rgba(255,255,255,.1); }
.ctz.dark .browser-url { background:#161834; border-color:rgba(255,255,255,.1); color:var(--n500); }
/* .wordmark NO se toca: el mismo componente se usa dentro del teléfono (fondo claro) */

/* ══ v2D: mobile — el seguimiento entra en el celular ═════════════════
   Objetivo: home + seguimiento usables con una mano. El editor es de
   escritorio: acá no se toca (el rail ya se esconde a 900px).
   ══════════════════════════════════════════════════════════════════════ */
@media (max-width:700px){
  .ctz .home-wrap { padding:20px 16px 48px !important; }
  .ctz .home-cta { flex:1 1 100%; }
  .ctz .home-tabs { overflow-x:auto; scrollbar-width:none; }
  .ctz .home-tabs::-webkit-scrollbar { height:0; }
  .ctz .home-pad { padding:15px 16px 18px !important; }
  /* las ayudas largas de cada encabezado no entran en el ancho del celular */
  .ctz .hint-desk { display:none !important; }

  /* paquetes y vendedores: carrusel con snap en vez de una torre de cards */
  .ctz .pq-grid, .ctz .vend-grid { display:flex !important; gap:10px; overflow-x:auto;
    scroll-snap-type:x mandatory; margin:0 -16px; padding:2px 16px 8px; scrollbar-width:none; }
  .ctz .pq-grid::-webkit-scrollbar, .ctz .vend-grid::-webkit-scrollbar { height:0; }
  .ctz .pq-grid > * { flex:0 0 76%; scroll-snap-align:start; }
  .ctz .vend-grid > * { flex:0 0 62%; scroll-snap-align:start; }
  .ctz .pq-vacio { flex:1 1 100% !important; }

  /* "Para hoy": la acción abajo, ancha y cómoda al dedo */
  .ctz .cola-i { flex-wrap:wrap; padding:10px 12px; }
  .ctz .cola-acc { flex:1 1 100%; height:36px; font-size:12.5px; }

  /* la tabla de seguimiento pasa a cards apiladas */
  .ctz .tabla-head { display:none !important; }
  .ctz .fila-seg { display:grid !important; grid-template-columns:minmax(0,1fr) auto;
    gap:3px 10px !important; padding:12px 13px !important; }
  .ctz .fs-cli { display:contents; }
  .ctz .fs-num, .ctz .fs-vend, .ctz .fs-chev { display:none !important; }
  .ctz .fs-cli-n { grid-column:1; grid-row:1; font-size:14px !important; }
  .ctz .fs-estado { grid-column:2; grid-row:1; width:auto !important; }
  .ctz .fs-cli-d { grid-column:1; grid-row:2; }
  .ctz .fs-monto { grid-column:2; grid-row:2; width:auto !important; }
  .ctz .fs-sem { grid-column:1; grid-row:3; width:auto !important; gap:7px; margin-top:5px;
    justify-content:flex-start !important; }
  .ctz .fs-sem .tip { display:none !important; }
  .ctz .sem-txt { display:inline; font-size:11.5px; font-weight:600; color:var(--n500); }
  .ctz .fs-dias { grid-column:2; grid-row:3; width:auto !important; margin-top:5px; }
  .ctz .fila-acc { position:static !important; grid-column:1 / -1; grid-row:4;
    transform:none !important; opacity:1 !important; pointer-events:auto !important;
    background:none !important; padding-left:0 !important; margin-top:9px; gap:7px; }
  .ctz .fila-acc > .btn { flex:1 1 0; width:auto !important; height:36px !important; }

  /* el drawer ocupa la pantalla entera */
  .ctz .drawer, .ctz .drawer-izq { width:100% !important; border-radius:0; animation:riseUp .26s cubic-bezier(.16,1,.3,1); }
  .ctz .drawer-x { width:40px !important; height:40px !important; }
  .ctz .drawer-acc { flex-wrap:wrap; }
  .ctz .drawer-acc > .btn { min-height:42px; }
}

/* ══════════════════════════════════════════════════════════════════════════
   LINK PÚBLICO DE COTIZACIÓN  ·  /c/<token>
   ──────────────────────────────────────────────────────────────────────────
   El pasajero abre esto desde WhatsApp. No es una página del sitio: es un
   documento dirigido a una persona, así que el chrome se reduce al wordmark
   arriba y a los datos de la agencia abajo, y todo lo demás es la hoja.

   Todo cuelga de .ctz-pub — la raíz que pone el layout del route group
   (cotizacion) — para no tocar ni el panel ni la vista previa del editor.
   ══════════════════════════════════════════════════════════════════════════ */

.ctz-pub {
  --pub-w:880px;
  /* Fondo tintado con el violeta de marca y un resto de coral arriba a la
     derecha: gris puro deja la hoja flotando sobre nada. */
  --pub-bg:#F3F1F9;
  min-height:100dvh; display:flex; flex-direction:column;
  background:
    radial-gradient(115% 52% at 84% -10%, rgba(244,62,85,.10), transparent 62%),
    radial-gradient(95% 58% at 2% 106%, rgba(120,90,229,.13), transparent 66%),
    var(--pub-bg);
  font-variant-numeric:tabular-nums;
}
/* grano fijo: rompe el plano del fondo sin que se note qué lo rompe */
.ctz-pub::before {
  content:''; position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.035;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
}

.ctz-pub-top { position:relative; z-index:1; width:100%; max-width:var(--pub-w);
  margin:0 auto; padding:26px 20px 15px; display:flex; align-items:center; }
.ctz-pub-top .wordmark { opacity:.92; }
.ctz-pub-main { position:relative; z-index:1; flex:1 0 auto; }

.ctz-pub-pie { position:relative; z-index:1; width:100%; max-width:var(--pub-w);
  margin:0 auto; padding:26px 22px 44px; text-align:center; }
.ctz-pub-pie-l { margin:0 0 4px; font-size:11.5px; line-height:1.7; color:var(--n400);
  text-wrap:pretty; }
.ctz-pub-pie a { color:var(--n500); text-decoration:none;
  border-bottom:1px solid rgba(17,17,36,.13); transition:color .2s, border-color .2s; }
.ctz-pub-pie a:hover { color:var(--violet); border-color:rgba(120,90,229,.5); }

/* la hoja: sin borde — la elevación ya la separa del fondo — y con la sombra
   tintada del violeta que tiñe la página, no negro al 35 % */
.ctz-pub .cot-hoja { position:relative; max-width:var(--pub-w); margin:0 auto; background:#fff;
  box-shadow:0 1px 2px rgba(58,38,120,.055), 0 44px 84px -48px rgba(58,38,120,.45); }
@media (min-width:768px){
  .ctz-pub .cot-hoja { border-radius:22px; overflow:hidden; }
}

/* ── entrada escalonada de las secciones ──────────────────────────────────
   El estado por defecto es VISIBLE: si el JS no corre, si el observer no
   existe o si el navegador respeta reduce-motion, la cotización se lee igual.
   Solo cuando la ficha se marca a sí misma con data-animar="1" —después de
   montar, y nunca en la vista previa del vendedor ni en el papel— los bloques
   arrancan corridos y suben a su lugar. */
[data-animar="1"] [data-ap] { opacity:0; transform:translateY(15px); }
[data-animar="1"] [data-ap][data-vis="1"] { opacity:1; transform:none;
  transition:opacity .45s cubic-bezier(.2,.8,.2,1), transform .45s cubic-bezier(.2,.8,.2,1); }
@media (prefers-reduced-motion:reduce){
  [data-animar="1"] [data-ap] { opacity:1 !important; transform:none !important; }
}

/* ── título de sección ────────────────────────────────────────────────────
   Vive fuera de .ctz-pub a propósito: la misma pieza la usan la pantalla del
   pasajero, la vista previa del vendedor y el papel. */
.sec-t { margin:0 0 12px; break-after:avoid; }
.sec-t-rule { display:block; width:26px; height:2.5px; border-radius:99px; margin-bottom:9px;
  background:linear-gradient(90deg,var(--coral),var(--violet)); }
.sec-t-tx { display:block; font-size:15px; font-weight:600; line-height:1.25;
  letter-spacing:-.018em; color:var(--ink); }

/* ── switcher de opciones: le faltaba todo lo que pasa antes del click ──── */
.opt-seg > button { transition:background .2s, color .2s, box-shadow .2s, transform .14s cubic-bezier(.2,.8,.2,1); }
.opt-seg > button:hover:not([data-on="1"]) { background:rgba(255,255,255,.6); color:var(--ink); }
.opt-seg > button[data-on="1"] { transform:translateY(-1px); }

/* ── confirmar: presión física y llegada del sí ──────────────────────────── */
.btn-conf { position:relative; overflow:hidden;
  transition:transform .14s cubic-bezier(.2,.8,.2,1), box-shadow .22s, filter .22s; }
.btn-conf:hover:not(:disabled) { transform:translateY(-1px); filter:saturate(1.06);
  box-shadow:0 12px 26px -8px rgba(42,158,142,.55), inset 0 1px 0 rgba(255,255,255,.34); }
.btn-conf:active:not(:disabled) { transform:translateY(1px) scale(.985);
  box-shadow:0 4px 10px -4px rgba(42,158,142,.5), inset 0 2px 7px rgba(0,0,0,.14); }
.btn-conf:disabled { transform:none; }
/* el barrido de luz mientras viaja la action: dice "está pasando algo" sin spinner */
.btn-conf[data-enviando="1"]::after { content:''; position:absolute; inset:0;
  background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.34) 50%,transparent 70%);
  animation:shimmer 1.1s linear infinite; background-size:220% 100%; }

/* "Ver detalle" / "Cerrar" y "Solicitar una revisión": estados, no texto muerto */
.op-ver { transition:color .18s, gap .18s; }
.op-cab:hover .op-ver { gap:6px; }
.op-cab { transition:background .2s; }
.op-cab:hover { background:rgba(120,90,229,.028); }
.lnk-rev { transition:color .18s, opacity .18s; }
.lnk-rev:hover:not(:disabled) { color:var(--violet-ink); }

/* la tarjeta de opción respira al pasarle por encima */
.op-card { transition:box-shadow .28s cubic-bezier(.2,.8,.2,1), transform .28s cubic-bezier(.2,.8,.2,1); }
.ctz-pub .op-card:hover { transform:translateY(-2px); }

/* el precio del encabezado de la opción, cuando rueda el odómetro */
@keyframes precioLatido { 0%{transform:scale(1)} 40%{transform:scale(1.045)} 100%{transform:scale(1)} }
.precio-chip { display:inline-block; transform-origin:right center; }
.precio-chip[data-latido="1"] { animation:precioLatido .42s cubic-bezier(.2,.8,.2,1); }
@media (prefers-reduced-motion:reduce){ .precio-chip[data-latido="1"] { animation:none; } }

/* ── link vencido o revocado ──────────────────────────────────────────────
   Misma tarjeta, misma sombra y mismo Playfair que la hoja: el pasajero tiene
   que reconocer de dónde viene, aunque lo que abrió ya no esté. */
.cot-vencida { max-width:560px; margin:0 auto; padding:8px 20px 20px; }
.cot-vencida > section { background:#fff; border-radius:22px; padding:34px 30px 30px;
  box-shadow:0 1px 2px rgba(58,38,120,.055), 0 44px 84px -48px rgba(58,38,120,.45); }
.cv-rule { display:block; width:30px; height:3px; border-radius:99px; margin-bottom:16px;
  background:linear-gradient(90deg,var(--coral),var(--violet)); }
.cv-t { font-size:29px; font-weight:600; line-height:1.12; letter-spacing:-.03em;
  margin:0 0 12px; text-wrap:balance; color:var(--ink); }
.cv-p { font-size:14.5px; line-height:1.6; color:var(--n600); margin:0; max-width:52ch;
  text-wrap:pretty; }
.cv-vend { display:flex; align-items:center; gap:13px; margin:26px 0 16px;
  padding-top:22px; border-top:1px solid var(--hair-soft); }
.cv-foto { width:52px; height:52px; border-radius:50%; flex-shrink:0; object-fit:cover;
  box-shadow:0 0 0 3px rgba(120,90,229,.13); }
.cv-ini { display:grid; place-items:center; font-size:17px; font-weight:700; color:#fff;
  background:linear-gradient(145deg,var(--violet-2),var(--violet)); }
.cv-vend-n { font-size:15.5px; font-weight:700; letter-spacing:-.015em; }
.cv-vend-c { font-size:12px; color:var(--n400); margin-top:1px; }
.cv-cta { display:flex; align-items:center; justify-content:center; min-height:50px;
  border-radius:14px; color:#fff; font-size:14.5px; font-weight:800; letter-spacing:-.012em;
  text-decoration:none; background:linear-gradient(103deg,var(--coral) 0%,#C4409B 47%,var(--violet) 100%);
  box-shadow:0 10px 24px -9px rgba(120,90,229,.6);
  transition:transform .14s cubic-bezier(.2,.8,.2,1), box-shadow .22s, filter .22s; }
.cv-cta:hover { transform:translateY(-1px); filter:saturate(1.06);
  box-shadow:0 14px 30px -10px rgba(120,90,229,.7); }
.cv-cta:active { transform:translateY(1px) scale(.99); box-shadow:0 5px 12px -6px rgba(120,90,229,.6); }
.cv-nota { display:flex; align-items:center; justify-content:center; gap:6px; margin:14px 0 0;
  font-size:11.5px; color:var(--n300); text-align:center; }
@media (max-width:520px){
  .cot-vencida > section { padding:28px 22px 26px; border-radius:20px; }
  .cv-t { font-size:25px; }
}

/* ── esqueleto mientras la hoja monta ────────────────────────────────────── */
@keyframes pubShim { 0%{background-position:-180% 0} 100%{background-position:180% 0} }
.pub-sk { max-width:var(--pub-w); margin:0 auto; background:#fff; overflow:hidden; }
@media (min-width:768px){ .pub-sk { border-radius:22px; } }
.pub-sk-h { height:150px; background:linear-gradient(103deg,rgba(244,62,85,.45),rgba(120,90,229,.45)); }
.pub-sk-b { padding:24px 22px 34px; }
.pub-sk-l { height:12px; border-radius:99px; margin-bottom:11px;
  background:linear-gradient(90deg,var(--n100),rgba(17,17,36,.05),var(--n100));
  background-size:180% 100%; animation:pubShim 1.5s ease-in-out infinite; }

/* ══ móvil ══ */
@media (max-width:767px){
  .ctz-pub-top { padding:20px 18px 12px; }
  .ctz-pub-pie { padding:22px 20px 36px; }
  /* nada de tablas de tarifas empujando la hoja a lo ancho */
  .ctz-pub .cot-hoja { overflow-x:hidden; }
  /* el dedo pide 44 px: el switcher los tenía justos y el link de revisión, no */
  .ctz-pub .opt-seg > button { min-height:48px; }
  .ctz-pub .lnk-rev { min-height:44px; }
  .ctz-pub .sec-t-tx { font-size:14.5px; }
}

/* ── membrete del papel ───────────────────────────────────────────────────
   El logo oficial, centrado sobre el blanco de la hoja, con el número de la
   cotización a un lado. Vive fuera del bloque de impresión a propósito: la
   vista previa del panel dibuja el mismo marcado en pantalla y tiene que
   verse igual que lo que va a salir. Solo lo pinta SalidaPasajero en modo
   print, así que ninguna otra pantalla lo hereda. */
.pr-mbr { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px;
  padding:14px 2px 16px; }
.pr-mbr-logo { display:block; width:120px; height:auto; margin:0 auto;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.pr-mbr-num { font-size:12px; line-height:1.2; color:#8A8DB5; letter-spacing:.01em;
  font-variant-numeric:tabular-nums; }

/* condiciones a dos columnas cuando las líneas son cortas (solo papel) */
.pr-2col { columns:2; column-gap:26px; }
.pr-2col > li { break-inside:avoid; page-break-inside:avoid; }

/* ── el papel ─────────────────────────────────────────────────────────────
   Mismo documento, otro soporte. Lo que cambia son tres cosas: el chrome de
   la página no existe, el ritmo vertical se abre (un título respira arriba y
   se pega a lo que titula), y las tarifas dejan de ser tarjetas para volverse
   una tabla de líneas finas con los números alineados a la derecha. */
@media print {
  .ctz-pub { min-height:0; background:#fff !important; display:block; }
  .ctz-pub::before { display:none !important; }
  .ctz-pub [data-ctz-chrome] { display:none !important; }
  .ctz-pub .cot-hoja { max-width:none; margin:0; border-radius:0; box-shadow:none; }
  /* las animaciones de entrada no llegan al papel ni por accidente */
  [data-animar="1"] [data-ap] { opacity:1 !important; transform:none !important; }

  /* Ritmo del título de sección.
     Sobre el papel el título es Playfair: es la letra con la que la marca
     titula, y es lo que separa una sección de un renglón cualquiera en un
     documento que por lo demás es todo DM Sans. El aire de ARRIBA lo pone
     cada sección con las constantes AIRE_* de telefono.jsx (el margen del
     bloque, no el del título: así una sección que no se dibuja no deja aire
     doble); acá solo van los 8 de abajo, para que el título quede pegado a lo
     que titula, que es lo único que el corte de página tiene que respetar. */
  .ctz .print-hoja .sec-t { margin:0 0 8px; break-inside:avoid; page-break-inside:avoid; }
  .ctz .print-hoja .sec-t-rule { width:24px; height:2px; margin-bottom:6px; }
  .ctz .print-hoja .sec-t-tx { font-family:'Playfair Display',Georgia,serif; font-size:15.5px;
    font-weight:600; line-height:1.2; letter-spacing:-.012em; }
  /* el renglón gris bajo el título de las opciones: sin caja y sin peso */
  .ctz .print-hoja .sec-sub { margin:-4px 0 12px !important; }

  /* las estrellas del hotel, en dorado suave: sobre papel el naranja fuerte
     competía con el precio, que es lo que tiene que mirarse primero */
  .ctz .print-hoja .lucide-star { fill:#D9A441 !important; color:#D9A441 !important; }

  /* tarifas: tabla, no tarjeta */
  .ctz .print-hoja .tar-box { background:#fff !important; border:none !important;
    border-top:1px solid rgba(17,17,36,.14) !important;
    border-bottom:1px solid rgba(17,17,36,.14) !important; border-radius:0 !important; }
  .ctz .print-hoja .tar-hd { border-bottom:1px solid rgba(17,17,36,.09) !important;
    padding-left:0 !important; padding-right:0 !important; }
  .ctz .print-hoja .tar-row { padding-left:0 !important; padding-right:0 !important; }
  .ctz .print-hoja .tar-sep { margin:0 !important; }

  /* la firma cierra el documento: el peso lo dan el marco y la foto, no el
     relleno — sobre papel cada milímetro se paga en páginas */
  .ctz .print-hoja .firma-caja { padding:13px 15px !important; background:#fff !important;
    border:1px solid rgba(17,17,36,.14) !important; border-radius:14px !important; }
}
`;

export { CSS };
