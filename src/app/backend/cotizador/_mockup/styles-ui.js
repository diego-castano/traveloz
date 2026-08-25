/* ═══════════════════════════════════════════════════════════════════════════
   CSS_UI — la hoja de los controles nuevos del cotizador

   Vive aparte de `styles.js` para no pisarse con quien esté tocando la hoja
   grande. Se inyecta DESPUÉS de `CSS` en `CotizadorMockup.jsx`, así que a
   igual especificidad esta gana.

   Dos familias:

     · `.sb-*`  — el select con buscador (`SelectBuscable`, en ui.jsx). El
       botón queda adentro de `.ctz`; el panel sale por un portal, también a
       `.ctz`, y por eso hereda las variables de color y el modo oscuro sin
       redeclarar nada.
     · `.ml-*`  — el popover "Mis links" (mis-links.jsx), mismo mecanismo.

   Todo se pinta con las variables de `styles.js` (`--pop`, `--field`,
   `--hair`, `--sunk`…). Ningún color literal salvo los tintes de marca que
   ya son literales allá.
   ═══════════════════════════════════════════════════════════════════════════ */

export const CSS_UI = `
/* ═══ Select con buscador ═════════════════════════════════════════════════ */

.ctz .sb-wrap { position:relative; display:inline-block; max-width:100%; vertical-align:top; }

/* El control cerrado: un botón que se hace pasar por input. La clase .in ya le
   da fondo, borde y radio; acá va lo que un botón necesita de más.
   (Ojo: nada de acentos graves acá adentro — esto es un template literal.) */
.ctz .sb-btn {
  display:flex; align-items:center; width:100%; text-align:left; cursor:pointer;
  background:var(--field); border:1px solid var(--field-brd); border-radius:9px;
  color:var(--ink); font-weight:400; line-height:1;
}
.ctz .sb-btn:hover:not(:disabled) { border-color:rgba(17,17,36,.24); }
.ctz .sb-btn[data-open="1"] { border-color:var(--teal-2); box-shadow:0 0 0 3px rgba(59,191,173,.15); }
.ctz .sb-btn:disabled { opacity:.55; cursor:default; }
.ctz .sb-btn[data-vacio="1"] .sb-val { color:var(--n300); }
.ctz .sb-val { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.ctz .sb-chev { position:absolute; right:9px; top:50%; transform:translateY(-50%);
  color:var(--n300); pointer-events:none; }
.ctz .sb-wrap:hover .sb-chev { color:var(--n400); }

.ctz .sb-x { position:absolute; right:27px; top:50%; transform:translateY(-50%);
  width:18px; height:18px; border-radius:99px; display:grid; place-items:center;
  color:var(--n400); background:var(--sunk); transition:color .14s, background .14s; }
.ctz .sb-x:hover { color:var(--coral); background:var(--sunk-2); }

/* El panel. Sale por portal, así que no se cuelga de ningún .ctz descendiente
   en el selector: la variable de color la hereda del portal igual. */
.sb-pop { position:fixed; z-index:220; display:flex; flex-direction:column;
  background:var(--pop); border:1px solid var(--hair); border-radius:13px; overflow:hidden;
  box-shadow:0 1px 3px rgba(17,17,36,.06), 0 26px 56px -18px rgba(17,17,36,.32);
  animation:sbIn .15s cubic-bezier(.2,.8,.2,1); }
@keyframes sbIn { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:none; } }

.sb-buscar { position:relative; flex-shrink:0; padding:8px 9px;
  border-bottom:1px solid var(--hair-soft); }
.sb-buscar svg { position:absolute; left:19px; top:50%; transform:translateY(-50%);
  color:var(--n300); pointer-events:none; }
.sb-buscar input { width:100%; height:32px; padding:0 10px 0 30px; border-radius:8px;
  background:var(--field); border:1px solid var(--field-brd); color:var(--ink);
  font-family:inherit; font-size:13px; outline:none; }
.sb-buscar input:focus { border-color:var(--teal-2); box-shadow:0 0 0 3px rgba(59,191,173,.13); }
.sb-buscar input::placeholder { color:var(--n300); }

.sb-lista { overflow-y:auto; overscroll-behavior:contain; padding:4px; }
.sb-i { display:flex; align-items:center; gap:8px; width:100%; padding:7px 9px;
  border-radius:8px; text-align:left; font-size:13px; color:var(--ink);
  background:none; border:none; cursor:pointer; font-family:inherit; }
.sb-i[data-on="1"] { background:rgba(120,90,229,.10); }
.sb-i b { font-weight:700; color:var(--violet); }
.sb-i-txt { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.sb-i-txt > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sb-i-vacio { color:var(--n400); }
.sb-i-sub { font-size:10.5px; color:var(--n400); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sb-i-ok { color:var(--teal-2); flex-shrink:0; }
.sb-nada { padding:16px 12px; font-size:12px; color:var(--n400); text-align:center; }

.sb-pie { flex-shrink:0; display:flex; gap:11px; padding:6px 11px; font-size:10.5px;
  color:var(--n400); border-top:1px solid var(--hair-soft); background:var(--wash); }

/* ═══ Popover "Mis links" ═════════════════════════════════════════════════ */

.ml-pop { position:fixed; z-index:220; width:342px; max-width:calc(100vw - 16px);
  background:var(--pop); border:1px solid var(--hair); border-radius:15px; overflow:hidden;
  box-shadow:0 1px 3px rgba(17,17,36,.06), 0 30px 64px -20px rgba(17,17,36,.34);
  animation:sbIn .15s cubic-bezier(.2,.8,.2,1); }

.ml-head { display:flex; align-items:center; gap:8px; padding:11px 13px 9px;
  border-bottom:1px solid var(--hair-soft); }
.ml-head-t { font-size:13px; font-weight:700; letter-spacing:-.01em; }
.ml-head-s { font-size:10.5px; color:var(--n400); }

.ml-fila { padding:10px 13px; border-bottom:1px solid var(--hair-soft); }
.ml-fila:last-child { border-bottom:none; }
.ml-fila-t { display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:700; }
.ml-fila-s { font-size:10.5px; color:var(--n400); line-height:1.45; margin:2px 0 7px; }

.ml-url { display:flex; align-items:center; gap:7px; padding:6px 9px; margin-bottom:7px;
  border-radius:9px; background:var(--sunk); border:1px solid var(--hair-soft); }
.ml-url span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.ml-sin { padding:13px; font-size:12px; color:var(--n400); line-height:1.55; }
.ml-sin a { color:var(--violet); font-weight:600; text-decoration:underline; text-underline-offset:2px; }
`;
