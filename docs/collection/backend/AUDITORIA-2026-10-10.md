# Auditoría del admin de Traveloz Collection

Fecha: 09/10/2026. Base: copia estable en `HEAD d6db2b9` (worktree), servida con `next dev -p 3007` y recorrida con puppeteer a 1440×900, 1280×800 y 390×844.
Las referencias `archivo:línea` son de `HEAD` (el repo principal tiene cambios en curso de otro agente). Rutas relativas a `src/components/collection/` salvo que diga otra cosa.
Capturas: `/private/tmp/claude-501/-Users-diegothx-Desktop-Proyectos-DEV-Traveloz-Destinico-traveloz/0f81ff65-912b-480e-aace-e08a047131a7/scratchpad/shots/` (abajo solo el nombre del archivo).

Marcado **[en curso]**: lo está tocando el otro agente (tipografía, ancho del riel, primitivas de input y botón, microanimaciones, modal de subida). Igual dejo el hallazgo concreto para que lo tenga en cuenta.

Alcance no cubierto en vivo: Inicio y Equipo no tienen ruta en `/dev/collection`, así que los audité solo por código.

---

## (A) Sistema visual

**A1. Escala tipográfica sin tokens**
- Dónde: todo el admin. 33 tamaños arbitrarios distintos (`text-[9.5px]` a `text-[72px]`, incluidos 10.5, 11.5, 12.5 y 13.5). Los más usados: 12px (103), 13px (97), 14px (78), 11px (45).
- Problema: no hay jerarquía estable. Cada pantalla inventa su tamaño y el ojo no encuentra un ritmo. Con el cambio a Clarika/Garamond este desorden va a quedar más a la vista.
- Arreglo: definir en `tailwind.config.ts` una escala `col-xs 12 / col-sm 13 / col-base 15 / col-md 17 / col-lg 22 / col-xl 28 / col-2xl 36 / col-3xl 44` con line-heights fijos, y prohibir `text-[Npx]` en `components/collection` con una regla de lint (`no-restricted-syntax` sobre la clase).
- Severidad: media. **[en curso]** parcialmente, por el cambio de fuentes.
- Captura: cualquiera, por ejemplo `audit-experiencias-1440.png`.

**A2. Mayúsculas espaciadas en todos lados**
- Dónde: `ui.tsx:23` (botón), `ui.tsx:54` (etiqueta de campo), `ui.tsx:164` (chip), pills de estado, breadcrumb (`shell/CollectionShell.tsx:186`), "Volver a Traveloz". En total hay 105 `uppercase` en el admin.
- Problema: botones, chips, etiquetas, eyebrows, pills y migas compiten con el mismo tratamiento (13px, tracking 0.12em). Por eso el admin se siente formulario de sistema y no editorial. Además, las mayúsculas espaciadas se leen más lento en los formularios largos del constructor.
- Arreglo: reservar las mayúsculas para eyebrow y pills de estado. Botones, chips y etiquetas de campo van en sentence case, Clarika 14px, peso 500, tracking 0. Las etiquetas de campo quedan en 13px/500 color `col-ink`.
- Severidad: alta.
- Captura: `audit-constructor-esencial-1440.png`, `audit-consultas-1440.png`.

**A3. Grises por opacidad que no pasan AA**
- Dónde: hay 9 variantes de `col-slate/NN`: `/60` (26 usos), `/70` (25), `/50` (22), `/40` (20), `/30` (18), y siguen. Medido en vivo: conteos de chips `slate/60` dan 2.69:1, "86 % completa" 3.30:1, "Arrastrá las tarjetas…" 3.30:1, "Sin título" `slate/45` 2.03:1, el atajo "Alt + ↑ ↓" 2.85:1 y los contadores "36 / 140" 3.30:1.
- Problema: el texto secundario no se lee bien sobre `#F0F0F0`, y sobre blanco empeora.
- Arreglo: reemplazar las opacidades por dos tokens sólidos. `col-muted: #5E6B6C` da 4.86:1 sobre `#F0F0F0` y sirve para todo texto secundario. `col-subtle: #9AA3A4` queda solo para bordes e íconos decorativos, nunca para texto.
- Severidad: alta.
- Captura: `audit-experiencias-1440.png`, `audit-constructor-esencial-1440.png`.

**A4. El dorado significa demasiadas cosas a la vez**
- Dónde: el punto de "Publicada" y el de "En revisión", "Cambios sin publicar", el contador en rango ideal (`constructor/campos.tsx:91`, `text-[#B07A2A]`), el badge "Falta", el foco, el check de los avisos, el anillo de completitud, el indicador del riel y la insignia de consultas. Además `#B07A2A` aparece hardcodeado 15 veces sin token.
- Problema: el usuario no distingue entre "está bien", "falta algo" y "ojo". Un contador dorado se lee como advertencia, pero en realidad quiere decir que el largo es el ideal. El dorado como texto sobre `#F0F0F0` da 3.25:1, y los números "01 02 03" del Recorrido, en `#F4B860` sobre blanco, dan 1.77:1.
- Arreglo: el dorado queda solo como acento de marca (foco, activo, eyebrow). Para estados, usar colores semánticos desaturados: publicado `#3F6B4F`, pendiente/cambios `#9A6A1F` (5:1 sobre base), borrador `col-muted`, error `col-alerta`. Agregar el token `col-gold-ink: #8A5D17` (5.0:1) para texto dorado legible.
- Severidad: alta.
- Captura: `audit-experiencias-1440.png`, `audit-constructor-recorrido-1440.png`.

