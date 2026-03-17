# TravelOz — Explicación del Negocio y Diagnóstico Operativo

> **Documento para:** Equipo interno Latitud Nómade + stakeholders TravelOz  
> **Versión:** 1.0 — Marzo 2026  
> **Fuente:** Reuniones de relevamiento con Gerónimo Cassoni (producto/operaciones) y Santiago Rodríguez (estrategia comercial), 25/02 y 05/03 de 2026.

---

## 1. Quién es TravelOz

TravelOz es una agencia de viajes uruguaya con sede en Montevideo (Edificio Trade Plaza, Av. Luis Alberto de Herrera 1343, Of. 301). Tiene más de 35 profesionales, 48.000 seguidores en Instagram y opera bajo el lema #ExperienciaOZ. Se especializan en turismo tradicional (paquetes a Brasil, Caribe, Europa, Argentina, México, USA) y corporativo. Ofrecen paquetes completos con aéreos, alojamiento, traslados, seguros, circuitos y cruceros.

La agencia opera simultáneamente dos marcas desde el mismo equipo: **TravelOz** (marca principal, turismo tradicional y corporativo) y **DestinoIcono** (marca secundaria, mismo servicio, audiencia diferente). Ambas marcas comparten estructura operativa pero tienen webs independientes y audiencias separadas.

El equipo está organizado en un departamento de producto (liderado por "Lucha", encargada de cargar y actualizar paquetes), un departamento comercial/ventas (múltiples vendedores, coordinados por Santiago), y la dirección operativa (Gerónimo). Los vendedores no cargan información — consumen los paquetes armados por producto para atender leads que llegan por web, Instagram o contacto directo.

---

## 2. Cómo operan hoy

### 2.1 El sistema actual: EvangelioZ + Excel

TravelOz gestiona sus paquetes turísticos a través de dos herramientas:

Una **planilla de Excel en Google Drive** que funciona como fuente primaria de información de costos y combinaciones de servicios. Gerónimo lo describió como "este monstruo" — una planilla que centraliza todo pero que no está conectada a nada.

Un **sistema legacy llamado EvangelioZ** alojado en pica-cloud, que es el administrador web actual. EvangelioZ tiene 5 solapas principales (Perfil, Tarifario, Paquetes, Ajustes, Sitio Web) y permite cargar paquetes que se publican en las webs de ambas marcas. Es funcional pero tiene serias limitaciones que veremos en la sección de dolores.

### 2.2 El flujo operativo semanal actual

Cada semana, la operación de TravelOz sigue este ciclo:

El departamento de producto se reúne internamente para definir qué paquetes van a crear o actualizar para la semana. Revisan costos de aéreos, hoteles y traslados, arman las combinaciones en Excel, y luego cargan manualmente cada paquete en EvangelioZ.

Los lunes se cargan los paquetes nuevos o se actualizan los existentes en la web. Los martes se crean las placas de marketing, se lanzan las pautas en redes, y se envía un email manual a los vendedores con un resumen de lo que se publicó esa semana — qué paquetes, qué vuelos, qué links.

Cuando un vendedor recibe un lead (alguien pregunta por un paquete a Cancún, por ejemplo), necesita acceder a EvangelioZ para ver cómo está cotizado ese paquete: qué aéreo tiene, qué opciones hoteleras, qué traslados. Con esa información arma la respuesta al cliente.

### 2.3 Cómo se compone un paquete hoy

Un paquete turístico de TravelOz se arma combinando servicios independientes:

Un vuelo (aéreo) de ida y vuelta — por ejemplo, Montevideo → Cancún → Montevideo. Este vuelo tiene un costo que varía según la temporada y la aerolínea.

Un alojamiento (hotel) con precio por noche que depende de la categoría, la ubicación, el régimen (desayuno, all inclusive, media pensión) y la temporada.

Un traslado del aeropuerto al hotel y vuelta, que tiene un costo fijo y depende del proveedor y de si es regular o privado.

Opcionalmente un seguro de viaje, que tiene un costo por día por persona según el proveedor y el plan de cobertura.

Opcionalmente un circuito (itinerario terrestre operado por un proveedor como Europa Mundo) o un crucero.

El precio final del paquete es la suma de todos los costos netos de estos servicios, más un markup (margen) que define el precio de venta al público. TravelOz trabaja en dólares americanos.

Lo importante es que los servicios son reutilizables: el mismo vuelo Montevideo → Cancún se usa para paquetes de Cancún, Playa del Carmen, Costa Mujeres y Tulum. El mismo hotel se usa en varios paquetes de la misma ciudad. Cuando cambia el precio de un vuelo o un hotel, ese cambio debería afectar a todos los paquetes donde está incluido.

