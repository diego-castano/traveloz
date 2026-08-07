# Changelog

Registro de lo que fue cambiando en Traveloz, contado para que se entienda sin
abrir el código. Lo más reciente arriba. Las fechas son de cuando se desplegó a
producción, no de cuando se escribió.

Convención de las secciones: **Arreglado** es algo que estaba roto, **Nuevo** es
algo que antes no existía, **Cambiado** es algo que funcionaba y ahora funciona
distinto, y **Operación** es lo que se tocó fuera del código (variables, datos
del catálogo, CRM).

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