**A5. Sombras sin sistema**
- Dónde: hay 33 sombras arbitrarias distintas (`shadow-[...]`): `ui.tsx:129`, `contenido/comun.tsx:51`, `biblioteca/ColaSubidas.tsx:43`, `shell/Avisos.tsx:51`, el riel, el drawer y otras.
- Problema: cada superficie flota a una altura distinta, sin una luz coherente.
- Arreglo: tres tokens tintados con azul noche, `col-e1: 0 1px 2px rgba(4,7,31,.06)`, `col-e2: 0 8px 24px -12px rgba(4,7,31,.18)` y `col-e3: 0 24px 56px -24px rgba(4,7,31,.32)`, usados para tarjeta en hover, popover y hoja/modal respectivamente.
- Severidad: media.
- Captura: `audit-biblioteca-subida-error-1440.png`.

**A6. Radios casi cero en un admin que el dueño quiere "moderno"**
- Dónde: `rounded-sm` (2px) aparece 207 veces, `rounded-full` 28 (pills, switch, avatar) y `rounded` (4px) 10. Los inputs boxed, chips, botones, tarjetas y modales usan todos 2px.
- Problema: el 2px en todo, más las mayúsculas, da un aire rígido y anticuado. Encima conviven el pill redondo (insignias) y el chip cuadrado sin una regla clara.
- Arreglo: escala `6px` para controles (input, botón, chip), `10px` para tarjetas y paneles, `14px` para modales y hojas, `full` solo para avatar e insignia numérica. Las fotos de tarjeta pueden quedar con 2px a propósito, como gesto editorial.
- Severidad: media. **[en curso]** en las primitivas.
- Captura: `audit-selector-biblioteca-1440.png`.

**A7. Encabezado redundante y muy alto**
- Dónde: `ui.tsx:86-108` más la barra de `shell/CollectionShell.tsx:177-211`.
- Problema: el breadcrumb "COLLECTION > EXPERIENCIAS", el eyebrow "EXPERIENCIAS" y el H1 "Los viajes de Collection" dicen lo mismo tres veces. A 1440×900 el contenido arranca en y≈340 y en Experiencias en y≈383, porque los chips bajan a una segunda fila. En 900px de alto se ven 2 filas de tarjetas a medias.
- Arreglo: sacar el eyebrow cuando hay breadcrumb (o sacar el breadcrumb en los módulos de primer nivel). Bajar el H1 de 46px a 34px, `mb-10` a `mb-6`, y poner filtros y buscador en la misma fila que el H1 cuando hay lugar. Objetivo: contenido en y≤220.
- Severidad: alta.
- Captura: `audit-experiencias-1440.png`, `audit-destinos-1440.png`.

**A8. Eyebrow inconsistente**
- Dónde: `consultas/Consultas.tsx` y `ajustes/Ajustes.tsx` usan "Gestión" (el nombre del grupo). Los demás módulos usan el nombre del módulo.
- Arreglo: un solo criterio. Con A7 desaparece el eyebrow y se resuelve solo.
- Severidad: baja.
- Captura: `audit-consultas-1440.png`, `audit-ajustes-1440.png`.

**A9. Números en estilo antiguo de Cormorant**
- Dónde: título de la hoja de consulta "TC-0412 · Florencia Techera", que se ve "TC-o412". También los conteos y cifras en display.
- Problema: un código de referencia con números antiguos parece una errata.
- Arreglo: `font-variant-numeric: lining-nums tabular-nums` global en `[data-collection-shell]` para la display, y los códigos (TC-xxxx) en la fuente de texto.
- Severidad: media.
- Captura: `audit-consultas-detalle-1440.png`.

**A10. Riel lateral ancho y con detalles de "glow"**
- Dónde: `shell/CollectionShell.tsx:105` (256px), `:281` (logo en 104px de alto), `:327` (títulos de grupo `white/40` a 11px, 3.73:1), `:441` (indicador con `shadow 0 0 10px gold/.6`).
- Problema: el texto más largo ocupa unos 110px y quedan casi 100px vacíos a la derecha de cada ítem. El bloque del logo se lleva 104px de alto. El glow dorado es un cliché.
- Arreglo: riel de 224px, logo en 72px, ítems de `h-9` con `gap-2.5`, títulos de grupo `white/55` a 12px, indicador de 2px sin glow.
- Severidad: media. **[en curso]**
- Captura: `audit-experiencias-1440.png`.

**A11. Contenedores con anchos máximos distintos**
- Dónde: listas en `max-w-[1600px]`, Inicio en `max-w-[1280px]` (`app/backend/collection/page.tsx`), Equipo en `max-w-[1080px]` (`equipo/Equipo.tsx:81`).
- Arreglo: un token `col-contenedor` de 1360px, y 960px para pantallas de formulario (Ajustes, Equipo).
- Severidad: baja.

**A12. Iconos con grosores mezclados**
- Dónde: lucide con `strokeWidth` 1.25, 1.5, 1.75 y 2 según el archivo (por ejemplo `ui.tsx:271` usa 2, `biblioteca/Biblioteca.tsx` 1.25, `shell/Avisos.tsx` 1.75).
- Arreglo: 1.5 fijo, vía un wrapper `Icono` o una constante.
- Severidad: baja.

---

## (B) Componentes

**B1. Causa raíz de "el texto toca el borde": el outline global de foco**
- Dónde: `app/backend/collection/collection.css:9-12`, `[data-collection-shell] :focus-visible { outline: 2px solid #f4b860; outline-offset: 2px }`. Gana sobre `focus:outline-none` porque tiene la misma especificidad y carga después.
- Problema: cada input de línea (`px-0`) recibe al enfocarse una caja dorada además de su subrayado dorado, y el texto queda pegado al borde izquierdo de esa caja. Pasa en "Nuevo destino" (`contenido/comun.tsx:185`), "Nueva pregunta", "Nueva categoría" y en todos los campos del constructor al tabular.
- Arreglo: `[data-collection-shell] :is(input,textarea,select,[contenteditable]):focus-visible { outline: none }` y dejar el foco del campo en su contenedor (borde y ring). Ver B2.
- Severidad: alta. **[en curso]** en las primitivas, pero conviene que sepa que la causa es este CSS global.
- Captura: `audit-destinos-nuevo-escrito-1440.png`, `audit-preguntas-nueva-1440.png`, `audit-preguntas-nuevacat-1440.png`.

