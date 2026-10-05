# Traveloz Collection · design system

El design system se arma en Claude Design y se publica en
https://traveloz.com.uy/collection. Google no lo indexa: la página responde
`X-Robots-Tag: noindex, nofollow` y lleva el mismo meta robots.

## Actualizar

1. En Claude Design, exportar el proyecto como zip.
2. `node scripts/import-collection.mjs "<ruta>/Traveloz Collection Design System.zip"`
3. Commit y push a `main`. Railway despliega solo.

El script reemplaza entero `public/collection/` y `docs/collection/contexto/`.

Desde la v0.3 (05/10/2026) el mockup se edita directo en
`public/collection/index.html`: el feedback del cliente del 01/10 (menú nuevo,
Destinos, Especialistas, Aliados, Contactanos) solo existe en el repo. Un
import nuevo desde Claude Design lo borra. Antes de importar, hay que aplicar
esos cambios también en el proyecto de Claude Design.

## Qué hay

- `public/collection/`: la página exportada (`index.html`), el runtime de
  Claude Design (`support.js`), React 18.3.1 en `vendor/` y los assets.
- `docs/collection/contexto/`: el brief, las referencias y la propuesta
  funcional que se le cargaron al proyecto en Claude Design. Viven en el repo
  y no se publican.

## Por qué así

- El runtime de Claude Design baja React de unpkg y la CSP del sitio lo
  bloquea. El script sirve la misma versión desde `vendor/`, con el mismo hash
  SRI que fija el runtime.
- `/collection` tiene CSP propia en `next.config.mjs`: suma `'unsafe-eval'`
  (el runtime evalúa la lógica del documento con `new Function`) y Google
  Fonts, y saca GTM.
- La página se sirve en `/collection`, sin barra final, así que el script
  pasa a absolutas las rutas relativas del export.
- En la consola aparecen 404 a URLs como `/{{ s.img }}`: el navegador lee la
  plantilla cruda antes de que el runtime la reemplace. Pasa igual en Claude
  Design y no rompe nada.
