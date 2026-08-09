const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.ctz *, .ctz *::before, .ctz *::after { box-sizing: border-box; }
.ctz {
  --teal-1:#45D4C0; --teal-2:#2A9E8E; --teal-3:#1F7D70;
  --violet:#785AE5; --violet-2:#A05ED3; --coral:#F43E55;
  --navy:#1A3A5C; --ink:#1A1A2E; --ink-2:#111124;
  --page:#F5F6FA; --card:#FFFFFF;
  --n300:#B0B4CD; --n400:#8A8DB5; --n500:#6B6F99; --n600:#3D4066; --n100:#ECEDF5; --n50:#F5F6FA;
  --hair:rgba(17,17,36,0.09); --hair-soft:rgba(17,17,36,0.055);
  --brand-a:#F43E55; --brand-b:#785AE5;
  font-family:'DM Sans',system-ui,sans-serif;
  color:var(--ink); background:var(--page);
  font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased;
}

.ctz button { font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; }
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
.in { width:100%; height:38px; padding:0 12px; background:#fff; border:1px solid rgba(17,17,36,.14);
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
.sem .tip { display:none; position:absolute; bottom:calc(100% + 9px); right:-10px; width:216px;
  background:rgba(26,26,46,.97); color:#fff; padding:10px 12px; border-radius:11px; font-size:11px;
  line-height:1.55; z-index:70; box-shadow:0 14px 34px -10px rgba(17,17,36,.5); text-align:left; }
.sem .tip b { display:block; font-size:11.5px; margin-bottom:2px; }
.sem .tip::after { content:''; position:absolute; top:100%; right:13px; border:5px solid transparent;
  border-top-color:rgba(26,26,46,.97); }
.sem:hover .tip { display:block; animation:fadeIn .15s; }

/* ── drawer de analytics ─────────────────────────────────────────────── */
.drawer { position:fixed; top:0; right:0; bottom:0; width:min(400px,94vw); background:#fff; z-index:96;
  box-shadow:-24px 0 60px -20px rgba(17,17,36,.35); animation:slideInR .28s cubic-bezier(.16,1,.3,1);
  display:flex; flex-direction:column; }
.drawer-bg { position:fixed; inset:0; background:rgba(17,17,36,.35); backdrop-filter:blur(3px); z-index:95; animation:fadeIn .2s; }
.tl-row { display:flex; gap:11px; }
.tl-rail { display:flex; flex-direction:column; align-items:center; width:14px; flex-shrink:0; }
.tl-dot { width:9px; height:9px; border-radius:99px; flex-shrink:0; margin-top:4px; }
.tl-line { width:2px; flex:1; background:rgba(17,17,36,.08); border-radius:9px; margin:3px 0; }

/* ── segmentos ───────────────────────────────────────────────────────── */
.seg { display:inline-flex; gap:3, padding:3px; background:rgba(17,17,36,.055); border-radius:11px; padding:3px; }
.seg button { padding:6px 13px; border-radius:8px; font-size:12px; font-weight:600; color:var(--n400);
  display:inline-flex; align-items:center; gap:6px; transition:all .18s; }
.seg button[data-on="1"] { background:#fff; color:var(--ink); box-shadow:0 1px 3px rgba(26,26,46,.14); }

/* ── dropzone ────────────────────────────────────────────────────────── */
.dz { border:1.5px dashed rgba(120,90,229,.32); border-radius:14px; padding:22px 16px; text-align:center;
  background:rgba(120,90,229,.03); cursor:pointer; transition:all .2s; }
.dz:hover { border-color:rgba(120,90,229,.55); background:rgba(120,90,229,.06); transform:translateY(-1px); }

/* ── wysiwyg ─────────────────────────────────────────────────────────── */
.wys { min-height:88px; padding:11px 13px; background:#fff; border:1px solid rgba(17,17,36,.14);
  border-radius:0 0 11px 11px; font-size:13.5px; line-height:1.65; outline:none; }
.wys:focus { border-color:var(--teal-2); box-shadow:0 0 0 3px rgba(59,191,173,.13); }
.wys ul { margin:4px 0; padding-left:20px; }
.wys:empty::before { content:attr(data-ph); color:var(--n300); }
.wys-bar { display:flex; gap:3px; padding:6px 8px; background:#FAFBFE; border:1px solid rgba(17,17,36,.14);
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

.ov { position:fixed; inset:0; background:rgba(17,17,36,.42); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:120; display:grid; place-items:center; padding:20px; }
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
`;

export { CSS };