**B2. Tres familias de campo conviviendo**
- Dónde: línea (`ui.tsx:55` `inputLinea`, en 19 archivos), caja (editor de texto con borde en `editor/EditorTexto.tsx`, buscador del selector con caja, steppers de 36px en `constructor/pasos/Recorrido.tsx` y `Dias.tsx`), y punteado (chip "+ Otro tipo" en Aliados, "Nueva categoría").
- Problema: el formulario no parece de un solo sistema. El editor de texto con caja al lado de inputs de línea es justo el "sistema sin diseñar" del que habla el dueño.
- Arreglo: un único `Campo` de 44px de alto, radio 6px, fondo `col-surface`, borde `#DCDCDC`, padding 12/14, foco con borde `col-ink` más ring de 3px `gold/30`. Lo usan input, textarea, select, buscador, stepper y editor de texto (la barra de herramientas va dentro de la misma caja). Los títulos grandes (Cormorant 26–32px) pueden seguir sin caja, pero con padding interno de 4px y fondo en hover.
- Severidad: alta. **[en curso]**
- Captura: `audit-destinos-hoja-scroll-1440.png`, `audit-constructor-dias-1440.png`.

**B3. Placeholders que parecen valores cargados**
- Dónde: SEO de Destinos ("Misterios de Oriente | Traveloz Collection" con contador 0/60), redes en Ajustes (URLs de Facebook y LinkedIn en gris), alt en DetalleMedio, "Viajes de autor" como antetítulo en Términos y descripción de Google en Compartir.
- Problema: el usuario no sabe si el campo está lleno o vacío. En SEO eso decide si publica o no.
- Arreglo: el placeholder empieza con "Ej.:" y va en itálica `col-subtle`. Cuando el valor por defecto se usa de verdad, mostrarlo como ayuda debajo del campo ("Si lo dejás vacío se usa: …") y no como placeholder.
- Severidad: media.
- Captura: `audit-destinos-hoja-scroll2-1440.png`, `audit-ajustes-scroll-1440.png`.

**B4. Títulos de una sola línea que se cortan**
- Dónde: título en Lo esencial ("Filipinas: Manila, El Nido y Borac"), título del día en Día a día ("Llegada y traslado pr") y nombres de hotel en Recorrido ("The Peninsula M", cortado a mitad de letra, `constructor/pasos/Recorrido.tsx:136`).
- Problema: no se ve lo que uno escribió, y el corte duro sin elipsis parece un error.
- Arreglo: `textarea` con `field-sizing: content` (o un autosize mínimo) para títulos. En Recorrido, `truncate` con elipsis real (`min-w-0` en el padre) y el nombre del hotel en su propia línea.
- Severidad: alta.
- Captura: `audit-constructor-esencial-1440.png`, `audit-constructor-dias-1440.png`, `audit-constructor-recorrido-1440.png`.

**B5. Estados deshabilitados ilegibles**
- Dónde: `ui.tsx:23` `disabled:opacity-40`. "Publicar" sobre el panel oscuro queda en un dorado apagado, "Elegir" y "Agregar" del selector quedan en un bloque gris y "Publicar cambios" en Páginas también.
- Problema: no se entiende si el botón existe ni por qué está apagado.
- Arreglo: disabled con `bg-col-line text-col-muted`, `cursor-not-allowed` y un tooltip con el motivo ("Falta título y descripción para Google").
- Severidad: media. **[en curso]**
- Captura: `audit-constructor-publicar-1440.png`, `audit-selector-biblioteca-1440.png`, `audit-paginas-terminos-1440.png`.

**B6. Chips de filtro inconsistentes entre módulos**
- Dónde: `ui.tsx:163-292`. Consultas no tiene conteos y pone "Todas" al final. Biblioteca no tiene conteos. Preguntas no tiene "Todas". El resto pone "Todos" primero con conteo. Los conteos `slate/60` dan 2.69:1 y los chips miden 36px de alto.
- Problema: cada lista se filtra con una lógica visual distinta. En Experiencias a 1440 "Archivadas" baja sola a una segunda fila porque el buscador se lleva la columna derecha.
- Arreglo: chip de 40px, sentence case, conteo `col-muted` tabular, "Todas" siempre primero. Buscador en la misma fila, con ancho flexible y mínimo de 200px.
- Severidad: media.
- Captura: `audit-experiencias-1440.png`, `audit-consultas-1440.png`, `audit-biblioteca-1440.png`.

**B7. Pills de estado sin semántica**
- Dónde: `PillDestino` y las pills de experiencias, artículos y consultas. Miden 10.5px en mayúscula y hay 3 estilos (relleno tinta, borde blanco, borde dorado). El punto dorado es igual en "Publicada" y "En revisión".
- Problema: en la grilla no se distingue de un vistazo qué está publicado.
- Arreglo: un componente `Estado` único de 12px sentence case con punto de color semántico (ver A4) y fondo `color/10`.
- Severidad: media.
- Captura: `audit-experiencias-1440.png`, `audit-journal-lista-1440.png`.

