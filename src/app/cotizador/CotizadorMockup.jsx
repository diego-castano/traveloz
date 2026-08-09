"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plane, Building2, Car, Shield, Sparkles, MapPin, Calendar, User, MessageSquare,
  FileText, Copy, Trash2, GripVertical, Plus, Check, ChevronDown, ChevronRight,
  Search, Send, Download, Eye, ArrowLeft, Command, Zap, Star,
  Bed, Undo2, X, Mail, Smartphone, LayoutGrid, Loader2, CheckCheck, AlertCircle,
  RefreshCw, Wallet, PenLine, Link2, Printer, Lock, ArrowUp, ArrowDown, Bus,
  Utensils, TrendingUp, CornerDownLeft, Gauge, Ticket, Files, Monitor, StickyNote, ListChecks, Clock3
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   COTIZADOR — Mockup funcional
   Latitud Nómade · TravelOz + Destínico

   Tokens tomados de tailwind.config.ts (backend) y site.css (sitio público):
     · Gradiente de marca TravelOz  #F43E55 → #785AE5
     · Acción primaria (clay teal)  #45D4C0 → #2A9E8E
     · Tinta                        #1A1A2E / #111124
     · Página / Card                #F5F6FA / #FFFFFF
     · Hairline                     rgba(17,17,36,0.07)
     · Tipografías                  Playfair Display · DM Sans · JetBrains Mono

   Sin base de datos. Todo el estado vive en memoria.
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   DATOS SIMULADOS  (en producción salen del catálogo del backend)
   ═══════════════════════════════════════════════════════════════════════════ */

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MES_AB = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const ANIO_BASE = 2026;

/* Fotos: se generan por semilla para que cualquier "original" quede en la
   misma relación de aspecto — es exactamente lo que pidió Santi. */
const PALETAS = [
  ["#F4A261","#E76F51","#2A3D66"], ["#48CAE4","#0077B6","#03045E"],
  ["#F7B267","#F25C54","#5A189A"], ["#95D5B2","#2D6A4F","#1B4332"],
  ["#FFC8DD","#BDB2FF","#4361EE"], ["#FFD166","#EF476F","#073B4C"],
  ["#A8DADC","#457B9D","#1D3557"], ["#FFCB77","#FE6D73","#17C3B2"],
];
function fotoBg(seed = 0) {
  const p = PALETAS[Math.abs(seed) % PALETAS.length];
  return `radial-gradient(120% 90% at 22% 12%, ${p[0]} 0%, transparent 55%),
          radial-gradient(110% 80% at 82% 30%, ${p[1]} 0%, transparent 60%),
          linear-gradient(168deg, ${p[1]} 0%, ${p[2]} 100%)`;
}
function Foto({ seed = 0, w = 56, h = 42, r = 10, children, style }) {
  return (
    <div className="foto" style={{ width: w, height: h, borderRadius: r, background: fotoBg(seed), ...style }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,transparent 45%,rgba(0,0,0,.28))" }} />
      {children}
    </div>
  );
}

const HOTELES = [
  { id:"h1",  nombre:"Windsor Excelsior",         ciudad:"Río de Janeiro", cat:4, seed:1 },
  { id:"h2",  nombre:"Miramar by Windsor",        ciudad:"Río de Janeiro", cat:5, seed:2 },
  { id:"h3",  nombre:"Arena Copacabana",          ciudad:"Río de Janeiro", cat:4, seed:3 },
  { id:"h4",  nombre:"Fairmont Rio Copacabana",   ciudad:"Río de Janeiro", cat:5, seed:4 },
  { id:"h5",  nombre:"Pousada Vila da Santa",     ciudad:"Búzios",         cat:4, seed:5 },
  { id:"h6",  nombre:"Casas Brancas Boutique",    ciudad:"Búzios",         cat:5, seed:6 },
  { id:"h7",  nombre:"Insólito Boutique",         ciudad:"Búzios",         cat:5, seed:7 },
  { id:"h8",  nombre:"Bahia Principe Grand",      ciudad:"Punta Cana",     cat:5, seed:8 },
  { id:"h9",  nombre:"Riu Palace Macao",          ciudad:"Punta Cana",     cat:5, seed:9 },
  { id:"h10", nombre:"Occidental Caribe",         ciudad:"Punta Cana",     cat:4, seed:10 },
  { id:"h11", nombre:"Hotel Praia Centro",        ciudad:"Florianópolis",  cat:4, seed:11 },
  { id:"h12", nombre:"Costão do Santinho",        ciudad:"Florianópolis",  cat:5, seed:12 },
  { id:"h13", nombre:"NH Collection Eurobuilding",ciudad:"Madrid",         cat:5, seed:13 },
  { id:"h14", nombre:"Catalonia Plaza Catalunya", ciudad:"Barcelona",      cat:4, seed:14 },
  { id:"h15", nombre:"Hotel Mundial",             ciudad:"Lisboa",         cat:4, seed:15 },
  { id:"h16", nombre:"Meliá Buenos Aires",        ciudad:"Buenos Aires",   cat:5, seed:16 },
];

const REGIMENES = ["Desayuno","Media pensión","Pensión completa","All inclusive","Solo alojamiento"];
const HABITACIONES = ["Doble estándar","Doble superior","Doble vista al mar","Triple estándar","Suite junior","Bungalow"];

/* Iconos REALES del sistema — extraídos de src/components/ui/traveloz-icons.tsx */
const TzIcon = ({ vb, size = 14, children, style }) => (
  <svg viewBox={vb} width={size} height={size} fill="currentColor" aria-hidden style={style}>{children}</svg>
);
const IcoAvion = (p) => <TzIcon vb="0 0 57.1 57.36" {...p}><path d="M46.15,51.77l-3.63,3.63c-1.11.88-2.57.33-3.28-.8l-7.63-20.26c-3.02,3.02-6.12,5.98-9.27,8.87.31,2.71.57,5.43.8,8.15.04.63-.12,2.35-.87,2.33.07.09.16.22.11.28-.52.65-2.26,2.42-2.91,2.91l-.34-.05c.12.21.09.26-.08.37-.57.36-1.97.11-2.42-.42l-.98-.98-1.22-1.61-4.15-7.46-7.45-4.13-1.61-1.22-.98-.98c-.25-.77-.41-1.68.1-2.4.45-.65,2.06-2.22,2.7-2.75,1.02-.83,2.08-1.02,3.34-.99,2.41.06,5.05.64,7.48.77,2.96-3.32,6.29-6.33,9.25-9.65L2.55,17.57c-.9-.52-1.31-2.05-.79-2.93.36-.62,2.8-3.02,3.44-3.52.6-.46,1.42-.65,2.16-.7l27.37,2.64C39.36,9.22,44.98.38,51.5,0c3.25-.19,5.71,2.26,5.6,5.5-.19,5.38-6.45,10.29-10.01,13.73-.56.54-2.92,2.75-3.05,3.25.76,9.36,1.98,18.7,2.52,28.06l-.41,1.23Z" /></TzIcon>;
const IcoCama = (p) => <TzIcon vb="0 0 64.29 45.66" {...p}><path d="M.07,41.11c.05-4.79-.29-9.96.18-14.5.34-3.25,3.22-5.93,6.48-6.1h51.33c2.55.32,4.76,1.92,5.72,4.3l.5,1.57v14.72h-4.57s-54.9,0-54.9,0l-4.74.02Z" /><path d="M57.42,15.94h-6.86v-2.93c0-1.45-1.72-3.22-3.04-3.67-1.34-.46-6.98-.39-8.61-.26-1.89.15-4.36,1.89-4.36,3.93v2.93h-4.57v-2.93c0-1.45-1.72-3.22-3.04-3.67-1.34-.46-6.98-.39-8.61-.26-1.89.15-4.36,1.89-4.36,3.93v2.93h-6.86V1.72c0-.57.41-1.72,1.71-1.72l47.02.03c1.05,0,1.6,1.16,1.6,1.69v14.22Z" /><path d="M59.37,41.11h4.92v2.1c0,1.36-1.1,2.46-2.46,2.46h0c-1.36,0-2.46-1.1-2.46-2.46v-2.1h0Z" /><path d="M.07,41.11h4.92v2.1c0,1.36-1.1,2.46-2.46,2.46h0c-1.36,0-2.46-1.1-2.46-2.46v-2.1H.07Z" /></TzIcon>;
const IcoBus = (p) => <TzIcon vb="0 0 79.43 44.31" {...p}><path d="M75.85,39.8h-3.84c1.12-5.69-3.23-10.81-8.83-10.81s-9.98,5.12-8.85,10.82H21.47c1.12-5.63-3.14-10.72-8.64-10.82s-10.14,5.06-9.05,10.81C1.7,39.85,0,38.3,0,36.22V3.6C0,1.62,1.74,0,3.72,0h65.92c3.5,0,6.63,2.34,7.19,5.83l2.12,13.04c.32,1.99.47,3.91.46,5.92v11.44c0,1.93-1.6,3.55-3.57,3.56ZM18.05,18.13V3.7s-12.67,0-12.67,0c-1,.04-1.7.74-1.77,1.74v12.7s14.44-.01,14.44-.01ZM36.11,3.7h-14.44v14.44h14.44V3.7ZM54.15,3.7h-14.44v14.43h14.44V3.7ZM75.38,19.66l-2.07-12.81c-.24-1.73-1.66-3.14-3.48-3.14h-12.08s0,14.44,0,14.44l5.41,5.41h12.56s-.36-3.9-.36-3.9Z" /><circle cx="12.63" cy="38" r="6.31" /><circle cx="63.18" cy="38" r="6.31" /></TzIcon>;
const IcoAuto = (p) => <TzIcon vb="0 0 64.74 45.83" {...p}><path d="M64.74,14.82l-.04.87-.93,4.36c-.17.8-.85,1.34-1.68,1.35l-1.91.02c3.96,4.55,3.71,11.56-.74,15.7l-.02,6.28c0,1.34-1.09,2.34-2.39,2.42h-5.83c-1.46,0-2.55-1.11-2.56-2.55l-.02-2.48H16.09s-.02,2.48-.02,2.48c0,1.44-1.1,2.55-2.56,2.55h-5.69c-1.45-.02-2.53-1.11-2.53-2.55v-6.28c-4.42-4.02-4.69-11.07-.87-15.57l-1.8-.02c-.82,0-1.51-.55-1.68-1.35L.05,15.75c-.12-.58-.05-1.14.33-1.61.29-.35.82-.58,1.37-.58h6.2c1.38-3.38,2.79-6.99,5.54-9.41,2.99-1.97,6.82-2.99,10.4-3.52,5.65-.84,11.31-.84,16.95,0,3.58.53,7.41,1.56,10.4,3.52,2.74,2.41,4.17,6.03,5.53,9.41h6.2c.87,0,1.49.48,1.77,1.25ZM52.39,16.16c-.75-2.21-1.57-4.01-2.48-5.85-.47-.75-.93-1.4-1.49-2.08-2.52-1.58-5.64-2.35-8.62-2.77-4.96-.69-9.91-.69-14.87,0-2.98.42-6.1,1.19-8.62,2.77-.55.65-.99,1.28-1.45,2-.95,1.9-1.79,3.79-2.54,5.93h40.07ZM18.9,29.35c0-2.69-2.18-4.88-4.88-4.88s-4.88,2.18-4.88,4.88,2.18,4.88,4.88,4.88,4.88-2.18,4.88-4.88ZM55.65,29.34c0-2.69-2.18-4.88-4.88-4.88s-4.88,2.18-4.88,4.88,2.18,4.88,4.88,4.88,4.88-2.18,4.88-4.88Z" /></TzIcon>;
const IcoEscudo = (p) => <TzIcon vb="0 0 64.53 75.8" {...p}><path d="M33.01,75.8h-1.47c-12.7-4.07-23.04-11.81-27.93-24.63-1.4-3.67-2.26-7.35-2.8-11.26C.15,35.09-.08,30.35.02,25.48l.17-7.7c.26-4.2,3.68-7.3,7.8-7.53,7.9-.44,14.79-3.07,20.51-8.52,2.41-2.3,5.14-2.3,7.55,0,5.7,5.43,12.63,8.1,20.49,8.52,4.52.24,7.86,3.76,7.9,8.28l.09,9.91c.04,3.94-.27,7.7-.81,11.59-.64,4.58-1.74,8.92-3.61,13.13-2.93,6.58-7.53,12.07-13.5,16.12-4.21,2.86-8.8,5.04-13.59,6.53ZM51.14,37.9c0-10.42-8.45-18.87-18.87-18.87s-18.87,8.45-18.87,18.87,8.45,18.87,18.87,18.87,18.87-8.45,18.87-18.87Z" /><path d="M46.7,37.9c0,7.97-6.46,14.43-14.43,14.43s-14.43-6.46-14.43-14.43,6.46-14.43,14.43-14.43,14.43,6.46,14.43,14.43ZM23.45,41.62l3.8,3.81c.94.94,2.32,1.02,3.29.05l10.34-10.35c.9-.9.75-2.34-.09-3.14s-2.22-.81-3.11.08l-8.75,8.75-2.3-2.31c-.9-.91-2.26-.96-3.16-.13s-.97,2.29-.02,3.24Z" /></TzIcon>;
const IcoEstrella = (p) => <TzIcon vb="0 0 59.53 56.72" {...p}><path d="M29.78,48l-16,8.41c-.79.41-1.55.44-2.29-.06-.54-.36-1.05-1.12-.91-1.96l3.1-18.08L.75,23.71c-.63-.61-.91-1.32-.66-2.22.18-.65.78-1.33,1.67-1.46l18.07-2.62L27.98.88C28.3.23,29.14.01,29.71,0c.63-.01,1.51.19,1.85.89l8.14,16.51,17.86,2.59c.9.13,1.56.6,1.83,1.32.32.86.13,1.7-.53,2.34l-13,12.67,3.08,17.97c.15.85-.26,1.61-.82,2.02-.68.5-1.5.56-2.28.15l-16.06-8.45Z" /></TzIcon>;

const CATS = [
  { id:"aereo",       label:"Aéreo",       Icon:IcoAvion },
  { id:"traslado",    label:"Traslado",    Icon:IcoBus },
  { id:"alojamiento", label:"Alojamiento", Icon:IcoCama },
  { id:"vehiculo",    label:"Vehículo",    Icon:IcoAuto },
  { id:"seguro",      label:"Seguro",      Icon:IcoEscudo },
  { id:"opcionales",  label:"Opcionales",  Icon:IcoEstrella },
];

/* Servicios habituales precargados por categoría */
const SUG = {
  aereo: ["Aéreo ida y vuelta con equipaje de mano","Aéreo ida y vuelta con valija en bodega 23kg","Equipaje de mano 10kg incluido","Tasas e impuestos incluidos"],
  traslado: ["Traslado de llegada","Traslado de salida","Traslado llegada y salida","Traslado llegada, salida e interhotel"],
  alojamiento: ["Alojamiento en base doble","Impuestos hoteleros incluidos","Early check-in sujeto a disponibilidad"],
  vehiculo: ["Alquiler de auto categoría económica","Alquiler de auto categoría SUV","Seguro de cobertura total del vehículo"],
  seguro: ["Asistencia al viajero cobertura básica","Asistencia al viajero cobertura premium","Cobertura por cancelación"],
  opcionales: ["Excursión Cristo Redentor y Pan de Azúcar","City tour de medio día","Paseo en catamarán","Entradas a parques temáticos","Cena show típica"],
};
const MODALIDADES = ["Regular","Privado"];
const SUG_ALL = Object.entries(SUG).flatMap(([cat, arr]) => arr.map((texto) => ({ cat, texto })));

const CIUDADES = ["Río de Janeiro","Búzios","Punta Cana","Florianópolis","Madrid","Barcelona","Lisboa","Buenos Aires","París","Roma","Cancún","Santiago de Chile","Miami","Orlando","Nueva York","Cartagena","Porto Seguro","San Pablo","Bariloche","Punta del Este"];

const AEROLINEAS = { LA:"LATAM", AR:"Aerolíneas Argentinas", G3:"GOL", AD:"Azul", CM:"Copa Airlines", AV:"Avianca", IB:"Iberia", AF:"Air France", UX:"Air Europa", TP:"TAP Air Portugal", H2:"Sky Airline", JJ:"LATAM Brasil" };
const AEROPUERTOS = { MVD:"Montevideo", GRU:"São Paulo · Guarulhos", GIG:"Río de Janeiro", CGH:"São Paulo · Congonhas", EZE:"Buenos Aires · Ezeiza", AEP:"Buenos Aires · Aeroparque", PUJ:"Punta Cana", MAD:"Madrid", BCN:"Barcelona", LIS:"Lisboa", CDG:"París · CDG", FCO:"Roma · Fiumicino", CUN:"Cancún", SCL:"Santiago de Chile", FLN:"Florianópolis", PTY:"Panamá", MIA:"Miami", BPS:"Porto Seguro" };

const PNR_DEMO = `RP/MVDUY2100/MVDUY2100  AA/GS  28JUL26/1432Z
  1.PEREZ/MARIA MRS  2.PEREZ/JUAN MR
  3  LA1339 K 15OCT 4 MVDGRU HK2  0755 0940
  4  LA3226 K 15OCT 4 GRUGIG HK2  1215 1330
  5  LA3247 K 22OCT 4 GIGGRU HK2  1425 1545
  6  LA1338 K 22OCT 4 GRUMVD HK2  1830 2015`;

