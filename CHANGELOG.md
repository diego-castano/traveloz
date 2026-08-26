# Changelog

Registro de lo que fue cambiando en Traveloz, contado para que se entienda sin
abrir el código. Lo más reciente arriba. Las fechas son de cuando se desplegó a
producción, no de cuando se escribió.

Convención de las secciones: **Arreglado** es algo que estaba roto, **Nuevo** es
algo que antes no existía, **Cambiado** es algo que funcionaba y ahora funciona
distinto, y **Operación** es lo que se tocó fuera del código (variables, datos
del catálogo, CRM).

---

## 26 de agosto de 2026

### Cambiado

**Ronda de feedback del check-in en producción (Gero y Pablo, 26/08).**

- **Formulario de datos de pasajeros, más corto y obligatorio.** Se va el
  bloque de datos del viaje. Por pasajero quedan cinco campos obligatorios:
  nombre y apellido (uno solo), documento de viaje (cédula o pasaporte),
  fecha de nacimiento, email y teléfono. Ciudad, país y dirección solo se
  piden en la factura con RUT. Un único "Foto del documento" y un "Adjuntar
  archivo", los dos opcionales: sin foto también se puede enviar.
- **Formulario de tarjeta reordenado.** Arriba el pasajero (nombre y
  documento de quien viaja); abajo la tarjeta: titular tal cual figura,
  número, vencimiento, código y cuotas de 1 a 6. Las tarjetas se listan por
  el nombre del pasajero. El botón y el aviso de "Datos de tarjeta" pasan de
  rojo a violeta.
- **La bóveda guarda 96 horas** (antes 72) para cubrir el fin de semana.
- **"Enviar a ADM"** al lado de "Ver datos": pide el número de file, manda
  los datos a la casilla de administración (se configura en Web →
  Notificaciones) y queda registrado quién lo envió y cuándo. Abrir "Ver
  datos" también queda en el registro de accesos.
- **Cotizador.** Elegir un cliente del historial carga solo sus datos, nunca
  la cotización anterior. El régimen del encabezado cambia todos los hoteles,
  y el modo "Régimen detallado" deja cada hotel a mano y escribe "según
  régimen detallado" en servicios. Fecha de check-in editable por destino
  (vuelos nocturnos). "Agregar habitación" vive solo dentro de cada opción y
  replica la habitación en las demás. El selector de personas llega a 5 y
  después "Más…" editable.
- **PDF.** Cada tramo de vuelo (aerolínea, ruta y espera) y cada opción de
  alojamiento van enteros; el itinerario se reparte entre páginas solo en
  las escalas, así la primera hoja no queda vacía. El título de la
  cotización ya no repite "Jamaica › Jamaica" cuando la ciudad se llama como
  el país. Se sumaron 89 aeropuertos (Montego Bay, Kingston, Orlando, Nueva
  York, Ámsterdam, Londres…) para que el itinerario muestre el nombre del
  aeropuerto; si alguno no está, se muestra solo el código. El logo del encabezado es la imagen del sitio,
  que imprime bien en cualquier navegador. Las notas aparecen solo si hay
  notas. Se quitó la línea de validez del PDF y de la página del pasajero.
- El selector celular/tablet/escritorio que había quedado en el panel "Lo que
  ve el pasajero" del editor se retiró; "Vista previa" sigue abriendo la
  previsualización completa.
- **La vigencia por defecto de una cotización pasa a 96 horas hábiles** (antes
  48). El modal de compartir ofrece 24 / 48 / 72 / 96 y el valor inicial se
  edita en Ajustes. Las cotizaciones ya enviadas conservan su vigencia.
- Confirmado con el cliente el circuito de tarjetas: el vendedor recibe solo
  el aviso de que entró una tarjeta; los datos quedan en la bóveda del sistema
  y salen a Administración con el número de file desde "Enviar a ADM".

### Arreglado

- **No se podía escribir "@" en el email del cliente** desde Mac con teclado
  español: el atajo Alt+número para saltar de bloque se comía Option+2.
  Los atajos ya no actúan mientras se escribe en un campo.

## 25 de agosto de 2026

### Cambiado

**La página que ve el cliente y el PDF, rediseñados.** El link `traveloz.com.uy/c/…`
heredaba la barra violeta y el footer oscuro del sitio; ahora tiene su propio
marco: wordmark arriba, la cotización, y un cierre discreto con dirección,
teléfono y web de la agencia. Tipografía con jerarquía (el precio manda),
sombras tintadas, entradas escalonadas y respuesta al tacto en botones, sin
animaciones para quien las desactiva en su dispositivo. Los logos de pago ya
no aparecen vacíos hasta scrollear. Sin nombre de cliente, el saludo dice
"¡Hola! ¿Cómo estás?". El PDF gana tabla de tarifas con líneas finas y
números alineados, firma con más presencia y mismo recuento de páginas.

**El panel trabaja con más espacio.** Al entrar al cotizador el menú lateral
se colapsa solo y vuelve a como estaba al salir. Los selectores largos
(ciudad del traslado, ciudad del hotel nuevo, vendedor en "Ver como" y en
Analytics, destino en los filtros) pasan a ser buscadores: escribís "mont" y
elegís. Un botón **Mis links**, en el inicio y en el editor, muestra los links
de datos de pasajeros y de tarjeta del vendedor para copiar o mandar por
WhatsApp sin abrir Compartir.

### Arreglado

- **Un vendedor creado desde Perfiles no podía abrir "Datos de pasajeros" ni
  "Datos de tarjeta"**: veía "An error occurred in the Server Components
  render". El alta no le generaba el link personal (slug) y el modal fallaba
  al pedirlo. Ahora el link se genera al crear el usuario y, si a alguno le
  faltara, se genera solo al abrir el modal. Los avisos de negocio de ese
  módulo (sin link, tope diario de solicitudes, email inválido) vuelven como
  mensajes legibles en vez de errores enmascarados.
- La vista de impresión de demo (`?imprimir=demo`) dejaba borradores en el
  seguimiento cada vez que se usaba para generar un PDF de prueba. Ya no
  guarda nada.

### Nuevo

**Ajustes pedidos por Gero después de ver el cotizador funcionando.**