**B8. Interruptores de visibilidad**
- Dónde: `ui.tsx:58-83`, de 36×20. En Aliados va sin texto en la tarjeta, en Especialistas con "Publicado/Oculto" a la izquierda y en Preguntas con "PUBLICADA" en mayúscula.
- Problema: un toque oculta algo del sitio público sin aviso ni deshacer. Al ocultar a Lucía Fernández no apareció ningún aviso.
- Arreglo: etiqueta siempre a la derecha en sentence case, área táctil de 44px (pseudo-elemento) y un aviso "Lucía Fernández ya no se ve en el sitio · Deshacer".
- Severidad: media.
- Captura: `audit-toast-especialista-1440.png`, `audit-aliados-1440.png`.

**B9. Hoja lateral de edición (`contenido/comun.tsx:21-77`)**
- Problema: al abrir, Radix pone el foco en la X y aparece una caja dorada grande arriba a la derecha (B1). No hay pie con acciones: el estado de guardado va en la cabecera y "Eliminar" queda al final sin separación. La vista previa está arriba y se pierde al bajar.
- Arreglo: `onOpenAutoFocus` al primer campo (o `preventDefault`), pie sticky de 56px con "Guardado hace 2 s" y "Listo", zona de peligro con fondo `col-alerta/5`, y vista previa sticky plegable o en una pestaña "Editar | Vista previa".
- Severidad: media.
- Captura: `audit-especialistas-hoja-1440.png`, `audit-destinos-hoja-scroll2-1440.png`.

**B10. Avisos (toasts)**
- Dónde: `shell/Avisos.tsx:37-61`.
- Problema: aparecen centrados abajo, sin botón de cerrar, sin acción (no hay "Deshacer"), sin pausa al pasar el mouse, y los errores salen en `role=status` polite. Varias acciones no avisan nada (cambio de visibilidad, reorden).
- Arreglo: avisos abajo a la derecha con acción opcional, cerrar, pausa en hover, `role=alert` para errores y 5 s por defecto.
- Severidad: media. **[en curso]** (toolkit de microanimación).
- Captura: `audit-toast-especialista-1440.png`.

**B11. Lista de Consultas sin estructura de tabla**
- Dónde: `consultas/Consultas.tsx:224`, `:727`.
- Problema: no hay encabezados de columna. El punto de Bitrix (verde, rojo o hueco) no tiene leyenda. La columna de origen mezcla Cormorant ("Japón en otoño…") con mayúsculas ("CONTACTANOS").
- Arreglo: fila de encabezado de 12px (Código, Persona, Origen, Especialista, Estado, Bitrix), un ícono más un tooltip para Bitrix ("Enviada", "Falló, reintentar", "No aplica") y el origen en una sola fuente.
- Severidad: media.
- Captura: `audit-consultas-1440.png`.

**B12. Tarjetas de Experiencias demasiado altas**
- Dónde: `experiencias/ListaExperiencias.tsx`, 3 columnas `aspect-[4/5]`.
- Problema: a 1440 cada tarjeta mide 433px y la completitud queda bajo el pliegue. No se escanean 6+ viajes.
- Arreglo: 4 columnas desde 1280, `aspect-[4/3]`, y la completitud como barra de 2px sobre la foto con el porcentaje en la pill.
- Severidad: media.
- Captura: `audit-experiencias-1440.png`.

**B13. Estados vacíos pobres fuera de Experiencias**
- Dónde: `contenido/Destinos.tsx:251-253` (y el mismo patrón en Especialistas, Aliados y Testimonios), con una frase en itálica centrada y sin botón. Experiencias vacía está bien resuelta, pero muestra filtros y buscador sin datos.
- Arreglo: un componente `Vacio` reutilizable (mosaico o ilustración, frase y CTA principal), y ocultar la barra de filtros cuando `total === 0`.
- Severidad: media.
- Captura: `audit-experiencias-vacia-1440.png`.

**B14. Menú "…" de tarjeta**
- Dónde: tarjetas de Experiencias. El botón es de 32×32 y solo aparece en hover.
- Problema: en tablet o con teclado no se descubre.
- Arreglo: siempre visible con opacidad 60% y 100% en hover, con área de 40px.
- Severidad: baja.
- Captura: `audit-experiencias-menu-opciones-1440.png`.

---

## (C) Microinteracciones

**C1. Duraciones largas y sin escala**
- Dónde: `duration-200` en 78 usos. Hojas a 500ms (`contenido/comun.tsx:55`), drawer móvil a 450ms y cola de subidas a 500ms.
- Problema: abrir y cerrar hojas seguido se siente lento. No hay tokens.
- Arreglo: `dur-rapida 150`, `dur-base 220` y `dur-lenta 360`. Las hojas entran en 320ms y salen en 200ms, con `ease-col`.
- Severidad: media. **[en curso]**

**C2. Acciones silenciosas**
- Problema: reordenar arrastrando, cambiar visibilidad o duplicar no dan confirmación visual en el lugar.
- Arreglo: un check de 14px que aparece 1.2 s junto al elemento ("Orden guardado"), y un aviso con deshacer para lo que cambia el sitio público.
- Severidad: media.

**C3. Hover de tarjeta inconsistente**
- Dónde: `ui.tsx:128` `tarjetaElevable` se aplica en Experiencias, Destinos y Especialistas, pero no en Aliados ni Testimonios.
- Arreglo: un solo hover para todas las tarjetas clicables: `-translate-y-0.5` con sombra `col-e2` y la imagen a `scale(1.02)` en 360ms.
- Severidad: baja.

**C4. Botones sin respuesta al presionar más allá de 1px**
- Dónde: `ui.tsx:23`, `active:translate-y-px`. Los chips solo cambian de color.
- Arreglo: `active:scale-[0.98]` en botones y chips, y hover del primario con un leve cambio de fondo más el ícono desplazado 2px.
- Severidad: baja. **[en curso]**