/* Paquetes ya cargados en el backend — origen de la precarga */
const PAQUETES = [
  {
    id:"pq1", nombre:"Río de Janeiro y Búzios", mes:9, anio:2026, seed:0,
    resumen:"7 noches · 2 destinos · salidas de octubre",
    destinos:[ {ciudad:"Río de Janeiro", noches:4}, {ciudad:"Búzios", noches:3} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg"},
      {cat:"traslado",    texto:"Traslado llegada y salida", ciudad:"Río de Janeiro", modalidad:"Regular"},
      {cat:"traslado",    texto:"Traslado interhotel Río – Búzios", ciudad:"Búzios", modalidad:"Privado"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura básica"},
      {cat:"opcionales",  texto:"Excursión Cristo Redentor y Pan de Azúcar"},
    ],
    opciones:[
      { nombre:"Opción 1 · Turista",  hoteles:["h1","h5"], regimen:"Desayuno",     habitacion:"Doble estándar",     neto:1120, factor:0.88 },
      { nombre:"Opción 2 · Superior", hoteles:["h3","h6"], regimen:"Desayuno",     habitacion:"Doble superior",     neto:1465, factor:0.86 },
      { nombre:"Opción 3 · Premium",  hoteles:["h4","h7"], regimen:"Media pensión",habitacion:"Doble vista al mar", neto:2050, factor:0.84 },
    ],
  },
  {
    id:"pq2", nombre:"Punta Cana All Inclusive", mes:10, anio:2026, seed:1,
    resumen:"7 noches · all inclusive · salidas de noviembre",
    destinos:[ {ciudad:"Punta Cana", noches:7} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg"},
      {cat:"traslado",    texto:"Traslado llegada y salida", ciudad:"Punta Cana", modalidad:"Regular"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura premium"},
    ],
    opciones:[
      { nombre:"Opción 1 · Occidental", hoteles:["h10"], regimen:"All inclusive", habitacion:"Doble estándar", neto:1390, factor:0.88 },
      { nombre:"Opción 2 · Bahia Principe", hoteles:["h8"], regimen:"All inclusive", habitacion:"Doble superior", neto:1720, factor:0.86 },
      { nombre:"Opción 3 · Riu Palace", hoteles:["h9"], regimen:"All inclusive", habitacion:"Doble vista al mar", neto:2180, factor:0.84 },
    ],
  },
  {
    id:"pq3", nombre:"Madrid, Barcelona y Lisboa", mes:2, anio:2027, seed:5,
    resumen:"10 noches · 3 destinos · salidas de marzo",
    destinos:[ {ciudad:"Madrid", noches:3}, {ciudad:"Barcelona", noches:4}, {ciudad:"Lisboa", noches:3} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg"},
      {cat:"traslado",    texto:"Traslado de llegada", ciudad:"Madrid", modalidad:"Privado"},
      {cat:"traslado",    texto:"Traslado de salida", ciudad:"Lisboa", modalidad:"Privado"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"opcionales",  texto:"Tren de alta velocidad Madrid – Barcelona"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura premium"},
    ],
    opciones:[
      { nombre:"Opción 1 · Céntrica", hoteles:["h13","h14","h15"], regimen:"Desayuno", habitacion:"Doble estándar", neto:2340, factor:0.86 },
    ],
  },
  {
    id:"pq4", nombre:"Florianópolis en familia", mes:0, anio:2027, seed:6,
    resumen:"5 noches · media pensión · salidas de enero",
    destinos:[ {ciudad:"Florianópolis", noches:5} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con equipaje de mano"},
      {cat:"traslado",    texto:"Traslado llegada y salida", ciudad:"Florianópolis", modalidad:"Regular"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura básica"},
    ],
    opciones:[
      { nombre:"Opción 1 · Praia Centro", hoteles:["h11"], regimen:"Desayuno",      habitacion:"Doble estándar", neto:780,  factor:0.88 },
      { nombre:"Opción 2 · Costão",       hoteles:["h12"], regimen:"Media pensión", habitacion:"Doble superior", neto:1180, factor:0.85 },
    ],
  },
];

const PAQUETES_EXTRA = [
  { id:"pq5", nombre:"Cancún y Riviera Maya", mes:11, anio:2026, seed:7, resumen:"7 noches · all inclusive · salidas de diciembre",
    destinos:[{ciudad:"Cancún", noches:7}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado llegada y salida",ciudad:"Cancún",modalidad:"Regular"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"seguro",texto:"Asistencia al viajero cobertura premium"}],
    opciones:[{ nombre:"Opción 1 · Riviera", hoteles:["h8"], regimen:"All inclusive", habitacion:"Doble estándar", neto:1610, factor:0.87 }] },
  { id:"pq6", nombre:"Buenos Aires escapada", mes:8, anio:2026, seed:2, resumen:"3 noches · city break · salidas de septiembre",
    destinos:[{ciudad:"Buenos Aires", noches:3}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con equipaje de mano"},{cat:"alojamiento",texto:"Alojamiento en base doble"}],
    opciones:[{ nombre:"Opción 1 · Recoleta", hoteles:["h16"], regimen:"Desayuno", habitacion:"Doble superior", neto:420, factor:0.88 }] },
  { id:"pq7", nombre:"París y Roma", mes:3, anio:2027, seed:4, resumen:"9 noches · 2 capitales · salidas de abril",
    destinos:[{ciudad:"París", noches:5},{ciudad:"Roma", noches:4}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado de llegada",ciudad:"París",modalidad:"Privado"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"seguro",texto:"Asistencia al viajero cobertura premium"}],
    opciones:[{ nombre:"Opción 1 · Céntrica", hoteles:["h13","h14"], regimen:"Desayuno", habitacion:"Doble estándar", neto:2680, factor:0.85 }] },
  { id:"pq8", nombre:"Miami y Orlando", mes:6, anio:2027, seed:9, resumen:"8 noches · parques + playa · salidas de julio",
    destinos:[{ciudad:"Miami", noches:3},{ciudad:"Orlando", noches:5}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"vehiculo",texto:"Alquiler de auto categoría SUV"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"opcionales",texto:"Entradas a parques temáticos"}],
    opciones:[{ nombre:"Opción 1 · Familiar", hoteles:["h10","h9"], regimen:"Desayuno", habitacion:"Triple estándar", neto:2140, factor:0.86 }] },
  { id:"pq9", nombre:"Bariloche invierno", mes:6, anio:2026, seed:10, resumen:"5 noches · nieve · salidas de julio",
    destinos:[{ciudad:"Bariloche", noches:5}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado llegada y salida",ciudad:"Bariloche",modalidad:"Regular"},{cat:"alojamiento",texto:"Alojamiento en base doble"}],
    opciones:[{ nombre:"Opción 1 · Centro", hoteles:["h11"], regimen:"Media pensión", habitacion:"Doble estándar", neto:940, factor:0.88 }] },
  { id:"pq10", nombre:"Cartagena caribe colombiano", mes:9, anio:2026, seed:11, resumen:"6 noches · ciudad amurallada · salidas de octubre",
    destinos:[{ciudad:"Cartagena", noches:6}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado llegada y salida",ciudad:"Cartagena",modalidad:"Regular"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"seguro",texto:"Asistencia al viajero cobertura básica"}],
    opciones:[{ nombre:"Opción 1 · Ciudad vieja", hoteles:["h15"], regimen:"Desayuno", habitacion:"Doble superior", neto:1120, factor:0.87 }] },
];
PAQUETES.push(...PAQUETES_EXTRA);

const PLANTILLAS = [
  { id:"t1", nombre:"Caribe all inclusive", destino:"Punta Cana", detalle:"Aéreo + traslados + seguro premium · base doble", usos:23, ultimo:"hace 2 d" },
  { id:"t2", nombre:"Brasil playa",         destino:"Río de Janeiro", detalle:"Aéreo + traslados regulares + excursión clásica", usos:31, ultimo:"hace 5 h" },
  { id:"t3", nombre:"Europa clásica",       destino:"Madrid", detalle:"Aéreo + traslados privados + trenes entre ciudades", usos:9, ultimo:"hace 6 d" },
];

const CLIENTES = [
  { nombre:"María", apellido:"Pérez", email:"maria.perez@gmail.com", telefono:"+598 99 123 456" },
  { nombre:"Juan", apellido:"Rodríguez", email:"juanrod@hotmail.com", telefono:"+598 98 654 321" },
  { nombre:"Lucía", apellido:"Fernández", email:"lucia.f@gmail.com", telefono:"+598 91 555 010" },
  { nombre:"Martín", apellido:"Olivera", email:"molivera@outlook.com", telefono:"+598 94 777 220" },
  { nombre:"Sofía", apellido:"Methol", email:"sofimethol@gmail.com", telefono:"+598 92 303 404" },
];

const VENDEDORES = [
  { id:"v1", nombre:"Agustina Vera",   inicial:"AV", cargo:"Ejecutiva de ventas", tel:"+598 99 412 330" },
  { id:"v2", nombre:"Gerónimo Silva",  inicial:"GS", cargo:"Líder técnico",       tel:"+598 99 118 204" },
  { id:"v3", nombre:"Amparo Núñez",    inicial:"AN", cargo:"Ejecutiva de ventas", tel:"+598 99 663 871" },
  { id:"v4", nombre:"Federico Vila",   inicial:"FV", cargo:"Ejecutivo de ventas", tel:"+598 99 205 449" },
];

const HISTORIAL = [
  { num:"COT-2026-0147", cliente:"Familia Rodríguez", destino:"Punta Cana, Noviembre 2026", vendedor:"v3", estado:"abierta",
    monto:1955, dias:1, hEnvio:26, aperturas:3, hasta:"4 h 10 m", lectura:"2 m 40 s", hastaSec:"Formas de pago",
    apDet:[{ hace:"hace 22 h", disp:"iPhone · WhatsApp", lugar:"Montevideo, UY" },
           { hace:"hace 20 h", disp:"iPhone · Safari",   lugar:"Montevideo, UY" },
           { hace:"hace 3 h",  disp:"Android · WhatsApp", lugar:"Canelones, UY" }] },
  { num:"COT-2026-0146", cliente:"Lucía Fernández", destino:"Madrid, Marzo 2027", vendedor:"v1", estado:"enviada",
    monto:2720, dias:2, hEnvio:52, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  { num:"COT-2026-0145", cliente:"Martín Olivera", destino:"Florianópolis, Enero 2027", vendedor:"v4", estado:"confirmada",
    monto:1388, dias:4, hEnvio:96, aperturas:6, hasta:"1 h 05 m", lectura:"4 m 12 s", hastaSec:"Confirmó desde el link",
    apDet:[{ hace:"hace 4 d", disp:"iPhone · WhatsApp", lugar:"Montevideo, UY" },
           { hace:"hace 3 d", disp:"Notebook · Chrome", lugar:"Montevideo, UY" },
           { hace:"hace 2 d", disp:"iPhone · WhatsApp", lugar:"Punta del Este, UY" }] },
  { num:"COT-2026-0144", cliente:"Sofía Methol", destino:"Río de Janeiro, Octubre 2026", vendedor:"v1", estado:"enviada",
    monto:1704, dias:5, hEnvio:120, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  { num:"COT-2026-0143", cliente:"Diego Castaño", destino:"Barcelona, Abril 2027", vendedor:"v2", estado:"borrador",
    monto:0, dias:6, hEnvio:null, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  /* v2: caso ámbar (+24 h sin abrir) — es el que dispara "Mandar recordatorio" en la cola de hoy */
  { num:"COT-2026-0142", cliente:"Valentina Souza", destino:"Florianópolis, Enero 2027", vendedor:"v3", estado:"enviada",
    monto:1290, dias:7, hEnvio:30, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
];

/* Semáforo de seguimiento: cuánto hace que se envió y si el pasajero la abrió */
function semaforo(r) {
  if (r.estado === "vencida")    return { c:"#F43E55", l:"Vencida",
    d:"El link venció sin apertura. Reactivalo con un recordatorio o marcá el estado a mano si el seguimiento sigue por otro canal." };
  if (r.estado === "borrador")   return { c:"#B0B4CD", l:"Borrador",
    d:"Todavía no se envió al pasajero. El semáforo arranca a correr cuando la compartas." };
  if (r.estado === "confirmada") return { c:"#2A9E8E", l:"Confirmada",
    d:"Cotización confirmada. Lista para pasar al flujo de reserva." };
  if (r.aperturas > 0)           return { c:"#2A9E8E", l:"Abierta",
    d:`El pasajero la abrió ${r.aperturas === 1 ? "una vez" : r.aperturas + " veces"}. Buen momento para el seguimiento.` };
  if (r.hEnvio == null)          return { c:"#B0B4CD", l:"—", d:"Sin datos de envío." };
  if (r.hEnvio < 24)             return { c:"#45D4C0", l:"En ventana",
    d:"Enviada hace menos de 24 h y todavía sin abrir. Normal — la mayoría se abre el mismo día." };
  if (r.hEnvio < 48)             return { c:"#E8A13C", l:"Sin abrir +24 h",
    d:"Pasaron más de 24 h sin apertura. Conviene un recordatorio corto por WhatsApp." };
  return { c:"#F43E55", l:"Sin abrir +48 h",
    d:"Más de 48 h sin abrir: el link ya venció. Reactivalo y reenviá, o llamá al pasajero." };
}
function fmtHace(h) { if (h == null) return "—"; return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`; }


/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const uid = (() => { let n = 0; return (p = "id") => `${p}_${++n}_${Math.random().toString(36).slice(2, 6)}`; })();
const hotelById = (id) => HOTELES.find((h) => h.id === id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function parseISO(s) { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(iso, n) { const d = parseISO(iso); if (!d) return ""; d.setDate(d.getDate() + n); return toISO(d); }
function fmtCorto(iso) { const d = parseISO(iso); return d ? `${d.getDate()} ${MES_AB[d.getMonth()]}` : "—"; }
function fmtLargo(iso) { const d = parseISO(iso); return d ? `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}` : "—"; }
function money(n) { const v = Number(n); return "USD " + (Number.isFinite(v) ? Math.round(v) : 0).toLocaleString("es-UY"); }
/* Modelo de markup del sistema: Precio Venta = Neto ÷ Factor */
function venta(neto, factor) { const f = Number(factor); if (!f || f <= 0) return 0; return Number(neto) / f; }
function margenPct(factor) { return Math.round((1 - Number(factor)) * 1000) / 10; }

/* Normaliza cualquier pegado a texto plano — mata el problema de tipografías */
function limpiarPegado(txt) {
  return String(txt)
    .replace(/\r/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

/* Parser de PNR. Si no reconoce nada devuelve [] y la UI conserva lo pegado. */
function parsePNR(raw) {
  const out = [];
  const lineas = String(raw).split("\n");
  const re = /([A-Z0-9]{2})\s*(\d{2,4})\s+([A-Z])?\s*(\d{2})([A-Z]{3})\s+\d?\s*([A-Z]{3})([A-Z]{3})\s+[A-Z]{2}(\d+)?\s+(\d{4})\s+(\d{4})/;
  const MES3 = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11,
                 ENE:0, ABR:3, AGO:7, DIC:11 };
  for (const l of lineas) {
    const m = l.toUpperCase().match(re);
    if (!m) continue;
    const [, cia, nro, , dd, mmm, org, dst, , hs, hl] = m;
    if (!(mmm in MES3)) continue;
    out.push({
      id: uid("vl"),
      cia, nro,
      aerolinea: AEROLINEAS[cia] || cia,
      dia: Number(dd), mes: MES3[mmm],
      origen: org, destino: dst,
      salida: `${hs.slice(0, 2)}:${hs.slice(2)}`,
      llegada: `${hl.slice(0, 2)}:${hl.slice(2)}`,
    });
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2 · LECTURA DE CONSULTAS DE WHATSAPP
   Todo acá es JavaScript común: no hay ningún servicio detrás. Alcanza para la
   demo porque el vendedor pega textos cortos y siempre parecidos.
   ═══════════════════════════════════════════════════════════════════════════ */

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const STOP_IA = new Set(["de","la","el","los","las","del","y","en","a","al","con"]);
const NUM_PAL = { un:1, una:1, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10 };
const numPal = (x) => (NUM_PAL[x] != null ? NUM_PAL[x] : Number(x)) || 0;

/* palabra suelta, no pedazo de otra palabra */
function palabraEn(t, w) {
  const e = String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${e}([^a-z0-9]|$)`).test(t);
}

function detectarMes(t) {
  for (let i = 0; i < MESES.length; i++) if (palabraEn(t, norm(MESES[i]))) return i;
  for (let i = 0; i < MES_AB.length; i++) if (MES_AB[i] !== "mar" && palabraEn(t, MES_AB[i])) return i;
  return null;
}

function detectarPax(t) {
  let adultos = null, menores = 0;
  const ad = t.match(/(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s+(adultos?|personas?|pasajeros?|pax)\b/);
  if (ad) adultos = numPal(ad[1]);
  if (adultos == null) { const s = t.match(/somos\s+(\d+|dos|tres|cuatro|cinco|seis|siete|ocho)\b/); if (s) adultos = numPal(s[1]); }
  if (adultos == null && /(mi (senora|esposa|esposo|marido|mujer|novia|novio|pareja))|en pareja|los dos/.test(t)) adultos = 2;
  const re = /(\d+|un|una|dos|tres|cuatro)\s+(nenes?|nenas?|ninos?|ninas?|menores?|chicos?|chicas?|hijos?|bebes?)\b/g;
  let m; while ((m = re.exec(t))) menores += numPal(m[1]);
  return { adultos, menores };
}

function detectarNoches(t) {
  const n = t.match(/(\d+)\s*noches?\b/);            if (n) return Number(n[1]);
  const s = t.match(/(\d+|una|dos|tres)\s*semanas?\b/); if (s) return numPal(s[1]) * 7;
  const d = t.match(/(\d+)\s*dias?\b/);              if (d) return Math.max(1, Number(d[1]) - 1);
  return null;
}

/* puntaje: ciudad completa vale más que una palabra suelta; el mes que coincide desempata */
function detectarPaquete(t, mes) {
  let mejor = null, top = 0;
  for (const p of PAQUETES) {
    let sc = 0;
    for (const d of p.destinos) {
      const c = norm(d.ciudad);
      if (t.includes(c)) { sc += 3; continue; }
      const toks = c.split(/\s+/).filter((w) => w.length >= 3 && !STOP_IA.has(w));
      const hits = toks.filter((w) => palabraEn(t, w)).length;
      if (hits) sc += hits === toks.length ? 3 : 1.5;
    }
    if (sc > 0) {
      const pal = norm(p.nombre).split(/\s+/).filter((w) => w.length >= 5 && !STOP_IA.has(w));
      sc += pal.filter((w) => palabraEn(t, w)).length * 0.5;
      if (mes != null && p.mes === mes) sc += 1.5;
    }
    if (sc > top) { top = sc; mejor = p; }
  }
  return top >= 1.5 ? mejor : null;
}

function detectarDestino(t, crudo) {
  const pool = [...new Set([...CIUDADES, ...PAQUETES.flatMap((p) => p.destinos.map((d) => d.ciudad))])];
  for (const c of pool) if (t.includes(norm(c))) return c;
  for (const c of pool) {
    const toks = norm(c).split(/\s+/).filter((w) => w.length >= 3 && !STOP_IA.has(w));
    if (toks.length && toks.some((w) => palabraEn(t, w))) return c;
  }
  const m = crudo.match(/(?:ir a|viajar a|vamos a|escaparnos a|viaje a|conocer)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})?)/);
  return m ? m[1] : "";
}

/* el "Hola Agustina!" del arranque es el vendedor, no el pasajero: se descarta */
function detectarCliente(crudo) {
  const m = crudo.match(/(?:soy|me llamo|mi nombre es|te habla|habla)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/);
  if (!m) return "";
  const n = m[1];
  if (VENDEDORES.some((v) => norm(v.nombre).split(" ")[0] === norm(n))) return "";
  return n;
}

function etiquetaPax(adultos, menores) {
  const p = [];
  if (adultos) p.push(`${adultos} ${adultos === 1 ? "adulto" : "adultos"}`);
  if (menores) p.push(`${menores} ${menores === 1 ? "menor" : "menores"}`);
  return p.join(" + ");
}

function detectarConsulta(texto) {
  const crudo = limpiarPegado(texto);
  const t = norm(crudo);
  const mes = detectarMes(t);
  const hoy = new Date();
  const explicito = crudo.match(/\b(20\d{2})\b/);
  let anio = explicito ? Number(explicito[1])
    : mes != null && mes < hoy.getMonth() ? ANIO_BASE + 1 : ANIO_BASE;
  if (anio !== ANIO_BASE && anio !== ANIO_BASE + 1) anio = ANIO_BASE;

  const paquete = detectarPaquete(t, mes);
  const destino = paquete ? paquete.destinos[0].ciudad : detectarDestino(t, crudo);
  const { adultos, menores } = detectarPax(t);
  const noches = detectarNoches(t);
  const cliente = detectarCliente(crudo);

  const chips = [];
  if (destino) chips.push(destino);
  if (mes != null) chips.push(`${MESES[mes]} ${anio}`);
  const pax = etiquetaPax(adultos, menores);
  if (pax) chips.push(pax);
  if (noches) chips.push(`${noches} noches`);

  return { texto:crudo, paquete, destino, mes, anio, adultos, menores, noches, cliente, chips };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVAS DE UI
   ═══════════════════════════════════════════════════════════════════════════ */

function Btn({ variant = "s", size, className = "", children, ...p }) {
  const v = { p:"btn-p", v:"btn-v", s:"btn-s", g:"btn-g" }[variant] || "btn-s";
  const s = size === "sm" ? "btn-sm" : size === "xs" ? "btn-xs" : "";
  return <button className={`btn ${v} ${s} ${className}`} {...p}>{children}</button>;
}

function Label({ children, hint }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
      <span className="lbl">{children}</span>
      {hint && <span style={{ fontSize:11, color:"var(--n300)" }}>{hint}</span>}
    </div>
  );
}

function Pill({ tone = "n", children, style }) {
  const T = {
    teal:   { bg:"rgba(59,191,173,.13)",  c:"#1F7D70" },
    violet: { bg:"rgba(120,90,229,.13)",  c:"#5B3FBF" },
    coral:  { bg:"rgba(244,62,85,.11)",   c:"#CC2030" },
    amber:  { bg:"rgba(247,178,103,.20)", c:"#8A5A16" },
    n:      { bg:"rgba(17,17,36,.06)",    c:"var(--n500)" },
  }[tone];
  return <span className="pill" style={{ background:T.bg, color:T.c, ...style }}>{children}</span>;
}

/* Identificador de todo lo que arma la IA — mismo chip en el modal y en el editor */
function ChipIA({ texto = "IA", style }) {
  return (
    <span className="chip-ia" style={style}><Sparkles size={11} /> {texto}</span>
  );
}

function Estrellas({ n = 0, size = 11 }) {
  return (
    <span style={{ display:"inline-flex", gap:1 }}>
      {Array.from({ length:n }).map((_, i) => (
        <Star key={i} size={size} style={{ fill:"#F7B267", color:"#F7B267" }} />
      ))}
    </span>
  );
}

function Block({ id, icon:Icon, title, count, right, children, forwardRef }) {
  return (
    <section id={id} ref={forwardRef} className="blk a-rise">
      <div className="blk-h">
        <div className="blk-ico"><Icon size={15} /></div>
        <div className="blk-t">{title}</div>
        {count != null && <Pill tone="n">{count}</Pill>}
        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>{right}</div>
      </div>
      <div className="blk-b">{children}</div>
    </section>
  );
}

function Vacio({ icon:Icon, titulo, accion }) {
  return (
    <div style={{ border:"1px dashed rgba(17,17,36,.16)", borderRadius:13, padding:"22px 18px",
      textAlign:"center", background:"rgba(17,17,36,.012)" }}>
      <Icon size={19} style={{ color:"var(--n300)", marginBottom:8 }} />
      <div style={{ fontSize:13, fontWeight:600, color:"var(--n600)", marginBottom:3 }}>{titulo}</div>
      {accion && <div style={{ fontSize:12, color:"var(--n400)" }}>{accion}</div>}
    </div>
  );
}

/* Toasts con deshacer */
function Toasts({ items, onUndo, onClose }) {
  return (
    <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:120,
      display:"flex", flexDirection:"column", gap:8, alignItems:"center", pointerEvents:"none" }}>
      {items.map((t) => (
        <div key={t.id} className="a-pop" style={{ pointerEvents:"auto", display:"flex", alignItems:"center", gap:11,
          background:"rgba(26,26,46,.96)", color:"#fff", padding:"10px 12px 10px 15px", borderRadius:13,
          boxShadow:"0 18px 44px -12px rgba(17,17,36,.5)", fontSize:13, fontWeight:500, backdropFilter:"blur(10px)" }}>
          {t.tone === "ok" && <CheckCheck size={15} style={{ color:"#45D4C0" }} />}
          {t.tone === "warn" && <AlertCircle size={15} style={{ color:"#F7B267" }} />}
          <span>{t.msg}</span>
          {t.undo && (
            <button onClick={() => onUndo(t)} style={{ display:"inline-flex", alignItems:"center", gap:5,
              background:"rgba(255,255,255,.14)", padding:"5px 10px", borderRadius:8, fontSize:12, fontWeight:700, color:"#fff" }}>
              <Undo2 size={12} /> Deshacer
            </button>
          )}
          <button onClick={() => onClose(t.id)} style={{ color:"rgba(255,255,255,.45)", display:"grid", placeItems:"center" }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Wordmark TravelOz — replica del logo del repo ─────────────────────── */
function Wordmark({ size = 20, dark = false }) {
  return (
    <span className={`wordmark ${dark ? "on-dark" : ""}`} style={{ fontSize:size }}>
      <span className="t">Travel</span><span className="oz">oz</span>
    </span>
  );
}

/* ── Calendario — date picker propio, nada de input nativo ─────────────── */
const DSEM = ["L","M","X","J","V","S","D"];
const DOW = ["dom","lun","mar","mié","jue","vie","sáb"];
function fmtBtn(iso) { const d = parseISO(iso); return d ? `${DOW[d.getDay()]} ${d.getDate()} ${MES_AB[d.getMonth()]} ${d.getFullYear()}` : null; }

function diffDias(iso) {
  const d = parseISO(iso); if (!d) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((d - hoy) / 86400000);
}

function Calendario({ value, onChange, placeholder = "Elegir fecha", grande = false, nota }) {
  const [open, setOpen] = useState(false);
  const [vista, setVista] = useState("dias");            // dias | meses
  const sel = value ? parseISO(value) : null;
  const [vm, setVm] = useState(() => sel || new Date());
  const box = useRef(null);
  useEffect(() => { if (sel) setVm(new Date(sel.getFullYear(), sel.getMonth(), 1)); }, [value]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) { setOpen(false); setVista("dias"); } };
    const k = (e) => { if (e.key === "Escape") { setOpen(false); setVista("dias"); } };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, []);

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const hoyISO = toISO(hoy);
  const y = vm.getFullYear(), m = vm.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7;
  const nd = new Date(y, m + 1, 0).getDate();
  const ndPrev = new Date(y, m, 0).getDate();
  const dias = diffDias(value);

  /* strip: los próximos 9 meses desde hoy, para saltar de un toque */
  const strip = Array.from({ length: 9 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth() + i, 1));

  const pick = (d) => { onChange(toISO(new Date(y, m, d))); setOpen(false); setVista("dias"); };
  const esVM = (d) => d.getFullYear() === y && d.getMonth() === m;

  /* celdas: relleno del mes anterior + mes + relleno siguiente (6 filas fijas) */
  const celdas = [];
  for (let i = start - 1; i >= 0; i--) celdas.push({ d: ndPrev - i, out: -1 });
  for (let i = 1; i <= nd; i++) celdas.push({ d: i, out: 0 });
  while (celdas.length % 7 !== 0 || celdas.length < 42) celdas.push({ d: celdas.length - (start + nd) + 1, out: 1 });

  return (
    <div ref={box} style={{ position:"relative" }}>
      <button className={`in cal-btn ${grande ? "in-lg" : ""}`} onClick={() => setOpen((v) => !v)}
        style={{ height: grande ? 44 : 38 }}>
        <Calendar size={grande ? 16 : 14} style={{ color: value ? "var(--teal-2)" : "var(--n300)", flexShrink:0 }} />
        <span style={{ flex:1, fontWeight: value ? 600 : 400, color: value ? "var(--ink)" : "var(--n300)",
          fontSize: grande ? 14.5 : 13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {fmtBtn(value) || placeholder}
          {value && dias != null && dias >= 0 && (
            <span style={{ fontWeight:500, color:"var(--n400)", fontSize: grande ? 11.5 : 10.5 }}>
              {"  ·  "}{dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}</span>
          )}
        </span>
        <ChevronDown size={13} style={{ color:"var(--n300)", transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
      </button>

      {open && (
        <div className="cal-pop a-slide" style={{ width:288 }}>

          {/* strip de meses próximos — un toque y estás ahí */}
          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:8, marginBottom:8,
            borderBottom:"1px solid var(--hair-soft)" }}>
            {strip.map((d) => {
              const on = esVM(d);
              return (
                <button key={d.getFullYear() + "-" + d.getMonth()}
                  onClick={() => setVm(new Date(d.getFullYear(), d.getMonth(), 1))}
                  style={{ flexShrink:0, padding:"5px 10px", borderRadius:9, fontSize:11, fontWeight:700,
                    background: on ? "linear-gradient(145deg,#A05ED3,#785AE5)" : "rgba(17,17,36,.045)",
                    color: on ? "#fff" : "var(--n500)", transition:"all .15s" }}>
                  {MES_AB[d.getMonth()]}
                  {d.getMonth() === 0 || on ? <span style={{ opacity:.7, marginLeft:3 }}>{String(d.getFullYear()).slice(2)}</span> : null}
                </button>
              );
            })}
          </div>

          {/* header: mes año clickeable → vista meses */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <button className="cal-nav" onClick={() => vista === "dias" ? setVm(new Date(y, m - 1, 1)) : setVm(new Date(y - 1, m, 1))}>
              <ChevronRight size={14} style={{ transform:"rotate(180deg)" }} /></button>
            <button onClick={() => setVista(vista === "dias" ? "meses" : "dias")}
              style={{ flex:1, textAlign:"center", fontSize:13.5, fontWeight:700, letterSpacing:"-.01em",
                padding:"5px 0", borderRadius:9, transition:"background .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(120,90,229,.07)"}
              onMouseLeave={(e) => e.currentTarget.style.background = ""}>
              {vista === "dias" ? <>{MESES[m]} <span style={{ color:"var(--violet)", fontWeight:600 }}>{y}</span></> : y}
              <ChevronDown size={11} style={{ marginLeft:5, color:"var(--n300)",
                transform: vista === "meses" ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
            </button>
            <button className="cal-nav" onClick={() => vista === "dias" ? setVm(new Date(y, m + 1, 1)) : setVm(new Date(y + 1, m, 1))}>
              <ChevronRight size={14} /></button>
          </div>

          {vista === "meses" ? (
            <div className="a-fade" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:5, marginBottom:4 }}>
              {MESES.map((mn, i) => {
                const pasado = new Date(y, i + 1, 0) < hoy;
                const on = sel && sel.getFullYear() === y && sel.getMonth() === i;
                return (
                  <button key={mn} disabled={pasado}
                    onClick={() => { setVm(new Date(y, i, 1)); setVista("dias"); }}
                    style={{ padding:"10px 4px", borderRadius:10, fontSize:12.5, fontWeight:600,
                      background: on ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : i === m ? "rgba(120,90,229,.09)" : "rgba(17,17,36,.028)",
                      color: on ? "#fff" : pasado ? "var(--n300)" : "var(--n600)",
                      opacity: pasado ? .45 : 1, transition:"all .14s" }}>{mn.slice(0, 3)}</button>
                );
              })}
            </div>
          ) : (
            <div className="cal-grid a-fade">
              {DSEM.map((d, i) => <div key={i} className="cal-dw">{d}</div>)}
              {celdas.map((c, i) => {
                if (c.out !== 0) return <div key={i} className="cal-d" data-out="1" style={{ opacity:.35 }}>{c.d}</div>;
                const iso = toISO(new Date(y, m, c.d));
                const pasada = iso < hoyISO;
                return (
                  <button key={i} className="cal-d" data-sel={value === iso ? "1" : "0"}
                    data-hoy={iso === hoyISO ? "1" : "0"}
                    style={pasada ? { color:"var(--n300)", opacity:.6 } : undefined}
                    onClick={() => pick(c.d)}>{c.d}</button>
                );
              })}
            </div>
          )}

          <div style={{ display:"flex", gap:5, marginTop:9, alignItems:"center", flexWrap:"wrap" }}>
            {[["Hoy", () => { onChange(hoyISO); setOpen(false); }],
              ["+7", () => onChange(addDays(value || hoyISO, 7))],
              ["+15", () => onChange(addDays(value || hoyISO, 15))],
              ["+30", () => onChange(addDays(value || hoyISO, 30))]].map(([l, fn]) => (
              <button key={l} className="chip" style={{ height:27, fontSize:11.5 }} onClick={fn}>{l}</button>
            ))}
            {value && <button className="chip" style={{ height:27, fontSize:11.5, marginLeft:"auto", color:"var(--coral)" }}
              onClick={() => { onChange(""); setOpen(false); }}><X size={10} /> Quitar</button>}
          </div>
          {nota && <div style={{ fontSize:10.5, color:"var(--n400)", marginTop:8, lineHeight:1.45 }}>{nota}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Autocomplete de ciudades — flechas + Enter, texto libre siempre ───── */
function AutoCiudad({ value, onChange, onPick, placeholder, excluir = [], grande = false, inputRef }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const box = useRef(null);
  const res = useMemo(() => {
    const pool = CIUDADES.filter((c) => !excluir.includes(c));
    const q = (value || "").trim().toLowerCase();
    const hit = q ? pool.filter((c) => c.toLowerCase().includes(q)) : pool;
    return hit.slice(0, 6);
  }, [value, excluir]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const marcar = (c) => {
    const q = (value || "").trim();
    if (!q) return c;
    const i = c.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return c;
    return <>{c.slice(0, i)}<b>{c.slice(i, i + q.length)}</b>{c.slice(i + q.length)}</>;
  };
  const elegir = (c) => { onPick(c); setOpen(false); setIdx(0); };
  return (
    <div ref={box} style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <MapPin size={grande ? 15 : 13} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          color: value ? "var(--violet)" : "var(--n300)" }} />
        <input ref={inputRef} className={`in ${grande ? "in-lg" : ""}`} style={{ paddingLeft:34 }}
          value={value} placeholder={placeholder}
          onFocus={() => { setOpen(true); setIdx(0); }}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setIdx((i) => clamp(i + 1, 0, res.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => clamp(i - 1, 0, res.length - 1)); }
            else if (e.key === "Enter") { e.preventDefault();
              if (open && res[idx]) elegir(res[idx]); else if ((value || "").trim()) elegir(value.trim()); }
            else if (e.key === "Escape") setOpen(false);
          }} />
      </div>
      {open && res.length > 0 && (
        <div className="ac-pop a-slide">
          {res.map((c, i) => (
            <button key={c} className="ac-i" data-on={i === idx ? "1" : "0"}
              onMouseEnter={() => setIdx(i)} onClick={() => elegir(c)}>
              <MapPin size={12} style={{ color:"var(--n300)", flexShrink:0 }} />
              <span>{marcar(c)}</span>
            </button>
          ))}
          {(value || "").trim() && !res.some((c) => c.toLowerCase() === value.trim().toLowerCase()) && (
            <button className="ac-i" data-on="0" style={{ borderTop:"1px solid var(--hair-soft)", color:"var(--n500)" }}
              onClick={() => elegir(value.trim())}>
              <PenLine size={12} style={{ flexShrink:0 }} />
              <span>Usar “{value.trim()}”</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* Buscador con foto + escape a texto libre */
function BuscadorHotel({ ciudad, valor, onPick, onLibre, autoFocus }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const box = useRef(null);
  const res = useMemo(() => {
    const base = HOTELES.filter((h) => !ciudad || h.ciudad === ciudad);
    const pool = base.length ? base : HOTELES;
    if (!q.trim()) return pool.slice(0, 6);
    const s = q.toLowerCase();
    return pool.filter((h) => h.nombre.toLowerCase().includes(s) || h.ciudad.toLowerCase().includes(s)).slice(0, 6);
  }, [q, ciudad]);

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const key = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => clamp(i + 1, 0, res.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => clamp(i - 1, 0, res.length)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (idx < res.length) { onPick(res[idx]); } else if (q.trim()) { onLibre(q.trim()); }
      setQ(""); setOpen(false);
    } else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={box} style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--n300)" }} />
        <input className="in" style={{ paddingLeft:32 }} autoFocus={autoFocus}
          value={open ? q : (valor || "")} placeholder={ciudad ? `Buscar hotel en ${ciudad}…` : "Buscar hotel…"}
          onFocus={() => { setOpen(true); setQ(""); setIdx(0); }}
          onChange={(e) => { setQ(e.target.value); setIdx(0); setOpen(true); }}
          onKeyDown={key} />
      </div>
      {open && (
        <div className="a-slide" style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, zIndex:40,
          background:"#fff", border:"1px solid var(--hair)", borderRadius:13, overflow:"hidden",
          boxShadow:"0 22px 50px -14px rgba(17,17,36,.28)" }}>
          {res.map((h, i) => (
            <button key={h.id} onMouseEnter={() => setIdx(i)}
              onClick={() => { onPick(h); setOpen(false); setQ(""); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 10px", textAlign:"left",
                background: i === idx ? "rgba(120,90,229,.07)" : "transparent" }}>
              <Foto seed={h.seed} w={40} h={30} r={7} />
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.nombre}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"var(--n400)" }}>
                  <MapPin size={10} />{h.ciudad}<Estrellas n={h.cat} size={9} />
                </div>
              </div>
            </button>
          ))}
          <button onMouseEnter={() => setIdx(res.length)}
            onClick={() => { if (q.trim()) { onLibre(q.trim()); setOpen(false); setQ(""); } }}
            style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"9px 10px", textAlign:"left",
              borderTop:"1px solid var(--hair-soft)",
              background: idx === res.length ? "rgba(120,90,229,.07)" : "rgba(17,17,36,.018)" }}>
            <div style={{ width:40, height:30, borderRadius:7, display:"grid", placeItems:"center",
              background:"rgba(17,17,36,.05)", color:"var(--n400)" }}><PenLine size={13} /></div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:"var(--n600)" }}>
                {q.trim() ? `Usar “${q.trim()}” como texto libre` : "Escribí para usar texto libre"}
              </div>
              <div style={{ fontSize:11, color:"var(--n400)" }}>Para hoteles que no están en el catálogo</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SALIDA AL PASAJERO  ·  mobile-first
   Lo que se comparte por WhatsApp. Las notas internas NUNCA llegan acá.
   ═══════════════════════════════════════════════════════════════════════════ */

function SalidaPasajero({ q, marca, vendedor, tramos, foco, scrollRef, modo = "cel" }) {
  const anclas = useRef({});
  useEffect(() => {
    const cont = scrollRef?.current; if (!cont || !foco) return;
    const el = anclas.current[foco];
    const top = el ? Math.max(0, el.offsetTop - 12) : 0;
    cont.scrollTo({ top, behavior:"smooth" });
  }, [foco, scrollRef]);

  const [abierta, setAbierta] = useState(q.opciones[0]?.id || null);
  const [confirmada, setConfirmada] = useState(null);
  const [revision, setRevision] = useState(null);
  useEffect(() => {
    if (!q.opciones.length) { setAbierta(null); return; }
    if (!q.opciones.some((o) => o.id === abierta)) setAbierta(q.opciones[0].id);
  }, [q.opciones, abierta]);

  const desk = modo === "desk";
  const G = { a:"#F43E55", b:"#785AE5", web:"traveloz.com.uy" };
  const grad = `linear-gradient(87deg, ${G.a} 0%, ${G.b} 100%)`;
  const titulo = [q.titulo.destino || "Destino", q.titulo.mes != null ? MESES[q.titulo.mes] : null, q.titulo.anio]
    .filter(Boolean).join(", ").replace(/, (\w+), (\d{4})$/, ", $1 $2");
  const V = VENDEDORES.find((v) => v.id === vendedor) || VENDEDORES[0];
  const totalNoches = tramos.reduce((a, t) => a + t.noches, 0);

  /* escala: en escritorio todo un punto más grande */
  const fz = (cel, d) => desk ? d : cel;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"#1A1A2E", background:"#fff", minHeight:"100%" }}>

      {/* ── encabezado de marca ── */}
      <div style={{ background:grad, padding: desk ? "34px 40px 26px" : "36px 20px 22px", color:"#fff",
        position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:170, height:170, borderRadius:"50%", background:"rgba(255,255,255,.10)" }} />
        <div style={{ position:"absolute", right:30, bottom:-56, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,.07)" }} />
        <div style={{ maxWidth: desk ? 660 : "none", margin:"0 auto", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", marginBottom:desk ? 20 : 16 }}>
            <div style={{ background:"rgba(255,255,255,.94)", borderRadius:10, padding:"6px 12px",
              boxShadow:"0 4px 14px rgba(0,0,0,.14)" }}>
              <Wordmark size={fz(17, 20)} />
            </div>
            <div className="mono" style={{ marginLeft:"auto", fontSize:fz(10, 11), opacity:.8 }}>{q.numero}</div>
          </div>
          <div className="disp" style={{ fontSize:fz(27, 34), fontWeight:600, lineHeight:1.14, letterSpacing:"-.02em" }}>
            {titulo}
          </div>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:13 }}>
            {q.fechaSalida && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:fz(11.5, 12.5),
                background:"rgba(255,255,255,.22)", padding:"6px 12px", borderRadius:999, backdropFilter:"blur(6px)", fontWeight:600 }}>
                <Calendar size={fz(11, 12)} /> {fmtLargo(q.fechaSalida)}
              </span>
            )}
            {totalNoches > 0 && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:fz(11.5, 12.5),
                background:"rgba(255,255,255,.22)", padding:"6px 12px", borderRadius:999, fontWeight:600 }}>
                <Bed size={fz(11, 12)} /> {totalNoches} noches
              </span>
            )}
            {tramos.map((t) => (
              <span key={t.id} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:fz(11.5, 12.5),
                background:"rgba(0,0,0,.18)", padding:"6px 12px", borderRadius:999 }}>
                {t.ciudad} · {t.noches}n
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: desk ? "26px 40px 34px" : "20px 20px 28px", maxWidth: desk ? 740 : "none", margin:"0 auto" }}>

        {/* saludo */}
        <p style={{ fontSize:fz(14.5, 15.5), lineHeight:1.65, margin:"0 0 6px", fontWeight:600 }}>
          Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""} 👋
        </p>
        <p style={{ fontSize:fz(13.5, 14.5), lineHeight:1.65, margin:"0 0 18px", color:"#3D4066" }}>
          De acuerdo a lo conversado, te comparto la cotización de tu viaje.
        </p>

        {q.mensaje && (
          <div style={{ fontSize:fz(13.5, 14), lineHeight:1.7, margin:"0 0 20px", color:"#3D4066",
            padding:"12px 14px", background:"#F5F6FA", borderRadius:12,
            borderLeft:`3px solid ${G.b}` }}
            dangerouslySetInnerHTML={{ __html: q.mensajeHtml || q.mensaje }} />
        )}

        {/* incluye */}
        {q.servicios.length > 0 && (
          <div ref={(el) => { anclas.current["b-servicios"] = el; }}>
            <SecTitulo texto="Tu viaje incluye" color={G.b} />
            <div style={{ display:"grid", gridTemplateColumns: desk ? "1fr 1fr" : "1fr", gap:"9px 18px", marginBottom:24 }}>
              {q.servicios.map((sv) => {
                const C = CATS.find((c) => c.id === sv.categoria) || CATS[0];
                return (
                  <div key={sv.id} style={{ display:"flex", gap:11, alignItems:"flex-start" }}>
                    <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, display:"grid", placeItems:"center",
                      background:`${G.b}12`, color:G.b }}><C.Icon size={14} /></div>
                    <div style={{ fontSize:fz(13, 13.5), lineHeight:1.5, paddingTop:5, fontWeight:500 }}>
                      {sv.texto}
                      {(sv.ciudad || sv.modalidad) && (
                        <div style={{ fontSize:fz(11, 11.5), color:"#8A8DB5", fontWeight:400 }}>
                          {[sv.ciudad, sv.modalidad].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* itinerario */}
        {q.vuelos.length > 0 && (
          <div ref={(el) => { anclas.current["b-vuelos"] = el; }}>
            <SecTitulo texto="Itinerario de vuelos" color={G.b} />
            <div style={{ border:"1px solid rgba(17,17,36,.09)", borderRadius:15, overflow:"hidden", marginBottom:24 }}>
              {q.vuelos.map((v, i) => (
                <div key={v.id} style={{ padding:"12px 14px",
                  borderBottom: i < q.vuelos.length - 1 ? "1px solid rgba(17,17,36,.07)" : "none",
                  background: i % 2 ? "#FCFCFE" : "#fff" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ width:22, height:22, borderRadius:7, background:`${G.b}12`, color:G.b,
                      display:"grid", placeItems:"center" }}><Plane size={11} /></div>
                    <span style={{ fontSize:fz(12.5, 13), fontWeight:700 }}>{v.aerolinea}</span>
                    <span className="mono" style={{ fontSize:fz(10, 10.5), color:"#8A8DB5" }}>{v.cia}{v.nro}</span>
                    <span style={{ marginLeft:"auto", fontSize:fz(11, 11.5), fontWeight:600, color:"#3D4066" }}>
                      {v.dia} {MES_AB[v.mes]}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div className="mono" style={{ fontSize:fz(16, 17), fontWeight:600, letterSpacing:"-.02em" }}>{v.salida}</div>
                      <div style={{ fontSize:fz(10.5, 11), color:"#8A8DB5", lineHeight:1.3, marginTop:2 }}>{AEROPUERTOS[v.origen] || v.origen}</div>
                    </div>
                    <div style={{ flex:"0 0 52px", display:"flex", alignItems:"center", gap:4, opacity:.35 }}>
                      <div style={{ height:1.5, flex:1, background:"#1A1A2E", borderRadius:9 }} />
                      <Plane size={11} style={{ transform:"rotate(45deg)" }} />
                    </div>
                    <div style={{ flex:1, textAlign:"right" }}>
                      <div className="mono" style={{ fontSize:fz(16, 17), fontWeight:600, letterSpacing:"-.02em" }}>{v.llegada}</div>
                      <div style={{ fontSize:fz(10.5, 11), color:"#8A8DB5", lineHeight:1.3, marginTop:2 }}>{AEROPUERTOS[v.destino] || v.destino}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* opciones — cards verticales, foto protagonista */}
        {q.opciones.length > 0 && (
          <div ref={(el) => { anclas.current["b-alojamiento"] = el; }}>
            <SecTitulo texto="Opciones de alojamiento" color={G.b} />
            <div style={{ fontSize:fz(11.5, 12), color:"#8A8DB5", margin:"-4px 0 12px" }}>
              Tocá cada opción para ver el detalle de hoteles y fechas.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:24 }}>
              {q.opciones.map((o, oi) => {
                const on = abierta === o.id;
                const pv = venta(o.neto, o.factor);
                const H0 = hotelById(o.hoteles?.[0]?.hotelId);
                return (
                  <div key={o.id} style={{ borderRadius:18, overflow:"hidden", background:"#fff",
                    border: on ? `1.5px solid ${G.b}55` : "1px solid rgba(17,17,36,.09)",
                    boxShadow: on ? `0 14px 34px -14px ${G.b}45` : "0 2px 6px rgba(17,17,36,.06)",
                    transition:"box-shadow .28s, border-color .28s, transform .28s" }}>

                    {/* foto full-width con overlay */}
                    <button onClick={() => setAbierta(on ? null : o.id)} style={{ width:"100%", textAlign:"left", display:"block" }}>
                      <Foto seed={H0?.seed ?? oi} w="100%" h={fz(112, 150)} r={0}>
                        <span style={{ position:"absolute", top:10, left:10, display:"inline-flex", alignItems:"center",
                          gap:5, padding:"4px 11px", borderRadius:999, background:"rgba(255,255,255,.94)",
                          fontSize:fz(10.5, 11), fontWeight:800, color:"#1A1A2E",
                          boxShadow:"0 2px 8px rgba(0,0,0,.18)" }}>
                          <span style={{ width:15, height:15, borderRadius:99, background:grad, color:"#fff",
                            display:"grid", placeItems:"center", fontSize:9 }}>{oi + 1}</span>
                          {o.nombre}
                        </span>
                        <span style={{ position:"absolute", right:10, bottom:10, padding:"6px 13px", borderRadius:12,
                          background:"rgba(255,255,255,.96)", boxShadow:"0 4px 14px rgba(0,0,0,.2)", textAlign:"right" }}>
                          <span style={{ display:"block", fontSize:fz(15.5, 17), fontWeight:800, color:G.b,
                            letterSpacing:"-.025em", lineHeight:1.1 }}>{money(pv)}</span>
                          <span style={{ display:"block", fontSize:fz(8.5, 9), color:"#6B6F99", fontWeight:600 }}>por adulto · base doble</span>
                        </span>
                      </Foto>

                      {/* resumen bajo la foto */}
                      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 14px" }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:fz(12.5, 13), fontWeight:700, whiteSpace:"nowrap",
                            overflow:"hidden", textOverflow:"ellipsis" }}>
                            {(tramos.length ? tramos : []).map((_, k) => o.hoteles?.[k])
                              .map((h) => h && (h.libre || hotelById(h.hotelId)?.nombre)).filter(Boolean).join("  +  ") || "Hoteles a definir"}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:fz(10.5, 11),
                            color:"#8A8DB5", marginTop:2 }}>
                            <Utensils size={10} /> {o.regimen} · <Bed size={10} /> {o.habitacion}
                          </div>
                        </div>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, flexShrink:0,
                          fontSize:fz(10.5, 11), fontWeight:700, color:G.b }}>
                          {on ? "Cerrar" : "Ver detalle"}
                          <ChevronDown size={13} style={{ transform: on ? "rotate(180deg)" : "none",
                            transition:"transform .26s cubic-bezier(.2,.8,.2,1)" }} />
                        </span>
                      </div>
                    </button>

                    {/* detalle expandido */}
                    {on && (
                      <div className="a-slide" style={{ padding:"0 14px 14px" }}>
                        {(tramos.length ? tramos : [null]).map((t, i) => {
                          const h = o.hoteles?.[i] || {};
                          const H = hotelById(h.hotelId);
                          return (
                            <div key={i} style={{ display:"flex", gap:12, padding:"12px", marginBottom:8,
                              borderRadius:13, background:"#FAFBFE", border:"1px solid rgba(17,17,36,.06)" }}>
                              <Foto seed={H?.seed ?? 99} w={fz(58, 76)} h={fz(58, 62)} r={11} />
                              <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:fz(13, 13.5), fontWeight:700 }}>{h.libre || H?.nombre || "A definir"}</span>
                                  {H && <Estrellas n={H.cat} size={10} />}
                                </div>
                                {t && (
                                  <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4,
                                    fontSize:fz(11, 11.5), color:"#6B6F99", fontWeight:600 }}>
                                    <MapPin size={10} style={{ color:G.b }} /> {t.ciudad} · {t.noches} {t.noches === 1 ? "noche" : "noches"}
                                  </div>
                                )}
                                {t?.checkin && (
                                  <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:7,
                                    padding:"4px 10px", borderRadius:999, background:"#fff",
                                    border:"1px solid rgba(17,17,36,.08)",
                                    fontSize:fz(10.5, 11), color:"#3D4066", fontWeight:700 }}>
                                    <Calendar size={9} style={{ color:G.b }} /> {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"12px 14px", borderRadius:13, background:grad, color:"#fff" }}>
                          <span style={{ fontSize:fz(11.5, 12), fontWeight:600, opacity:.92 }}>Precio final por adulto</span>
                          <span style={{ fontSize:fz(19, 21), fontWeight:800, letterSpacing:"-.03em" }}>{money(pv)}</span>
                        </div>
                        {confirmada === o.id ? (
                          <div className="a-pop" style={{ marginTop:9, padding:"12px 14px", borderRadius:13,
                            background:"rgba(59,191,173,.1)", border:"1.5px solid rgba(42,158,142,.4)",
                            display:"flex", gap:10, alignItems:"flex-start" }}>
                            <CheckCheck size={17} style={{ color:"#2A9E8E", flexShrink:0, marginTop:1 }} />
                            <div>
                              <div style={{ fontSize:fz(12.5, 13), fontWeight:800, color:"#1F7D70" }}>¡Recibimos tu confirmación!</div>
                              <div style={{ fontSize:fz(11, 11.5), color:"#3D4066", lineHeight:1.5, marginTop:2 }}>
                                {V.nombre.split(" ")[0]} te contacta a la brevedad para coordinar la seña y el pago.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button className="a-fade" onClick={() => setConfirmada(o.id)}
                              style={{ width:"100%", marginTop:9, padding:"13px", borderRadius:13, color:"#fff",
                                fontSize:fz(13.5, 14), fontWeight:800, letterSpacing:"-.01em",
                                background:"linear-gradient(145deg,#45D4C0,#2A9E8E)",
                                boxShadow:"0 8px 20px -6px rgba(42,158,142,.5), inset 0 1px 0 rgba(255,255,255,.3)" }}>
                              Confirmar esta opción
                            </button>
                            <div style={{ fontSize:fz(9.5, 10), color:"#8A8DB5", textAlign:"center", marginTop:6 }}>
                              Al confirmar aceptás esta cotización — vale como firma digital.
                            </div>
                            {revision === o.id ? (
                              <div className="a-pop" style={{ marginTop:8, padding:"9px 12px", borderRadius:11,
                                background:"rgba(120,90,229,.08)", fontSize:fz(11, 11.5), color:"#5B3FBF",
                                textAlign:"center", fontWeight:600 }}>
                                Le avisamos a {V.nombre.split(" ")[0]} — te contacta para ajustar la cotización.
                              </div>
                            ) : (
                              <button onClick={() => setRevision(o.id)}
                                style={{ display:"block", margin:"7px auto 0", fontSize:fz(10.5, 11), fontWeight:700,
                                  color:G.b, textDecoration:"underline", textUnderlineOffset:3 }}>
                                Solicitar una revisión
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* notas para el pasajero */}
        {q.notasCliente.length > 0 && (
          <div ref={(el) => { anclas.current["b-notascliente"] = el; }}>
            <SecTitulo texto="A tener en cuenta" color={G.b} />
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
              {q.notasCliente.map((n) => (
                <div key={n.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:6, height:6, borderRadius:99, background:G.b, marginTop:7, flexShrink:0 }} />
                  <div style={{ fontSize:fz(12.5, 13), lineHeight:1.55, color:"#3D4066" }}>{n.texto}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* condiciones */}
        <div style={{ background:"#F5F6FA", borderRadius:13, padding:"13px 15px", marginBottom:18 }}>
          <div style={{ fontSize:fz(9.5, 10), fontWeight:700, letterSpacing:".07em", textTransform:"uppercase",
            color:"#8A8DB5", marginBottom:7 }}>Condiciones</div>
          <ul style={{ margin:0, paddingLeft:15, fontSize:fz(10.5, 11), lineHeight:1.65, color:"#6B6F99" }}>
            <li>Precios por persona en dólares americanos, en base doble.</li>
            <li>Valores sujetos a disponibilidad y confirmación al momento de la reserva.</li>
            <li>Tarifa no incluye gastos personales ni excursiones no detalladas.</li>
            <li>Cotización válida por {q.vigencia ?? 48} horas.</li>
          </ul>
        </div>

        {/* pago */}
        <SecTitulo texto="Formas de pago" color={G.b} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:9 }}>
          {["BROU","Itaú","Santander","Scotiabank","BBVA"].map((b) => (
            <div key={b} style={{ height:32, minWidth:66, padding:"0 11px", borderRadius:9,
              border:"1px solid rgba(17,17,36,.09)", background:"#fff", display:"grid", placeItems:"center",
              fontSize:fz(10.5, 11), fontWeight:700, color:"#3D4066" }}>{b}</div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:fz(11, 11.5), color:"#6B6F99", marginBottom:22 }}>
          <Wallet size={12} style={{ color:G.b }} /> Hasta 12 cuotas sin recargo con tarjetas seleccionadas
        </div>

        {/* firma */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px", borderRadius:15,
          border:"1px solid rgba(17,17,36,.09)", background:"linear-gradient(180deg,#fff,#FAFBFE)" }}>
          <div style={{ width:46, height:46, borderRadius:"50%", flexShrink:0, background:grad, color:"#fff",
            display:"grid", placeItems:"center", fontWeight:700, fontSize:15 }}>{V.inicial}</div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:fz(13, 14), fontWeight:700 }}>{V.nombre}</div>
            <div style={{ fontSize:fz(11, 11.5), color:"#8A8DB5" }}>{V.cargo} · TravelOz</div>
            <div className="mono" style={{ fontSize:fz(10.5, 11), color:"#6B6F99", marginTop:2 }}>{V.tel}</div>
          </div>
          <div style={{ width:34, height:34, borderRadius:11, background:"#25D36615", color:"#128C7E",
            display:"grid", placeItems:"center", flexShrink:0 }}><Smartphone size={16} /></div>
        </div>
        <div style={{ textAlign:"center", marginTop:16 }}><Wordmark size={13} /></div>
        <div style={{ textAlign:"center", fontSize:fz(9.5, 10), color:"#B0B4CD", marginTop:4 }}>{G.web}</div>
      </div>
    </div>
  );
}

function SecTitulo({ texto, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
      <div style={{ width:3, height:13, borderRadius:9, background:color }} />
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:"#3D4066" }}>{texto}</span>
      <div style={{ flex:1, height:1, background:"rgba(17,17,36,.07)" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOQUES DEL ARMADO
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1 · Cliente ─────────────────────────────────────────────────────── */
function BloqueCliente({ q, set, refEl }) {
  const primero = useRef(null);
  const [bq, setBq] = useState("");
  const [bOpen, setBOpen] = useState(false);
  const bBox = useRef(null);
  const res = useMemo(() => {
    const t = bq.trim().toLowerCase(); if (!t) return [];
    return CLIENTES.filter((c) => `${c.nombre} ${c.apellido} ${c.email} ${c.telefono}`.toLowerCase().includes(t)).slice(0, 4);
  }, [bq]);
  useEffect(() => {
    const h = (e) => { if (bBox.current && !bBox.current.contains(e.target)) setBOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { const t = setTimeout(() => primero.current?.focus(), 220); return () => clearTimeout(t); }, []);
  const F = (k, ph, tipo = "text", ref) => (
    <div style={{ flex:"1 1 150px", minWidth:0 }}>
      <Label>{ph}</Label>
      <input ref={ref} className="in" type={tipo} value={q.cliente[k]} placeholder="Opcional"
        onChange={(e) => set((d) => { d.cliente[k] = e.target.value; })} />
    </div>
  );
  return (
    <Block id="b-cliente" forwardRef={refEl} icon={User} title="Cliente"
      right={<Pill tone="n"><Check size={9} /> Ningún campo obligatorio</Pill>}>
      <div ref={bBox} style={{ position:"relative", marginBottom:11 }}>
        <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--n300)" }} />
        <input className="in" style={{ paddingLeft:34 }} value={bq}
          placeholder="Buscar cliente existente por nombre, email o teléfono… o cargalo abajo"
          onFocus={() => setBOpen(true)}
          onChange={(e) => { setBq(e.target.value); setBOpen(true); }} />
        {bOpen && res.length > 0 && (
          <div className="ac-pop a-slide">
            {res.map((c) => (
              <button key={c.email} className="ac-i"
                onClick={() => { set((d) => { d.cliente = { ...c }; }); setBq(""); setBOpen(false); }}>
                <span style={{ width:24, height:24, borderRadius:99, flexShrink:0, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.12)", color:"var(--violet)", fontSize:9.5, fontWeight:800 }}>
                  {c.nombre[0]}{c.apellido[0]}</span>
                <span style={{ flex:1 }}><b style={{ color:"var(--ink)" }}>{c.nombre} {c.apellido}</b>
                  <span style={{ color:"var(--n400)", fontSize:11.5 }}> · {c.email}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {F("nombre","Nombre","text",primero)}{F("apellido","Apellido")}{F("email","Email","email")}{F("telefono","Teléfono","tel")}
      </div>
      <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:9, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        El nombre alimenta el saludo de la cotización. Podés guardar y completarlo después.
      </div>
    </Block>
  );
}

/* ── 2 · Encabezado: título por clic + fecha disparadora ─────────────── */
function BloqueEncabezado({ q, set, tramos, hayManual, onRepropagar, refEl }) {
  const [openMes, setOpenMes] = useState(false);
  const anios = [ANIO_BASE, ANIO_BASE + 1];
  const titulo = [q.titulo.destino || "Destino", q.titulo.mes != null ? MESES[q.titulo.mes] : "Mes", q.titulo.anio || "Año"].join(" · ");
  const previa = `${q.titulo.destino || "Destino"}, ${q.titulo.mes != null ? MESES[q.titulo.mes] : "Mes"} ${q.titulo.anio || ""}`.trim();

  return (
    <Block id="b-encabezado" forwardRef={refEl} icon={FileText} title="Encabezado"
      right={<Pill tone="violet"><Lock size={9} /> Formato controlado</Pill>}>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ flex:"2 1 190px", minWidth:0 }}>
          <Label hint="con autocompletado">Destino</Label>
          <AutoCiudad grande value={q.titulo.destino} placeholder="Punta Cana"
            onChange={(v) => set((d) => { d.titulo.destino = v; })}
            onPick={(v) => set((d) => { d.titulo.destino = v; })} />
        </div>
        <div style={{ flex:"1 1 130px", position:"relative" }}>
          <Label hint="por clic">Mes</Label>
          <button className="in in-lg" onClick={() => setOpenMes((v) => !v)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left",
              color: q.titulo.mes != null ? "var(--ink)" : "var(--n300)" }}>
            {q.titulo.mes != null ? MESES[q.titulo.mes] : "Elegir"}
            <ChevronDown size={14} style={{ color:"var(--n300)", transform: openMes ? "rotate(180deg)":"none", transition:"transform .2s" }} />
          </button>
          {openMes && (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:29 }} onClick={() => setOpenMes(false)} />
              <div className="a-slide" style={{ position:"absolute", top:"calc(100% + 5px)", left:0, zIndex:30, width:230,
                background:"#fff", border:"1px solid var(--hair)", borderRadius:13, padding:7,
                boxShadow:"0 22px 50px -14px rgba(17,17,36,.28)", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
                {MESES.map((m, i) => (
                  <button key={m} onClick={() => { set((d) => { d.titulo.mes = i; }); setOpenMes(false); }}
                    style={{ padding:"7px 4px", borderRadius:8, fontSize:11.5, fontWeight:600,
                      background: q.titulo.mes === i ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : "transparent",
                      color: q.titulo.mes === i ? "#fff" : "var(--n600)" }}>{m.slice(0,3)}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ flex:"1 1 120px" }}>
          <Label hint="solo 2">Año</Label>
          <div style={{ display:"flex", gap:6 }}>
            {anios.map((a) => (
              <button key={a} onClick={() => set((d) => { d.titulo.anio = a; })}
                className="in in-lg" style={{ flex:1, fontWeight:700, padding:0,
                  background: q.titulo.anio === a ? "linear-gradient(145deg,#45D4C0,#2A9E8E)" : "#fff",
                  color: q.titulo.anio === a ? "#fff" : "var(--n500)",
                  borderColor: q.titulo.anio === a ? "transparent" : "rgba(17,17,36,.14)" }}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:9, marginTop:12, padding:"9px 12px",
        background:"rgba(120,90,229,.055)", border:"1px solid rgba(120,90,229,.14)", borderRadius:11 }}>
        <Eye size={13} style={{ color:"var(--violet)", flexShrink:0 }} />
        <span style={{ fontSize:11.5, color:"var(--n500)" }}>Sale así:</span>
        <span className="disp" style={{ fontSize:16, fontWeight:600, letterSpacing:"-.02em" }}>{previa}</span>
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7 }}>
        Mes y año se eligen por clic para que todas las cotizaciones salgan iguales. Solo se ofrecen {anios[0]} y {anios[1]}:
        los vuelos no se ven más allá de once meses.
      </div>

      <div className="hairline" style={{ margin:"15px 0" }} />

      <div style={{ display:"flex", gap:14, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 230px" }}>
          <Label hint="se carga una sola vez y baja a todo">Fecha de salida</Label>
          <Calendario grande value={q.fechaSalida} placeholder="Elegir la salida"
            nota="De acá salen los check-in de cada destino y las fechas de todos los servicios."
            onChange={(v) => set((d) => { d.fechaSalida = v; })} />
        </div>
        <div style={{ flex:"2 1 240px", paddingBottom:4 }}>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {tramos.map((t) => (
              <div key={t.id} className="mono" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px",
                background:"rgba(59,191,173,.09)", border:"1px solid rgba(59,191,173,.2)", borderRadius:9,
                fontSize:11, color:"var(--teal-3)", fontWeight:500 }}>
                {t.ciudad}: {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)} · {t.noches}n
                {t.manual && <Pill tone="amber" style={{ padding:"1px 5px", fontSize:9 }}>manual</Pill>}
              </div>
            ))}
            {!tramos.length && <span style={{ fontSize:11.5, color:"var(--n300)" }}>Agregá destinos abajo y las fechas se calculan solas.</span>}
          </div>
        </div>
      </div>

      {hayManual && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, padding:"10px 12px",
          background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"#8A5A16", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"#8A5A16", flex:1 }}>
            Hay fechas editadas a mano que no siguen a la fecha de salida.
          </span>
          <Btn size="sm" onClick={onRepropagar}><RefreshCw size={12} /> Actualizar todo</Btn>
        </div>
      )}
    </Block>
  );
}

/* ── 3 · Destinos y noches ───────────────────────────────────────────── */
function SeccionDestinos({ q, set, tramos, toast }) {
  const [nuevo, setNuevo] = useState("");
  const inp = useRef(null);
  const agregar = (ciudad) => {
    const c = (ciudad || nuevo).trim(); if (!c) return;
    set((d) => { d.destinos.push({ id:uid("dst"), ciudad:c, noches:3, checkinManual:null }); });
    setNuevo(""); requestAnimationFrame(() => inp.current?.focus());
  };
  const sigueAlAnterior = (i) => i > 0 && !q.destinos[i].checkinManual;
  return (
    <div>
      {q.destinos.length === 0
        ? <Vacio icon={MapPin} titulo="Todavía no hay destinos" accion="Escribí una ciudad y apretá Enter" />
        : (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:11 }}>
          {q.destinos.map((dd, i) => {
            const t = tramos[i];
            return (
              <div key={dd.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px",
                background:"#FCFCFE", border:"1px solid var(--hair-soft)", borderRadius:11 }}>
                <div className="mono" style={{ width:20, height:20, borderRadius:6, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.11)", color:"var(--violet)", fontSize:10, fontWeight:600 }}>{i + 1}</div>
                <input className="in" style={{ flex:"1 1 130px", height:32 }} value={dd.ciudad}
                  onChange={(e) => set((d) => { d.destinos[i].ciudad = e.target.value; })} />
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <button className="btn btn-s btn-ico" style={{ width:27, height:27 }}
                    onClick={() => set((d) => { d.destinos[i].noches = Math.max(1, d.destinos[i].noches - 1); })}>−</button>
                  <div className="mono" style={{ width:52, textAlign:"center", fontSize:12, fontWeight:600 }}>{dd.noches} n</div>
                  <button className="btn btn-s btn-ico" style={{ width:27, height:27 }}
                    onClick={() => set((d) => { d.destinos[i].noches += 1; })}>+</button>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:168 }}>
                    <Calendario value={t?.checkin || ""} placeholder="Check-in"
                      onChange={(v) => set((d) => { d.destinos[i].checkinManual = v || null; })} />
                  </div>
                  <span className="mono" style={{ fontSize:10.5, color:"var(--n400)", width:56, whiteSpace:"nowrap" }}>
                    → {t ? fmtCorto(t.checkout) : "—"}
                  </span>
                  {t?.manual ? (
                    <button className="pill" title="Volver a la fecha automática"
                      style={{ background:"rgba(247,178,103,.2)", color:"#8A5A16", cursor:"pointer" }}
                      onClick={() => set((d) => { d.destinos[i].checkinManual = null; })}>
                      manual <RefreshCw size={9} />
                    </button>
                  ) : (
                    <span className="pill" style={{ background:"rgba(59,191,173,.12)", color:"#1F7D70" }}
                      title={i === 0 ? "Sigue a la fecha de salida" : "Sigue al check-out del destino anterior"}>
                      <Zap size={9} /> {i === 0 ? "= salida" : "sigue al anterior"}
                    </span>
                  )}
                </div>
                <button className="btn btn-g btn-ico" title="Quitar destino"
                  onClick={() => { const cp = { ...dd }; set((d) => { d.destinos.splice(i, 1); });
                    toast({ msg:`Se quitó ${cp.ciudad}`, tone:"warn", undo:() => set((d) => { d.destinos.splice(i, 0, cp); }) }); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:"1 1 230px" }}>
          <AutoCiudad inputRef={inp} value={nuevo} placeholder="Agregar ciudad… (autocompleta)"
            excluir={q.destinos.map((d) => d.ciudad)}
            onChange={setNuevo} onPick={(c) => agregar(c)} />
        </div>
        <span className="kbd">↵</span>
        {CIUDADES.filter((c) => !q.destinos.some((d) => d.ciudad === c)).slice(0, 3).map((c) => (
          <button key={c} className="chip" onClick={() => agregar(c)}><Plus size={11} />{c}</button>
        ))}
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
        <Zap size={11} style={{ color:"var(--teal-2)" }} />
        Elegís el check-in del primero y los siguientes se encadenan solos: cada destino arranca cuando termina el anterior.
      </div>
    </div>
  );
}

/* ── 4 · Mensaje al pasajero — WYSIWYG con formato ───────────────────── */
function BloqueMensaje({ q, set, refEl, toast }) {
  const ed = useRef(null);
  useEffect(() => { if (ed.current && ed.current.innerHTML !== (q.mensajeHtml || "")) {
    ed.current.innerHTML = q.mensajeHtml || ""; } }, []);   // carga inicial
  const sync = () => set((d) => { d.mensajeHtml = ed.current.innerHTML;
    d.mensaje = ed.current.innerText.trim(); });
  const cmd = (c, v) => { ed.current?.focus(); document.execCommand(c, false, v || null); sync(); };
  const B = ({ c, v, title, children }) => (
    <button className="wys-b" title={title} onMouseDown={(e) => { e.preventDefault(); cmd(c, v); }}>{children}</button>
  );
  return (
    <Block id="b-mensaje" forwardRef={refEl} icon={MessageSquare} title="Mensaje al pasajero"
      right={<Pill tone="n">Opcional · con formato</Pill>}>
      <div className="wys-bar">
        <B c="bold" title="Negrita"><b>B</b></B>
        <B c="italic" title="Cursiva"><i style={{ fontFamily:"Georgia" }}>I</i></B>
        <B c="underline" title="Subrayado"><u>U</u></B>
        <span style={{ width:1, background:"var(--hair)", margin:"3px 4px" }} />
        <B c="insertUnorderedList" title="Lista"><LayoutGrid size={13} /></B>
        <B c="removeFormat" title="Quitar formato"><X size={13} /></B>
        <span style={{ marginLeft:"auto", fontSize:10.5, color:"var(--n300)", alignSelf:"center", paddingRight:4 }}>
          lo pegado entra sin formato ajeno</span>
      </div>
      <div ref={ed} className="wys" contentEditable suppressContentEditableWarning
        data-ph="Escribí o pegá acá. Negrita, cursiva y listas — siempre con la tipografía de la marca."
        onInput={sync}
        onPaste={(e) => {
          e.preventDefault();
          const t = limpiarPegado(e.clipboardData.getData("text/plain"));
          document.execCommand("insertText", false, t);
          sync();
          toast({ msg:"Texto pegado y normalizado a la tipografía de la marca", tone:"ok" });
        }} />
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, display:"flex", alignItems:"center", gap:6 }}>
        <Check size={11} style={{ color:"var(--teal-2)" }} />
        El formato que apliques acá sale igual en la cotización. Lo que pegues de Word o WhatsApp pierde su fuente y toma la de la marca.
      </div>
    </Block>
  );
}

/* ── 5 · Itinerario de vuelos (PNR) ──────────────────────────────────── */
function BloqueVuelos({ q, set, refEl, toast }) {
  const [estado, setEstado] = useState("idle");  // idle | cargando | error
  const [modo, setModo] = useState("texto");     // texto | foto
  const [foto, setFoto] = useState(null);        // { nombre, url }
  const [choque, setChoque] = useState(null);    // fecha del vuelo ≠ fecha de salida
  const fileRef = useRef(null);
  const aplicarVuelos = (v) => {
    const p = v[0];
    const iso = toISO(new Date(p.mes >= new Date().getMonth() ? ANIO_BASE : ANIO_BASE + 1, p.mes, p.dia));
    if (!q.fechaSalida) {
      set((d) => { d.vuelos = v; d.fechaSalida = iso; });
      toast({ msg:`Fecha de salida tomada del primer vuelo: ${fmtCorto(iso)}`, tone:"ok" });
    } else if (q.fechaSalida !== iso) {
      set((d) => { d.vuelos = v; });
      setChoque(iso);
    } else {
      set((d) => { d.vuelos = v; });
    }
  };
  const leerFoto = (archivo) => {
    const nombre = archivo ? archivo.name : "reserva-amadeus.png";
    const url = archivo ? URL.createObjectURL(archivo) : null;
    setFoto({ nombre, url });
    setEstado("cargando");
    setTimeout(() => {
      const v = parsePNR(PNR_DEMO);
      set((d) => { d.pnrRaw = PNR_DEMO; });
      aplicarVuelos(v);
      setEstado("idle");
      toast({ msg:`Itinerario leído desde la imagen — ${v.length} tramos`, tone:"ok" });
    }, 1400);
  };
  const convertir = () => {
    if (!q.pnrRaw.trim()) return;
    setEstado("cargando");
    setTimeout(() => {
      const v = parsePNR(q.pnrRaw);
      if (!v.length) { setEstado("error"); return; }           // el pegado NO se pierde
      aplicarVuelos(v);
      setEstado("idle");
      toast({ msg:`${v.length} tramos convertidos al formato de la marca`, tone:"ok" });
    }, 620);
  };
  return (
    <Block id="b-vuelos" forwardRef={refEl} icon={Plane} title="Itinerario de vuelos" count={q.vuelos.length || null}
      right={
        <div className="seg">
          <button data-on={modo === "texto" ? "1" : "0"} onClick={() => setModo("texto")}>
            <FileText size={12} /> Pegar texto</button>
          <button data-on={modo === "foto" ? "1" : "0"} onClick={() => setModo("foto")}>
            <Eye size={12} /> Subir foto</button>
        </div>
      }>
      {modo === "texto" ? (
        <textarea className="in mono" rows={q.pnrRaw ? 5 : 3} value={q.pnrRaw}
          style={{ fontSize:11.5, lineHeight:1.55, background: estado === "error" ? "rgba(244,62,85,.04)" : "#fff" }}
          placeholder="Pegá acá el PNR tal como sale del GDS… (igual que en el sistema actual)"
          onChange={(e) => { set((d) => { d.pnrRaw = e.target.value; }); setEstado("idle"); }}
          onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData("text/plain");
            set((d) => { d.pnrRaw = t; }); setEstado("idle"); }} />
      ) : (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={(e) => e.target.files?.[0] && leerFoto(e.target.files[0])} />
          {estado === "cargando" ? (
            <div className="dz" style={{ cursor:"default" }}>
              <Loader2 size={20} className="spin" style={{ color:"var(--violet)", marginBottom:8 }} />
              <div style={{ fontSize:13, fontWeight:600, color:"var(--n600)" }}>Leyendo la reserva…</div>
              <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:3 }}>{foto?.nombre}</div>
            </div>
          ) : (
            <button className="dz" style={{ width:"100%" }} onClick={() => fileRef.current?.click()}>
              <div style={{ width:38, height:38, borderRadius:12, margin:"0 auto 9px", display:"grid", placeItems:"center",
                background:"rgba(120,90,229,.12)", color:"var(--violet)" }}><Plane size={17} /></div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--n600)" }}>Arrastrá o tocá para subir la foto de la reserva</div>
              <div style={{ fontSize:11.5, color:"var(--n400)", marginTop:3 }}>Captura de Amadeus, foto del papel, lo que tengas — lo leemos igual</div>
              <div style={{ marginTop:10 }}>
                <span className="chip" style={{ height:27, fontSize:11.5 }}
                  onClick={(e) => { e.stopPropagation(); leerFoto(null); }}>
                  <Sparkles size={11} /> Probar con una foto de ejemplo</span>
              </div>
            </button>
          )}
          {foto && estado === "idle" && (
            <div className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, marginTop:9, padding:"8px 11px",
              borderRadius:11, background:"rgba(59,191,173,.07)", border:"1px solid rgba(59,191,173,.2)" }}>
              <CheckCheck size={14} style={{ color:"var(--teal-2)" }} />
              <span style={{ fontSize:12, color:"var(--teal-3)", fontWeight:600 }}>{foto.nombre}</span>
              <span style={{ fontSize:11.5, color:"var(--n400)" }}>· itinerario extraído</span>
            </div>
          )}
        </>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:9, marginTop:9, flexWrap:"wrap" }}>
        {modo === "texto" && (
        <Btn variant="p" size="sm" onClick={convertir} disabled={!q.pnrRaw.trim() || estado === "cargando"}>
          {estado === "cargando" ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
          {estado === "cargando" ? "Convirtiendo…" : "Convertir itinerario"}
        </Btn>
        )}
        {modo === "texto" && !q.pnrRaw && (
          <Btn size="sm" onClick={() => set((d) => { d.pnrRaw = PNR_DEMO; })}>Pegar ejemplo</Btn>
        )}
        {q.vuelos.length > 0 && (
          <Btn size="sm" onClick={() => set((d) => { d.vuelos.push({ id:uid("vl"), cia:"LA", nro:"0000",
            aerolinea:"LATAM", dia:1, mes:0, origen:"MVD", destino:"GRU", salida:"08:00", llegada:"09:40" }); })}>
            <Plus size={12} /> Agregar tramo a mano
          </Btn>
        )}
      </div>

      {estado === "error" && (
        <div className="a-slide" style={{ display:"flex", alignItems:"flex-start", gap:9, marginTop:10, padding:"10px 12px",
          background:"rgba(244,62,85,.07)", border:"1px solid rgba(244,62,85,.24)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"var(--coral)", flexShrink:0, marginTop:1 }} />
          <div style={{ fontSize:12, color:"#A8192A", flex:1 }}>
            <strong>No se reconoció ningún tramo en ese texto.</strong> Lo pegado quedó intacto arriba:
            corregilo y volvé a convertir, o cargá los tramos a mano.
            <div style={{ marginTop:7 }}>
              <Btn size="xs" onClick={() => { set((d) => { d.vuelos.push({ id:uid("vl"), cia:"LA", nro:"0000",
                aerolinea:"LATAM", dia:1, mes:0, origen:"MVD", destino:"GRU", salida:"08:00", llegada:"09:40" }); }); setEstado("idle"); }}>
                <Plus size={11} /> Cargar a mano
              </Btn>
            </div>
          </div>
        </div>
      )}

      {q.vuelos.length > 0 && (
        <div style={{ marginTop:12, border:"1px solid var(--hair-soft)", borderRadius:12, overflow:"hidden" }}>
          {q.vuelos.map((v, i) => (
            <div key={v.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
              borderBottom: i < q.vuelos.length - 1 ? "1px solid var(--hair-soft)" : "none", background:"#FCFCFE" }}>
              <div style={{ width:26, height:26, borderRadius:8, background:"rgba(120,90,229,.11)", color:"var(--violet)",
                display:"grid", placeItems:"center", flexShrink:0 }}><Plane size={12} /></div>
              <input className="in mono" style={{ width:80, height:30, textAlign:"center", fontSize:11.5 }} value={v.cia + v.nro}
                onChange={(e) => { const t = e.target.value.toUpperCase(); const c = t.slice(0,2), n = t.slice(2);
                  set((d) => { d.vuelos[i].cia = c; d.vuelos[i].nro = n; d.vuelos[i].aerolinea = AEROLINEAS[c] || c; }); }} />
              <div style={{ flex:"1 1 96px", fontSize:12, fontWeight:600, minWidth:0, whiteSpace:"nowrap",
                overflow:"hidden", textOverflow:"ellipsis" }}>{v.aerolinea}</div>
              <input className="in mono" style={{ width:58, height:30, textAlign:"center" }} value={v.origen}
                onChange={(e) => set((d) => { d.vuelos[i].origen = e.target.value.toUpperCase().slice(0,3); })} />
              <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
              <input className="in mono" style={{ width:58, height:30, textAlign:"center" }} value={v.destino}
                onChange={(e) => set((d) => { d.vuelos[i].destino = e.target.value.toUpperCase().slice(0,3); })} />
              <input className="in mono" style={{ width:62, height:30, textAlign:"center" }} value={v.salida}
                onChange={(e) => set((d) => { d.vuelos[i].salida = e.target.value; })} />
              <input className="in mono" style={{ width:62, height:30, textAlign:"center" }} value={v.llegada}
                onChange={(e) => set((d) => { d.vuelos[i].llegada = e.target.value; })} />
              <button className="btn btn-g btn-ico" onClick={() => { const cp = { ...v };
                set((d) => { d.vuelos.splice(i, 1); });
                toast({ msg:"Tramo eliminado", tone:"warn", undo:() => set((d) => { d.vuelos.splice(i, 0, cp); }) }); }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {choque && (
        <div className="a-slide" style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, padding:"10px 12px",
          background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.34)", borderRadius:11 }}>
          <AlertCircle size={14} style={{ color:"#8A5A16", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"#8A5A16", flex:1 }}>
            El vuelo sale el <b>{fmtCorto(choque)}</b> pero la fecha de salida cargada es <b>{fmtCorto(q.fechaSalida)}</b>.
          </span>
          <Btn size="sm" onClick={() => { set((d) => { d.fechaSalida = choque; }); setChoque(null);
            toast({ msg:"Fecha de salida actualizada desde el vuelo", tone:"ok" }); }}>
            <RefreshCw size={12} /> Usar la del vuelo</Btn>
          <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} onClick={() => setChoque(null)}><X size={12} /></button>
        </div>
      )}
      {q.vuelos.length > 0 && !choque && (
        <div style={{ fontSize:11, color:"var(--n400)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
          <Check size={11} style={{ color:"var(--teal-2)" }} />
          Con los vuelos cargados, las fechas de traslado no se piden en ningún otro lado.
        </div>
      )}
    </Block>
  );
}

/* ── 6 · Servicios en cápsulas, reordenables ─────────────────────────── */
function BloqueServicios({ q, set, refEl, toast }) {
  const [cat, setCat] = useState("aereo");
  const [txt, setTxt] = useState("");
  const [acOpen, setAcOpen] = useState(false);
  const [acIdx, setAcIdx] = useState(0);
  const [fly, setFly] = useState(null);      // { cat, ts } badge volador
  const [pulseCat, setPulseCat] = useState(null);
  const acBox = useRef(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [armado, setArmado] = useState(null);
  const inp = useRef(null);

  const agregar = (texto, categoria) => {
    const t = (typeof texto === "string" ? texto : txt).trim(); if (!t) return;
    const c = categoria || cat;
    set((d) => { d.servicios.push({ id:uid("srv"), categoria:c, texto:t,
      ciudad: c === "traslado" ? "" : null, modalidad: c === "traslado" ? "Regular" : null }); });
    setTxt(""); setAcIdx(0);
    setFly({ cat:c, ts:Date.now() });
    setPulseCat(c + Date.now());
    setTimeout(() => setFly(null), 820);
    requestAnimationFrame(() => inp.current?.focus());
  };
  const mover = (from, to) => {
    if (from === to || to == null) return;
    set((d) => { const [it] = d.servicios.splice(from, 1); d.servicios.splice(from < to ? to - 1 : to, 0, it); });
  };

  const sugerencias = SUG[cat].filter((s) => !q.servicios.some((x) => x.texto === s));
  /* busqueda GLOBAL: en todas las categorias, no solo la activa */
  const acRes = useMemo(() => {
    const t = txt.trim().toLowerCase();
    const usados = new Set(q.servicios.map((x) => x.texto));
    if (!t) return SUG[cat].filter((x) => !usados.has(x)).slice(0, 5).map((texto) => ({ cat, texto }));
    return SUG_ALL.filter((x) => !usados.has(x.texto) && x.texto.toLowerCase().includes(t)).slice(0, 6);
  }, [txt, cat, q.servicios]);
  useEffect(() => {
    const h = (e) => { if (acBox.current && !acBox.current.contains(e.target)) setAcOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <Block id="b-servicios" forwardRef={refEl} icon={LayoutGrid} title="Servicios incluidos" count={q.servicios.length}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:11 }}>
        {CATS.map((c) => {
          const n = q.servicios.filter((s) => s.categoria === c.id).length;
          const late = pulseCat && String(pulseCat).startsWith(c.id);
          return (
            <button key={c.id} className={`chip ${cat === c.id ? "chip-on" : ""} ${late ? "a-tada" : ""}`}
              onClick={() => { setCat(c.id); requestAnimationFrame(() => inp.current?.focus()); }}>
              <c.Icon size={12} />{c.label}
              {n > 0 && <span key={n} className="mono a-pulse" style={{ fontSize:10, opacity:.7 }}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div ref={acBox} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, position:"relative" }}>
        <div style={{ flex:1, position:"relative" }}>
          {fly && (() => { const C = CATS.find((c) => c.id === fly.cat) || CATS[0];
            return <span key={fly.ts} className="fly"><C.Icon size={11} /> {C.label}</span>; })()}
          <input ref={inp} className="in" style={{ width:"100%" }} value={txt}
            placeholder="Buscá en todos los servicios… se agrega en su categoría solo"
            onFocus={() => { setAcOpen(true); setAcIdx(0); }}
            onChange={(e) => { setTxt(e.target.value); setAcOpen(true); setAcIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAcOpen(true); setAcIdx((i) => clamp(i + 1, 0, acRes.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAcIdx((i) => clamp(i - 1, 0, acRes.length - 1)); }
              else if (e.key === "Tab" && acOpen && acRes[acIdx]) { e.preventDefault(); setTxt(acRes[acIdx].texto); }
              else if (e.key === "Enter") { e.preventDefault();
                if (acOpen && acRes[acIdx]) agregar(acRes[acIdx].texto, acRes[acIdx].cat);
                else agregar();
                setAcIdx(0); }
              else if (e.key === "Escape") setAcOpen(false);
            }} />
          {acOpen && acRes.length > 0 && (
            <div className="ac-pop a-slide">
              {acRes.map((x, i) => {
                const C = CATS.find((c) => c.id === x.cat) || CATS[0];
                return (
                <button key={x.cat + x.texto} className="ac-i" data-on={i === acIdx ? "1" : "0"}
                  onMouseEnter={() => setAcIdx(i)} onClick={() => { agregar(x.texto, x.cat); }}>
                  <span style={{ width:22, height:22, borderRadius:7, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.1)", color:"var(--violet)", flexShrink:0 }}><C.Icon size={11} /></span>
                  <span style={{ flex:1 }}>{x.texto}</span>
                  <span className="pill" style={{ background:"rgba(17,17,36,.05)", color:"var(--n400)", flexShrink:0 }}>{C.label}</span>
                  {i === acIdx && <span className="kbd">{"\u21B5"}</span>}
                </button>
                );
              })}
              <div style={{ padding:"6px 11px", fontSize:10.5, color:"var(--n400)", borderTop:"1px solid var(--hair-soft)",
                display:"flex", gap:10 }}>
                <span><span className="kbd">↑↓</span> elegir</span>
                <span><span className="kbd">Tab</span> completar</span>
                <span><span className="kbd">↵</span> agregar y seguir</span>
              </div>
            </div>
          )}
        </div>
        <span className="kbd" style={{ minWidth:44, gap:4 }}><CornerDownLeft size={10} /> Enter</span>
      </div>

      {sugerencias.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:13 }}>
          {sugerencias.slice(0, 6).map((s) => (
            <button key={s} className="chip" style={{ height:27, fontSize:11.5, color:"var(--n500)" }} onClick={() => agregar(s)}>
              <Plus size={10} />{s.length > 42 ? s.slice(0, 42) + "…" : s}
            </button>
          ))}
        </div>
      )}

      {q.servicios.length === 0
        ? <Vacio icon={LayoutGrid} titulo="Todavía no hay servicios" accion="Elegí una categoría y escribí, o tocá una sugerencia" />
        : (
        <div>
          {q.servicios.map((s, i) => {
            const C = CATS.find((c) => c.id === s.categoria) || CATS[0];
            return (
              <React.Fragment key={s.id}>
                {over === i && drag !== null && <div className="drop-line" />}
                <div draggable={armado === i}
                  onDragStart={() => setDrag(i)}
                  onDragEnd={() => { mover(drag, over); setDrag(null); setOver(null); setArmado(null); }}
                  onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                  className={drag === i ? "drag-on" : ""}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 9px", marginBottom:5,
                    background:"#FCFCFE", border:"1px solid var(--hair-soft)", borderRadius:11, transition:"box-shadow .16s" }}>
                  <GripVertical size={14} style={{ color:"var(--n300)", cursor:"grab", flexShrink:0 }}
                    onMouseDown={() => setArmado(i)} onMouseUp={() => setArmado(null)} />
                  <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.10)", color:"var(--violet)" }}><C.Icon size={12} /></div>
                  <input className="in" style={{ flex:"1 1 140px", height:30, border:"1px solid transparent",
                    background:"transparent", paddingLeft:2 }} value={s.texto}
                    onChange={(e) => set((d) => { d.servicios[i].texto = e.target.value; })} />
                  {s.categoria === "traslado" && (
                    <>
                      <select className="in" style={{ width:126, height:30, fontSize:12 }} value={s.ciudad || ""}
                        onChange={(e) => set((d) => { d.servicios[i].ciudad = e.target.value; })}>
                        <option value="">Ciudad…</option>
                        {[...new Set([...q.destinos.map((x) => x.ciudad), ...CIUDADES])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <select className="in" style={{ width:92, height:30, fontSize:12 }} value={s.modalidad || "Regular"}
                        onChange={(e) => set((d) => { d.servicios[i].modalidad = e.target.value; })}>
                        {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </>
                  )}
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} disabled={i === 0}
                      onClick={() => mover(i, i - 1)}><ArrowUp size={12} /></button>
                    <button className="btn btn-g btn-ico" style={{ width:25, height:25 }} disabled={i === q.servicios.length - 1}
                      onClick={() => mover(i, i + 2)}><ArrowDown size={12} /></button>
                    <button className="btn btn-g btn-ico" style={{ width:25, height:25 }}
                      onClick={() => { const cp = { ...s }; set((d) => { d.servicios.splice(i, 1); });
                        toast({ msg:"Servicio eliminado", tone:"warn", undo:() => set((d) => { d.servicios.splice(i, 0, cp); }) }); }}>
                      <Trash2 size={12} /></button>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {over === q.servicios.length && drag !== null && <div className="drop-line" />}
          <div onDragOver={(e) => { e.preventDefault(); setOver(q.servicios.length); }} style={{ height:10 }} />
        </div>
      )}
      <div style={{ fontSize:11, color:"var(--n400)", display:"flex", alignItems:"center", gap:6 }}>
        <GripVertical size={11} /> Arrastrá para reordenar, o usá las flechas. El orden es el que ve el pasajero.
      </div>
    </Block>
  );
}

/* ── 7 · Notas internas — nunca salen ────────────────────────────────── */
function BloqueNotas({ q, set, refEl, toast }) {
  const [c, setC] = useState(""); const [n, setN] = useState("");
  const inp = useRef(null);
  const total = q.notas.reduce((a, x) => a + Number(x.neto || 0), 0);
  const agregar = () => { if (!c.trim()) return;
    set((d) => { d.notas.push({ id:uid("nt"), concepto:c.trim(), neto:Number(n) || 0 }); });
    setC(""); setN(""); requestAnimationFrame(() => inp.current?.focus()); };
  return (
    <Block id="b-notas" forwardRef={refEl} icon={Lock} title="Notas internas" count={q.notas.length}
      right={<Pill tone="coral"><Lock size={9} /> No se comparte</Pill>}>
      {q.notas.length === 0
        ? <Vacio icon={Lock} titulo="Sin notas internas" accion="Netos y costos fijos que el pasajero nunca ve" />
        : (
        <div style={{ border:"1px solid var(--hair-soft)", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
          {q.notas.map((x, i) => (
            <div key={x.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
              borderBottom:"1px solid var(--hair-soft)", background:"#FCFCFE" }}>
              <input className="in" style={{ flex:1, height:29, border:"1px solid transparent", background:"transparent", paddingLeft:2 }}
                value={x.concepto} onChange={(e) => set((d) => { d.notas[i].concepto = e.target.value; })} />
              <input className="in mono" style={{ width:104, height:29, textAlign:"right" }} type="number" value={x.neto}
                onChange={(e) => set((d) => { d.notas[i].neto = e.target.value; })} />
              <button className="btn btn-g btn-ico" style={{ width:25, height:25 }}
                onClick={() => { const cp = { ...x }; set((d) => { d.notas.splice(i, 1); });
                  toast({ msg:"Nota eliminada", tone:"warn", undo:() => set((d) => { d.notas.splice(i, 0, cp); }) }); }}>
                <Trash2 size={12} /></button>
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px",
            background:"rgba(17,17,36,.028)" }}>
            <span className="lbl">Total de costos fijos</span>
            <span className="mono" style={{ fontSize:14, fontWeight:600 }}>{money(total)}</span>
          </div>
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <input ref={inp} className="in" style={{ flex:1 }} value={c} placeholder="Concepto…"
          onChange={(e) => setC(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <input className="in mono" style={{ width:110, textAlign:"right" }} type="number" value={n} placeholder="0"
          onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <Btn size="sm" onClick={agregar} style={{ height:38 }}><Plus size={13} /></Btn>
      </div>
    </Block>
  );
}

/* ── 7b · Notas para el pasajero — SÍ salen en la cotización ─────────── */
function BloqueNotasCliente({ q, set, refEl, toast }) {
  const [t, setT] = useState("");
  const inp = useRef(null);
  const agregar = () => { if (!t.trim()) return;
    set((d) => { d.notasCliente.push({ id:uid("nc"), texto:t.trim() }); });
    setT(""); requestAnimationFrame(() => inp.current?.focus()); };
  return (
    <Block id="b-notascliente" forwardRef={refEl} icon={StickyNote} title="Notas para el pasajero"
      count={q.notasCliente.length}
      right={<Pill tone="teal"><Eye size={9} /> Sale en la cotización</Pill>}>
      {q.notasCliente.length === 0
        ? <Vacio icon={StickyNote} titulo="Sin notas para el pasajero"
            accion="Aclaraciones que sí se comparten: documentación, vacunas, horarios de check-in…" />
        : (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
          {q.notasCliente.map((x, i) => (
            <div key={x.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
              background:"rgba(59,191,173,.05)", border:"1px solid rgba(59,191,173,.16)", borderRadius:11 }}>
              <StickyNote size={12} style={{ color:"var(--teal-2)", flexShrink:0 }} />
              <input className="in" style={{ flex:1, height:29, border:"1px solid transparent", background:"transparent", paddingLeft:2 }}
                value={x.texto} onChange={(e) => set((d) => { d.notasCliente[i].texto = e.target.value; })} />
              <button className="btn btn-g btn-ico" style={{ width:25, height:25 }}
                onClick={() => { const cp = { ...x }; set((d) => { d.notasCliente.splice(i, 1); });
                  toast({ msg:"Nota eliminada", tone:"warn", undo:() => set((d) => { d.notasCliente.splice(i, 0, cp); }) }); }}>
                <Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <input ref={inp} className="in" style={{ flex:1 }} value={t}
          placeholder="Ej.: Pasaporte con 6 meses de vigencia · Enter para agregar"
          onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <Btn size="sm" onClick={agregar} style={{ height:38 }}><Plus size={13} /></Btn>
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:7, display:"flex", alignItems:"center", gap:6 }}>
        <Eye size={11} style={{ color:"var(--teal-2)" }} />
        A diferencia de las notas internas, estas aparecen en la cotización bajo "A tener en cuenta".
      </div>
    </Block>
  );
}

/* ── 8 · Opciones hoteleras ──────────────────────────────────────────── */
function SeccionOpciones({ q, set, tramos, toast }) {
  const [foco, setFoco] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [armado, setArmado] = useState(null);
  const nombreRefs = useRef({});

  useEffect(() => { if (foco && nombreRefs.current[foco]) { nombreRefs.current[foco].focus(); nombreRefs.current[foco].select(); setFoco(null); } }, [foco, q.opciones.length]);

  const nueva = () => {
    const id = uid("op");
    set((d) => { d.opciones.push({ id, nombre:`Opción ${d.opciones.length + 1}`,
      hoteles: d.destinos.map(() => ({ hotelId:null, libre:"" })),
      habitacion:"Doble estándar", regimen:"Desayuno", neto:0, factor:0.88 }); });
    setFoco(id);
  };
  const duplicar = (i) => {
    const src = q.opciones[i]; const id = uid("op");
    const copia = JSON.parse(JSON.stringify(src));
    copia.id = id; copia.nombre = src.nombre + " (copia)";
    set((d) => { d.opciones.splice(i + 1, 0, copia); });
    setFoco(id);
    toast({ msg:"Opción duplicada — el orden quedó intacto", tone:"ok" });
  };
  const mover = (from, to) => { if (from === to || to == null) return;
    set((d) => { const [it] = d.opciones.splice(from, 1); d.opciones.splice(from < to ? to - 1 : to, 0, it); }); };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:9, margin:"18px 0 12px" }}>
        <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
          background:"rgba(59,191,173,.13)", color:"var(--teal-3)" }}><Bed size={13} /></div>
        <span style={{ fontSize:12.5, fontWeight:700 }}>Opciones hoteleras</span>
        {q.opciones.length > 0 && <Pill tone="n">{q.opciones.length}</Pill>}
        <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
        <Btn variant="p" size="sm" onClick={nueva}><Plus size={13} /> Nueva opción</Btn>
      </div>
      {q.opciones.length === 0 && <Vacio icon={Building2} titulo="Todavía no hay opciones" accion="Agregá la primera y elegí un hotel por destino — hereda los destinos y fechas de arriba" />}

      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        {q.opciones.map((o, i) => {
          const pv = venta(o.neto, o.factor);
          return (
            <React.Fragment key={o.id}>
              {over === i && drag !== null && <div className="drop-line" />}
              <div draggable={armado === i}
                onDragStart={() => setDrag(i)}
                onDragEnd={() => { mover(drag, over); setDrag(null); setOver(null); setArmado(null); }}
                onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                className={`a-pop ${drag === i ? "drag-on" : ""}`}
                style={{ border:"1px solid var(--hair-soft)", borderRadius:14, overflow:"hidden", background:"#fff",
                  boxShadow:"0 1px 2px rgba(26,26,46,.03)" }}>

                {/* cabecera de la opción */}
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px",
                  background:"linear-gradient(180deg,#FCFCFE,#F8F9FC)", borderBottom:"1px solid var(--hair-soft)" }}>
                  <GripVertical size={14} style={{ color:"var(--n300)", cursor:"grab", flexShrink:0 }}
                    onMouseDown={() => setArmado(i)} onMouseUp={() => setArmado(null)} />
                  <input ref={(el) => { nombreRefs.current[o.id] = el; }}
                    className="in" style={{ flex:"1 1 150px", height:31, fontWeight:700, fontSize:13,
                      border:"1px solid transparent", background:"transparent", paddingLeft:2 }}
                    value={o.nombre} onChange={(e) => set((d) => { d.opciones[i].nombre = e.target.value; })} />
                  <div style={{ display:"flex", gap:3 }}>
                    <button className="btn btn-s btn-ico" title="Duplicar esta opción" onClick={() => duplicar(i)}>
                      <Copy size={13} /></button>
                    <button className="btn btn-g btn-ico" disabled={i === 0} onClick={() => mover(i, i - 1)}><ArrowUp size={13} /></button>
                    <button className="btn btn-g btn-ico" disabled={i === q.opciones.length - 1} onClick={() => mover(i, i + 2)}><ArrowDown size={13} /></button>
                    <button className="btn btn-g btn-ico" onClick={() => { const cp = JSON.parse(JSON.stringify(o));
                      set((d) => { d.opciones.splice(i, 1); });
                      toast({ msg:`${o.nombre} eliminada`, tone:"warn", undo:() => set((d) => { d.opciones.splice(i, 0, cp); }) }); }}>
                      <Trash2 size={13} /></button>
                  </div>
                </div>

                {/* hoteles por tramo */}
                <div style={{ padding:"11px" }}>
                  {tramos.length === 0 && <div style={{ fontSize:12, color:"var(--n400)" }}>Agregá destinos para elegir hoteles por tramo.</div>}
                  {tramos.map((t, hi) => {
                    const h = o.hoteles[hi] || { hotelId:null, libre:"" };
                    const H = hotelById(h.hotelId);
                    return (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
                        <Foto seed={H?.seed ?? (hi + 40)} w={48} h={36} r={9} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                            <span className="lbl" style={{ color:"var(--violet)" }}>{t.ciudad}</span>
                            <span className="mono" style={{ fontSize:10, color:"var(--n400)" }}>
                              {t.noches}n · {fmtCorto(t.checkin)} → {fmtCorto(t.checkout)}
                            </span>
                          </div>
                          <BuscadorHotel ciudad={t.ciudad} valor={h.libre || H?.nombre || ""}
                            onPick={(hh) => set((d) => { if (!d.opciones[i].hoteles[hi]) d.opciones[i].hoteles[hi] = {};
                              d.opciones[i].hoteles[hi] = { hotelId:hh.id, libre:"" }; })}
                            onLibre={(txt) => set((d) => { if (!d.opciones[i].hoteles[hi]) d.opciones[i].hoteles[hi] = {};
                              d.opciones[i].hoteles[hi] = { hotelId:null, libre:txt }; })} />
                        </div>
                        {H && <div style={{ flexShrink:0 }}><Estrellas n={H.cat} /></div>}
                        {h.libre && <Pill tone="amber" style={{ flexShrink:0 }}><PenLine size={9} /> libre</Pill>}
                      </div>
                    );
                  })}

                  <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:11 }}>
                    <div style={{ flex:"1 1 150px" }}>
                      <Label>Habitación</Label>
                      <select className="in" value={o.habitacion} onChange={(e) => set((d) => { d.opciones[i].habitacion = e.target.value; })}>
                        {HABITACIONES.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                    <div style={{ flex:"1 1 150px" }}>
                      <Label>Régimen</Label>
                      <select className="in" value={o.regimen} onChange={(e) => set((d) => { d.opciones[i].regimen = e.target.value; })}>
                        {REGIMENES.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* markup: factor divisor, venta en vivo */}
                  <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:10, alignItems:"flex-end",
                    padding:"10px", background:"rgba(59,191,173,.045)", border:"1px solid rgba(59,191,173,.16)", borderRadius:11 }}>
                    <div style={{ flex:"1 1 110px" }}>
                      <Label>Neto</Label>
                      <input className="in mono" type="number" value={o.neto}
                        onChange={(e) => set((d) => { d.opciones[i].neto = e.target.value; })} />
                    </div>
                    <div style={{ flex:"1 1 110px" }}>
                      <Label hint={`${margenPct(o.factor)}%`}>Factor</Label>
                      <input className="in mono" type="number" step="0.01" min="0.5" max="1" value={o.factor}
                        onChange={(e) => set((d) => { d.opciones[i].factor = e.target.value; })} />
                    </div>
                    <div style={{ flex:"1 1 130px", textAlign:"right" }}>
                      <Label>Precio de venta</Label>
                      <div key={pv} className="a-pulse" style={{ fontSize:20, fontWeight:700, letterSpacing:"-.025em",
                        color:"var(--teal-3)", lineHeight:1.25 }}>{money(pv)}</div>
                      <div style={{ fontSize:10.5, color:"var(--n400)" }}>por adulto en base doble</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                    {!Number(o.neto) && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"#8A5A16" }}>
                        <AlertCircle size={11} /> Falta el neto de esta opción
                      </span>
                    )}
                    <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginLeft:"auto", textAlign:"right" }}>
                      {money(o.neto)} ÷ {o.factor} = {money(pv)} · margen {money(pv - o.neto)}
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {over === q.opciones.length && drag !== null && <div className="drop-line" />}
        <div onDragOver={(e) => { e.preventDefault(); setOver(q.opciones.length); }} style={{ height:6 }} />
      </div>
    </div>
  );
}

/* ── 3+8 · Destinos y alojamiento — un solo módulo ──────────────────── */
function BloqueAlojamiento({ q, set, tramos, refEl, toast }) {
  const noches = tramos.reduce((a, t) => a + t.noches, 0);
  return (
    <Block id="b-alojamiento" forwardRef={refEl} icon={Building2} title="Destinos y alojamiento"
      count={q.destinos.length}
      right={noches > 0 && <Pill tone="teal"><Bed size={9} /> {noches} noches</Pill>}>
      <SeccionDestinos q={q} set={set} tramos={tramos} toast={toast} />
      <SeccionOpciones q={q} set={set} tramos={tramos} toast={toast} />
    </Block>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2 · ENTRADA — cómo arranca una cotización
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── A1 · modal "¿Cómo arrancamos?" — cinco caminos, teclas 1 a 5 ────── */
function ModalNueva({ plantillas, recientes, onClose, onBlanco, onPaquete, onPlantilla, onFila, onIA }) {
  const [paso, setPaso] = useState("menu");     // menu | paquete | plantilla | reciente
  const [busq, setBusq] = useState("");
  const inp = useRef(null);

  const CAMINOS = [
    { k:"ia",        n:1, Icon:MessageSquare, t:"Desde una consulta de WhatsApp",
      d:"Pegá lo que te escribió el pasajero y la IA arma el borrador" },
    { k:"blanco",    n:2, Icon:FileText,   t:"En blanco",             d:"Formulario vacío, listo para escribir" },
    { k:"paquete",   n:3, Icon:LayoutGrid, t:"Desde un paquete",      d:"Todo precargado: destinos, hoteles y precios" },
    { k:"plantilla", n:4, Icon:Files,      t:"Desde una plantilla",   d:"Lo repetitivo ya viene cargado" },
    { k:"reciente",  n:5, Icon:Copy,       t:"Duplicar una reciente", d:"Arrancá desde una cotización ya armada" },
  ];

  const elegir = useCallback((k) => {
    if (k === "ia") onIA();
    else if (k === "blanco") onBlanco();
    else { setPaso(k); setBusq(""); }
  }, [onIA, onBlanco]);

  const volver = useCallback(() => { setPaso("menu"); setBusq(""); }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (paso === "menu") {
        const i = ["1","2","3","4","5"].indexOf(e.key);
        if (i >= 0) { e.preventDefault(); elegir(CAMINOS[i].k); }
      } else if (e.key === "ArrowLeft") {
        const el = e.target;
        if (!(el && el.tagName === "INPUT" && el.value)) { e.preventDefault(); volver(); }
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [paso, elegir, volver, onClose]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (paso !== "menu") { const t = setTimeout(() => inp.current?.focus(), 80); return () => clearTimeout(t); } }, [paso]);

  /* ── segundo paso: elegir de qué exactamente ── */
  const b = busq.trim().toLowerCase();
  const paquetes  = PAQUETES.filter((p) => !b || `${p.nombre} ${p.resumen} ${p.destinos.map((d) => d.ciudad).join(" ")}`.toLowerCase().includes(b));
  const plantis   = plantillas.filter((t) => !b || `${t.nombre} ${t.destino} ${t.detalle || ""}`.toLowerCase().includes(b));
  const recis     = recientes.filter((r) => !b || `${r.num} ${r.cliente} ${r.destino}`.toLowerCase().includes(b));
  const CAB = { paquete:{ t:"Elegí el paquete", ph:`Buscá entre los ${PAQUETES.length} paquetes publicados…` },
                plantilla:{ t:"Elegí la plantilla", ph:"Buscá entre tus plantillas…" },
                reciente:{ t:"Elegí cuál duplicar", ph:"Buscá por cliente, destino o número…" } }[paso];

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(620px,100%)", padding:0, overflow:"hidden" }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          {paso !== "menu" && (
            <button className="btn btn-g btn-ico" title="Volver a los caminos (←)" onClick={volver}><ArrowLeft size={15} /></button>
          )}
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>
            {paso === "menu" ? "¿Cómo arrancamos?" : CAB.t}
          </div>
          {paso === "menu" && <span style={{ fontSize:11, color:"var(--n400)" }}>elegí con el mouse o con los números</span>}
          <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>
        </div>

        {paso === "menu" ? (
          <div style={{ padding:"15px 17px 17px" }}>
            {/* camino destacado */}
            {(() => { const C = CAMINOS[0]; return (
              <button className="cam cam-hero a-rise" onClick={() => elegir(C.k)} style={{ marginBottom:11 }}>
                <span className="kbd cam-n">{C.n}</span>
                <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                  <div className="cam-ico" style={{ marginBottom:0, width:36, height:36, borderRadius:12 }}><C.Icon size={17} /></div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span className="cam-t">{C.t}</span>
                      <ChipIA />
                    </div>
                    <div className="cam-d">{C.d}</div>
                  </div>
                </div>
              </button>
            ); })()}

            {/* los otros cuatro */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:10 }}>
              {CAMINOS.slice(1).map((C, i) => (
                <button key={C.k} className="cam a-rise" onClick={() => elegir(C.k)} style={{ animationDelay:`${(i + 1) * .04}s` }}>
                  <span className="kbd cam-n">{C.n}</span>
                  <div className="cam-ico"><C.Icon size={15} /></div>
                  <div className="cam-t">{C.t}</div>
                  <div className="cam-d">{C.d}</div>
                </button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:13, fontSize:11, color:"var(--n400)" }}>
              <span className="kbd">1</span>…<span className="kbd">5</span> para elegir
              <span style={{ opacity:.4 }}>·</span>
              <span className="kbd">esc</span> para cerrar
            </div>
          </div>
        ) : (
          <div style={{ padding:"14px 17px 17px" }}>
            <div style={{ position:"relative", marginBottom:11 }}>
              <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--n300)" }} />
              <input ref={inp} className="in" style={{ paddingLeft:34 }} value={busq}
                placeholder={CAB.ph} onChange={(e) => setBusq(e.target.value)} />
            </div>

            <div style={{ maxHeight:330, overflowY:"auto", margin:"0 -4px" }}>
              {paso === "paquete" && paquetes.map((p) => (
                <button key={p.id} className="lst-i" onClick={() => onPaquete(p)}>
                  <Foto seed={p.seed} w={46} h={34} r={9} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.nombre}</div>
                    <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {p.destinos.map((d) => `${d.ciudad} · ${d.noches}n`).join("   ·   ")}</div>
                  </div>
                  <Pill tone="violet" style={{ flexShrink:0 }}>{MESES[p.mes].slice(0,3)} {p.anio}</Pill>
                  <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                </button>
              ))}

              {paso === "plantilla" && plantis.map((t) => (
                <button key={t.id} className="lst-i" onClick={() => onPlantilla(t)}>
                  <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:"grid", placeItems:"center",
                    background:"rgba(120,90,229,.1)", color:"var(--violet)" }}><Files size={14} /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{t.nombre}</div>
                    <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {t.destino} · {t.detalle}</div>
                  </div>
                  <Pill tone="teal" style={{ flexShrink:0 }}><Zap size={8} /> {t.usos ?? 0}</Pill>
                  <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                </button>
              ))}

              {paso === "reciente" && recis.map((r) => {
                const V = VENDEDORES.find((v) => v.id === r.vendedor);
                return (
                  <button key={r.num} className="lst-i" onClick={() => onFila(r)}>
                    <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:"grid", placeItems:"center",
                      background:"rgba(59,191,173,.12)", color:"var(--teal-3)" }}><Copy size={14} /></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.cliente}</div>
                      <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {r.destino}{V ? ` · ${V.nombre.split(" ")[0]}` : ""}</div>
                    </div>
                    <span className="mono" style={{ fontSize:10.5, color:"var(--n300)", flexShrink:0 }}>{r.num}</span>
                    <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />
                  </button>
                );
              })}

              {((paso === "paquete" && !paquetes.length) || (paso === "plantilla" && !plantis.length) || (paso === "reciente" && !recis.length)) && (
                <div style={{ padding:"22px 6px" }}>
                  <Vacio icon={Search} titulo={`Nada para “${busq.trim()}”`} accion="Probá con otra palabra, o arrancá en blanco" />
                </div>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11, color:"var(--n400)" }}>
              <span className="kbd">←</span> volver a los caminos
              <span style={{ opacity:.4 }}>·</span>
              <span className="kbd">esc</span> cerrar
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── A2 · modal "Pegá la consulta del pasajero" ──────────────────────── */
const EJEMPLOS_IA = [
  { l:"Familia a Brasil",   t:"Hola! somos 2 adultos y un nene de 8, queremos ir a Río en octubre, una semana mas o menos, algo con desayuno" },
  { l:"Pareja al Caribe",   t:"Buenas! con mi señora queremos escaparnos a Punta Cana en noviembre, all inclusive, 7 noches" },
  { l:"Grupo a Europa",     t:"Hola Agustina! te escribo por el viaje a Madrid y Barcelona de marzo que vi en la web, somos 4 adultos" },
];

function ModalIA({ onClose, onArmar }) {
  const [texto, setTexto] = useState("");
  const [fase, setFase] = useState("edit");     // edit | corriendo
  const [paso, setPaso] = useState(0);
  const [det, setDet] = useState(null);
  const ta = useRef(null);
  const armarRef = useRef(onArmar);
  useEffect(() => { armarRef.current = onArmar; });

  useEffect(() => { const t = setTimeout(() => ta.current?.focus(), 90); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && fase === "edit") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose, fase]);

  /* si la consulta no trae mes, mandan las fechas del paquete */
  const salidaMes = det?.paquete ? (det.mes != null ? det.mes : det.paquete.mes) : det?.mes;
  const salidaAnio = det?.paquete ? (det.mes != null ? det.anio : det.paquete.anio) : det?.anio;
  const pasos = det ? [
    { l:"Leyendo tu consulta…" },
    { l:`Buscando entre tus ${PAQUETES.length} paquetes publicados…` },
    det.paquete
      ? { l:`Encontré: ${det.paquete.nombre} · ${MESES[salidaMes].slice(0,3)} ${salidaAnio}` }
      : { l:"No encontré un paquete que coincida — la armo en blanco" },
    { l:"Armando el borrador…" },
  ] : [];

  const armar = () => { if (!texto.trim()) return; setDet(detectarConsulta(texto)); setPaso(0); setFase("corriendo"); };

  useEffect(() => {
    if (fase !== "corriendo" || !det) return;
    const durs = [600, 800, 620, 640];
    const ts = []; let acum = 0;
    for (let i = 1; i <= durs.length; i++) { acum += durs[i - 1]; ts.push(setTimeout(() => setPaso(i), acum)); }
    ts.push(setTimeout(() => armarRef.current(det), acum + 220));
    return () => ts.forEach(clearTimeout);
  }, [fase, det]);

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && fase === "edit" && onClose()}>
      <div className="a-zoom card" style={{ width:"min(560px,100%)", padding:0, overflow:"hidden" }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          <ChipIA />
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>
            Pegá la consulta del pasajero
          </div>
          {fase === "edit" && <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>}
        </div>

        {fase === "edit" ? (
          <div style={{ padding:"14px 17px 17px" }}>
            <textarea ref={ta} className="in" rows={6} value={texto}
              placeholder={"Pegá acá el mensaje tal cual te llegó. Por ejemplo:\n“Hola! somos 2 adultos y un nene de 8, queremos ir a Río en octubre, una semana mas o menos, algo con desayuno”"}
              onChange={(e) => setTexto(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const el = e.target;
                const t = limpiarPegado(e.clipboardData.getData("text/plain"));
                const a = el.selectionStart ?? texto.length, b = el.selectionEnd ?? texto.length;
                setTexto(texto.slice(0, a) + t + texto.slice(b));
              }} />

            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginTop:11 }}>
              <span className="lbl">Probá con un ejemplo</span>
              {EJEMPLOS_IA.map((x) => (
                <button key={x.l} className="chip" style={{ height:27, fontSize:11.5 }}
                  onClick={() => { setTexto(x.t); ta.current?.focus(); }}>
                  <MessageSquare size={11} style={{ color:"var(--violet)" }} /> {x.l}
                </button>
              ))}
            </div>

            <button className="btn btn-hero" style={{ width:"100%", height:44, borderRadius:12, fontSize:14, marginTop:14 }}
              onClick={armar} disabled={!texto.trim()}>
              <Sparkles size={16} /> Armar borrador
            </button>
            <div style={{ fontSize:11, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
              Lee el destino, el mes, cuántos viajan y cuántas noches. Después lo revisás y ajustás vos.
            </div>
          </div>
        ) : (
          <div style={{ padding:"16px 17px 18px" }}>
            {pasos.map((p, i) => (
              <div key={i} className="ia-paso" data-on={paso === i ? "1" : paso > i ? "2" : "0"}>
                <span className="ia-dot">
                  {paso > i ? <Check size={12} /> : paso === i ? <Loader2 size={12} className="spin" /> : <span style={{ width:5, height:5, borderRadius:99, background:"currentColor" }} />}
                </span>
                <span style={{ flex:1 }}>{p.l}</span>
              </div>
            ))}

            {/* mini-card del paquete encontrado */}
            {det?.paquete && paso >= 2 && (
              <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, padding:"9px 10px",
                borderRadius:13, background:"rgba(59,191,173,.06)", border:"1px solid rgba(59,191,173,.22)" }}>
                <Foto seed={det.paquete.seed} w={54} h={40} r={9} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{det.paquete.nombre}</div>
                  <div style={{ fontSize:11, color:"var(--n400)" }}>{det.paquete.resumen}</div>
                </div>
                <CheckCheck size={16} style={{ color:"var(--teal-2)", flexShrink:0 }} />
              </div>
            )}
            {det && !det.paquete && paso >= 2 && (
              <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:9, marginTop:8, padding:"9px 11px",
                borderRadius:12, background:"rgba(247,178,103,.13)", border:"1px solid rgba(247,178,103,.32)" }}>
                <AlertCircle size={14} style={{ color:"#8A5A16", flexShrink:0 }} />
                <span style={{ fontSize:11.5, color:"#8A5A16" }}>La armo en blanco con lo que entendí — vos la completás.</span>
              </div>
            )}

            {det?.chips?.length > 0 && (
              <div className="a-rise" style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:11 }}>
                {det.chips.map((c) => (
                  <span key={c} className="pill" style={{ background:"rgba(120,90,229,.1)", color:"#5B3FBF" }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── A2 · banner del editor: qué entendió la IA + la consulta original ── */
function BannerIA({ ia }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="a-rise" style={{ marginBottom:14, padding:"12px 14px", borderRadius:14,
      background:"linear-gradient(90deg,rgba(244,62,85,.06),rgba(120,90,229,.08))",
      border:"1px solid rgba(120,90,229,.24)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <ChipIA />
        <div style={{ fontSize:12.5, flex:"1 1 260px" }}>
          La IA armó este borrador leyendo tu consulta — revisá y ajustá.
          <span style={{ color:"var(--n400)" }}> Todo editable.</span>
        </div>
        <button className="btn btn-g btn-xs" onClick={() => setVer((v) => !v)}>
          {ver ? "Ocultar la consulta" : "Ver la consulta original"}
          <ChevronDown size={11} style={{ transform: ver ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
        </button>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:9 }}>
        {ia.paquete && (
          <span className="pill" style={{ background:"rgba(59,191,173,.14)", color:"#1F7D70" }}>
            <Zap size={8} /> Precargado desde {ia.paquete}
          </span>
        )}
        {(ia.chips || []).map((c) => (
          <span key={c} className="pill" style={{ background:"#fff", color:"var(--n600)", border:"1px solid var(--hair)" }}>
            <Check size={8} style={{ color:"var(--teal-2)" }} /> {c}
          </span>
        ))}
      </div>

      {!ia.paquete && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:9, fontSize:11.5, color:"#8A5A16" }}>
          <AlertCircle size={12} style={{ flexShrink:0 }} />
          No encontré un paquete que coincida — la armé en blanco con lo que entendí.
        </div>
      )}

      {ver && (
        <div className="a-slide" style={{ marginTop:10, padding:"11px 13px", borderRadius:12, background:"#fff",
          border:"1px solid var(--hair-soft)" }}>
          <div className="lbl" style={{ marginBottom:6 }}>Lo que escribió el pasajero</div>
          <div style={{ fontSize:12.5, lineHeight:1.65, color:"var(--n600)", whiteSpace:"pre-wrap" }}>{ia.consulta}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PANTALLA DE INICIO
   ═══════════════════════════════════════════════════════════════════════════ */

function Inicio({ onPaquete, onBlanco, onPlantilla, onIA, onFila, toast, tab, setTab, plantillas, onCrearPlantilla, onBorrarPlantilla, onDuplicarPlantilla, actual }) {
  const G = ["#F43E55","#785AE5"];
  const [busq, setBusq] = useState("");
  const [creando, setCreando] = useState(false);
  const [nomPl, setNomPl] = useState("");
  const [destPl, setDestPl] = useState("");
  /* v2 · caminos de entrada */
  const [modalNueva, setModalNueva] = useState(false);
  const [modalIA, setModalIA] = useState(false);
  const recientes = useMemo(() => (actual ? [actual, ...HISTORIAL] : HISTORIAL).slice(0, 5), [actual]);

  const resultados = useMemo(() => {
    const t = busq.trim().toLowerCase();
    if (!t) return PAQUETES.slice(0, 4);
    return PAQUETES.filter((p) =>
      p.nombre.toLowerCase().includes(t) ||
      p.destinos.some((d) => d.ciudad.toLowerCase().includes(t)) ||
      p.resumen.toLowerCase().includes(t)
    ).slice(0, 8);
  }, [busq]);
  const buscando = busq.trim().length > 0;

  const TABS = [
    { id:"cotizar",    l:"Cotizar y seguimiento", Icon:Ticket,      badge:148 },
    { id:"plantillas", l:"Plantillas",            Icon:Files,       badge:plantillas.length },
    { id:"analytics",  l:"Analytics",             Icon:TrendingUp,  badge:"71%" },
  ];

  return (
    <div style={{ maxWidth:1080, margin:"0 auto", padding:"28px 22px 60px" }}>

      {/* ── barra superior: identidad + acción primaria ── */}
      <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:13, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ width:40, height:40, borderRadius:13, background:`linear-gradient(87deg,${G[0]},${G[1]})`,
          display:"grid", placeItems:"center", color:"#fff", boxShadow:`0 10px 26px -8px ${G[1]}77` }}>
          <Ticket size={20} />
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:9 }}>
            <div className="disp" style={{ fontSize:24, fontWeight:600, letterSpacing:"-.025em", lineHeight:1.1 }}>Cotizador</div>
            <Wordmark size={15} />
          </div>
          <div style={{ fontSize:12, color:"var(--n400)" }}>Módulo del backend · mismo login, mismo sistema</div>
        </div>
        <button className="btn btn-hero" onClick={() => setModalNueva(true)}
          style={{ height:46, paddingInline:22, fontSize:14, borderRadius:13 }}>
          <Plus size={17} /> Nueva cotización
        </button>
      </div>

      {/* ── card única con tabs ── */}
      <div className="card a-rise" style={{ padding:0, overflow:"visible", animationDelay:".05s" }}>

        <div style={{ display:"flex", gap:2, padding:"10px 12px 0", borderBottom:"1px solid var(--hair-soft)" }}>
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"10px 16px 12px",
                  fontSize:13, fontWeight:700, color: on ? "var(--ink)" : "var(--n400)",
                  borderBottom: on ? "2.5px solid var(--violet)" : "2.5px solid transparent",
                  marginBottom:-1, transition:"color .18s, border-color .18s" }}>
                <t.Icon size={14} style={{ color: on ? "var(--violet)" : "var(--n300)" }} />
                {t.l}
                <span className="mono" style={{ fontSize:10, padding:"2px 7px", borderRadius:99,
                  background: on ? "rgba(120,90,229,.12)" : "rgba(17,17,36,.05)",
                  color: on ? "var(--violet)" : "var(--n400)" }}>{t.badge}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding:"18px 20px 20px" }}>

          {/* ══ TAB PAQUETES ══ */}
          {tab === "cotizar" && (
            <div className="a-fade">
              <div style={{ position:"relative", marginBottom:15 }}>
                <Search size={17} style={{ position:"absolute", left:15, top:"50%", transform:"translateY(-50%)",
                  color: buscando ? "var(--violet)" : "var(--n300)", transition:"color .2s" }} />
                <input className={`in ${buscando ? "a-glow" : ""}`} value={busq}
                  style={{ height:50, paddingLeft:44, paddingRight:110, fontSize:15, borderRadius:14, fontWeight:500 }}
                  placeholder={`Buscá entre los ${PAQUETES.length} paquetes publicados… Río, Cancún, Madrid`}
                  onChange={(e) => setBusq(e.target.value)} />
                {buscando ? (
                  <button onClick={() => setBusq("")} style={{ position:"absolute", right:12, top:"50%",
                    transform:"translateY(-50%)", display:"inline-flex", alignItems:"center", gap:5,
                    padding:"5px 11px", borderRadius:9, background:"rgba(17,17,36,.06)", fontSize:11.5,
                    fontWeight:600, color:"var(--n500)" }}><X size={11} /> Limpiar</button>
                ) : (
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                    fontSize:11, color:"var(--n300)", display:"inline-flex", gap:5, alignItems:"center" }}>
                    instantánea <Sparkles size={11} style={{ color:"var(--violet)" }} /></span>
                )}
              </div>

              {/* ── v2 · A2 · entrada por consulta de WhatsApp ── */}
              <button className="ia-bar a-rise" style={{ marginBottom:14, animationDelay:".06s" }}
                onClick={() => setModalIA(true)}>
                <ChipIA />
                <span className="ia-bar-t">¿Te escribieron por WhatsApp? Pegá la consulta y te armo el borrador</span>
                <span className="ia-bar-b">Pegar consulta <ChevronRight size={13} /></span>
              </button>

              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
                <span className="lbl">{buscando ? `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}` : "Últimos publicados"}</span>
                <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
                <span style={{ fontSize:11, color:"var(--n300)", display:"inline-flex", alignItems:"center", gap:5 }}>
                  <Zap size={10} style={{ color:"var(--teal-2)" }} /> precarga todo: destinos, servicios, opciones, fotos</span>
              </div>

              <div key={busq} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(226px,1fr))", gap:12 }}>
                {resultados.map((p, i) => {
                  const desde = p.opciones.length ? Math.min(...p.opciones.map((o) => venta(o.neto, o.factor))) : null;
                  return (
                  <button key={p.id} onClick={() => onPaquete(p)} className="a-pop"
                    style={{ padding:0, overflow:"hidden", textAlign:"left", animationDelay:`${i * .05}s`,
                      background:"#fff", border:"1px solid var(--hair-soft)", borderRadius:16,
                      boxShadow:"0 1px 2px rgba(26,26,46,.04)",
                      transition:"transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px) scale(1.008)";
                      e.currentTarget.style.boxShadow = "0 20px 44px -18px rgba(26,26,46,.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 2px rgba(26,26,46,.04)"; }}>
                    <Foto seed={p.seed} w="100%" h={96} r={0}>
                      <div style={{ position:"absolute", left:12, bottom:9, right:12, color:"#fff" }}>
                        <div style={{ fontSize:13.5, fontWeight:700, letterSpacing:"-.015em", textShadow:"0 1px 8px rgba(0,0,0,.45)" }}>{p.nombre}</div>
                      </div>
                      <div style={{ position:"absolute", right:9, top:9 }}>
                        <Pill style={{ background:"rgba(255,255,255,.93)", color:"var(--ink)" }}>{MESES[p.mes].slice(0,3)} {p.anio}</Pill>
                      </div>
                    </Foto>
                    <div style={{ padding:"10px 12px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginBottom:9 }}>
                        {p.destinos.map((d) => (
                          <span key={d.ciudad} className="pill" style={{ background:"rgba(120,90,229,.10)", color:"#5B3FBF" }}>
                            {d.ciudad} · {d.noches}n</span>
                        ))}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--teal-3)", display:"inline-flex",
                          alignItems:"center", gap:5 }}>Armar cotización <ChevronRight size={13} /></span>
                        {desde && <span className="mono" style={{ marginLeft:"auto", fontSize:10.5, color:"var(--n400)" }}>
                          desde {money(desde)}</span>}
                      </div>
                    </div>
                  </button>
                  );
                })}
                {buscando && resultados.length === 0 && (
                  <div className="a-fade" style={{ gridColumn:"1/-1", textAlign:"center", padding:"26px 0" }}>
                    <Search size={20} style={{ color:"var(--n300)", marginBottom:8 }} />
                    <div style={{ fontSize:13.5, fontWeight:600, color:"var(--n600)" }}>No hay paquetes para “{busq.trim()}”</div>
                    <div style={{ fontSize:12, color:"var(--n400)", margin:"4px 0 12px" }}>Se puede cotizar igual, arrancando de cero.</div>
                    <Btn variant="p" size="sm" onClick={onBlanco}><Plus size={12} /> Cotizar “{busq.trim()}” en blanco</Btn>
                  </div>
                )}
              </div>

              {/* ── seguimiento debajo, sin espacio muerto ── */}
              <div style={{ display:"flex", alignItems:"center", gap:9, margin:"22px 0 12px" }}>
                <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
                  background:"rgba(120,90,229,.11)", color:"var(--violet)" }}><ListChecks size={13} /></div>
                <span style={{ fontSize:13, fontWeight:800, letterSpacing:"-.01em" }}>Seguimiento de cotizaciones</span>
                <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
                <span style={{ fontSize:11, color:"var(--n300)" }}>búsqueda instantánea por cualquier campo</span>
              </div>
              <ListadoContenido actual={actual} toast={toast} onDuplicar={onFila} />
            </div>
          )}

          {/* ══ TAB ANALYTICS ══ */}
          {tab === "analytics" && <TabAnalytics />}

          {/* ══ TAB PLANTILLAS ══ */}
          {tab === "plantillas" && (
            <div className="a-fade">
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                <p style={{ fontSize:12.5, color:"var(--n400)", margin:0, flex:1 }}>
                  Lo repetitivo ya viene cargado. También podés guardar cualquier cotización como plantilla desde el editor.
                </p>
                <Btn variant="p" size="sm" onClick={() => setCreando((v) => !v)}>
                  {creando ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Nueva plantilla</>}
                </Btn>
              </div>

              {creando && (
                <div className="a-slide" style={{ display:"flex", gap:7, marginBottom:12, padding:"11px",
                  background:"rgba(120,90,229,.05)", border:"1px solid rgba(120,90,229,.16)", borderRadius:12 }}>
                  <input className="in" style={{ flex:"1.4 1 0" }} value={nomPl} placeholder="Nombre de la plantilla…" autoFocus
                    onChange={(e) => setNomPl(e.target.value)} />
                  <input className="in" style={{ flex:"1 1 0" }} value={destPl} placeholder="Destino…"
                    onChange={(e) => setDestPl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && nomPl.trim()) {
                      onCrearPlantilla(nomPl.trim(), destPl.trim() || "General"); setNomPl(""); setDestPl(""); setCreando(false); } }} />
                  <Btn variant="p" disabled={!nomPl.trim()}
                    onClick={() => { onCrearPlantilla(nomPl.trim(), destPl.trim() || "General"); setNomPl(""); setDestPl(""); setCreando(false); }}>
                    <Check size={14} /> Crear</Btn>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:9 }}>
                {plantillas.map((t, i) => (
                  <div key={t.id} className="a-pop" style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 12px",
                    borderRadius:13, border:"1px solid var(--hair-soft)", background:"#FCFCFE",
                    animationDelay:`${i * .04}s`, transition:"border-color .16s, box-shadow .16s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(120,90,229,.3)";
                      e.currentTarget.style.boxShadow = "0 8px 20px -10px rgba(26,26,46,.14)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ width:34, height:34, borderRadius:11, display:"grid", placeItems:"center", flexShrink:0,
                      background:"rgba(120,90,229,.1)", color:"var(--violet)" }}><Files size={15} /></div>
                    <button onClick={() => onPlantilla(t)} style={{ flex:1, minWidth:0, textAlign:"left" }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{t.nombre}</div>
                      <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {t.destino} · {t.detalle}</div>
                      <div style={{ display:"flex", gap:6, marginTop:5 }}>
                        <span className="pill" style={{ background:"rgba(59,191,173,.1)", color:"#1F7D70" }}>
                          <Zap size={8} /> usada {t.usos ?? 0} veces</span>
                        <span className="pill" style={{ background:"rgba(17,17,36,.05)", color:"var(--n400)" }}>{t.ultimo || "sin usar"}</span>
                      </div>
                    </button>
                    <Btn variant="p" size="xs" onClick={() => onPlantilla(t)}>Usar</Btn>
                    <button className="btn btn-g btn-ico" style={{ width:27, height:27, flexShrink:0 }} title="Duplicar plantilla"
                      onClick={() => onDuplicarPlantilla(t)}><Copy size={12} /></button>
                    <button className="btn btn-g btn-ico" style={{ width:27, height:27, flexShrink:0 }} title="Eliminar"
                      onClick={() => onBorrarPlantilla(t)}><Trash2 size={13} /></button>
                  </div>
                ))}
                {plantillas.length === 0 && (
                  <div style={{ gridColumn:"1/-1" }}>
                    <Vacio icon={Files} titulo="Sin plantillas todavía" accion="Creá la primera, o guardá una cotización como plantilla desde el editor" />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="a-rise" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:22,
        fontSize:11.5, color:"var(--n400)", animationDelay:".15s" }}>
        <Command size={12} /> <span className="kbd">⌘</span><span className="kbd">K</span> paleta de comandos
        <span style={{ opacity:.4 }}>·</span>
        <span className="kbd">⌘</span><span className="kbd">↵</span> compartir desde el editor
      </div>

      {/* ── v2 · A1 y A2 · de dónde sale una cotización nueva ── */}
      {modalNueva && (
        <ModalNueva
          plantillas={plantillas} recientes={recientes}
          onClose={() => setModalNueva(false)}
          onBlanco={() => { setModalNueva(false); onBlanco(); }}
          onPaquete={(p) => { setModalNueva(false); onPaquete(p); }}
          onPlantilla={(t) => { setModalNueva(false); onPlantilla(t); }}
          onFila={(r) => { setModalNueva(false); onFila(r); }}
          onIA={() => { setModalNueva(false); setModalIA(true); }} />
      )}
      {modalIA && (
        <ModalIA onClose={() => setModalIA(false)}
          onArmar={(det) => { setModalIA(false); onIA(det); }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LISTADO
   ═══════════════════════════════════════════════════════════════════════════ */

const ESTADOS = {
  borrador:   { l:"Borrador",   tone:"n",      Icon:PenLine },
  enviada:    { l:"Enviada",    tone:"violet", Icon:Send },
  abierta:    { l:"Abierta",    tone:"teal",   Icon:Eye },
  vencida:    { l:"Vencida",    tone:"coral",  Icon:Clock3 },
  confirmada: { l:"Confirmada", tone:"teal",   Icon:CheckCheck },
};
/* vencida automática: enviada, sin abrir, pasada la vigencia — salvo que el vendedor la haya pisado a mano */
function estadoEfectivo(r) {
  if (r.estadoManual) return r.estadoManual;
  if (r.estado === "enviada" && r.aperturas === 0 && r.hEnvio != null && r.hEnvio >= 48) return "vencida";
  return r.estado;
}

/* ── v2 · A3 · cola de trabajo del día ───────────────────────────────── */
function ColaParaHoy({ items, onReactivar, onRecordatorio, onSeguimiento, onAbrir }) {
  const [abierta, setAbierta] = useState(true);
  const hay = items.length > 0;
  return (
    <div style={{ marginBottom:15 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom: abierta ? 10 : 0 }}>
        <div style={{ width:24, height:24, borderRadius:8, display:"grid", placeItems:"center",
          background: hay ? "rgba(244,62,85,.1)" : "rgba(59,191,173,.13)",
          color: hay ? "var(--coral)" : "var(--teal-3)" }}><ListChecks size={13} /></div>
        <span style={{ fontSize:13, fontWeight:800, letterSpacing:"-.01em" }}>Para hoy</span>
        <Pill tone={hay ? "coral" : "teal"}>{items.length}</Pill>
        <div style={{ flex:1, height:1, background:"var(--hair-soft)" }} />
        <span style={{ fontSize:11, color:"var(--n300)" }}>lo que conviene mover antes de que se enfríe</span>
        <button className="btn btn-g btn-ico" style={{ width:27, height:27 }}
          title={abierta ? "Ocultar la lista" : "Mostrar la lista"} onClick={() => setAbierta((v) => !v)}>
          <ChevronDown size={14} style={{ transform: abierta ? "none" : "rotate(-90deg)", transition:"transform .2s" }} />
        </button>
      </div>

      {abierta && (hay ? (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {items.map((it, i) => (
            <div key={it.r.num} className="cola-i a-rise" style={{ animationDelay:`${i * .04}s` }}>
              <span className="sem-dot" style={{ background:it.c, flexShrink:0 }} />
              <button onClick={() => onAbrir(it.r)} title="Ver el detalle de esta cotización"
                style={{ flex:1, minWidth:0, textAlign:"left", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:12.5, fontWeight:700 }}>{it.r.cliente}</span>
                <span style={{ fontSize:11.5, color:"var(--n400)" }}>{it.r.destino}</span>
                <span className="pill" style={{ background:it.bg, color:it.fg }}>{it.motivo}</span>
              </button>

              {it.tipo === "vencida" && (
                <Btn size="xs" style={{ flexShrink:0, color:"var(--teal-3)", background:"rgba(59,191,173,.09)",
                  borderColor:"rgba(59,191,173,.4)", fontWeight:700 }}
                  onClick={() => onReactivar(it.r)}><RefreshCw size={11} /> Reactivar</Btn>
              )}
              {it.tipo === "recordatorio" && (
                <Btn size="xs" style={{ flexShrink:0 }} onClick={() => onRecordatorio(it.r)}>
                  <Send size={11} /> Mandar recordatorio</Btn>
              )}
              {it.tipo === "seguimiento" && (
                <Btn size="xs" style={{ flexShrink:0 }} onClick={() => onSeguimiento(it.r)}>
                  <Smartphone size={11} /> Hacer seguimiento</Btn>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="a-fade" style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 13px", borderRadius:13,
          background:"rgba(59,191,173,.07)", border:"1px solid rgba(59,191,173,.22)" }}>
          <CheckCheck size={16} style={{ color:"var(--teal-2)", flexShrink:0 }} />
          <span style={{ fontSize:12.5, fontWeight:700, color:"var(--teal-3)" }}>Nada urgente por hoy ✓</span>
          <span style={{ fontSize:11.5, color:"var(--n400)" }}>Todas las cotizaciones están al día.</span>
        </div>
      ))}
    </div>
  );
}

function ListadoContenido({ actual, toast, onDuplicar }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [vendedor, setVendedor] = useState("todos");
  const [selNum, setSelNum] = useState(null);  // fila abierta en el drawer
  const [ov, setOv] = useState({});            // confirmaciones hechas en esta sesión
  const [ovEst, setOvEst] = useState({});      // estados pisados a mano por el vendedor
  const [ovReact, setOvReact] = useState({});  // v2 · reactivadas: link nuevo por 48 h
  const [hechos, setHechos] = useState({});    // v2 · lo ya resuelto en la cola de hoy

  const base = useMemo(() => (actual ? [actual, ...HISTORIAL] : HISTORIAL)
    .map((r) => ov[r.num] ? { ...r, estado:"confirmada", confOpcion:ov[r.num].op, confVia:ov[r.num].via } : r)
    .map((r) => ovReact[r.num] ? { ...r, ...ovReact[r.num] } : r)
    .map((r) => ({ ...r, estadoManual: ovEst[r.num] || null, estado: estadoEfectivo({ ...r, estadoManual: ovEst[r.num] || null }) })),
    [actual, ov, ovEst, ovReact]);
  const sel = base.find((r) => r.num === selNum) || null;

  /* ── v2 · A5 · reactivar: link nuevo por 48 h, semáforo de vuelta en verde ── */
  const reactivar = useCallback((r) => {
    const antes = ovEst[r.num] || null;
    setOvReact((o) => ({ ...o, [r.num]:{ estado:"enviada", hEnvio:0, aperturas:0, apDet:[], hasta:null, lectura:null, hastaSec:null } }));
    setOvEst((o) => ({ ...o, [r.num]:null }));
    toast?.({ msg:"Reactivada con link nuevo por 48 h ✓", tone:"ok",
      undo:() => { setOvReact((o) => { const c = { ...o }; delete c[r.num]; return c; });
                   setOvEst((o) => ({ ...o, [r.num]:antes })); } });
  }, [ovEst, toast]);

  const marcarHecho = useCallback((r, motivo, msg) => {
    setHechos((h) => ({ ...h, [r.num]:motivo }));
    toast?.({ msg, tone:"ok",
      undo:() => setHechos((h) => { const c = { ...h }; delete c[r.num]; return c; }) });
  }, [toast]);

  const recordatorio = useCallback((r) => marcarHecho(r, "recordatorio", "Recordatorio listo en WhatsApp ✓"), [marcarHecho]);
  const seguimiento  = useCallback((r) => marcarHecho(r, "seguimiento", `Seguimiento anotado — llamá a ${String(r.cliente).split(" ")[0]} hoy ✓`), [marcarHecho]);
  const copiarLink   = useCallback(() => toast?.({ msg:"Link copiado ✓", tone:"ok" }), [toast]);
  const porWhatsapp  = useCallback((r) => toast?.({ msg:`Mensaje listo en WhatsApp para ${String(r.cliente).split(" ")[0]} ✓`, tone:"ok" }), [toast]);

  /* ── v2 · A3 · qué entra en la cola de hoy y por qué ── */
  const cola = useMemo(() => base.map((r) => {
    if (hechos[r.num]) return null;
    if (r.estado === "vencida") {
      const venc = r.hEnvio != null ? r.hEnvio - 48 : null;
      const motivo = venc == null ? "El link ya no está vigente"
        : venc < 24 ? "El link venció hoy"
        : venc < 48 ? "El link venció ayer"
        : `El link venció hace ${Math.round(venc / 24)} días`;
      return { r, tipo:"vencida", c:"#F43E55", bg:"rgba(244,62,85,.10)", fg:"#CC2030", motivo };
    }
    if (r.estado === "enviada" && r.aperturas === 0 && r.hEnvio != null && r.hEnvio >= 24) {
      const d = Math.max(1, Math.round(r.hEnvio / 24));
      return { r, tipo:"recordatorio", c:"#E8A13C", bg:"rgba(247,178,103,.20)", fg:"#8A5A16",
        motivo:`Hace ${d} ${d === 1 ? "día" : "días"} que no la abre` };
    }
    if (r.estado === "abierta" && r.aperturas > 0) {
      return { r, tipo:"seguimiento", c:"#2A9E8E", bg:"rgba(59,191,173,.13)", fg:"#1F7D70",
        motivo:`La abrió ${r.aperturas === 1 ? "una vez" : `${r.aperturas} veces`} — buen momento para llamar` };
    }
    return null;
  }).filter(Boolean), [base, hechos]);

  /* búsqueda instantánea por CUALQUIER campo */
  const filas = useMemo(() => {
    return base.filter((r) => {
      if (filtro !== "todas" && r.estado !== filtro) return false;
      if (vendedor !== "todos" && r.vendedor !== vendedor) return false;
      if (!q.trim()) return true;
      const V = VENDEDORES.find((v) => v.id === r.vendedor);
      const pajar = [r.num, r.cliente, r.destino, V?.nombre, ESTADOS[r.estado]?.l, String(r.monto), semaforo(r).l]
        .filter(Boolean).join(" ").toLowerCase();
      return q.toLowerCase().split(/\s+/).every((t) => pajar.includes(t));
    });
  }, [q, filtro, vendedor, base]);

  const porVendedor = useMemo(() => VENDEDORES.map((v) => {
    const r = base.filter((x) => x.vendedor === v.id);
    return { ...v, n:r.length, monto:r.reduce((a, x) => a + x.monto, 0),
      abiertas:r.filter((x) => x.aperturas > 0).length };
  }).filter((v) => v.n > 0), [base]);

  useEffect(() => {
    if (!sel) return;
    const k = (e) => e.key === "Escape" && setSelNum(null);
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [sel]);

  return (
    <div className="a-fade">

      {/* v2 · A3 · la cola del día, antes que cualquier número */}
      <ColaParaHoy items={cola} onReactivar={reactivar} onRecordatorio={recordatorio}
        onSeguimiento={seguimiento} onAbrir={(r) => setSelNum(r.num)} />

      {/* reportes por vendedor */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:10, marginBottom:14 }}>
        {porVendedor.map((v, i) => (
          <div key={v.id} className="card a-rise" style={{ padding:12, animationDelay:`${i * .04}s` }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(145deg,#A05ED3,#785AE5)",
                color:"#fff", display:"grid", placeItems:"center", fontSize:10.5, fontWeight:700 }}>{v.inicial}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.nombre}</div>
                <div style={{ fontSize:10.5, color:"var(--n400)" }}>{v.n} cotizaciones</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:7 }}>
              <span className="mono" style={{ fontSize:14.5, fontWeight:600 }}>{money(v.monto)}</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10.5, color:"var(--teal-3)" }}>
                <TrendingUp size={10} /> {v.abiertas} abiertas</span>
            </div>
          </div>
        ))}
      </div>

      {/* buscador total + filtros */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12, alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 240px" }}>
          <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
            color: q ? "var(--violet)" : "var(--n300)" }} />
          <input className={`in ${q ? "a-glow" : ""}`} style={{ paddingLeft:32 }} value={q}
            placeholder="Buscar por cualquier campo: cliente, destino, vendedor, número, estado, monto…"
            onChange={(e) => setQ(e.target.value)} />
        </div>
        {["todas", ...Object.keys(ESTADOS)].map((k) => (
          <button key={k} className={`chip ${filtro === k ? "chip-on" : ""}`} onClick={() => setFiltro(k)}>
            {k === "todas" ? "Todas" : ESTADOS[k].l}
          </button>
        ))}
        <select className="in" style={{ width:160 }} value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
          <option value="todos">Todos los vendedores</option>
          {VENDEDORES.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </div>

      {/* tabla — la fila entera abre el drawer */}
      <div className="card" style={{ overflow:"visible" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11, padding:"9px 14px",
          borderBottom:"1px solid var(--hair-soft)", background:"#FAFBFE", borderRadius:"16px 16px 0 0" }}>
          <span className="lbl" style={{ width:110, flexShrink:0 }}>Nº</span>
          <span className="lbl" style={{ flex:"1 1 150px" }}>Cliente y destino</span>
          <span className="lbl" style={{ width:110, flexShrink:0 }}>Vendedor</span>
          <span className="lbl" style={{ width:92, flexShrink:0, textAlign:"right" }}>Monto</span>
          <span className="lbl" style={{ width:128, flexShrink:0, textAlign:"right" }}>Estado</span>
          <span className="sem lbl" style={{ width:26, flexShrink:0, justifyContent:"center", cursor:"help" }}>
            Seg.
            <div className="tip"><b>Semáforo de seguimiento</b>
              Verde: abierta o confirmada. Teal: enviada hace menos de 24 h. Ámbar: +24 h sin abrir. Rojo: +48 h sin abrir — el link venció.</div>
          </span>
          <span className="lbl" style={{ width:52, flexShrink:0, textAlign:"right" }}>Creada</span>
          <span style={{ width:13, flexShrink:0 }} />
        </div>
        {filas.map((r, i) => {
          const E = ESTADOS[r.estado]; const V = VENDEDORES.find((v) => v.id === r.vendedor);
          const S = semaforo(r);
          return (
            <div key={r.num + q} role="button" tabIndex={0} onClick={() => setSelNum(r.num)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelNum(r.num); } }}
              className="a-rise fila-seg"
              style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 14px", width:"100%", textAlign:"left",
                borderBottom: i < filas.length - 1 ? "1px solid var(--hair-soft)" : "none",
                animationDelay:`${i * .03}s`, transition:"background .14s", borderRadius: i === 0 ? "16px 16px 0 0" : 0 }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(120,90,229,.035)"}
              onMouseLeave={(e) => e.currentTarget.style.background = ""}>
              <div className="mono" style={{ fontSize:11, color:"var(--n400)", width:110, flexShrink:0 }}>{r.num}</div>
              <div style={{ flex:"1 1 150px", minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.cliente}</div>
                <div style={{ fontSize:11.5, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.destino}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, width:110, flexShrink:0 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(120,90,229,.13)", color:"var(--violet)",
                  display:"grid", placeItems:"center", fontSize:9.5, fontWeight:700, flexShrink:0 }}>{V?.inicial}</div>
                <span style={{ fontSize:11.5, color:"var(--n500)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {V?.nombre.split(" ")[0]}</span>
              </div>
              <div style={{ width:92, flexShrink:0, textAlign:"right" }} className="mono">
                {r.monto ? money(r.monto) : <span style={{ color:"var(--n300)" }}>—</span>}
              </div>
              <div style={{ width:128, flexShrink:0, display:"flex", justifyContent:"flex-end" }}>
                <Pill tone={E.tone} style={{ flexShrink:0 }}><E.Icon size={9} /> {E.l}
                  {r.aperturas > 0 && <span className="mono" style={{ opacity:.7 }}>·{r.aperturas}</span>}
                </Pill>
              </div>
              {/* semáforo con tooltip */}
              <div className="sem" style={{ width:26, flexShrink:0, justifyContent:"center" }}
                onClick={(e) => e.stopPropagation()}>
                <span className="sem-dot" style={{ background:S.c }} />
                <div className="tip"><b style={{ color:S.c }}>{S.l}</b>{S.d}</div>
              </div>
              <div style={{ width:52, flexShrink:0, fontSize:11, color:"var(--n300)", textAlign:"right" }}>
                {r.dias === 0 ? "hoy" : `${r.dias}d`}
              </div>
              <ChevronRight size={13} style={{ color:"var(--n300)", flexShrink:0 }} />

              {/* v2 · A4 y A5 · lo más usado, sin abrir la cotización */}
              <div className="fila-acc" onClick={(e) => e.stopPropagation()}>
                {r.estado === "vencida" && (
                  <Btn size="xs" title="Generar un link nuevo y volver a dejarla vigente 48 h"
                    style={{ color:"var(--teal-3)", background:"rgba(59,191,173,.09)",
                      borderColor:"rgba(59,191,173,.4)", fontWeight:700 }}
                    onClick={(e) => { e.stopPropagation(); reactivar(r); }}>
                    <RefreshCw size={11} /> Reactivar
                  </Btn>
                )}
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Copiar link"
                  onClick={(e) => { e.stopPropagation(); copiarLink(r); }}><Link2 size={12} /></button>
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Mandar por WhatsApp"
                  onClick={(e) => { e.stopPropagation(); porWhatsapp(r); }}><Send size={12} /></button>
                <button className="btn btn-s btn-ico" style={{ width:27, height:27 }} title="Duplicar"
                  onClick={(e) => { e.stopPropagation(); onDuplicar?.(r); }}><Files size={12} /></button>
              </div>
            </div>
          );
        })}
        {!filas.length && <div style={{ padding:30, textAlign:"center", color:"var(--n400)", fontSize:13 }}>
          No hay cotizaciones con esos filtros.</div>}
      </div>
      <div style={{ fontSize:11, color:"var(--n400)", marginTop:9, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><Eye size={11} /> Clic en una fila para ver sus analytics</span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
          <span className="sem-dot" style={{ background:"#2A9E8E", width:8, height:8 }} /> abierta
          <span className="sem-dot" style={{ background:"#45D4C0", width:8, height:8, marginLeft:7 }} /> en ventana
          <span className="sem-dot" style={{ background:"#E8A13C", width:8, height:8, marginLeft:7 }} /> +24 h sin abrir
          <span className="sem-dot" style={{ background:"#F43E55", width:8, height:8, marginLeft:7 }} /> +48 h sin abrir
        </span>
      </div>

      {sel && <DrawerAnalytics r={sel} onClose={() => setSelNum(null)}
        onConfirmar={(num, op, via) => setOv((o) => ({ ...o, [num]:{ op, via } }))}
        onEstado={(num, est) => setOvEst((o) => ({ ...o, [num]: est }))} />}
    </div>
  );
}

/* ── Tab Analytics — métricas del flujo comercial ──────────────────────── */
function BarraH({ label, pct, right, color = "linear-gradient(90deg,#45D4C0,#2A9E8E)" }) {
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>
        <span className="mono" style={{ fontSize:11, color:"var(--n500)" }}>{right}</span>
      </div>
      <div style={{ height:7, borderRadius:99, background:"rgba(17,17,36,.06)", overflow:"hidden" }}>
        <div className="a-fade" style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:color, transition:"width .7s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
    </div>
  );
}

function TabAnalytics() {
  const KPIS = [
    { l:"Enviadas este mes", v:"126", d:"+18% vs julio", up:true },
    { l:"Tasa de apertura", v:"71%", d:"89 de 126 abiertas", up:true },
    { l:"Tasa de confirmación", v:"24%", d:"30 confirmadas", up:true },
    { l:"1ª apertura (mediana)", v:"3 h 40 m", d:"desde el envío", up:null },
    { l:"Armado promedio", v:"3 m 05 s", d:"por cotización", up:null },
  ];
  const FUNNEL = [
    { l:"Creadas", n:148, c:"#B0B4CD" }, { l:"Enviadas", n:126, c:"#785AE5" },
    { l:"Abiertas", n:89, c:"#45D4C0" }, { l:"Confirmadas", n:30, c:"#2A9E8E" },
  ];
  const VEND = [
    { n:"Agustina Vera", env:41, ap:78, conf:29, monto:71200 },
    { n:"Amparo Núñez", env:35, ap:74, conf:26, monto:58900 },
    { n:"Federico Vila", env:31, ap:68, conf:22, monto:49800 },
    { n:"Gerónimo Silva", env:19, ap:58, conf:16, monto:34400 },
  ];
  const HORAS = [2,3,4,6,9,11,10,8,7,9,12,16,22,26,31,24,14,6];  // 8..23 hs aprox
  const maxH = Math.max(...HORAS);
  const DEST = [
    { l:"Punta Cana", env:31, conf:9 }, { l:"Río de Janeiro", env:27, conf:8 },
    { l:"Madrid", env:19, conf:4 }, { l:"Florianópolis", env:16, conf:5 }, { l:"Cancún", env:12, conf:2 },
  ];
  return (
    <div className="a-fade">
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(168px,1fr))", gap:10, marginBottom:16 }}>
        {KPIS.map((k, i) => (
          <div key={k.l} className="card a-rise" style={{ padding:"12px 13px", animationDelay:`${i * .04}s` }}>
            <div className="lbl" style={{ marginBottom:5 }}>{k.l}</div>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-.025em", lineHeight:1.1 }}>{k.v}</div>
            <div style={{ fontSize:10.5, marginTop:3, color: k.up ? "var(--teal-3)" : "var(--n400)",
              display:"flex", alignItems:"center", gap:4 }}>
              {k.up && <TrendingUp size={10} />}{k.d}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12 }}>
        {/* embudo */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Embudo del mes</div>
          {FUNNEL.map((f) => (
            <BarraH key={f.l} label={f.l} right={`${f.n} · ${Math.round((f.n / FUNNEL[0].n) * 100)}%`}
              pct={(f.n / FUNNEL[0].n) * 100} color={f.c} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4, lineHeight:1.5 }}>
            De cada 5 cotizaciones enviadas, 3,5 se abren y 1,2 se confirma.
          </div>
        </div>

        {/* por vendedor */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Apertura por vendedor</div>
          {VEND.map((v) => (
            <BarraH key={v.n} label={v.n} right={`${v.ap}% · ${v.env} env · ${money(v.monto)}`}
              pct={v.ap} color={v.ap >= 70 ? "linear-gradient(90deg,#45D4C0,#2A9E8E)" : v.ap >= 60 ? "#E8A13C" : "#F43E55"} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4 }}>
            Ámbar por debajo de 70%: revisar el mensaje de envío con ese vendedor.
          </div>
        </div>

        {/* mejor hora */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Aperturas por hora de envío</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:74 }}>
            {HORAS.map((h, i) => {
              const pico = h >= 22;
              return (
                <div key={i} className="sem" style={{ flex:1, height:"100%", alignItems:"flex-end" }}>
                  <div style={{ width:"100%", height:`${(h / maxH) * 100}%`, borderRadius:"4px 4px 0 0",
                    background: pico ? "linear-gradient(180deg,#A05ED3,#785AE5)" : "rgba(17,17,36,.1)",
                    transition:"height .5s" }} />
                  <div className="tip"><b>{6 + i}:00 h</b>{h} aperturas atribuidas a envíos de esta hora.</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9.5, color:"var(--n300)", marginTop:4 }}>
            <span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span>
          </div>
          <div style={{ fontSize:11, color:"var(--violet)", marginTop:8, fontWeight:600, display:"flex", gap:5, alignItems:"center" }}>
            <Sparkles size={11} /> Los envíos de 19 a 21 h se abren el doble: agendar los pendientes para esa franja.
          </div>
        </div>

        {/* destinos */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Destinos: cotizado vs confirmado</div>
          {DEST.map((d) => (
            <BarraH key={d.l} label={d.l} right={`${d.env} cot · ${d.conf} conf (${Math.round((d.conf / d.env) * 100)}%)`}
              pct={(d.env / DEST[0].env) * 100}
              color={d.conf / d.env >= 0.28 ? "linear-gradient(90deg,#45D4C0,#2A9E8E)" : "linear-gradient(90deg,#A05ED3,#785AE5)"} />
          ))}
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4, lineHeight:1.5 }}>
            Madrid y Cancún cierran por debajo del promedio: revisar precios de las opciones o la vigencia del link.
          </div>
        </div>

        {/* canal y dispositivo */}
        <div className="card" style={{ padding:16 }}>
          <div className="lbl" style={{ marginBottom:10 }}>Cómo la reciben y la leen</div>
          <BarraH label="WhatsApp" right="82%" pct={82} color="linear-gradient(90deg,#45D4C0,#2A9E8E)" />
          <BarraH label="Email" right="18%" pct={18} color="rgba(17,17,36,.22)" />
          <div className="hairline" style={{ margin:"10px 0" }} />
          <BarraH label="iPhone" right="54%" pct={54} color="linear-gradient(90deg,#A05ED3,#785AE5)" />
          <BarraH label="Android" right="31%" pct={31} color="linear-gradient(90deg,#A05ED3,#785AE5)" />
          <BarraH label="Computadora" right="15%" pct={15} color="rgba(17,17,36,.22)" />
          <div style={{ fontSize:11, color:"var(--n400)", marginTop:4 }}>
            85% se lee en celular: la salida mobile-first no es opcional.
          </div>
        </div>

        {/* insights accionables */}
        <div className="card" style={{ padding:16, background:"linear-gradient(160deg,#fff,#FAF9FF)" }}>
          <div className="lbl" style={{ marginBottom:10 }}>Para accionar esta semana</div>
          {["7 cotizaciones en rojo (+48 h sin abrir): mandar recordatorio hoy — el drawer lo hace en dos clics.",
            "Gerónimo tiene 58% de apertura vs 74% del equipo: comparar el texto del mensaje de WhatsApp.",
            "Las que incluyen fotos de hotel se abren 1,4× más que las de texto libre: priorizar hoteles del catálogo."].map((t, i) => (
            <div key={i} style={{ display:"flex", gap:9, marginBottom:9, alignItems:"flex-start" }}>
              <span style={{ width:18, height:18, borderRadius:6, flexShrink:0, display:"grid", placeItems:"center",
                background:"rgba(120,90,229,.12)", color:"var(--violet)", fontSize:10, fontWeight:800 }}>{i + 1}</span>
              <span style={{ fontSize:12, lineHeight:1.55, color:"var(--n600)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Drawer de analytics de una cotización ─────────────────────────────── */
function DrawerAnalytics({ r, onClose, onConfirmar, onEstado }) {
  const V = VENDEDORES.find((v) => v.id === r.vendedor) || VENDEDORES[0];
  const S = semaforo(r);
  const E = ESTADOS[r.estado];
  const [copiado, setCopiado] = useState(false);
  const [comp, setComp] = useState(false);
  const [confOpen, setConfOpen] = useState(false);
  const [editEst, setEditEst] = useState(false);
  const [preview, setPreview] = useState(false);
  /* cotización de muestra para la vista previa del drawer */
  const qPrev = useMemo(() => {
    const dest = r.destino.split(",")[0];
    return { numero:r.num, estado:r.estado,
      cliente:{ nombre:r.cliente.split(" ")[0], apellido:"", email:"", telefono:"" },
      titulo:{ destino:dest, mes:9, anio:2026 }, fechaSalida:"2026-10-15",
      mensaje:"", mensajeHtml:"", pnrRaw:"", vuelos:[], destinos:[],
      servicios:[
        { id:"s1", categoria:"aereo", texto:"Aéreo ida y vuelta con valija en bodega 23kg", ciudad:null, modalidad:null },
        { id:"s2", categoria:"traslado", texto:"Traslado llegada y salida", ciudad:dest, modalidad:"Regular" },
        { id:"s3", categoria:"alojamiento", texto:"Alojamiento en base doble", ciudad:null, modalidad:null },
      ],
      notas:[], notasCliente:[], vigencia:48,
      opciones:[{ id:"o1", nombre:"Opción 1", hoteles:[{ hotelId:"h8", libre:"" }],
        habitacion:"Doble estándar", regimen:"All inclusive", neto:Math.round((r.monto || 1500) * 0.88), factor:0.88 }],
    };
  }, [r]);
  const [op, setOp] = useState("Opción 1");
  const [via, setVia] = useState("WhatsApp");
  const puedeConfirmar = r.estado === "enviada" || r.estado === "abierta";
  const apDet = r.apDet || [];
  const vigTotal = 48;
  const vigResta = r.hEnvio == null ? null : Math.max(0, vigTotal - r.hEnvio);
  const qLite = {
    numero:r.num, estado:r.estado,
    cliente:{ nombre:r.cliente.split(" ")[0], apellido:"", email:"pasajero@mail.com", telefono:"" },
    titulo:{ destino:r.destino.split(",")[0], mes:null, anio:"" },
    fechaSalida:"", mensaje:"", mensajeHtml:"", pnrRaw:"", vuelos:[], destinos:[],
    servicios:[], notas:[], notasCliente:[], opciones:[],
  };

  const eventos = [
    { c:"#B0B4CD", t:`Creada por ${V.nombre.split(" ")[0]}`, s:r.dias === 0 ? "hoy" : `hace ${r.dias} d` },
    ...(r.hEnvio != null ? [{ c:"#785AE5", t:"Enviada al pasajero", s:fmtHace(r.hEnvio) + " · WhatsApp" }] : []),
    ...apDet.map((a, i) => ({ c:"#2A9E8E", t: i === 0 ? "Primera apertura" : `Reabierta`, s:`${a.hace} · ${a.disp} · ${a.lugar}` })),
    ...(r.estado === "confirmada" ? [{ c:"#2A9E8E",
      t: r.confOpcion ? `Confirmada · ${r.confOpcion}` : "Confirmada desde el link",
      s: r.confVia ? `recién · vía ${r.confVia} · por ${V.nombre.split(" ")[0]}` : "hace 2 d" }] : []),
  ];

  const stat = (l, v) => (
    <div style={{ padding:"9px 11px", borderRadius:11, background:"#F5F6FA" }}>
      <div className="lbl" style={{ marginBottom:3 }}>{l}</div>
      <div style={{ fontSize:13, fontWeight:700 }}>{v ?? <span style={{ color:"var(--n300)", fontWeight:500 }}>—</span>}</div>
    </div>
  );

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer">
        {/* header */}
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)", position:"relative" }}>
          <span className="mono" style={{ fontSize:12, fontWeight:600 }}>{r.num}</span>
          <button onClick={() => setEditEst((v) => !v)} title="Cambiar estado a mano"
            style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
            <Pill tone={E.tone}><E.Icon size={9} /> {E.l}
              {r.estadoManual && <PenLine size={8} style={{ opacity:.7 }} />}
              <ChevronDown size={9} style={{ opacity:.6, transform: editEst ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
            </Pill>
          </button>
          {editEst && (
            <div className="a-slide" style={{ position:"absolute", top:"calc(100% - 6px)", left:100, zIndex:10,
              background:"#fff", border:"1px solid var(--hair)", borderRadius:12, padding:6, width:190,
              boxShadow:"0 18px 44px -14px rgba(17,17,36,.3)" }}>
              {Object.entries(ESTADOS).map(([k, e]) => (
                <button key={k} onClick={() => { onEstado?.(r.num, k); setEditEst(false); }}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 9px", borderRadius:8,
                    fontSize:12.5, fontWeight:600, background: r.estado === k ? "rgba(120,90,229,.08)" : "transparent" }}>
                  <e.Icon size={12} style={{ color:"var(--n400)" }} /> {e.l}
                  {r.estado === k && <Check size={12} style={{ marginLeft:"auto", color:"var(--teal-2)" }} />}
                </button>
              ))}
              <div style={{ fontSize:10, color:"var(--n400)", padding:"6px 9px 3px", lineHeight:1.45,
                borderTop:"1px solid var(--hair-soft)", marginTop:4 }}>
                El estado se calcula solo (la vigencia lo pasa a Vencida), pero acá lo pisás a mano para el seguimiento.
              </div>
            </div>
          )}
          <button className="btn btn-g btn-ico" style={{ marginLeft:"auto" }} onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 17px 20px" }}>
          {/* quién / qué / cuánto */}
          <div style={{ fontSize:16.5, fontWeight:700, letterSpacing:"-.015em" }}>{r.cliente}</div>
          <div style={{ fontSize:12.5, color:"var(--n400)", marginTop:2 }}>{r.destino}</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:8 }}>
            <span className="mono" style={{ fontSize:21, fontWeight:700, letterSpacing:"-.02em", color:"var(--teal-3)" }}>
              {r.monto ? money(r.monto) : "Sin precio"}</span>
            {r.monto > 0 && <span style={{ fontSize:10.5, color:"var(--n400)" }}>opción principal · por adulto</span>}
          </div>

          {/* semáforo explicado */}
          <div className="a-pop" style={{ display:"flex", gap:11, marginTop:14, padding:"12px 13px", borderRadius:13,
            background:`${S.c}12`, border:`1px solid ${S.c}44` }}>
            <span className="sem-dot" style={{ background:S.c, width:12, height:12, marginTop:2, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12.5, fontWeight:800, color:S.c }}>{S.l}</div>
              <div style={{ fontSize:11.5, color:"var(--n600)", lineHeight:1.55, marginTop:2 }}>{S.d}</div>
            </div>
          </div>

          {/* ficha */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Ficha</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ padding:"9px 11px", borderRadius:11, background:"#F5F6FA" }}>
              <div className="lbl" style={{ marginBottom:3 }}>Creada por</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:20, height:20, borderRadius:99, background:"linear-gradient(145deg,#A05ED3,#785AE5)",
                  color:"#fff", display:"grid", placeItems:"center", fontSize:8.5, fontWeight:700 }}>{V.inicial}</span>
                <span style={{ fontSize:12.5, fontWeight:700 }}>{V.nombre.split(" ")[0]}</span>
              </div>
            </div>
            <div style={{ padding:"9px 11px", borderRadius:11, background:"#F5F6FA" }}>
              <div className="lbl" style={{ marginBottom:3 }}>Canal de envío</div>
              <div style={{ fontSize:12.5, fontWeight:700 }}>{r.hEnvio != null ? "WhatsApp" : "—"}</div>
            </div>
          </div>
          {vigResta != null && (
            <div style={{ marginTop:8, padding:"10px 12px", borderRadius:11, background:"#F5F6FA" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span className="lbl">Vigencia del link</span>
                <span className="mono" style={{ fontSize:11, fontWeight:600,
                  color: vigResta === 0 ? "var(--coral)" : "var(--n600)" }}>
                  {vigResta === 0 ? "vencido" : `quedan ${vigResta} h de ${vigTotal}`}</span>
              </div>
              <div style={{ height:5, borderRadius:99, background:"rgba(17,17,36,.08)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(vigResta / vigTotal) * 100}%`, borderRadius:99,
                  background: vigResta === 0 ? "var(--coral)" : vigResta < 12 ? "#E8A13C" : "linear-gradient(90deg,#45D4C0,#2A9E8E)",
                  transition:"width .6s" }} />
              </div>
              {vigResta === 0 && <div style={{ fontSize:10.5, color:"var(--coral)", marginTop:5 }}>
                El recordatorio lo reactiva automáticamente por 48 h más.</div>}
            </div>
          )}

          {/* stats de lectura */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Lectura del pasajero</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {stat("Aperturas", r.aperturas > 0 ? `${r.aperturas}` : null)}
            {stat("Hasta la 1ª apertura", r.hasta)}
            {stat("Tiempo de lectura", r.lectura)}
            {stat("Llegó hasta", r.hastaSec)}
          </div>

          {/* timeline */}
          <div className="lbl" style={{ margin:"16px 0 8px" }}>Historia</div>
          <div>
            {eventos.map((ev, i) => (
              <div key={i} className="tl-row a-rise" style={{ animationDelay:`${i * .05}s` }}>
                <div className="tl-rail">
                  <span className="tl-dot" style={{ background:ev.c }} />
                  {i < eventos.length - 1 && <span className="tl-line" />}
                </div>
                <div style={{ paddingBottom: i < eventos.length - 1 ? 13 : 0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700 }}>{ev.t}</div>
                  <div className="mono" style={{ fontSize:10.5, color:"var(--n400)", marginTop:1 }}>{ev.s}</div>
                </div>
              </div>
            ))}
          </div>

          {r.estado === "confirmada" && (
            <div className="a-pop" style={{ marginTop:14, padding:"11px 13px", borderRadius:12,
              background:"rgba(120,90,229,.07)", border:"1px solid rgba(120,90,229,.22)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                <Sparkles size={13} style={{ color:"var(--violet)" }} />
                <span style={{ fontSize:12, fontWeight:800, color:"var(--violet)" }}>Siguiente paso — Confirmador (Fase 2)</span>
              </div>
              <div style={{ fontSize:11.5, color:"var(--n600)", lineHeight:1.55 }}>
                Acá arranca el flujo de confirmación: confirmación de reserva al pasajero y disparo a los
                departamentos que reservan vuelos, hoteles y traslados. Nace de esta cotización, con la opción elegida.
              </div>
            </div>
          )}
        </div>

        {/* acciones */}
        <div style={{ display:"flex", gap:8, padding:"13px 17px", borderTop:"1px solid var(--hair-soft)" }}>
          <button className="btn btn-s btn-ico" style={{ width:38, height:38 }} title="Vista previa de la cotización"
            onClick={() => setPreview(true)}><Eye size={15} /></button>
          <button className="btn btn-s btn-ico" style={{ width:38, height:38 }} title="Duplicar cotización — abre una copia lista para cambiar fechas"
            onClick={() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
            <Copy size={14} /></button>
          <Btn style={{ flex:1 }} onClick={() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
            {copiado ? <><Check size={13} /> Copiado</> : <><Link2 size={13} /> Copiar link</>}
          </Btn>
          <Btn variant="p" style={{ flex:1 }} onClick={() => setComp(true)}>
            <Send size={13} /> Recordatorio
          </Btn>
          {puedeConfirmar && (
            <button className="btn btn-hero" style={{ flex:1.1, height:38, borderRadius:11, fontSize:13 }}
              onClick={() => setConfOpen(true)}>
              <CheckCheck size={14} /> Confirmar
            </button>
          )}
        </div>

        {/* panel de confirmación */}
        {confOpen && (
          <div className="a-slide" style={{ position:"absolute", left:0, right:0, bottom:0, background:"#fff",
            borderTop:"1px solid var(--hair)", borderRadius:"18px 18px 0 0", padding:"16px 17px 18px",
            boxShadow:"0 -20px 50px -18px rgba(17,17,36,.3)", zIndex:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div className="disp" style={{ fontSize:16, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>Confirmar cotización</div>
              <button className="btn btn-g btn-ico" onClick={() => setConfOpen(false)}><X size={14} /></button>
            </div>
            <div className="lbl" style={{ marginBottom:7 }}>¿Qué opción eligió el pasajero?</div>
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {["Opción 1","Opción 2","Opción 3"].map((o) => (
                <button key={o} className={`chip ${op === o ? "chip-on" : ""}`} onClick={() => setOp(o)}>{o}</button>
              ))}
            </div>
            <div className="lbl" style={{ marginBottom:7 }}>¿Cómo confirmó?</div>
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {["WhatsApp","Desde el link","Llamada"].map((v) => (
                <button key={v} className={`chip ${via === v ? "chip-on" : ""}`} onClick={() => setVia(v)}>{v}</button>
              ))}
            </div>
            <button className="btn btn-hero" style={{ width:"100%", height:44, borderRadius:12, fontSize:14 }}
              onClick={() => { onConfirmar?.(r.num, op, via); setConfOpen(false); }}>
              <CheckCheck size={16} /> Confirmar {op}
            </button>
            <div style={{ fontSize:10.5, color:"var(--n400)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
              La cotización pasa a Confirmada y queda lista para el flujo del Confirmador (Fase 2).
            </div>
          </div>
        )}
      </div>
      {comp && <ModalCompartir q={qLite} marca="traveloz" recordatorio
        onClose={() => setComp(false)} onEnviada={() => {}} />}
      {preview && (
        <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && setPreview(false)}>
          <div className="a-zoom" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            <div className="phone">
              <div className="phone-scr">
                <div className="notch" />
                <SalidaPasajero q={qPrev} marca="traveloz" vendedor={r.vendedor} tramos={[
                  { id:"t1", ciudad:qPrev.titulo.destino, noches:7, checkin:"2026-10-15", checkout:"2026-10-22", manual:false },
                ]} />
              </div>
            </div>
            <Btn onClick={() => setPreview(false)}><X size={14} /> Cerrar vista previa</Btn>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARTIR
   ═══════════════════════════════════════════════════════════════════════════ */

function ModalCompartir({ q, marca, onClose, onEnviada, toast, recordatorio = false, onVigencia }) {
  const [tab, setTab] = useState("whatsapp");
  const [extras, setExtras] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [vig, setVig] = useState(q.vigencia ?? 48);
  const avisos = useMemo(() => {
    const a = [];
    if (!q.cliente.nombre) a.push("Sin nombre de cliente — el saludo sale genérico");
    if (!q.fechaSalida) a.push("Sin fecha de salida");
    if (!q.opciones.length) a.push("Sin opciones hoteleras");
    q.opciones.forEach((o, i) => { if (!Number(o.neto)) a.push(`${o.nombre || `Opción ${i + 1}`} sin precio`); });
    if (!q.vuelos.length) a.push("Sin itinerario de vuelos");
    return a;
  }, [q]);
  const link = `traveloz.com.uy/c/${q.numero.toLowerCase()}`;

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const copiar = () => { setCopiado(true); toast?.({ msg:"Link copiado al portapapeles", tone:"ok" }); setTimeout(() => setCopiado(false), 2200); };
  const enviar = () => { setEnviando(true); setTimeout(() => { setEnviando(false); onEnviada();
    toast?.({ msg: recordatorio ? "Recordatorio enviado al pasajero." : "Cotización enviada. Te avisamos cuando la abran.", tone:"ok" }); onClose(); }, 900); };

  const TABS = [["whatsapp","WhatsApp",Smartphone],["email","Email",Mail],["pdf","PDF",Printer]];

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(520px,100%)", padding:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 17px", borderBottom:"1px solid var(--hair-soft)" }}>
          <div className="disp" style={{ fontSize:17, fontWeight:600, letterSpacing:"-.02em", flex:1 }}>{recordatorio ? "Enviar recordatorio" : "Compartir cotización"}</div>
          <span className="mono" style={{ fontSize:11, color:"var(--n400)" }}>{q.numero}</span>
          <button className="btn btn-g btn-ico" onClick={onClose}><X size={15} /></button>
        </div>

        {!recordatorio && avisos.length > 0 && (
          <div className="a-slide" style={{ margin:"11px 17px 0", padding:"10px 12px", borderRadius:12,
            background:"rgba(247,178,103,.12)", border:"1px solid rgba(247,178,103,.32)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <AlertCircle size={13} style={{ color:"#8A5A16" }} />
              <span style={{ fontSize:12, fontWeight:700, color:"#8A5A16" }}>
                Antes de enviar — {avisos.length} {avisos.length === 1 ? "detalle" : "detalles"} (no bloquea)</span>
            </div>
            {avisos.slice(0, 4).map((a) => (
              <div key={a} style={{ fontSize:11.5, color:"#8A5A16", paddingLeft:20, lineHeight:1.6 }}>· {a}</div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:8, margin:"11px 17px 0", flexWrap:"wrap" }}>
          <span className="lbl">Vigencia del link</span>
          <div className="seg">
            {[24, 48, 72].map((h) => (
              <button key={h} data-on={vig === h ? "1" : "0"}
                onClick={() => { setVig(h); onVigencia?.(h); }}>{h}h</button>
            ))}
          </div>
          <span style={{ fontSize:10.5, color:"var(--n400)" }}>después se muestra como vencida y se puede reactivar</span>
        </div>

        <div style={{ display:"flex", gap:5, padding:"11px 17px 0" }}>
          {TABS.map(([k, l, I]) => (
            <button key={k} className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>
              <I size={12} /> {l}
            </button>
          ))}
        </div>

        <div style={{ padding:"15px 17px 17px" }}>
          {tab === "whatsapp" && (
            <>
              <Label hint="es el canal principal">Link para el pasajero</Label>
              <div style={{ display:"flex", gap:8 }}>
                <div className="in mono" style={{ flex:1, display:"flex", alignItems:"center", color:"var(--n600)", overflow:"hidden" }}>{link}</div>
                <Btn variant={copiado ? "p" : "s"} onClick={copiar} style={{ flexShrink:0 }}>
                  {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </Btn>
              </div>
              <div style={{ marginTop:13, padding:"12px 13px", borderRadius:12, background:"#E6F8F5",
                border:"1px solid rgba(59,191,173,.28)" }}>
                <div style={{ fontSize:12, lineHeight:1.6, color:"#165C53" }}>
                  {recordatorio
                    ? <>Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""} 👋 ¿pudiste ver la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>? Te la dejo de nuevo por acá 👇<br />{link}</>
                    : <>Hola{q.cliente.nombre ? ` ${q.cliente.nombre}` : ""}, te comparto la cotización de{" "}
                        <strong>{q.titulo.destino || "tu viaje"}</strong>. Se abre desde el celular 👇<br />{link}</>}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                <Eye size={12} style={{ color:"var(--teal-2)" }} />
                Registramos si el pasajero la abre. Si no la abrió a las 48 horas, te avisamos.
              </div>
              <Btn variant="p" onClick={enviar} style={{ width:"100%", marginTop:14, height:42 }} disabled={enviando}>
                {enviando ? <Loader2 size={15} className="spin" /> : <Link2 size={15} />} {recordatorio ? "Enviar recordatorio" : "Marcar como enviada"}
              </Btn>
            </>
          )}

          {tab === "email" && (
            <>
              <Label>Para</Label>
              <div className="in" style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                <Mail size={13} style={{ color:"var(--n300)" }} />
                <span style={{ fontSize:13 }}>{q.cliente.email || <span style={{ color:"var(--n300)" }}>Sin email cargado</span>}</span>
              </div>
              <Label>Copia</Label>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
                <span className="chip chip-on" style={{ gap:6 }}>
                  <Lock size={10} /> cotizaciones@traveloz.com.uy
                </span>
                <span style={{ fontSize:11, color:"var(--n400)" }}>fija, siempre</span>
              </div>
              <Label hint="separados por coma">Otros destinatarios</Label>
              <input className="in" value={extras} placeholder="supervisor@…, operaciones@…"
                onChange={(e) => setExtras(e.target.value)} />
              <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:11, fontSize:11.5, color:"var(--n400)" }}>
                <Download size={12} style={{ color:"var(--teal-2)" }} /> El PDF va adjunto automáticamente.
              </div>
              <Btn variant="p" onClick={enviar} style={{ width:"100%", marginTop:14, height:42 }} disabled={enviando}>
                {enviando ? <Loader2 size={15} className="spin" /> : <Send size={15} />} Enviar cotización
              </Btn>
            </>
          )}

          {tab === "pdf" && (
            <>
              <div style={{ display:"flex", gap:12, alignItems:"center", padding:"13px", borderRadius:12,
                border:"1px solid var(--hair-soft)", background:"#FCFCFE", marginBottom:12 }}>
                <div style={{ width:44, height:56, borderRadius:7, background:"#fff", border:"1px solid var(--hair)",
                  display:"grid", placeItems:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(26,26,46,.07)" }}>
                  <FileText size={19} style={{ color:"var(--coral)" }} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{q.numero}.pdf</div>
                  <div style={{ fontSize:11.5, color:"var(--n400)" }}>
                    {q.opciones.length} opciones · {q.vuelos.length} tramos · saltos de página controlados
                  </div>
                </div>
              </div>
              <div style={{ fontSize:11.5, color:"var(--n400)", lineHeight:1.6, marginBottom:14 }}>
                Sale bien de una: sin Ctrl+P, sin ajustar márgenes, sin tablas cortadas al medio
                y sin la firma huérfana en la última hoja.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="p" style={{ flex:1, height:42 }} onClick={() => toast({ msg:"PDF generado", tone:"ok" })}>
                  <Download size={15} /> Descargar
                </Btn>
                <Btn style={{ flex:1, height:42 }} onClick={() => toast({ msg:"Enviado a la impresora", tone:"ok" })}>
                  <Printer size={15} /> Imprimir
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PALETA DE COMANDOS  ⌘K
   ═══════════════════════════════════════════════════════════════════════════ */

function Paleta({ acciones, onClose }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const res = useMemo(() => {
    if (!q.trim()) return acciones;
    const s = q.toLowerCase();
    return acciones.filter((a) => a.label.toLowerCase().includes(s) || (a.grupo || "").toLowerCase().includes(s));
  }, [q, acciones]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => clamp(x + 1, 0, res.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => clamp(x - 1, 0, res.length - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); res[i]?.run(); onClose(); }
    };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [res, i, onClose]);

  return (
    <div className="ov" style={{ alignItems:"flex-start", paddingTop:"12vh" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-zoom card" style={{ width:"min(520px,100%)", padding:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 15px", borderBottom:"1px solid var(--hair-soft)" }}>
          <Command size={16} style={{ color:"var(--violet)" }} />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
            placeholder="Buscar acción o bloque…"
            style={{ flex:1, border:"none", background:"transparent", fontSize:15, outline:"none" }} />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight:330, overflowY:"auto", padding:6 }}>
          {res.map((a, k) => (
            <button key={a.label} onMouseEnter={() => setI(k)} onClick={() => { a.run(); onClose(); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 10px", borderRadius:10,
                textAlign:"left", background: i === k ? "rgba(120,90,229,.09)" : "transparent" }}>
              <a.Icon size={14} style={{ color: i === k ? "var(--violet)" : "var(--n400)", flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:500, flex:1 }}>{a.label}</span>
              {a.grupo && <span className="lbl">{a.grupo}</span>}
            </button>
          ))}
          {!res.length && <div style={{ padding:26, textAlign:"center", fontSize:13, color:"var(--n400)" }}>Sin resultados</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE RAÍZ
   ═══════════════════════════════════════════════════════════════════════════ */

let CORRELATIVO = 148;
function cotizacionVacia() {
  return {
    numero: `COT-2026-${String(CORRELATIVO++).padStart(4, "0")}`,
    estado: "borrador",
    origen: null,
    ia: null,                 /* v2 · lo que la IA leyó de la consulta de WhatsApp */
    cliente: { nombre:"", apellido:"", email:"", telefono:"" },
    titulo: { destino:"", mes:null, anio:ANIO_BASE },
    fechaSalida: "",
    mensaje: "",
    mensajeHtml: "",
    pnrRaw: "",
    vuelos: [],
    destinos: [],
    servicios: [],
    notas: [],
    notasCliente: [],
    vigencia: 48,
    opciones: [],
  };
}

function desdePaquete(p) {
  const q = cotizacionVacia();
  q.origen = p.nombre;
  q.titulo = { destino:p.destinos[0].ciudad, mes:p.mes, anio:p.anio };
  const hoy = new Date(); const salida = new Date(p.anio, p.mes, 15);
  q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
  q.destinos = p.destinos.map((d) => ({ id:uid("dst"), ciudad:d.ciudad, noches:d.noches, checkinManual:null }));
  q.servicios = p.servicios.map((s) => ({ id:uid("srv"), categoria:s.cat, texto:s.texto,
    ciudad:s.ciudad ?? null, modalidad:s.modalidad ?? null }));
  q.opciones = p.opciones.map((o) => ({ id:uid("op"), nombre:o.nombre,
    hoteles:o.hoteles.map((h) => ({ hotelId:h, libre:"" })),
    habitacion:o.habitacion, regimen:o.regimen, neto:o.neto, factor:o.factor }));
  q.notas = [
    { id:uid("nt"), concepto:"Neto aéreo por pasajero", neto:Math.round(o0(p) * 0.42) },
    { id:uid("nt"), concepto:"Traslados", neto:64 },
    { id:uid("nt"), concepto:"Asistencia al viajero", neto:38 },
  ];
  q.notasCliente = [
    { id:uid("nc"), texto:"Pasaporte con vigencia mínima de 6 meses al momento del viaje." },
  ];
  return q;
}
function o0(p) { return p.opciones[0]?.neto || 900; }

function desdePlantilla(t) {
  const q = cotizacionVacia();
  q.origen = `Plantilla · ${t.nombre}`;
  q.titulo = { destino:t.destino, mes:null, anio:ANIO_BASE };
  q.destinos = [{ id:uid("dst"), ciudad:t.destino, noches:7, checkinManual:null }];
  const cat = t.destino === "Madrid" ? "Privado" : "Regular";
  q.servicios = [
    { id:uid("srv"), categoria:"aereo", texto:"Aéreo ida y vuelta con valija en bodega 23kg", ciudad:null, modalidad:null },
    { id:uid("srv"), categoria:"traslado", texto:"Traslado llegada y salida", ciudad:t.destino, modalidad:cat },
    { id:uid("srv"), categoria:"alojamiento", texto:"Alojamiento en base doble", ciudad:null, modalidad:null },
    { id:uid("srv"), categoria:"seguro", texto:"Asistencia al viajero cobertura premium", ciudad:null, modalidad:null },
  ];
  return q;
}

/* ── v2 · duplicar una fila del seguimiento (cliente y destino precargados) ── */
function desdeFila(r) {
  const q = cotizacionVacia();
  q.origen = `Duplicada de ${r.num}`;
  const [dest = "", resto = ""] = String(r.destino || "").split(",").map((x) => x.trim());
  const mes = MESES.findIndex((m) => norm(resto).startsWith(norm(m)));
  const anio = (resto.match(/(20\d{2})/) || [])[1];
  q.titulo = { destino:dest, mes: mes >= 0 ? mes : null, anio: anio ? Number(anio) : ANIO_BASE };
  const cli = String(r.cliente || "").trim();
  if (/^(familia|flia)\b/i.test(cli)) q.cliente.nombre = cli;
  else { const p = cli.split(/\s+/); q.cliente.nombre = p[0] || ""; q.cliente.apellido = p.slice(1).join(" "); }
  if (dest) q.destinos = [{ id:uid("dst"), ciudad:dest, noches:7, checkinManual:null }];
  if (q.titulo.mes != null) {
    const hoy = new Date(); const salida = new Date(q.titulo.anio, q.titulo.mes, 15);
    q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
  }
  return q;
}

/* ── v2 · borrador armado a partir de una consulta de WhatsApp ─────────── */
function desdeIA(det) {
  const q = det.paquete ? desdePaquete(det.paquete) : cotizacionVacia();
  if (det.mes != null) {
    q.titulo.mes = det.mes;
    q.titulo.anio = det.anio;
    const hoy = new Date(); const salida = new Date(det.anio, det.mes, 15);
    q.fechaSalida = toISO(salida > hoy ? salida : new Date(hoy.getFullYear(), hoy.getMonth() + 2, 15));
  }
  if (!det.paquete && det.destino) {
    q.titulo.destino = det.destino;
    q.destinos = [{ id:uid("dst"), ciudad:det.destino, noches: det.noches || 7, checkinManual:null }];
  }
  if (det.cliente) q.cliente.nombre = det.cliente;
  q.ia = { consulta:det.texto, chips:det.chips, paquete: det.paquete ? det.paquete.nombre : null };
  return q;
}

export default function Cotizador() {
  const [pantalla, setPantalla] = useState("inicio");     // inicio | editor | listado
  const marca = "traveloz";
  const [vendedor, setVendedor] = useState("v1");
  const [q, setQ] = useState(cotizacionVacia);
  const [guardado, setGuardado] = useState("ok");          // ok | guardando
  const [toasts, setToasts] = useState([]);
  const [paleta, setPaleta] = useState(false);
  const [compartir, setCompartir] = useState(false);
  const [prev, setPrev] = useState(null);                  // overlay de vista previa: null | "cel" | "tab" | "desk" 
  const [plantillas, setPlantillas] = useState(PLANTILLAS);
  const [homeTab, setHomeTab] = useState("cotizar");
  const pantallaRef = useRef("inicio");
  const [crono, setCrono] = useState(0);
  const [activo, setActivo] = useState("b-cliente");
  const primerCampo = useRef(null);
  const scroller = useRef(null);
  const timerRef = useRef(null);
  const phoneScroll = useRef(null);

  /* mutación inmutable simple */
  const set = useCallback((fn) => {
    setQ((prev) => { const d = JSON.parse(JSON.stringify(prev)); fn(d); return d; });
    setGuardado("guardando");
  }, []);

  /* autosave simulado */
  useEffect(() => {
    if (guardado !== "guardando") return;
    const t = setTimeout(() => setGuardado("ok"), 620);
    return () => clearTimeout(t);
  }, [guardado, q]);

  /* cronómetro */
  useEffect(() => {
    if (pantalla !== "editor") return;
    timerRef.current = setInterval(() => setCrono((c) => c + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [pantalla]);

  /* atajos globales */
  useEffect(() => { pantallaRef.current = pantalla; }, [pantalla]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaleta((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && pantallaRef.current === "editor") {
        e.preventDefault(); setCompartir(true); }
    };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);

  const toast = useCallback((t) => {
    const id = uid("ts");
    setToasts((l) => [...l, { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), t.undo ? 5200 : 2800);
  }, []);

  /* ── propagación de fechas ─────────────────────────────────────────── */
  const tramos = useMemo(() => {
    let acum = 0;
    return q.destinos.map((d) => {
      const auto = q.fechaSalida ? addDays(q.fechaSalida, acum) : "";
      const checkin = d.checkinManual || auto;
      const out = { id:d.id, ciudad:d.ciudad, noches:d.noches,
        checkin, checkout: checkin ? addDays(checkin, d.noches) : "",
        manual: !!d.checkinManual && d.checkinManual !== auto };
      acum += d.noches; return out;
    });
  }, [q.destinos, q.fechaSalida]);

  const hayManual = tramos.some((t) => t.manual);
  const repropagar = () => { set((d) => { d.destinos.forEach((x) => { x.checkinManual = null; }); });
    toast({ msg:"Fechas actualizadas desde la salida", tone:"ok" }); };

  /* ── progreso por bloque ───────────────────────────────────────────── */
  const bloques = [
    { id:"b-cliente",    l:"Cliente",     Icon:User,        ok: !!(q.cliente.nombre || q.cliente.email) },
    { id:"b-encabezado", l:"Encabezado",  Icon:FileText,    ok: !!(q.titulo.destino && q.titulo.mes != null && q.fechaSalida) },
    { id:"b-alojamiento", l:"Alojamiento", Icon:Building2,  ok: q.destinos.length > 0 && q.opciones.length > 0 },
    { id:"b-mensaje",    l:"Mensaje",     Icon:MessageSquare, ok: !!q.mensaje },
    { id:"b-vuelos",     l:"Vuelos",      Icon:Plane,       ok: q.vuelos.length > 0 },
    { id:"b-servicios",  l:"Servicios",   Icon:LayoutGrid,  ok: q.servicios.length > 0 },
    { id:"b-notas",      l:"Notas internas", Icon:Lock,     ok: q.notas.length > 0 },
    { id:"b-notascliente", l:"Notas pasajero", Icon:StickyNote, ok: q.notasCliente.length > 0 },
  ];
  const listos = bloques.filter((b) => b.ok).length;

  const irA = (id) => {
    setActivo(id);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  /* observer para el rail */
  useEffect(() => {
    if (pantalla !== "editor") return;
    const obs = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActivo(vis[0].target.id);
    }, { rootMargin:"-70px 0px -55% 0px", threshold:0 });
    bloques.forEach((b) => { const el = document.getElementById(b.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [pantalla, q.destinos.length]);

  const abrir = (nueva) => {
    setQ(nueva); setCrono(0); setPantalla("editor"); setActivo("b-cliente");
    requestAnimationFrame(() => window.scrollTo({ top:0, behavior:"instant" }));
  };

  const acciones = [
    ...bloques.map((b) => ({ label:`Ir a ${b.l}`, grupo:"bloque", Icon:b.Icon, run:() => irA(b.id) })),
    { label:"Nueva opción hotelera", grupo:"acción", Icon:Plus, run:() => { set((d) => { d.opciones.push({ id:uid("op"),
        nombre:`Opción ${d.opciones.length + 1}`, hoteles:d.destinos.map(() => ({ hotelId:null, libre:"" })),
        habitacion:"Doble estándar", regimen:"Desayuno", neto:0, factor:0.88 }); }); irA("b-alojamiento"); } },
    { label:"Compartir cotización", grupo:"acción", Icon:Send, run:() => setCompartir(true) },
    { label:"Duplicar esta cotización", grupo:"acción", Icon:Copy, run:() => {
        const c = JSON.parse(JSON.stringify(q)); c.numero = `COT-2026-${String(CORRELATIVO++).padStart(4,"0")}`;
        c.estado = "borrador"; abrir(c); toast({ msg:"Cotización duplicada — cambiá las fechas y listo", tone:"ok" }); } },
    { label:"Ver cotizaciones", grupo:"ir", Icon:ListChecks, run:() => { setHomeTab("cotizar"); setPantalla("inicio"); } },
    { label:"Volver al inicio", grupo:"ir", Icon:ArrowLeft, run:() => setPantalla("inicio") },
  ];

  const actualEnListado = (q.titulo.destino || q.cliente.nombre || q.opciones.length) ? {
    num:q.numero, cliente:[q.cliente.nombre, q.cliente.apellido].filter(Boolean).join(" ") || "Sin cliente",
    destino:`${q.titulo.destino || "Sin destino"}${q.titulo.mes != null ? `, ${MESES[q.titulo.mes]} ${q.titulo.anio}` : ""}`,
    vendedor, estado:q.estado, monto: q.opciones.length ? Math.round(venta(q.opciones[0].neto, q.opciones[0].factor)) : 0,
    dias:0, aperturas: q.estado === "abierta" ? 1 : 0,
  } : null;

  const G = ["#F43E55","#785AE5"];
  const mm = String(Math.floor(crono / 60)); const ss = String(crono % 60).padStart(2, "0");
  const meta = q.origen ? 60 : 240;

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <div className="ctz" data-brand={marca} style={{ minHeight:"100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {pantalla === "inicio" && (
        <Inicio
          onPaquete={(p) => abrir(desdePaquete(p))}
          onBlanco={() => abrir(cotizacionVacia())}
          onPlantilla={(t) => abrir(desdePlantilla(t))}
          onIA={(det) => {
            abrir(desdeIA(det));
            toast({ msg: det.paquete
              ? `Borrador armado desde “${det.paquete.nombre}” — revisalo y ajustá`
              : "No encontré un paquete que coincida — la armé en blanco con lo que entendí", tone: det.paquete ? "ok" : "warn" });
          }}
          onFila={(r) => {
            abrir(desdeFila(r));
            toast({ msg:`Duplicada desde ${r.num} — cambiá las fechas y listo`, tone:"ok" });
          }}
          toast={toast}
          tab={homeTab} setTab={setHomeTab}
          actual={actualEnListado}
          plantillas={plantillas}
          onCrearPlantilla={(nombre, destino) => {
            setPlantillas((l) => [...l, { id:uid("pl"), nombre, destino, detalle:"Creada a mano — sin servicios aún", usos:0, ultimo:"recién creada" }]);
            toast({ msg:`Plantilla “${nombre}” creada`, tone:"ok" });
          }}
          onDuplicarPlantilla={(t) => {
            setPlantillas((l) => [...l, { ...t, id:uid("pl"), nombre:t.nombre + " (copia)", usos:0, ultimo:"recién creada" }]);
            toast({ msg:`Plantilla duplicada`, tone:"ok" });
          }}
          onBorrarPlantilla={(t) => {
            setPlantillas((l) => l.filter((x) => x.id !== t.id));
            toast({ msg:`Plantilla “${t.nombre}” eliminada`, tone:"warn",
              undo:() => setPlantillas((l) => [...l, t]) });
          }} />
      )}

      {pantalla === "editor" && (
        <>
          {/* ── barra superior ────────────────────────────────────────── */}
          <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(245,246,250,.86)",
            backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", borderBottom:"1px solid var(--hair-soft)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 18px", maxWidth:1460, margin:"0 auto" }}>
              <button className="btn btn-g btn-ico" onClick={() => setPantalla("inicio")}><ArrowLeft size={16} /></button>
              <div style={{ width:30, height:30, borderRadius:10, background:`linear-gradient(87deg,${G[0]},${G[1]})`,
                display:"grid", placeItems:"center", color:"#fff", flexShrink:0 }}><Ticket size={15} /></div>
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span className="mono" style={{ fontSize:12, fontWeight:500 }}>{q.numero}</span>
                  <Pill tone={ESTADOS[q.estado].tone}>{ESTADOS[q.estado].l}</Pill>
                </div>
                {q.origen && <div style={{ fontSize:11, color:"var(--n400)", whiteSpace:"nowrap", overflow:"hidden",
                  textOverflow:"ellipsis", maxWidth:220 }}>desde {q.origen}</div>}
              </div>

              {/* cronómetro */}
              <div className="mono" title="Tiempo de armado" style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8,
                padding:"5px 10px", borderRadius:9, background:"rgba(17,17,36,.04)", fontSize:11.5,
                color: crono > meta ? "var(--coral)" : "var(--n500)" }}>
                <Gauge size={12} /> {mm}:{ss}
                <span style={{ opacity:.5 }}>/ meta {meta === 60 ? "1:00" : "4:00"}</span>
              </div>

              <div style={{ flex:1 }} />

              {/* autosave */}
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:"var(--n400)" }}>
                {guardado === "guardando"
                  ? <><Loader2 size={12} className="spin" /> Guardando…</>
                  : <><CheckCheck size={12} style={{ color:"var(--teal-2)" }} /> Guardado</>}
              </div>

              <select className="in" style={{ width:150, height:34, fontSize:12 }} value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}>
                {VENDEDORES.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>

              <button className="btn btn-s btn-sm" onClick={() => setPaleta(true)} title="Paleta de comandos">
                <Command size={13} /><span className="kbd" style={{ marginLeft:-2 }}>K</span>
              </button>
              <Btn className="only-wide" onClick={() => setPrev("cel")} size="sm"><Smartphone size={13} /> Vista previa</Btn>
              <Btn variant="p" size="sm" onClick={() => setCompartir(true)}><Send size={13} /> Compartir</Btn>
            </div>
          </header>

          {/* ── cuerpo: rail · formulario · teléfono ──────────────────── */}
          <div style={{ display:"flex", gap:20, maxWidth:1460, margin:"0 auto", padding:"18px 18px 60px", alignItems:"flex-start" }}>

            {/* rail */}
            <aside className="rail-col" style={{ width:172, flexShrink:0, position:"sticky", top:74 }}>
              <div className="card" style={{ padding:9 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"3px 7px 8px" }}>
                  <span className="lbl">Bloques</span>
                  <span className="mono" style={{ fontSize:10.5, color:"var(--n400)" }}>{listos}/{bloques.length}</span>
                </div>
                <div style={{ height:3, borderRadius:9, background:"rgba(17,17,36,.06)", margin:"0 7px 9px", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:9, width:`${(listos / bloques.length) * 100}%`,
                    background:"linear-gradient(90deg,#45D4C0,#2A9E8E)", transition:"width .5s cubic-bezier(.2,.8,.2,1)" }} />
                </div>
                {bloques.map((b) => (
                  <button key={b.id} className="rail-i" data-on={activo === b.id ? "1" : "0"} onClick={() => irA(b.id)}>
                    <span className="rail-dot" data-ok={b.ok ? "1" : "0"} />
                    <b.Icon size={13} style={{ opacity:.75, flexShrink:0 }} />
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.l}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding:"11px 9px 0", fontSize:10.5, color:"var(--n300)", lineHeight:1.5 }}>
                Un solo scroll. El rail es para saltar, no un asistente por pasos.
              </div>
            </aside>

            {/* formulario */}
            <main ref={scroller} style={{ flex:1, minWidth:0 }}>
              {q.ia && <BannerIA ia={q.ia} />}

              {q.origen && !q.ia && (
                <div className="a-rise" style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", marginBottom:14,
                  borderRadius:14, background:"linear-gradient(90deg,rgba(59,191,173,.11),rgba(120,90,229,.07))",
                  border:"1px solid rgba(59,191,173,.24)" }}>
                  <Zap size={15} style={{ color:"var(--teal-2)", flexShrink:0 }} />
                  <div style={{ fontSize:12.5, flex:1 }}>
                    Precargado desde <strong>{q.origen}</strong> — destinos, noches, servicios, opciones y fotos.
                    <span style={{ color:"var(--n400)" }}> Todo editable.</span>
                  </div>
                </div>
              )}

              <BloqueCliente q={q} set={set} refEl={primerCampo} />
              <BloqueEncabezado q={q} set={set} tramos={tramos} hayManual={hayManual} onRepropagar={repropagar} />
              <BloqueAlojamiento q={q} set={set} tramos={tramos} toast={toast} />
              <BloqueMensaje q={q} set={set} toast={toast} />
              <BloqueVuelos q={q} set={set} toast={toast} />
              <BloqueServicios q={q} set={set} toast={toast} />
              <BloqueNotas q={q} set={set} toast={toast} />
              <BloqueNotasCliente q={q} set={set} toast={toast} />

              <div style={{ display:"flex", gap:9, marginTop:18, flexWrap:"wrap" }}>
                <Btn variant="p" style={{ height:44, paddingInline:22 }} onClick={() => setCompartir(true)}>
                  <Send size={15} /> Compartir cotización
                </Btn>
                <Btn style={{ height:44 }} onClick={() => { const c = JSON.parse(JSON.stringify(q));
                  c.numero = `COT-2026-${String(CORRELATIVO++).padStart(4,"0")}`; c.estado = "borrador"; abrir(c);
                  toast({ msg:"Cotización duplicada — cambiá las fechas y listo", tone:"ok" }); }}>
                  <Copy size={15} /> Duplicar cotización
                </Btn>
                <Btn style={{ height:44 }} onClick={() => {
                  const nombre = q.titulo.destino ? `${q.titulo.destino} · plantilla` : "Plantilla sin nombre";
                  setPlantillas((l) => [...l, { id:uid("pl"), nombre, destino:q.titulo.destino || "General",
                    detalle:`${q.servicios.length} servicios · ${q.opciones.length} opciones` }]);
                  toast({ msg:`Guardada como plantilla “${nombre}”`, tone:"ok" });
                }}><Files size={15} /> Guardar como plantilla</Btn>
                <Btn variant="v" style={{ height:44 }} onClick={() => { setHomeTab("cotizar"); setPantalla("inicio"); }}>
                  <ListChecks size={15} /> Cotizaciones</Btn>
              </div>
            </main>

            {/* teléfono */}
            <aside className="phone-col" style={{ width:336, flexShrink:0, position:"sticky", top:74 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10, paddingLeft:4 }}>
                <span className="lbl" style={{ whiteSpace:"nowrap" }}>Lo que ve el pasajero</span>
                <span title="Las notas internas no aparecen acá" style={{ display:"grid", placeItems:"center",
                  width:20, height:20, borderRadius:7, background:"rgba(244,62,85,.1)", color:"#CC2030" }}>
                  <Lock size={10} /></span>
                <div style={{ marginLeft:"auto", display:"flex", gap:3, padding:3, background:"rgba(17,17,36,.05)", borderRadius:9 }}>
                  <button title="Vista celular" style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center",
                    background:"#fff", color:"var(--ink)", boxShadow:"0 1px 3px rgba(26,26,46,.12)" }}>
                    <Smartphone size={12} /></button>
                  <button title="Ver en tablet" onClick={() => setPrev("tab")}
                    style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center", color:"var(--n400)" }}>
                    <Smartphone size={14} style={{ transform:"rotate(90deg)" }} /></button>
                  <button title="Ver en escritorio" onClick={() => setPrev("desk")}
                    style={{ width:26, height:24, borderRadius:7, display:"grid", placeItems:"center", color:"var(--n400)" }}>
                    <Monitor size={12} /></button>
                </div>
              </div>
              <div className="phone">
                <div className="phone-scr" ref={phoneScroll}>
                  <div className="notch" />
                  <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos}
                    foco={activo} scrollRef={phoneScroll} />
                </div>
              </div>
              <div style={{ fontSize:10.5, color:"var(--n300)", textAlign:"center", marginTop:9, lineHeight:1.5 }}>
                Se actualiza mientras armás y sigue al bloque que editás.
                Las notas internas nunca aparecen acá.
              </div>
            </aside>
          </div>

          {/* vista previa unificada: celular · tablet · escritorio */}
          {prev && (
            <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && setPrev(null)}>
              <div className="a-zoom" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, maxWidth:"96vw" }}>

                {/* selector de formato */}
                <div style={{ display:"flex", gap:4, padding:4, borderRadius:13,
                  background:"rgba(255,255,255,.12)", backdropFilter:"blur(8px)" }}>
                  {[["cel","Celular",Smartphone],["tab","Tablet",null],["desk","Escritorio",Monitor]].map(([k, l, I]) => (
                    <button key={k} onClick={() => setPrev(k)}
                      style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10,
                        fontSize:13, fontWeight:700, transition:"all .18s",
                        background: prev === k ? "#fff" : "transparent",
                        color: prev === k ? "var(--ink)" : "rgba(255,255,255,.75)",
                        boxShadow: prev === k ? "0 4px 14px rgba(0,0,0,.25)" : "none" }}>
                      {I ? <I size={13} /> : <Smartphone size={15} style={{ transform:"rotate(90deg)" }} />}
                      {l}
                    </button>
                  ))}
                </div>

                {/* celular */}
                {prev === "cel" && (
                  <div className="phone a-zoom" key="cel">
                    <div className="phone-scr">
                      <div className="notch" />
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} />
                    </div>
                  </div>
                )}

                {/* tablet */}
                {prev === "tab" && (
                  <div className="a-zoom" key="tab" style={{ width:"min(700px,94vw)", borderRadius:30, padding:12,
                    background:"linear-gradient(160deg,#2A2A45,#14142A)",
                    boxShadow:"0 34px 80px -24px rgba(17,17,36,.55), 0 0 0 1px rgba(255,255,255,.06) inset" }}>
                    <div style={{ borderRadius:20, overflow:"hidden", background:"#fff", height:"min(540px,66vh)", overflowY:"auto" }}>
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} modo="desk" />
                    </div>
                  </div>
                )}

                {/* escritorio */}
                {prev === "desk" && (
                  <div className="browser a-zoom" key="desk" style={{ width:"min(940px,96vw)" }}>
                    <div className="browser-bar">
                      <span className="browser-dot" style={{ background:"#F25C54" }} />
                      <span className="browser-dot" style={{ background:"#F7B267" }} />
                      <span className="browser-dot" style={{ background:"#45D4C0" }} />
                      <div className="browser-url">
                        <Lock size={10} style={{ color:"var(--teal-2)" }} />
                        traveloz.com.uy/c/{q.numero.toLowerCase()}
                      </div>
                    </div>
                    <div style={{ height:"min(560px,66vh)", overflowY:"auto" }}>
                      <SalidaPasajero q={q} marca={marca} vendedor={vendedor} tramos={tramos} modo="desk" />
                    </div>
                  </div>
                )}

                <Btn onClick={() => setPrev(null)} style={{ background:"rgba(255,255,255,.92)" }}>
                  <X size={14} /> Cerrar vista previa</Btn>
              </div>
            </div>
          )}
        </>
      )}

      {compartir && (
        <ModalCompartir q={q} marca={marca} toast={toast} onClose={() => setCompartir(false)}
          onVigencia={(h) => set((d) => { d.vigencia = h; })}
          onEnviada={() => set((d) => { d.estado = "enviada"; })} />
      )}
      {paleta && <Paleta acciones={acciones} onClose={() => setPaleta(false)} />}

      <Toasts items={toasts} onClose={(id) => setToasts((l) => l.filter((x) => x.id !== id))}
        onUndo={(t) => { t.undo?.(); setToasts((l) => l.filter((x) => x.id !== t.id)); }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width:1320px){ .ctz .phone-col{ display:none } }
        @media (min-width:1321px){ .ctz .only-wide{ display:none } }
        @media (max-width:900px){ .ctz .rail-col{ display:none } }
      `}} />
    </div>
  );
}