---

## 3. Los dolores principales

### 3.1 Desconexión entre servicios y paquetes

Este es el dolor más grande y el que más tiempo operativo consume.

En EvangelioZ, los servicios (aéreos, hoteles, traslados) existen como entidades separadas en una sección de "tarifario", pero la conexión con los paquetes es deficiente. Dentro de un paquete, la sección de "incluye" permite agregar texto libre — el operador escribe manualmente "Pasaje aéreo Montevideo / Cancún / Montevideo" como texto. Ese texto no tiene ninguna vinculación real con la entidad del aéreo cargada en el tarifario.

Esto significa que se puede poner "10 hoteles de texto" en un paquete que no tienen nada que ver con los servicios hoteleros asignados internamente. No hay consistencia entre lo que el sistema sabe (la entidad del aéreo con su precio) y lo que se muestra al público (el texto libre). Diego (Latitud Nómade) lo detectó al revisar el sistema: "yo acá puedo poner 10 hoteles de texto y no tiene nada que ver con los servicios hoteleros que tengo asignados".

La consecuencia es que cuando cambia un precio de un servicio, el departamento de producto tiene que ir paquete por paquete revisando y actualizando manualmente. No hay propagación automática. Santiago lo explicó claramente: la necesidad es que "si cambio el precio del hotel Río 1, automáticamente me tiene que cambiar todos los paquetes donde ese Río 1 está involucrado". Hoy eso se hace a mano.

### 3.2 Demasiados pasos para operaciones simples

EvangelioZ tiene una navegación fragmentada que obliga a navegar entre múltiples pestañas y pantallas para hacer una sola operación. Gerónimo lo describió al mostrar cómo se asigna un aéreo a un paquete: "crear grupo, ir a asignar aéreo, clickear en asignar aéreo, hay mucho pasito". Santiago completó: "de pestaña, te cambia tipo de bloquecito, tendría que ser todo en la primera pantalla".

Los precios de aéreos y hoteles se cargan en pestañas separadas dentro del servicio ("voy a editarlo, cuando voy a editarlo ahí sí voy al precio"), lo que agrega clics innecesarios. Gerónimo y Santiago pidieron que todo esté en la misma pantalla: datos del servicio, precios por periodo, y fotos, sin tener que saltar entre secciones.

### 3.3 Campos obsoletos y ruido visual

El sistema actual tiene muchos campos que TravelOz ya no usa y que ensucian la interfaz. En la revisión con Gerónimo se fueron identificando uno por uno: aerolínea en el listado (no es necesario), ciudad de inicio y fin (no va), tasas (se eliminan), menor precio (se va), moneda (se va), latitud y longitud en hoteles (se eliminan), campos de "incluye" y "no incluye" como texto libre (se reemplazan por la vinculación automática de servicios), vuelos, itinerario y observaciones como secciones separadas (se eliminan y se unifica).

Gerónimo fue directo: "hacer una limpieza de lo que son estos campos, que queden realmente aquellos que nos interesa que estén, y simplificar un poco todo".

### 3.4 Sin inteligencia de datos ni visibilidad para decisiones

TravelOz no tiene reportes de ningún tipo. Santiago contó que estudian el "momento de compra" hace un año y medio, pero lo hacen de forma manual y externa al sistema. No hay forma de saber desde el admin cuántos paquetes hay por destino, cuáles son los hoteles más usados, qué proveedores se usan menos, ni cuántas visitas tiene cada paquete en la web.

Gerónimo dijo que le gustaría "tener una visual gráfica, de forma bien resumida, de cuántos paquetes tengo para Brasil en temporada baja, separado por destino". Santiago agregó el interés en ver reportes desde la web: "qué cantidad de gente entra, a qué paquete, en qué fecha, para qué fecha es el paquete".

Esto significa que las decisiones de qué paquetes armar, qué destinos empujar, y dónde ajustar precios se toman sin datos del propio sistema. Todo es intuición y experiencia del equipo.

### 3.5 Comunicación manual con vendedores

Cada semana, cuando se lanzan paquetes nuevos o se actualiza una campaña, alguien del equipo de producto redacta manualmente un email a los vendedores con la información de los paquetes: qué vuelos se usan, qué hoteles, los links de la web. Gerónimo describió el proceso: "el martes hacemos un aviso a los vendedores vía mail, de chicos sacamos esta pauta, acá está el link, hacemos un pequeño resumencito del vuelo que utilizamos".