**C5. El contador cambia a dorado sin explicación**
- Dónde: `constructor/campos.tsx:91`.
- Problema: el usuario lo lee como advertencia.
- Arreglo: barra fina de 2px bajo el campo, que se llena en verde en el rango ideal y en ámbar al pasarse, con tooltip "Ideal: 50 a 60".
- Severidad: baja.

**C6. Cola de subidas: avance poco visible**
- Dónde: `biblioteca/ColaSubidas.tsx:72-76`, barra de 1px en la cabecera.
- Arreglo: ver D1 (tarjetas fantasma en la grilla con progreso).
- Severidad: media.

---

## (D) Subida de archivos y biblioteca

**D1. Cola de subidas poco clara ante errores**
- Dónde: `biblioteca/ColaSubidas.tsx:92-118`.
- Problema: el error se corta ("No autorizado. Debe inici…"). "Reintentar" aparece también para errores que no se arreglan reintentando (sesión vencida). No hay "Reintentar todo" y el panel tapa la grilla abajo a la derecha. Lo que sube no aparece en la grilla hasta terminar.
- Arreglo: error en 2 líneas con `title` completo, "Reintentar todo" en la cabecera, sin reintento para errores de sesión o formato (con un "Volvé a entrar"), y tarjetas fantasma en la grilla con miniatura local y progreso que se convierten en el medio real.
- Severidad: alta. **[en curso]** (modal y cola).
- Captura: `audit-biblioteca-subida-error-1440.png`.

**D2. Sin validación antes de subir**
- Dónde: `biblioteca/useSubidas.ts` (`agregar` no revisa tipo ni peso). Al arrastrar se saltea el `accept` del input.
- Problema: un `.heic` o un video de 400 MB recién falla después del viaje al servidor.
- Arreglo: validar en `agregar` contra las mismas listas de `Biblioteca.tsx:30`, con error inmediato por archivo: "Foto.heic: formato no admitido. Usá JPG, PNG, WebP o AVIF."
- Severidad: media.

**D3. Modal SelectorMedios**
- Dónde: `pickers/SelectorMedios.tsx:242-260` y `:368-372`.
- Problemas:
  - En selección única, cada miniatura tiene un checkbox (parece selección múltiple) y el doble clic para elegir no se anuncia.
  - Las miniaturas no tienen nombre ni medidas.
  - En "Subir", la zona de arrastre ocupa 645px vacíos. Después de subir, el archivo queda chico abajo y el pie sigue diciendo "Tocá una para elegirla".
  - Las pestañas usan `role=tab` sin `tabpanel` ni flechas.
- Arreglo:
  - Una sola vista. La grilla de la biblioteca acepta archivos arrastrados encima y tiene una franja de subida compacta de 120px arriba. Lo recién subido aparece primero, elegido, con progreso.
  - En selección única, borde de 2px `col-ink` más un check en la esquina, sin checkbox.
  - Nombre y medidas al pie de cada miniatura (12px).
  - El pie dice "1 elegida: foto-3.jpg".
- Severidad: alta. **[en curso]** (modal de subida).
- Captura: `audit-selector-biblioteca-1440.png`, `audit-selector-subir-1440.png`, `audit-selector-subir-resultado-1440.png`.

**D4. Jerga técnica en la biblioteca**
- Dónde: filtros "Sin alt" y "Sin crédito" (`biblioteca/Biblioteca.tsx:22-28`), badges naranjas "SIN ALT / SIN CRÉDITO" en cada miniatura en hover, y "Texto alternativo" con "FALTA" (`biblioteca/DetalleMedio.tsx:533`).
- Problema: el equipo de viajes no sabe qué es "alt". Los badges naranjas en hover alarman.
- Arreglo: "Sin descripción" y "Sin autor", y en la miniatura un solo punto discreto con tooltip. El campo se llama "Descripción de la foto (para Google y lectores de pantalla)".
- Severidad: media.
- Captura: `audit-biblioteca-subida-error-1440.png`, `audit-biblioteca-detalle-1440.png`.

**D5. Checkbox de selección de 24px**
- Dónde: `biblioteca/Grilla.tsx`, checkbox de 24×24 en la esquina.
- Arreglo: 32px visibles y 44px de área.
- Severidad: baja.
- Captura: `audit-biblioteca-seleccion-confirmar-1440.png`.

**D6. Mensaje de sesión crudo**
- Dónde: `src/lib/require-auth.ts:31` dice "No autorizado. Debe iniciar sesion." (sin tilde y de usted). Se muestra tal cual en la biblioteca y en la cola.
- Arreglo: "Tu sesión venció. Volvé a entrar para seguir." con un botón que lleve al login.
- Severidad: media.

---

## (E) Flujos y usabilidad por módulo

### Inicio (solo código, sin ruta dev)

- **E1.** `app/backend/collection/page.tsx` no sigue el PLAN ("experiencias con portada grande y % de completitud, medios recientes, accesos rápidos"). Los números se centran en medios ("Medios", "Fotos sin alt") y no hay consultas nuevas, borradores pendientes ni "cambios sin publicar". La guía "Empezá por acá" queda para siempre, aunque esté completa. Los títulos saltan de H1 a H3. **Arreglo:** primera fila con consultas nuevas, experiencias en revisión y cambios sin publicar; después "Seguí donde dejaste" (3 experiencias con portada y completitud); la guía se oculta al completarse. Agregar `/dev/collection/inicio` para poder revisarla. Severidad: media.

### Experiencias

- **E2.** Filtros en dos filas a 1440 y tarjetas altas (B6, B12).
- **E3.** "Sin título" con 2.03:1 de contraste.

### Constructor

