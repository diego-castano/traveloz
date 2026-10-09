# Backend de Traveloz Collection: plan

Fecha: 09/10/2026. Fuentes: reunión "Landing de Traveloz Collection" (21/09,
Gero y Amparo), `docs/collection/contexto/06-propuesta-funcional.md` (v3 y
cambios del 01/10), WhatsApp de Gero y decisiones de Diego del 09/10.

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Dónde vive | Dentro de esta app y esta base. Un solo login. Catálogo común de países, ciudades y hoteles. |
| Marca | Sin `brandId`. Collection tiene modelos propios con prefijo `Col`. |
| Backoffice | Link "Collection" en el backend de Traveloz que abre `/backend/collection`: un segundo backend con el design system de Collection, sin el chrome de Traveloz. |
| Sitio público | `collection.traveloz.com.uy`, servido por esta misma app (middleware reescribe por host a un route group propio). Los componentes de página se comparten con la vista previa del backoffice. |
| Permisos | Capa propia por usuario (`ColPermiso`), independiente del rol de Traveloz. Amparo, Agustina y Diego son super admin. El super admin prende y apaga permisos de cada usuario. |
| Precio | Opcional por experiencia: interruptor "Mostrar precio" + monto "desde" en USD. Apagado por defecto. |
| Bitrix | Igual que hoy (`crearNegocioLead`): mismo embudo y etapa, "Información del origen" = `Collection · <experiencia>`. |
| Contenido | Todo editable y visual: experiencias, destinos, especialistas, aliados, testimonios, preguntas frecuentes, journal, páginas. |

## Design system del backoffice

Tokens del mockup (`public/collection/index.html:1254-1274`):

- Colores: base `#F0F0F0`, superficie `#FFFFFF`, tinta `#32373B`, pizarra
  `#4A5859`, dorado `#F4B860`, línea `#DCDCDC`.
- Tipos: Cormorant Garamond (display) y Jost (texto), con `next/font/google`.
- Radios 2 y 4 px. Easing `cubic-bezier(0.22, 1, 0.36, 1)`, hover 200 ms,
  revelado 500 ms.
- Etiquetas en mayúscula, 13 px, tracking 0.12em; eyebrow con línea dorada.

Librerías: ya instaladas `@dnd-kit/*`, `motion`, `embla-carousel-react`,
`radix-ui`, `cmdk`, `react-easy-crop`, `yet-another-react-lightbox`, `sharp`.
A sumar: `@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` (texto rico,
`immediatelyRender: false`) y `vaul` (drawer lateral, `direction="right"`,
`modal={false}`).

## Módulos del backoffice

| Módulo | Qué es |
|---|---|
| Inicio | Tablero visual: experiencias con portada grande y % de completitud, medios recientes, accesos rápidos. |
| Experiencias | Grilla de tarjetas con portada, estado y completitud. Arrastrar para ordenar destacadas. Abre el constructor. |
| Constructor | Pasos a la izquierda, formulario al centro, vista previa a la derecha (plegable; drawer cuando está plegada). Se salta entre pasos libremente. Guardado automático. |
| Destinos | Mosaico igual al del sitio, arrastrable. Editor con vista previa. |
| Biblioteca | Todos los medios: grilla con color dominante mientras carga, subir arrastrando a cualquier parte, foco, alt, leyenda, crédito, dónde se usa. |
| Especialistas, Aliados, Testimonios, Preguntas, Journal | Listas visuales, edición en drawer con vista previa del bloque. |
| Páginas | Inicio, Nosotros y legales por bloques, con vista previa. |
| Consultas | Las del sitio de Collection, con estado de Bitrix. |
| Equipo | Solo super admin: usuarios y sus permisos de Collection. |
| Ajustes | WhatsApp, SEO global, redes, textos generales. |

## Constructor de experiencias: pasos