Este proceso es completamente manual — no está conectado al sistema. Si se equivocan en un link, si olvidan un paquete, si cambia un precio después de enviado, no hay forma de corregirlo automáticamente. El email no se genera desde los datos reales del admin.

### 3.6 Los vendedores no tienen acceso directo a la información de costeo

Cuando un vendedor recibe un lead, necesita saber rápido cómo está armado el paquete: qué aéreo tiene, qué opciones de hotel, qué traslado, a qué precio. Hoy no tienen una vista rápida de esto en el sistema. Gerónimo lo describió como una necesidad urgente: "que cuando le llegue un lead de Playa del Carmen para vacaciones de septiembre, pueda hacer un clic y ver cómo está cotizado, con qué aéreo, qué traslados y qué opciones hoteleras".

### 3.7 Gestión de dos marcas duplicando esfuerzo

TravelOz y DestinoIcono se gestionan como webs separadas con el mismo backend, pero el proceso de carga es doble. Los paquetes similares se cargan en ambas webs por separado. Gerónimo y Santiago fueron claros en que "el manejo sea exactamente el mismo, el diseño sea exactamente el mismo" para ambas marcas, con URLs separadas pero un solo sistema. Hoy, cualquier cambio que aplique a ambas marcas hay que hacerlo dos veces.

### 3.8 No hay control de proveedores normalizado

Los proveedores de traslados y seguros se ingresan como texto libre, lo que genera duplicados e inconsistencias. Gerónimo puso el ejemplo: "si quiero poner Sevens, puede aparecer como 'siete' con S minúscula, 'Seven' con mayúscula, 'SEVENS' todo en mayúsculas". Santiago estuvo de acuerdo en que "está bueno agregar una lista de proveedores" como entidad normalizada.

### 3.9 Desactivación manual de paquetes vencidos

Cuando una campaña termina o un paquete promocional caduca (por ejemplo, la "Semana Reebok" que dura una semana), el departamento de producto tiene que ir paquete por paquete desactivándolos manualmente. Gerónimo pidió que el sistema lo haga solo: "ponemos validez 8 de octubre para que el 8 de octubre se nos den de baja automáticamente y no tengamos que desactivar cada uno de ellos".

### 3.10 Recarga innecesaria de paquetes entre temporadas

Cuando cambia la temporada (de alta a baja, por ejemplo), en lugar de reutilizar los paquetes del año anterior, muchas veces los recargan desde cero. Gerónimo pidió poder "volver a un paquete desactivado del 2025, editarlo, cambiar la fecha y los precios, y activarlo de nuevo, sin tener que cargar nuevamente paquetes".

---

## 4. Lo que el negocio necesita

### 4.1 Un sistema único para ambas marcas

Un solo panel de administración que sirva a TravelOz y DestinoIcono, con un selector de marca en el topbar. Misma interfaz, mismos módulos, misma experiencia. Datos separados por marca pero gestión centralizada. Un solo hosting. Esto elimina el esfuerzo doble y garantiza consistencia.

### 4.2 Servicios como entidades vivas conectadas a paquetes

Los aéreos, hoteles, traslados, seguros y circuitos deben ser entidades independientes que se asignan a paquetes. Cuando cambia el precio de un servicio, todos los paquetes que lo usan se actualizan automáticamente. Es la diferencia entre un sistema donde actualizar un precio toma 2 minutos (cambiar el servicio) versus el actual donde toma horas (recorrer cada paquete manualmente).

### 4.3 Todo en una sola pantalla

El equipo de producto necesita que la creación y edición de servicios y paquetes no requiera saltar entre pestañas. Datos generales, precios por periodo, fotos, asignación de servicios — todo visible y editable en un solo lugar. Esto reduce errores y acelera la operación diaria.

### 4.4 Búsqueda y filtros instantáneos

Con decenas de paquetes activos en cada temporada, encontrar rápido lo que se busca es crítico. El filtro inteligente que busca en todos los campos (título, destino, temporada, etiqueta) permite que escribir "Cancún" muestre instantáneamente todo lo relacionado. Gerónimo pidió filtros por temporada, estado (activo/inactivo), tipo de paquete, y un buscador global. Santiago agregó la necesidad de que sea "instantáneo".

### 4.5 Vista rápida para vendedores

Los vendedores necesitan ver, con un solo clic, la composición completa de un paquete: con qué aéreo está cotizado, qué opciones de hotel tiene, qué traslado incluye, y a qué precio de venta se ofrece. Sin acceso a costos internos ni posibilidad de modificar nada. Es una herramienta de consulta rápida para atender leads.