- **E4.** Cuatro columnas a 1440: riel de 76, pasos de 260, formulario de ~530 y vista previa de ~574. El formulario útil queda en unos 447px y de ahí salen los cortes de B4 y el recuadro de ayuda de Día a día partido en 5 líneas de 110px. **Arreglo:** pasos como columna compacta de 64px (número más tooltip) desde 1280 hasta 1536, formulario de al menos 560px y vista previa al 40% redimensionable. Severidad: alta. Captura: `audit-constructor-dias-1440.png`.
- **E5.** El paso incompleto se ve igual que uno no visitado (número gris). Publicar muestra un anillo parcial. **Arreglo:** 3 estados: completo (check), incompleto (punto ámbar con "Falta: descripción para Google" en tooltip) y sin tocar (número). Severidad: media. Captura: `audit-constructor-publicar-1440.png`.
- **E6.** Galería: "9 de 6 mínimo" (`constructor/pasos/Galeria.tsx:106`) en dorado grande. **Arreglo:** "9 fotos" con "mínimo 6" debajo en `col-muted` y un check. Además, las leyendas de las miniaturas se cortan ("Kayak al amanec"). Severidad: baja. Captura: `audit-constructor-galeria-1440.png`.
- **E7.** Detalles: el placeholder del alta repite un ítem que ya existe ("Traslados privados en cada destino y Enter"). **Arreglo:** "Ej.: Seguro de viaje" y la tecla en un `kbd` aparte. Severidad: baja. Captura: `audit-constructor-detalles-1440.png`.
- **E8.** Compartir: el contador va debajo del campo, mientras que en el resto va a la derecha de la etiqueta. Severidad: baja.
- **E9.** Publicar: aparece "Para publicar falta: título y descripción para google" porque `constructor/pasos/Publicar.tsx:218` aplica `toLowerCase()`. **Arreglo:** lista con links a cada paso y sin pasar a minúscula. La vista previa de Publicar se titula "Portada, datos y especialista", que confunde. Severidad: media.
- **E10.** Modo lectura: un aviso de texto plano arriba del formulario, mientras las tarjetas de tipo siguen pareciendo clicables. **Arreglo:** franja con ícono de candado y fondo `col-line/40`, y controles con `cursor-default` sin hover. Severidad: baja. Captura: `audit-constructor-lectura-1440.png`.
- **E11.** El atajo "Alt + ↑ ↓" va a 11px con 2.85:1 de contraste (`constructor/Constructor.tsx:335`). Severidad: baja.

### Destinos

- **E12.** Inline "Nuevo destino" (B1). Al crear, abre la hoja, y eso está bien. El vacío no tiene CTA (B13). En la hoja, el prefijo de la dirección web es largo y deja poco lugar para el slug. **Arreglo:** prefijo "…/destinos/" con tooltip del dominio completo. Severidad: baja.

### Biblioteca

- **E13.** Ver la sección D.

### Especialistas

- **E14.** "Quienes arman cada viaje" sin tilde (`contenido/Especialistas.tsx:175`). La ayuda dice "Completa “Tu especialista en …”." y debería decir "Completá" (`:360`). El interruptor publica u oculta sin aviso (B8). Severidad: baja.

### Aliados

- **E15.** Los logos de prueba mezclan familias tipográficas. El chip "+ Otro tipo" va punteado y en sentence case al lado de chips en mayúscula. El interruptor de la tarjeta no tiene texto. Hay un tipo "Navegación" además de "Naviera" (revisar si son el mismo). Severidad: baja. Captura: `audit-aliados-hoja-1440.png`.

### Testimonios

- **E16.** El pie de cada tarjeta muestra "Filipinas en bangka" sin decir qué es. **Arreglo:** "Viaje: Filipinas en bangka". Severidad: baja.

### Preguntas

- **E17.** No hay chip "Todas". El placeholder de "Nueva categoría" es "Reservas, Pagos…", o sea categorías que ya existen. Las preguntas se ven en Cormorant de 22px en la lista y otra vez en la vista previa, y la pantalla duplica su contenido. **Arreglo:** placeholder "Ej.: Visados" y una vista previa plegable. Severidad: baja. Captura: `audit-preguntas-nuevacat-1440.png`.

### Journal

- **E18.** Debajo de 1024px el editor pierde la navegación de secciones (`journal/EditorArticulo.tsx:246`, `hidden lg:flex` sin reemplazo; el constructor sí tiene un `<select>` en `Constructor.tsx:653-656`). Severidad: alta. Captura: `audit-journal-editor-390.png`.
- **E19.** Tiempo de lectura: la lista dice "8 min" y la vista previa del mismo artículo "1 min". Puede venir de los datos de prueba; hay que verificarlo con datos reales. Severidad: baja.

### Páginas

- **E20.** El editor no funciona en celular: el aside es de `w-[300px]` fijo (`paginas/EditorPagina.tsx:292`) y deja 90px al formulario. Severidad: alta. Ver G1.
- **E21.** Las legales son una página de bloques con un único bloque "Texto" cuyo antetítulo tiene de placeholder "Viajes de autor". **Arreglo:** para legales, un editor de texto directo sin "Agregar bloque". Severidad: baja. Captura: `audit-paginas-terminos-1440.png`.
- **E22.** La vista previa "Escritorio" escala el texto a ~6px y no se lee. **Arreglo:** escala mínima de 0.6 con scroll horizontal, o mostrar celular por defecto. Severidad: media.

### Consultas