1. Lo esencial: título, bajada, tipo, destinos de Collection, especialista, slug.
2. Portada: foto o video (con póster), foco y recorte.
3. Relato: intro (texto rico), imperdibles (4 a 6), mejor época, frase.
4. Recorrido: tramos (ciudad del catálogo, noches, relato, foto, hotel del catálogo con texto propio). Se reordena arrastrando.
5. Día a día: días o rangos, destino, texto, fotos.
6. Galería: fotos y videos de la biblioteca, orden, leyendas.
7. Detalles: qué incluye y qué no, info práctica, precio opcional.
8. Compartir y Google: título, descripción, imagen; vista de Google y de WhatsApp.
9. Publicar: lista de requisitos (portada, 6 fotos, intro, un tramo con relato, día a día, especialista, texto para Google), estado e historial.

Cada paso marca su completitud. La vista previa sigue al paso activo (hace
scroll a esa sección) y alterna celular y escritorio.

## Modelo de datos

Persistencia híbrida, igual que `Presupuesto`: columnas para lo que se filtra
y `contenido Json` validado con Zod para las secciones.

| Modelo | Fase | Campos clave |
|---|---|---|
| `ColPermiso` | 1 | `userId` (PK), `superAdmin`, `permisos String[]` |
| `ColMedio` | 1 | tipo, key y url del original, ancho, alto, peso, color dominante, placeholder, variantes, alt, leyenda, crédito, foco, póster y duración de video |
| `ColEvento` | 1 | entidad, id, acción, usuario, detalle (historial de quién publicó o cambió qué) |
| `ColDestino` (+ `ColDestinoPais`) | 2 | slug, nombre, bajada, relato, portada, estado (incluye Próximamente), orden, SEO |
| `ColExperiencia` (+ destinos, + hoteles) | 2 | slug, título, tipo, estado, destacada, orden, especialista, proveedor interno, `mostrarPrecio`, `precioDesde`, portada, `contenido`, SEO, `publicadaEn` |
| `ColEspecialista` | 2 | usuario opcional, retrato, región, frase, idiomas, canales, orden |
| `ColAliado`, `ColTestimonio`, `ColPregunta`, `ColArticulo`, `ColPagina` | 3 | ver propuesta funcional |
| `ColConsulta` | 5 | campos del formulario, experiencia, atribución, columnas `crm*` |

Estados de experiencia: BORRADOR, EN_REVISION, PUBLICADA, PAUSADA, ARCHIVADA.
Se archiva, no se borra.

Permisos (`ColPermiso.permisos`): `panel`, `experiencias.editar`,
`experiencias.publicar`, `sitio.editar`, `medios.editar`, `consultas.ver`.
`superAdmin` incluye todo y además gestiona Equipo.

## Medios

Subida directa al bucket con URL firmada (`presignedUpload` de
`src/components/lib/upload.ts`), carpeta `collection/originales/`. Después
el servidor lee el original con sharp, guarda dimensiones, color dominante y
un placeholder borroso, y genera variantes webp de 480, 960, 1600 y 2400 px
(sin agrandar) en `collection/variantes/`. Los videos se guardan tal cual,
con póster.

## Fases

1. Fundaciones: modelos `ColPermiso`, `ColMedio`, `ColEvento`; permisos y
   guardas; link en el backend de Traveloz; shell de Collection con su design
   system; Inicio; Biblioteca de medios; Equipo.
2. Experiencias: destinos y especialistas mínimos, constructor completo,
   componentes de la página de experiencia (los mismos del sitio) y vista
   previa.
3. Contenido del sitio: destinos completos, aliados, testimonios, preguntas,
   journal, páginas.
4. Sitio público en `collection.traveloz.com.uy`: ruteo por host, páginas,
   SEO (sitemap, OG, migas de pan), noindex hasta el lanzamiento.
5. Consultas: formularios, Bitrix, aviso por mail, panel; después newsletter
   y WhatsApp.

## Reglas para los agentes

- `.env.local` apunta a producción: nada de `migrate dev`, `db push` ni
  escrituras desde local. Las migraciones las aplica el deploy.
- Server actions con contrato `{ ok, data } | { ok, error }`.
- pgbouncer: sin `prisma.$transaction`.
- Nada de `../destinico`.
