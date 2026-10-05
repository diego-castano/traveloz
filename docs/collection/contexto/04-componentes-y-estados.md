# Componentes, estados y responsive

## Componentes a diseñar

| Componente | Notas |
|---|---|
| Header | Ítems: Nosotros · Destinos · Experiencias · Especialistas · Aliados y botón destacado Contactanos. Transparente sobre la portada, sólido al hacer scroll. En celular, menú a pantalla completa. |
| Wordmark | "traveloz" en sans gris claro y "collection" en cursiva dorada. Versión clara y oscura. Provisorio hasta que llegue el logo. |
| Portada de página | Imagen o video a sangre, título abajo a la izquierda, degradado muy sutil para legibilidad. |
| Tarjeta de destino | Imagen 4:5, nombre en serif, bajada de una línea. Al pasar el mouse, zoom lento de la imagen. |
| Tarjeta de experiencia | Misma anatomía que la de destino: imagen 4:5, duración, nombre y bajada. |
| Grilla de especialistas | Retrato 4:5, nombre, especialidad o región y una frase. Simple y concreta. |
| Grilla de aliados | Logo monocromo con una descripción breve al lado. |
| Etiqueta de datos | Mayúsculas, cuerpo chico, tracking amplio, separadas por punto medio. |
| Lista "lo imperdible" | Filetes finos entre ítems, numeración discreta. |
| Bloque de destino | Imagen fija y texto que avanza, o alternado izquierda-derecha. |
| Acordeón de día a día | Agrupado por destino, con el hotel de cada tramo adentro. |
| Carrusel de hoteles | Foto, nombre, una línea. Arrastrable en celular. |
| Incluye / no incluye | Dos columnas en escritorio, pestañas en celular. |
| Barra de consulta | Columna lateral en escritorio, barra inferior fija en celular. |
| Formulario | Campos en una columna, etiquetas arriba, sin cajas pesadas: filete inferior. |
| Chips de filtro | Para el índice de experiencias. |
| Footer | Menú, datos de contacto, WhatsApp, legales, endoso de Traveloz. |

## Estados que hay que diseñar

- **Destino vacío:** "Próximamente", elegante, con imagen.
- **Experiencia sin precio:** el caso normal.
- **Experiencia con precio "desde":** chico, al lado del botón, con la aclaración de que es por persona en base doble.
- **Formulario:** vacío, con foco, con error, enviando y enviado.
- **Fechas del formulario:** dos caminos, "tengo fechas" con rango y "todavía no sé" con mes aproximado.
- **Carga:** imagen fija mientras carga el video, placeholder difuminado en las fotos.

## Formulario de consulta

Nombre · email · teléfono con prefijo · ¿tenés fechas? (sí, con rango / todavía no, con mes) · noches aproximadas · pasajeros (adultos y niños) · ocasión (luna de miel, aniversario, familia, amigos, otro) · rango de inversión por persona (opcional) · canal preferido (WhatsApp, llamada, email) · comentarios · casilla de novedades.

En la experiencia se abre desde el botón fijo, ya sabiendo de qué experiencia viene. En Contactanos (antes "viaje a medida") es la versión completa, con destinos soñados y estilo de viaje.

## Responsive

| Punto de corte | Comportamiento |
|---|---|
| ≥ 1440 px | Contenido a 1200 px, márgenes amplios |
| 1024–1439 px | Grilla de 12 columnas, portadas al 90 % del alto |
| 768–1023 px | Dos columnas, el lateral de consulta pasa a barra inferior |
| < 768 px | Una columna, menú a pantalla completa, barra de consulta fija abajo, carruseles arrastrables |

El sitio se piensa primero en celular: la mayor parte del tráfico va a llegar desde publicidad, en el teléfono.

## Accesibilidad

Contraste mínimo de 4,5:1 en textos. El dorado sobre blanco no alcanza para cuerpo de texto: usarlo solo en detalles o sobre fondo oscuro. Foco visible en todos los campos y botones. Video siempre con imagen de respaldo y sin reproducción automática de sonido.