- **E23.** Ver B11 y A9. "Prefiere whatsapp" sale en minúscula por el `toLowerCase()` de `consultas/Consultas.tsx:495`. En Newsletter, las filas en "Baja" dicen "Confirmó 30 ago. 2026" (`:734`) y deberían decir "Se dio de baja el …". El origen "Newsletter /" muestra la ruta cruda, mejor "Newsletter · Inicio". "Exportar CSV" mide 48px al lado de chips de 36px. Severidad: media. Captura: `audit-consultas-newsletter-1440.png`.

### Ajustes

- **E24.** Indexación le explica al cliente una variable de Railway (`ajustes/Ajustes.tsx:271`, `:275`). **Arreglo:** "El sitio todavía no aparece en Google. Lo activamos el día del lanzamiento." Las tarjetas blancas con borde no siguen el estilo de los demás módulos. Los placeholders parecen valores (B3). La imagen para compartir solo muestra "Quitar", sin "Cambiar". Severidad: media. Captura: `audit-ajustes-scroll2-1440.png`.

### Equipo (solo código)

- **E25.** "Super admin" se activa con un interruptor y no encontré confirmación en `equipo/Equipo.tsx:171-176`, aunque da acceso total. **Arreglo:** confirmación en línea ("Darle acceso total a Agustina?"). El ancho de 1080px difiere del resto (A11). Agregar `/dev/collection/equipo`. Severidad: media.

---

## (F) Accesibilidad

**F1. Enter y Espacio en tarjetas arrastrables no abren nada**
- Dónde: el `KeyboardSensor` de dnd-kit captura la tecla porque los `listeners` están en el mismo botón o link. Lo verifiqué con puppeteer: enfoco la tarjeta, presiono Enter y no se abre la hoja ni se navega. Pasa en `contenido/Destinos.tsx:319`, `contenido/Especialistas.tsx:268`, `aliados/Aliados.tsx:301`, `testimonios/Testimonios.tsx:260` y `experiencias/ListaExperiencias.tsx:237`.
- Problema: con teclado no se puede editar nada de esos módulos. Además `attributes` le pone `role=button` al link de Experiencias.
- Arreglo: un asa de arrastre aparte (`setActivatorNodeRef`, botón de 32px "Mover Misterios de Oriente") y el resto de la tarjeta como botón o link normal.
- Severidad: alta.
- Captura: `audit-a11y-enter-tarjeta-destino-1440.png`.

**F2. Contraste**
- Ver A3, A4 y A10. Los peores casos: números dorados de Recorrido (1.77:1), "Sin título" (2.03:1), conteos de chips (2.69:1), atajo de teclado (2.85:1), "Cambios sin publicar" (3.25:1) y títulos de grupo del riel (3.73:1).
- Severidad: alta.

**F3. El foco no se ve sobre el gris base**
- Dónde: el outline dorado `#F4B860` da 1.55:1 sobre `#F0F0F0` y 1.77:1 sobre blanco. No llega al 3:1 que se pide a indicadores no textuales.
- Arreglo: un anillo doble (2px `col-ink` más 2px de halo dorado), o `outline: 2px solid #32373B` con `box-shadow 0 0 0 4px rgba(244,184,96,.45)`.
- Severidad: alta.

**F4. Áreas táctiles chicas**
- Dónde: interruptores de 36×20; chips de 36px; acciones de bloque Ocultar, Duplicar y Eliminar de 28×28 (`paginas/EditorPagina.tsx`); "Quitar" email de 24×24 (Ajustes); checkbox de 24 (Biblioteca); asas de 24×32; migas de 18px de alto.
- Arreglo: mínimo 40px (44 en táctil) con un pseudo-elemento `::after` `inset:-8px`.
- Severidad: media.

**F5. No hay "Saltar al contenido"**
- Problema: hacen falta 16 Tab para llegar al contenido de Experiencias.
- Arreglo: un link visible al enfocar como primer elemento, y `id="contenido"` en `<main>`.
- Severidad: media.

**F6. Errores anunciados como estado**
- Dónde: los avisos de error usan `role=status` (`shell/Avisos.tsx:38-39`).
- Arreglo: separar en dos regiones, `polite` para éxito y `assertive` para error.
- Severidad: baja.

**F7. Pestañas del selector incompletas**
- Dónde: `pickers/SelectorMedios.tsx:242`, `role=tablist` sin `aria-controls` ni flechas.
- Arreglo: usar `Tabs` de radix-ui, que ya está instalado.
- Severidad: baja.

**F8. Textos de 10–10.5px**
- Dónde: pills de estado, "Pronto", el badge "Falta" y el `kbd`.
- Arreglo: mínimo 12px.
- Severidad: baja.

---

## (G) Responsive

**G1. Páginas a 390: el formulario queda en 90px**
- Dónde: `paginas/EditorPagina.tsx:292`.
- Arreglo: debajo de `lg`, la lista de bloques pasa a un selector o desplegable arriba, como en el constructor.
- Severidad: alta.
- Captura: `audit-paginas-inicio-390.png`.

**G2. El botón flotante "Vista previa" tapa contenido**
- Dónde: en el constructor a 390 tapa la tarjeta "Hotel", a 1280 tapa "Crucero" y "Tren", y en Páginas a 390 tapa "Agregar bloque". Las posiciones están duplicadas e inconsistentes: `constructor/marco.tsx:137` usa `bottom-6` y `constructor/Constructor.tsx:456` usa `bottom-[76px]`.
- Arreglo: ponerlo dentro de la barra inferior sticky como botón secundario, o reservar `pb-24` en el contenedor del formulario.
- Severidad: alta.
- Captura: `audit-constructor-esencial-390.png`, `audit-constructor-esencial-1280.png`.

**G3. A 1280 no hay vista previa en el constructor**
- Problema: la mayoría de las laptops del equipo van a estar en 1280–1440, y a 1280 el constructor esconde la vista previa en un botón.
- Arreglo: ver E4 (pasos compactos para liberar 200px).
- Severidad: media.
- Captura: `audit-constructor-esencial-1280.png`.