### 4.6 Ciclo de vida automático de paquetes

Los paquetes deben desactivarse solos cuando vence su fecha de validez. Los paquetes desactivados no se eliminan — quedan disponibles para ser reactivados en la siguiente temporada con solo actualizar fechas y precios. Clonar paquetes existentes como base para crear nuevos debe ser una operación de un clic.

### 4.7 Notificaciones integradas al sistema

La comunicación semanal con vendedores debe salir desde el propio admin. El operador selecciona una etiqueta de campaña, elige los paquetes, y el sistema genera automáticamente un email con resumen de servicios y links directos a la web. Sin redacción manual, sin copy-paste de links, sin riesgo de errores.

### 4.8 Datos para tomar decisiones

El sistema debe generar, como mínimo, reportes de paquetes por destino y temporada, hoteles más usados, proveedores menos utilizados, y visitas web por paquete. Esto transforma al admin de una herramienta de carga de datos en una herramienta de inteligencia comercial que ayuda al equipo a decidir qué armar, qué empujar y dónde ajustar.

### 4.9 Autonomía total del equipo

El cliente quiere ser autónomo al 100%. Todos los catálogos (temporadas, tipos de paquete, etiquetas, regímenes, proveedores) deben ser administrables por ellos mismos, sin depender del equipo de desarrollo. Si quieren crear "Baja 2027" como nueva temporada, lo hacen en un clic y empiezan a cargar paquetes de inmediato.

### 4.10 Visual atractivo, simple y rápido

No es solo funcionalidad — la experiencia importa. Un equipo que pasa horas diarias en el admin necesita una interfaz que no canse. Gerónimo fue explícito: "que sea lo más lindo visual, lo más sencillo a la vista". Santiago: "lindo visual, sencillo". Gerónimo a Latitud Nómade: "vos tengas cancha libre para programarlo y hagas el diseño que a vos te parezca más atractivo para que puedan trabajar los departamentos".

---

## 5. El impacto esperado

### 5.1 Tiempo operativo

La propagación automática de precios elimina horas semanales de actualización manual paquete por paquete. El equipo de producto pasa de recorrer decenas de paquetes a cambiar un precio en un solo lugar.

### 5.2 Errores humanos

La vinculación real entre servicios y paquetes elimina las inconsistencias de texto libre. Si un paquete dice que incluye el Hotel Copacabana, es porque el Hotel Copacabana efectivamente está asignado como servicio con su precio real — no porque alguien escribió "Copacabana" en un campo de texto.

### 5.3 Velocidad de respuesta comercial

Los vendedores pasan de no tener acceso directo a la composición de paquetes, a tener toda la información a un clic. Un lead que llega a las 9 de la mañana puede recibir respuesta completa en minutos, no en horas.

### 5.4 Capacidad de análisis

Por primera vez, TravelOz va a tener datos reales sobre su operación — qué destinos tienen más paquetes, qué hoteles se repiten más, qué periodos concentran más actividad, qué paquetes generan más interés en la web. Santiago mencionó que llevan un año y medio estudiando el "momento de compra" de forma manual. Con reportes integrados, eso se automatiza.

### 5.5 Escalabilidad entre marcas

Gestionar dos marcas desde un solo sistema significa que cualquier mejora, nueva funcionalidad o corrección beneficia a ambas simultáneamente. Y si mañana aparece una tercera marca, la arquitectura ya está preparada.

---

## 6. Resumen ejecutivo

TravelOz tiene un equipo experimentado que conoce profundamente su mercado, pero opera con herramientas que no están a la altura de la agencia que son hoy. La combinación de Excel + EvangelioZ genera fricción diaria en la carga de paquetes, la actualización de precios, la comunicación con vendedores y la toma de decisiones.

El nuevo sistema no busca cambiar cómo trabaja TravelOz — busca eliminar la fricción de cada paso. Los mismos procesos, los mismos roles, la misma lógica de servicios reutilizables y markup, pero ejecutados en una plataforma que propaga cambios automáticamente, que muestra todo en una sola pantalla, que notifica vendedores en 3 clics, y que empieza a generar inteligencia comercial desde el primer día.

El objetivo es que el equipo de producto de TravelOz pueda dedicar su tiempo a crear mejores paquetes y negociar mejores tarifas — no a copiar y pegar datos entre sistemas que no se hablan entre sí.

---

*Documento generado por Latitud Nómade como parte del relevamiento para el desarrollo del backend admin de TravelOz/DestinoIcono. Toda la información proviene de las reuniones con Gerónimo Cassoni y Santiago Rodríguez.*