- **Analytics por vendedor**, solo para administradores: creadas, enviadas,
  tasa de apertura y de confirmación, monto confirmado, tiempo hasta la
  primera apertura, lectura promedio, embudo por sección, dispositivos y
  destinos, por vendedor y por semana, con rango de fechas y exportación a
  CSV. Los vendedores no ven esta pestaña.
- **La vigencia no corre los fines de semana.** Las 48 horas por defecto son
  hábiles: una cotización mandada el viernes a las 15:00 vence el martes a
  las 15:00. El email y la página del pasajero dicen la fecha y hora
  concretas ("válida hasta el martes 25 de agosto a las 15:00") y el panel
  muestra las horas hábiles que quedan.
- **Semáforo en el listado.** Arriba de la grilla, cuatro chips que filtran:
  vencidas sin abrir, más de 24 h hábiles sin abrir, abiertas o confirmadas,
  borradores. El botón "Cotizador" de la vista de vendedor muestra cuántas
  requieren acción hoy.
- **Recordatorio con texto propio**: "te escribo por la cotización que te
  mandé el martes 25, sigue disponible hasta el jueves 27 a las 15:00", en
  WhatsApp y en email, sin repetir el mensaje inicial.
- **Título de la cotización editable.** Se precarga desde el paquete ("Caribe
  › Jamaica, Octubre 2026") y el vendedor lo puede reescribir libremente; el
  autocompletado sugiere ciudades pero no obliga a elegir una.
- **Hoteles nuevos desde el buscador.** Cuando el hotel no está en el
  catálogo, además de escribirlo como texto libre, el vendedor puede crearlo
  en el catálogo en el momento (nombre, ciudad, estrellas) y queda disponible
  para todos.
- **PDF sin páginas casi vacías.** La paginación se ajustó para las tres
  formas típicas (corta, con vuelos, con varias opciones y notas): sin
  títulos huérfanos, sin tarjetas partidas y con la firma siempre acompañada.

## 24 de agosto de 2026

### Nuevo

**El cotizador cierra el circuito con el pasajero: link real, lectura
registrada, confirmación, PDF y lector de itinerarios.**

- **Link público de la cotización.** Cada envío genera un link corto
  `traveloz.com.uy/c/xxxxxxxx` con vigencia (24/48/72 h). El pasajero ve la
  cotización tal cual la aprobó Gero, en celular o escritorio. Vencido el
  link, ve un aviso con el WhatsApp del vendedor para pedir una nueva. Al
  pasajero le llega solo lo que tiene que ver: precios de venta, nunca netos,
  factores ni notas internas.
- **WhatsApp y email de verdad.** La pestaña WhatsApp arma el mensaje con el
  link y abre la conversación con el cliente; la de Email lo manda desde
  `notificaciones@app.traveloz.com.uy` con copia a la casilla configurada,
  destinatarios extra, respuesta al vendedor y **el PDF adjunto**.
- **Se registra la lectura.** Cuántas veces la abrió, desde qué dispositivo,
  cuánto tardó en abrirla, cuánto tiempo la leyó y hasta qué sección llegó.
  La cotización pasa sola a "Abierta"; el semáforo, "Para hoy" y el embudo
  del drawer usan esos datos reales.
- **Confirmación desde el link.** "Confirmar esta opción" registra la
  confirmación (con fecha, IP y dispositivo, vale como firma), le manda un
  email al vendedor, deja comentario en el negocio abierto de Bitrix si el
  contacto tiene uno, y muestra al pasajero el botón para cargar los datos
  de los pasajeros. "Solicitar una revisión" avisa al vendedor por email.
- **PDF desde el sistema.** "Descargar PDF" en Compartir y en el drawer
  genera el PDF en el servidor con la misma hoja que ve el pasajero; es el
  mismo archivo que va adjunto en el email.
- **Lector de itinerarios con IA.** Pegar el código del GDS o una captura de
  pantalla (foto, o Ctrl+V) carga los vuelos solos; el parser local sigue
  respondiendo al instante y la IA completa fechas y tramos. Costo estimado:
  menos de US$ 5 por mes.
- **Pasajeros y Pagos atados a la cotización.** En Compartir hay una pestaña
  "Datos del pasajero" con los dos links del vendedor (datos de pasajeros y
  datos de tarjeta): copiar, mandar por WhatsApp o pedir por email con una
  solicitud que ya lleva el número de cotización y el destino. El drawer
  muestra lo que volvió: solicitudes vigentes, pasajeros cargados y tarjetas
  en la bóveda, con acceso a cada ficha. Desde la bandeja de pasajeros, la
  referencia abre la cotización. Al confirmar, el pasajero ve los dos
  botones (pasajeros y pago), y el email al vendedor los trae listos para
  reenviar. Los botones de WhatsApp ahora arman el número con código de país
  (`wa.me/59899…`), antes fallaban con celulares locales.

**El cotizador dejó de ser un mockup: vive adentro del panel y guarda en la
base.** Hasta hoy vivía en una URL suelta, sin login, y todo lo que se armaba
se perdía al cerrar la pestaña.

- **Entrada desde el panel.** Aparece como "Cotizador" en el menú del
  administrador y como botón arriba en la vista de vendedor, al lado de
  "Datos de pasajeros". La URL vieja `/cotizador` redirige a la nueva
  `/backend/cotizador`, que pide login como el resto del panel. "← Panel"
  vuelve al inicio de cada uno: el administrador a su tablero, el vendedor a
  su vista. El módulo viejo "Cotizadores" del menú pasó a llamarse "Landings
  por marca" para que no se confundan.
- **Cada vendedor ve sus cotizaciones, el administrador todas.** El filtro
  "Ver como" quedó solo para administradores y filtra por vendedor real. El
  servidor aplica el mismo corte en cada acción: un vendedor no puede abrir,
  editar ni borrar una cotización ajena aunque conozca el número.
- **Se guarda solo.** Cada cambio se graba a los 1,5 segundos; el indicador
  de la esquina dice si está guardando, guardado o si falló (y reintenta). El
  número COT-2026-NNNN se asigna en el primer guardado: abrir y cerrar sin
  tocar nada no gasta número. Volver, duplicar o cerrar la pestaña fuerza el
  guardado.
- **Paquetes, hoteles y ciudades reales.** "Desde un paquete" lista los
  paquetes activos del panel con su foto, y precarga destinos, noches,
  servicios, régimen por hotel y una tarifa por adulto en base doble cuyo
  precio se calcula con la misma fórmula que usa el panel de paquetes
  (neto de aéreo, traslados, seguros y circuito + noches de hotel al precio
  del período, dividido por el factor de la opción). El buscador de hoteles
  usa el catálogo de alojamientos con sus fotos; los hoteles escritos a mano
  siguen funcionando. Los favoritos (estrella) quedan guardados por vendedor.
- **Firma del vendedor real.** Foto, nombre, cargo, teléfono, WhatsApp, email
  y el link personal de datos de pasajeros salen del perfil del usuario. El
  cargo es un campo nuevo del perfil.
- **Seguimiento con datos reales.** La grilla, "Para hoy", el semáforo, las
  plantillas y Analytics salen de la base. La vigencia del link (24/48/72 h)
  se respeta al calcular "vencida". Las métricas de lectura del pasajero
  (aperturas, tiempo, hasta dónde llegó) muestran "Sin datos todavía" hasta
  la próxima entrega.
- **Ajustes.** Los administradores editan en `/backend/cotizador/ajustes` el
  mensaje que acompaña cada cotización, las condiciones, la vigencia por
  defecto, la casilla de copia y el factor inicial.
- **Buscador de clientes.** Escribir un nombre o teléfono en el bloque
  Cliente busca en las cotizaciones anteriores del vendedor y ofrece "Usar
  datos" o "Usar como base".
- **Lo que todavía no está:** el envío real por WhatsApp y email, el link
  público del pasajero y el PDF adjunto llegan en la próxima entrega. Las
  pestañas quedan visibles pero apagadas; mientras tanto se manda el PDF
  desde la vista de impresión y se usa "Marcar como enviada" para que el
  seguimiento cuente la vigencia.

### Arreglado

**Ajustes que salieron de probar el cotizador en producción con un admin y un
vendedor de prueba.**

- **Las tipografías de marca se perdían al entrar al cotizador desde el
  menú.** La política de seguridad del navegador se fija con la primera
  página que carga; si entrabas por el dashboard y después ibas al
  cotizador, las fuentes de Google quedaban bloqueadas y todo salía en la
  tipografía del sistema (también en el PDF). Ahora todo el panel las
  permite.
- **"Travel" salía gris en el encabezado de la cotización** sobre el
  degradado coral. Dentro de la píldora blanca el wordmark usa la tinta
  oscura.
- **El navegador preguntaba "¿Salir del sitio?" al cambiar de sección**
  aunque no hubiera ninguna cotización abierta. Ahora solo pregunta si el
  editor está abierto con cambios sin guardar.
- **Eliminar un usuario con cotizaciones daba "Error" a secas.** Ahora
  explica que ese usuario tiene cotizaciones y que hay que desactivarlo (las
  cotizaciones no se borran en cascada, a propósito).

### Operación

- Las tipografías del cotizador (DM Sans, Playfair Display, JetBrains Mono)
  ahora se sirven desde el propio sitio (`/fonts/cotizador`, licencia OFL).
  Antes venían de Google Fonts, que el Chromium del servidor no alcanzaba y
  el PDF salía con una tipografía genérica. De paso el panel dejó de
  necesitar excepciones de seguridad para fuentes externas.
- Chromium entra al contenedor de Railway vía `nixpacks.toml` (paquetes
  `chromium`, `dejavu_fonts`, `freefont_ttf`) para generar los PDF. Chequeo
  post-deploy: `/api/cotizador/pdf/salud` (solo admin). Variables nuevas,
  todas opcionales: `COTIZADOR_PDF_OFF=1` apaga el PDF (el email sale con el
  link), `COTIZADOR_IA_OFF=1` apaga el lector, `GEMINI_MODELO` cambia el
  modelo, `PUPPETEER_EXECUTABLE_PATH` fuerza la ruta de Chromium.
- Migración `20260824120000_presupuestos`: tablas Presupuesto,
  PresupuestoEvento, PresupuestoLink, PresupuestoApertura,
  PlantillaPresupuesto, HotelFavorito, Aeropuerto y Aerolinea; columna
  `cargo` en User; 18 aeropuertos, 12 aerolíneas y 5 ajustes del grupo
  "cotizador" cargados. Nada se borra ni se modifica de lo existente.

### Cambiado

**El cotizador incorpora la ronda de chequeo del 19/08 con Gero y Santi.**

- **El margen se maneja por tarifa.** Desapareció el bloque de abajo con el
  factor global, el precio de venta y la línea de margen ("es al pedo que
  figure"). Ahora cada tarifa tiene neto, venta y factor en la misma fila:
  arranca en 0,88 (12%, el mínimo aceptable), si cambiás la venta el factor
  se recalcula para mostrar la relación real, y si cambiás el factor la venta
  se recalcula. El precio de la opción se lee en su cabecera.
- **Régimen por hotel.** Dentro de cada opción, cada hotel lleva su régimen
  (Madrid con desayuno, Barcelona solo alojamiento) al lado del buscador, que
  se achicó para hacerle lugar. El pasajero lo ve hotel por hotel.
- **La línea de noches separa por destino.** "15 noches de alojamiento" pasó
  a "03 noches en Madrid · 03 noches en Barcelona · Desayuno incluido", y si
  los regímenes difieren, cada destino aclara el suyo entre paréntesis.
- **"+ Habitación" duplica la anterior** con ocupación, tipo y tarifas, y el
  tipo de habitación arranca en "Estándar".
- **La IA arma siempre en blanco.** Marcha atrás del cliente: al pegar una
  consulta de WhatsApp ya no busca ni ofrece paquetes de la web; arma la
  cotización de cero con el destino, el mes, las noches y los pasajeros que
  entendió. Si el pedido existe como paquete, se arranca desde "Desde un
  paquete o plantilla".
- **Hoteles propios y favoritos.** El hotel que se escribe a mano queda
  guardado para la próxima cotización (marcado "propio"), y cada hotel del
  buscador tiene una estrellita para marcarlo favorito y que aparezca primero.
- **Vuelos:** botón "Borrar itinerario" para arrancar de nuevo sin borrar de a
  un tramo; las horas salen con "hs" en la cotización; y solo vuelos suma el
  precio por infante.
- **Servicios:** las sugerencias de seguro quedaron en "Seguro de Asistencia
  al Viajero", sin básica, premium ni cancelación.
- **En la card de la opción los hoteles no se repiten:** la línea resumen con
  los nombres unidos por "+" se muestra solo con la card cerrada; abierta, el
  detalle ya los lista.

**El confirmador cierra el circuito con los datos de pasajeros.** Cuando el
pasajero toca "Confirmar esta opción" en su cotización, además del aviso de
que el vendedor lo contacta, aparece el botón "Cargar los datos de los
pasajeros" con el link personal del vendedor: el mismo flujo que pidió el
cliente ("apretás confirmar, ya te pido datos de pasajero").

**Los logos de pago son los del sitio.** En vez de chips de texto, la
cotización muestra los mismos logos que publica traveloz.com.uy en el detalle
de paquete: Visa, OCA, Mastercard y American Express; Santander, Itaú, BBVA
y Banco República.

### Arreglado

**Cambiar el mes arriba no movía la fecha de salida.** Era el bug que vieron
en "solo vuelos": el PNR fija la fecha (1 de octubre) y al elegir después otro
mes en el encabezado, la fecha quedaba clavada. Ahora mes, año y fecha de
salida van atados en las dos direcciones: cambiás el mes o el año y la fecha
se acomoda conservando el día; cambiás la fecha y el encabezado la sigue.

**El PDF salía "sin estilos".** Chrome apaga fondos y degradés al imprimir,
así que la vista de impresión quedaba plana. Ahora se fuerzan los colores en
la hoja, los títulos de sección no quedan huérfanos al pie de una página y la
firma viaja junto al cierre. Se agregó `?imprimir=demo` para generar el PDF de
prueba sin clickear nada; el resultado se verificó con un PDF real de cinco
páginas: encabezado con marca, itinerario Ida/Vuelta, tres opciones una debajo
de la otra, notas, condiciones, pagos y firma.

---

## 19 de agosto de 2026

### Nuevo

**La cotización ahora se imprime de verdad.** Gero preguntó cómo se ve al
imprimir y la respuesta era "mal": el botón de PDF no hacía nada. Ahora
Compartir → PDF abre la vista de impresión con el branding completo: las
opciones salen una debajo de la otra, todas abiertas, sin el selector ni los
botones de confirmar, y con los saltos de página cuidados para que ni las
tarjetas de vuelos, ni las tarifas, ni la firma se corten al medio. Desde ahí
se guarda el PDF o se manda a la impresora.

**Estrellas para el hotel libre.** Cuando el hotel se escribe a mano (no está
en el catálogo) ahora aparecen cinco estrellas al lado: un clic marca la
categoría, el mismo clic la saca, y salen en lo que ve el pasajero.

### Cambiado

**El mensaje al pasajero es uno solo.** Se eliminó el editor de "mensaje
adicional" con formato: si hay que decir algo más, se escribe en el mismo
mensaje automático y listo, como pidió el cliente.

**El calendario arranca en el mes elegido.** Si el encabezado dice Diciembre,
la fecha de salida abre el calendario en diciembre, no en el mes actual.

**El botón de duplicar opción ahora es un "+".** Agrega una opción en las
mismas condiciones que la que estás mirando — mismas habitaciones, tarifas y
régimen — para cambiar solo hotel y precio.

---

## 18 de agosto de 2026

### Nuevo

**El lector de itinerarios con IA quedó probado con los ejemplos reales del
cliente.** Gero mandó el mismo vuelo de Copa (Montevideo–Punta Cana vía Panamá)
en sus dos formatos — el código crudo de Amadeus y la captura de la herramienta
NDC — y Gemini los leyó a los dos sin un solo error, segmento por segmento:
vuelos, horarios, la llegada al día siguiente y el agrupado en Ida y Vuelta.
Cada lectura tarda 2-3 segundos y cuesta una décima de centavo de dólar: las
4.000 cotizaciones mensuales de las dos agencias salen menos de 5 dólares por
mes, contra la suscripción de PNR Converter que hoy pagan y que además no lee
imágenes. El prompt, el esquema de salida y el set de pruebas quedaron en
`scripts/poc-lector-itinerarios.mjs` con los ejemplos en `docs/pnr-ejemplos/`,
listos para el endpoint real. La clave de Gemini ya está cargada en Railway.

### Cambiado

**El itinerario de la cotización se ve como lo diseñó Gero.** Adoptamos su
referencia: tarjetas de Ida y Vuelta con la fecha en criollo ("Jueves 01 Oct"),
cada vuelo con su aerolínea y número, la ruta vertical con puntos de color de
la marca, la ciudad en grande con su hora, el aeropuerto con nombre propio
("Aeropuerto de Carrasco (MVD)"), la espera entre vuelos en un cartelito ámbar
("Espera de 56 min") y el aviso de "+1 día" cuando se aterriza al día
siguiente.

### Arreglado

**El conversor del mockup no leía el código real de Amadeus.** El formato que
usa el cliente trae un asterisco (`4*MVDPTY`) que el lector no toleraba y el
estado DK además de HK. Ahora el botón "Pegar ejemplo" usa el código real de
Copa que mandó Gero — con sus líneas de ruido incluidas, que se saltean solas —
y el formato viejo de LATAM sigue funcionando.

---

## 14 de agosto de 2026

### Cambiado

**El cotizador incorpora todo lo pedido en la reunión de chequeo del 14/08.**
Sigue en mockup, pero el flujo quedó como lo validaron Gero y Santi:

- **Mensaje automático con plantilla.** Toda cotización arranca con el texto
  que definió el cliente ("Hola {nombre}… te envío la cotización solicitada…
  completen en el siguiente link la información de cada pasajero…"), con el
  nombre del cliente y el link de datos de pasajeros del vendedor completados
  solos. El vendedor lo edita por cotización, y el máster define el texto por
  defecto en el nuevo panel de Ajustes, donde también se ven los links por
  vendedor.
- **Notas internas: bloc libre.** Vuelven a ser un bloc de notas común — se
  escribe y se edita en el mismo cuadrado, sin cápsulas — con el drawer
  izquierdo como pantalla grande. En el drawer de cada cotización de la tabla
  también es un bloc libre.
- **Destinos en una sola línea.** Ciudad más angosta, noches con flechitas
  apiladas, régimen al lado (Solo alojamiento sin comidas · Desayuno incluido ·
  Media pensión sin bebidas · Pensión completa sin bebidas · All Inclusive),
  fechas calculadas solas desde la salida (sin calendario por destino) y un
  "+" en la línea para agregar el siguiente — desapareció la fila de "agregar
  ciudad". El régimen del destino baja a la línea de noches del precio incluye
  y al régimen de las opciones hoteleras.
- **Servicios más limpios.** El aéreo por defecto dice "con artículo personal
  y equipaje de mano", se fue la fila de "más usados" y las sugerencias
  sueltas. Los chips de cabina y equipaje escriben directo la línea de aéreo,
  aunque se haya editado a mano.
- **Opciones que se clonan.** "Nueva opción" duplica la anterior entera —
  habitaciones, tarifas, régimen — para cambiar solo hotel y precio. Se puede
  agregar habitación desde adentro del contenedor, los campos de tarifa son
  más chicos y hay más aire. Las fotos de hotel ahora se prenden y apagan
  (Gero las prefiere apagadas, y así arrancan).
- **La salida del pasajero se rehízo donde hacía falta.** Los vuelos salen
  como tarjetas de Ida y Vuelta con ciudades, horarios y escalas calculadas —
  sin scroll lateral, como el ejemplo que mandó Santi. Las tarifas van todas
  iguales, separadas por una rayita corta y sin total ("a veces asusta").
  "A tener en cuenta" pasó a llamarse "Notas": campo libre donde se escribe
  largo y se pegan imágenes, que salen con el diseño de la agencia. Formas de
  pago en dos grupos (tarjetas: Visa, Mastercard, OCA, Amex · transferencia:
  BROU, Itaú, Santander, BBVA), sin Scotiabank y sin la línea de 12 cuotas.
  La firma suma el email del vendedor, el teléfono abre WhatsApp y las
  iniciales dieron paso a la foto del vendedor (placeholder en el mockup;
  la real se carga en su perfil de usuario).
- **Cotización de solo vuelos.** Cuarto camino al crear: itinerario, cabina,
  equipaje y precio por adulto y por menor — sin hoteles ni servicios. La
  cotización sale igual de prolija, solo con lo que corresponde.
- **Vuelos desde una captura.** Además del código, se puede pegar una imagen
  con Ctrl+V y la IA la lee y la formatea igual (simulado en el mockup; en
  producción reemplaza a la API de PNR converter).
- **Tab recorre solo los campos.** Tabulador salta de campo en campo sin
  pasar por los botones, como pidió Santi.

---

## 13 de agosto de 2026

### Arreglado

**Todos los botones del cotizador salían con fondo blanco.** Un reset de CSS
(`.ctz button`) tenía más peso que las clases de color de los botones, así que
el fondo de cada variante — el teal de Compartir, el gradiente de marca de
Confirmar, los chips activos — quedaba pisado y todo se veía blanco y plano.
El reset ahora usa `:where()`, que no compite en especificidad, y cada botón
recuperó su color. Además cada acción tiene su tinte propio: duplicar en
violeta suave, guardar como plantilla en ámbar, copiar link en teal.

### Cambiado

**El drawer de una cotización suma "Ver cotización" y "Edición total".** Ver
cotización abre la vista tal como la ve el pasajero (antes era un ícono de ojo
fácil de pasar por alto), con selector de celular, tablet y escritorio para
leerla cómodo; Edición total abre esa cotización en el formulario completo del
editor, con su mismo número y estado, para retocarla sin vueltas. El drawer
también muestra y maneja la bitácora interna de esa cotización: se anota con
Enter, cada entrada queda firmada con vendedor y hora, y se borra con deshacer
— sin tener que abrir la cotización.

**Las notas internas son una bitácora.** Un solo cuadro de escritura: Enter
anota y la entrada sube a la lista que vive encima, firmada por el vendedor y
con su hora (Shift+Enter hace salto de línea). La lista crece sola al pasar el
mouse para leer cómodo, y Expandir abre un drawer que entra desde la izquierda
con la bitácora completa — editable y borrable entrada por entrada, con
deshacer — más los costos fijos. Nada de esto llega nunca al pasajero.

**Detalles que faltaban de la reunión del 11/08:** agregar un destino arranca
con 7 noches (antes 3) — el estándar del paquete uruguayo — y el buscador de
ciudades ignora los tildes: "buzios" encuentra Búzios y "mexico" encontraría
México.

**La IA siempre ofrece las dos cosas.** Aunque encuentre un paquete que calza
justo, ya no arma el borrador solo: muestra el paquete como "mejor
coincidencia" y al lado, bien visible, el botón de armarla en blanco con lo
que entendió — Gero había marcado que ese botón "se veía muy chiquito". Y las
tarifas suman el casillero "Por infante": adulto, menor e infante, los tres
casilleros que pidió Santi, más la familiar.

**El mockup del cotizador incorpora todo lo pedido en la reunión del 11/08 y el
mail de Gero.** Sigue siendo un mockup sin conexión al sistema, pero ya muestra
el flujo completo que se acordó con el cliente:

- **Inicio más simple.** El tab principal quedó solo con los paquetes de la web
  (que funcionan como plantillas precargadas) y la tabla de cotizaciones. El
  seguimiento del día y los reportes por vendedor se mudaron a un tab propio,
  fuera de la vista diaria del vendedor. La tabla suma filtros por destino y
  por mes de salida, además de la búsqueda por cliente, y un selector "Ver
  como" que anticipa el modelo de usuarios: cada vendedor ve lo suyo, el
  máster ve todo.
- **Tres caminos para arrancar.** Consulta de WhatsApp con IA, en blanco, o
  desde un paquete o plantilla — paquetes de la web y plantillas propias
  centralizados en una sola lista.
- **Bloques en el orden pedido.** Cliente, mensaje al pasajero (con la línea
  fija "De acuerdo a lo conversado…" a la vista), encabezado, servicios
  incluidos, vuelos, opciones hoteleras y notas para el pasajero.
- **Servicios estándar de entrada.** Toda cotización nueva arranca con aéreo
  ida y vuelta con equipaje de mano, traslados de llegada y salida, 07 noches
  de alojamiento y seguro de asistencia al viajero. La línea de alojamiento
  replica sola las noches cargadas y la de aéreo se arma con la cabina y el
  equipaje que se elijan en el bloque de vuelos (turista a primera clase,
  artículo personal a bodega). Si el vendedor edita el texto a mano, deja de
  seguirlos.
- **La fecha de salida manda.** Ata el mes y el año del encabezado y baja como
  check-in del alojamiento, como ya venía haciendo.
- **Habitaciones y tarifas desglosadas.** Cada opción hotelera admite varias
  habitaciones (Single, Doble y de 3 a 15 personas, con tipo libre opcional) y
  cada habitación sus tarifas: por adulto, por menor, por familia u otras. La
  venta se calcula sola con el markup 0,88 pero se puede pisar a mano, con
  vuelta al automático en un clic. La vista del pasajero muestra el desglose.
- **Notas internas ancladas.** Salieron del formulario y viven como block de
  notas fijo en la columna izquierda, con escritura libre y un botón para
  expandirlas junto a los costos fijos. Nunca llegan al pasajero.
- **Previsualizar antes de mandar.** El modal de compartir suma un botón de
  previsualización que no cuenta como apertura en los analytics.

---

## 11 y 12 de agosto de 2026

### Arreglado

**El precio del panel y el de la web no coincidían.** Un paquete con markup
0,85 mostraba 895 en la pestaña Precios y 951 en la página pública. El 951
estaba de verdad guardado: era el precio del markup anterior. El precio de
venta lo calcula el sistema a partir del costo y el markup, pero el guardado
automático del panel devolvía al servidor el paquete entero, incluido el precio
que tenía en pantalla desde antes, y lo pisaba. Alcanzaba con cambiar el markup
una vez para que el próximo guardado restaurara el número viejo. Ahora el precio
es propiedad exclusiva del cálculo del servidor: el panel no lo puede sobrescribir
y la pantalla se sincroniza con lo que quedó guardado.

**El cambio masivo de markup no movía el precio del sitio público.** Actualizaba
el precio del backend y dejaba intacto el campo que lee la web, así que el
público seguía viendo el precio anterior. Es el mismo cálculo de siempre, ahora
aplicado a los dos lugares.

**El panel y la web hacían dos cuentas distintas.** La pestaña Precios recalcula
el precio en vivo con los costos cargados en ese momento. La web leía una copia
guardada de ese resultado, que queda vieja apenas cambia el costo de un servicio
sin que nadie vuelva a recalcular. Dos cuentas separadas terminan discrepando
siempre. Ahora hay una sola regla, y la usan la pestaña Precios, la tarjeta del
listado y la ficha pública: la opción hotelera más barata, o los costos vigentes
sobre el markup si el paquete no tiene opciones. La copia guardada queda para
ordenar los listados por precio, que es lo único para lo que hace falta.

Los paquetes clásicos ya venían salvados de casualidad, porque la tarjeta
corregía el precio leyendo las opciones hoteleras. Los circuitos no tienen
opciones y quedaban expuestos: tres publicados mostraban mal. Fin de año en
Florianópolis se publicaba a 798 cuando el panel decía 750, y Caribe Colombiano
y Egipto y Jordania tenían un dólar de diferencia, que resultó ser un aéreo de
USD 1 que nunca se había sumado al costo guardado.

**El reporte de márgenes no contaba los vuelos ni los circuitos.** Los armaba con
un nombre de campo que el cálculo de costos no lee, así que los sumaba como cero:
el costo salía incompleto y el margen, inflado. Los números de `/backend/reportes`
van a bajar y los nuevos son los reales.

**Los paquetes relacionados se elegían por el precio viejo.** El listado del pie
de la ficha recortaba a seis en la base de datos ordenando por la copia guardada,
así que esa copia decidía qué paquetes entraban, no solo en qué orden. Ahora el
corte se hace con el precio real.

**Al vencerse la sesión, el panel te mandaba a otro dominio.** Trabajando en la
dirección de Railway, cualquier acción que hablara con el servidor (previsualizar,
por ejemplo) redirigía al login de traveloz.com.uy, donde la sesión no existe: se
salía sin explicación. Ahora el login queda siempre en la dirección desde la que
estás entrando. La previsualización nunca tuvo un dominio fijo, el salto lo hacía
el control de acceso.

**Los iconos de "Incluye" se veían distintos a los del diseñador.** Dos cosas
distintas pasando a la vez. El borde redondo del círculo recortaba el dibujo:
la punta del avión salía cortada al ras y a la cama le faltaban las patas. Y el
icono de tren mostraba un auto. Los iconos son los mismos de siempre, ahora se
ven enteros.

**Los circuitos terrestres no se podían publicar** porque el sistema exigía un
aéreo asignado. En esa modalidad el producto y el precio salen del circuito, y
hay circuitos sin vuelo.

### Nuevo

**Ahora se puede ver si un lead llegó al CRM.** Hasta hoy el número de negocio
de Bitrix se escribía en un registro técnico y en ningún lado más, así que para
contestar "¿se perdió algún lead?" había que cruzar el CRM a mano, consulta por
consulta. Cada cotización guarda cómo terminó su envío: el número de negocio, si
entró como tarjeta nueva o como comentario dentro de otra, el error si falló, y
cuántos intentos lleva. Los dos listados de cotizaciones muestran esa columna con
un contador arriba del estilo "48 de 50 en el CRM", filtros para ver solo los
problemáticos, y un botón para reintentar el envío. La exportación a Excel lleva
las mismas columnas.

El lead nace pendiente y recién el envío lo pasa a enviado o con error. Si el
proceso se corta en el medio queda en pendiente, que es justamente el caso que
antes era invisible. Las consultas anteriores a este cambio quedan marcadas como
"sin dato", no como fallidas, porque de esas no sabemos.

**El aviso por mail dejó de poder tumbar el envío al CRM.** En el cotizador
general, si el proveedor de correo fallaba, el error se llevaba puesto todo lo
que venía después: la consulta quedaba guardada, el CRM no se enteraba y el
pasajero veía un error igual. Es lo que pasó durante la caída de correo del 5 de
agosto.

**La hora de cada consulta, a la vista en el listado de leads.** Debajo del "hace
cuánto" aparece la hora exacta, y pasando el mouse el día completo. En los seis
listados. La exportación a Excel también: escribía la fecha en horario universal,
tres horas adelantada, así que una consulta del sábado a las 23:17 salía como
domingo a las 02:17, con el día cambiado.

### Cambiado

**Bitrix reconoce al mismo pasajero aunque escriba el teléfono distinto.** Antes
comparaba el número tal cual llegaba, así que la misma persona escribiendo
099 375 840 y +598 99 375 840 entraba como dos contactos. Ahora se guarda
normalizado y se buscan las variantes conocidas.

---

## 7 de agosto de 2026

### Arreglado

**El módulo de vendedores muestra el hotel cotizado, no "OPCION 1".** Pedido
del cliente: las opciones hoteleras aparecían como "OPCION 1 / OPCION 2" y no
se sabía qué hotel se estaba cotizando. Ahora el nombre del hotel es el título
de cada opción (en multidestino se unen: "Windsor Excelsior + Pousada
Corsário"), y aparece también bajo el precio por persona del panel de
cotización y en la fila cerrada de la tabla. El número de opción queda como
etiqueta chica de referencia. De paso se arregló el motivo por el que a veces
se veía "—" en lugar del hotel: los hoteles cargan por tandas y el cálculo
quedaba cacheado antes de que llegara la tanda con ese hotel; ahora el caché
se refresca al terminar la carga. En paquetes multidestino los hoteles se
listan en el orden del itinerario.

**Las tarjetas de una fila quedaban de alturas distintas.** En los listados de
destinos, un paquete con título de una línea ("Búzios") dibujaba una tarjeta más
baja que la de al lado con título de dos ("Río de Janeiro & Búzios"), y la fila
se veía despareja. Ahora el título reserva siempre dos renglones, así la
temporada y los renglones de "Incluye" arrancan a la misma altura en todas, y
el bloque de precio se ancla al pie: todas las tarjetas de una fila miden lo
mismo y los precios quedan alineados, tengan 4 o 5 renglones de "Incluye". Un
título de tres líneas sigue creciendo, no se recorta. Aplica a las cuatro
grillas del sitio (todos los destinos, por región, por categoría y por
etiqueta); el carrusel del detalle ya lo tenía resuelto.

### Nuevo

**Crear una ciudad ahora pide confirmación.** Era el problema que reportó el
cliente: se escribía cualquier palabra, se apretaba Enter y la ciudad quedaba
creada, sin lectura ni vuelta atrás. Así aparecieron ciudades como "nas" al lado
de "Nassau". Ahora, desde los tres atajos donde se puede crear una ciudad
—el árbol de Catálogos, el picker de ciudades del paquete y el alta de hotel—
aparece un cartel que pregunta si se quiere agregar esa ciudad a ese país, y
muestra el nombre exacto que se va a guardar. El foco arranca en "Cancelar" a
propósito, para que un Enter de más no confirme solo.

**Aviso de ciudades parecidas.** Si en ese país ya hay una ciudad que se parece
a la que se está por crear, el cartel la nombra y sugiere elegir la existente.
Detecta tanto abreviaturas ("nas" contra "Nassau") como errores de tipeo
("Buens Aires" contra "Buenos Aires").

### Cambiado

**No se puede repetir una ciudad dentro del mismo país.** La comparación ignora
tildes, mayúsculas y puntuación, así que "Río de Janeiro" y "rio de janeiro" son
la misma y la segunda se rechaza con un mensaje que dice cuál es la que ya
existe. También se limpian los espacios sobrantes del nombre y se rechaza lo que
no puede ser una ciudad (vacío, un solo carácter, o algo sin ninguna letra como
"123"). Vale para el alta y para el renombre, y el chequeo está también del lado
del servidor, no solo en la pantalla.

---

## 6 de agosto de 2026

### Arreglado

**El buscador de destinos no encontraba nada si no escribías las tildes.**
Buscar "turquia" o "mexico" devolvía cero resultados, porque comparaba el texto
tal cual contra "Turquía" y "México". Y como sin resultados el menú ni se abría,
desde afuera parecía que el buscador estaba atado a la región en la que estabas y
que no había forma de llegar a otro destino. El grupo "Otros destinos", que ya
existía y lleva al listado completo, era inalcanzable por lo mismo. Es el segundo
lugar donde muerde este problema: el primero fue el buscador del panel. Ahora la
comparación vive en un solo archivo para las dos partes.

**El menú de "Ordenar por" nunca se abrió.** La plantilla lo esconde y la regla
que lo muestra al desplegarlo no estaba en ninguna parte, porque en el HTML
original la ponía un script que en esta versión no existe. Verificado contra el
sitio en vivo: aun forzándole el estado de abierto, el menú seguía oculto.

**Los paquetes de tipo circuito eran invisibles en el buscador.** Siete paquetes
publicados, que se venden y salen en los listados, no aparecían al buscar por
destino. No fue un descuido de nadie: el buscador arma su catálogo con las
ciudades de cada paquete, y para un circuito no había ningún lugar del panel
donde cargarlas.

### Nuevo

**Aviso de "no encontramos ese destino".** Antes buscabas algo que no existía y
no pasaba absolutamente nada. Ahora avisa y ofrece ver todos los destinos.

**Las ciudades del circuito se cargan en la pestaña Datos.** Debajo del campo
Destino, solo en esa modalidad. Pide la ciudad y nada más: el día por día se
sigue cargando en el módulo Circuitos, y pedirlo en dos lugares garantiza que en
algún momento discrepen.

### Cambiado

**Los selectores del buscador ahora son un sistema.** Antes cada control venía de
un lado distinto: alturas iguales con redondeos distintos, un violeta azulado en
las etiquetas que no aparecía en ningún otro lugar del sitio, el foco azul por
defecto del navegador, y el "Ordenar por" colgando contra el margen. Ahora
comparten alto, redondeo y el violeta de la marca, tienen sus propios estados al
pasar el mouse y al enfocar, los dos desplegables se ven iguales, y el "Ordenar
por" quedó integrado con una línea que lo ata al buscador. De paso, el texto de
los campos vacíos tenía un contraste de 2.57 a 1, muy por debajo del mínimo
accesible; ahora cumple.

### Operación

- Se cargaron las ciudades de los siete circuitos, sacadas del itinerario real de
  cada uno: Turquía, Portugal, Egipto y Jordania, Caribe Colombiano, Kenia con
  Tanzania y Zanzíbar, Norte Argentino, y Salvador de Bahía. Ningún paquete
  publicado queda sin ciudades.
- **Kenia, Tanzania y Jordania no existían como países** en el catálogo. Se
  crearon, junto con doce ciudades nuevas.
- Se encendió la regla de 24 horas de Bitrix (`BITRIX_DEDUPE_HOURS=24`) y se
  probó de punta a punta con dos consultas reales del mismo pasajero.
- Se limpiaron del CRM y de la base los registros de prueba que dejaron los
  tests de la integración.

---

## 5 de agosto de 2026

### Arreglado

**Los correos dejaron de salir durante 22 horas.** Al limpiar la configuración de
correo del dominio se borraron los tres registros que autorizan el envío, y el
proveedor pasó a rechazar todo. Se repusieron los registros y se reenviaron las
25 notificaciones que no habían salido. Ninguna consulta se perdió: estaban todas
en la base, y las de paquetes también habían entrado al CRM.

**Editar una pregunta frecuente le borraba los subtítulos para siempre.** El
limpiador de contenido no tenía los encabezados en su lista de etiquetas
permitidas, y también corre al guardar. Cuatro de los seis temas ya los habían
perdido.

**El título del tema se repetía dentro de la respuesta** al desplegar una
pregunta frecuente.

**El límite de envíos era demasiado bajo.** La agencia comparte una sola salida a
internet, así que cinco envíos por hora se agotaban entre ellos mismos y el
formulario dejaba de andar sin decir por qué. Subió a veinte y el aviso de error
ahora se ve arriba del formulario, no escondido abajo del botón.

**El favicon no cumplía la medida que pide Google** para mostrarlo en los
resultados de búsqueda.

### Cambiado

- Los títulos de las páginas de listado y de etiqueta, más chicos en celular:
  ocupaban dos y hasta tres renglones y empujaban el buscador fuera de la
  pantalla.
- En el detalle del paquete, la bajada del precio dejó de partirse dejando una
  palabra sola y se alineó con el bloque del monto.
- El selector de pasajeros volvió a mostrar "Cantidad de pasajeros" en gris, como
  el resto de los campos vacíos, en vez de arrancar con un número que se leía
  como un dato ya cargado.
- Los números del precio de las tarjetas quedaron más compactos.

---

## 4 de agosto de 2026

### Nuevo

**Papelera de paquetes.** Antes se eliminaban de una. Ahora se pueden recuperar,
con una vista rápida para confirmar cuál es.

**La fecha de baja automática del paquete se puede editar.**

### Arreglado

- Entrar por un link directo al panel ya no te devuelve al inicio: te lleva a
  donde ibas después de identificarte.
- Editar una galería dejó de perder imágenes. Se corrigió el origen del problema
  y se protegieron los archivos que estaban quedando huérfanos.
- Las búsquedas de listas del panel funcionan sin tildes.
- Se sacó el subtítulo de las páginas de etiqueta y de tipo, y el panel dejó de
  caer al dominio provisorio de Railway.

---

## 3 de agosto de 2026

### Arreglado

**El iPhone quedaba con zoom después de tocar un campo** y no volvía solo, ni
siquiera al cambiar de página.

### Cambiado

El lead que llega al CRM ahora trae dos accesos: la página pública del paquete y
la vista del paquete armado para el vendedor.

---

## 29 y 30 de julio de 2026

### Nuevo

**Los leads del sitio entran solos a Bitrix24.** Tanto las consultas desde un
paquete como el cotizador general crean el negocio en la columna de entradas
calientes, con el contacto asociado y todos los datos del formulario. El título
sigue el formato que ya usaba recepción: destino, cantidad de pasajeros y mes.

**El slug del paquete se genera solo** y dejó de ser un campo obligatorio que
alguien tenía que completar a mano. Había paquetes publicados sin slug, cuyo
enlace no llevaba a ninguna parte.

**Las notas internas del circuito y del operador** se ven en el módulo de
vendedores, marcadas como internas.

### Arreglado

- Seis correcciones del formulario en celular que reportó el cliente: el
  calendario pintando mal el rango, el selector de pasajeros sin forma de
  cerrarlo, el teléfono que no era obligatorio, la barra de desplazamiento
  horizontal, el teclado numérico y la página de gracias.
- El menú cerrado se comía los toques y el desplazamiento en el inicio.
- Los circuitos volvieron a aparecer en su región.
- Las imágenes destacadas dejaron de deformar las tarjetas.

---

## 24 al 28 de julio de 2026

### Nuevo

**SEO listo para producción:** direcciones canónicas, valores por defecto para
cada tipo de página, mapa del sitio con las etiquetas, y el panel excluido de los
buscadores.

**Imagen para compartir en redes**, con el logo sobre fondo blanco, y su
equivalente por paquete.

**Etiqueta de Google en todo el sitio público**, con los permisos de seguridad
ajustados para que el píxel de Meta y Metricool funcionen.

**Página de gracias**, a la que redirigen los formularios al enviarse, para poder
medir conversiones.

### Arreglado

- El desplazamiento se trababa al empezar a bajar en escritorio.
- Las tarjetas enlazaban a la región equivocada: paquetes de Miami aparecían bajo
  Europa.
- Las portadas de /terms y /faq quedaban mal en celular.
- "Trabajá con nosotros" volvió a avisar solo a la casilla de candidatos.
- Los relatos de viajeros se recortan a siete renglones en celular, con una
  flecha para desplegarlos.

---

## Pendiente

Del lado del cliente:

- Cargar las fotos de tres paquetes: Cancún Riu Week, Playa del Carmen Riu Week y
  Orlando y Miami.
- Pedir reindexado en Search Console para que Google levante el favicon nuevo.
- Redirigir `www.` y `app.` al dominio principal.
- Rotar la clave del proveedor de correo y el webhook de Bitrix.
- Decidir si se corrige el enlace del paquete de Egipto, que quedó como
  `paquete-sin-titulo-20-7` porque se creó sin título.