**G4. Cabecera de hojas con grilla fija**
- Dónde: `contenido/Destinos.tsx:347` (`grid-cols-[200px_…]`) y `contenido/Especialistas.tsx:347` (`132px`). A 390, "Vista previa" se parte en 2 líneas y la descripción en 4.
- Arreglo: `grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)]`.
- Severidad: baja.
- Captura: `audit-destinos-hoja-390.png`.

**G5. Tarjetas a pantalla completa en celular**
- Problema: a 390, cada experiencia o destino ocupa una pantalla, así que 7 destinos son 7 pantallas.
- Arreglo: lista compacta con miniatura de 72px, título, estado y chevron debajo de `sm`.
- Severidad: media.
- Captura: `audit-experiencias-390.png`, `audit-destinos-hoja-390.png`.

**G6. Filtros plegados en desplegable**
- A 390 funcionan bien ("Estado | Todas 6"). Mantener.
- Captura: `audit-experiencias-390.png`.

**G7. Journal sin navegación en celular**
- Ver E18.

---

## Bugs funcionales y de copy

1. Enter y Espacio no abren tarjetas en 5 módulos (F1).
2. Editor de Páginas inutilizable en celular (G1) y editor del Journal sin secciones en celular (E18).
3. Paleta ⌘K: el botón dice "Buscar o ir a…" (`shell/CollectionShell.tsx:200-203`), pero `shell/PaletaComandos.tsx` solo lista módulos. Al escribir "fil" con "Filipinas" en pantalla, responde "No hay nada con ese nombre." **Arreglo:** buscar experiencias, destinos, artículos y consultas por título o código, y sumar acciones ("Nueva experiencia", "Subir fotos"). Captura: `audit-paleta-busqueda-1440.png`.
4. Newsletter: las bajas dicen "Confirmó …" (`consultas/Consultas.tsx:734`), y el origen muestra la ruta cruda "Newsletter /".
5. "descripción para google" en minúscula (`constructor/pasos/Publicar.tsx:218`) y "Prefiere whatsapp" (`consultas/Consultas.tsx:495`), en los dos casos por `toLowerCase()` sobre nombres propios.
6. "Quienes arman cada viaje" sin tilde (`contenido/Especialistas.tsx:175`) y "Completa" en lugar de "Completá" (`:360`).
7. "No autorizado. Debe iniciar sesion." llega crudo al usuario (`src/lib/require-auth.ts:31`).
8. Biblioteca en la ruta dev: en el primer render aparece "No autorizado…" porque StrictMode corre dos veces el efecto de `biblioteca/Biblioteca.tsx:108-116`. `primeraCarga` se consume en la primera pasada y la segunda llama a `listarMedios` real. En producción no se nota, pero en dev ensucia toda prueba visual. Captura: `audit-biblioteca-1440.png`.
9. Galería: "9 de 6 mínimo" (`constructor/pasos/Galeria.tsx:106`).
10. Ajustes expone la variable `COLLECTION_INDEXAR` y Railway (`ajustes/Ajustes.tsx:271`, `:275`).
11. Selector de una sola foto con checkboxes, y el pie habla de "tocar una" en la pestaña Subir.
12. Detalles y Nueva categoría: los placeholders repiten valores existentes (E7, E17).
13. Ocultar o publicar especialistas, aliados, testimonios y preguntas no da aviso ni permite deshacer.
14. Tiempo de lectura inconsistente entre la lista y la vista previa (verificar con datos reales).
15. Faltan rutas dev para Inicio y Equipo, así que no se pueden revisar sin sesión.
16. Super admin sin confirmación (E25).

---

## Top 15 priorizado

1. **F1.** Separar el asa de arrastre del botón de abrir en las 5 grillas (hoy el teclado no edita nada).
2. **B1.** Quitar el outline global de foco sobre inputs (`collection.css:9`). Es la causa del "texto pegado al borde".
3. **B2.** Un solo componente `Campo` (caja de 44px, radio 6, foco con ring) para input, textarea, select, stepper y editor de texto.
4. **G1 + E18.** Páginas y Journal usables debajo de 1024px (selector de bloques y secciones).
5. **E4 + G3.** Constructor: pasos compactos para dar al formulario 560px o más y mostrar la vista previa desde 1280. Resuelve B4.
6. **A3 + F2 + F3.** Tokens sólidos `col-muted` y `col-subtle`, y un foco con contraste de 3:1 o más.
7. **A4 + B7.** Color semántico de estados y dorado solo como acento, con un componente `Estado` único.
8. **A2.** Sentence case para botones, chips y etiquetas; mayúsculas solo en eyebrow y pills.
9. **D3 + D1.** Selector de medios en una sola vista con subida integrada y tarjetas fantasma con progreso; cola con errores legibles y "Reintentar todo". **[en curso]**
10. **A7.** Encabezado de página compacto: sin eyebrow duplicado, H1 de 34px y contenido arriba de y≈220.
11. **G2.** "Vista previa" dentro de la barra inferior, sin tapar el formulario.
12. **Bug 3.** Paleta ⌘K con búsqueda de contenido y acciones.
13. **B8 + B10 + C2.** Avisos con deshacer para todo lo que cambia el sitio público, y confirmación para super admin (E25).
14. **A1 + A5 + A6 + C1.** Escalas de tipo, sombra, radio y duración como tokens en `tailwind.config.ts`, con lint contra los valores arbitrarios. **[en curso]** en parte.
15. **Copy.** Arreglar los bugs 4, 5, 6, 7, 9 y 10, y la jerga de D4 ("alt", "crédito", Railway).
