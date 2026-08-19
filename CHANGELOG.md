# Changelog

Registro de lo que fue cambiando en Traveloz, contado para que se entienda sin
abrir el código. Lo más reciente arriba. Las fechas son de cuando se desplegó a
producción, no de cuando se escribió.

Convención de las secciones: **Arreglado** es algo que estaba roto, **Nuevo** es
algo que antes no existía, **Cambiado** es algo que funcionaba y ahora funciona
distinto, y **Operación** es lo que se tocó fuera del código (variables, datos
del catálogo, CRM).

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
