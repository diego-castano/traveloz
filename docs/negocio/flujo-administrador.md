# TravelOz — Flujo Completo del Administrador Backend

> **Versión:** 1.0  
> **Fecha:** 15 de marzo de 2026  
> **Autor:** Latitud Nómade  
> **Basado en:** Reunión 1 (25/02/2026, 57 min) y Reunión 2 (05/03/2026, 53 min) con Gerónimo Cassoni (producto/operaciones) y Santiago Rodríguez (comercial/estrategia).  
> **Aplica a:** TravelOz y DestinoIcono (mismo sistema, URLs separadas, datos independientes).

---

## 1. Contexto general

TravelOz es una agencia de viajes uruguaya con sede en Montevideo (Av. Luis Alberto de Herrera 1343, Of. 301), 35+ profesionales, 48K seguidores en Instagram y presencia fuerte en turismo tradicional y corporativo. Actualmente gestionan paquetes turísticos mediante una planilla Excel y un sistema legacy llamado EvangelioZ alojado en pica-cloud.

El objetivo es reemplazar EvangelioZ con un backend admin moderno que sea idéntico en funcionalidad y visual para ambas marcas (TravelOz y DestinoIcono), pero significativamente más usable, rápido y visualmente atractivo. Gerónimo lo pidió textualmente: "que sea lo más lindo visualmente, sencillo, y que los filtros y búsqueda sean instantáneos". Santiago agregó: "lindo visual, sencillo y usable".

El sistema legacy tiene 5 solapas: Perfil, Tarifario (aéreos/traslados/hoteles/circuitos/servicios), Paquetes, Ajustes y Sitio Web. El nuevo sistema reemplaza esta estructura con 7 tabs planos en sidebar sin dropdowns, más módulos transversales.

---

## 2. Arquitectura multi-marca

El sistema sirve a dos marcas que operan de forma independiente pero con exactamente el mismo diseño y manejo:

**TravelOz** — traveloz.com.uy — Turismo tradicional + corporativo. Marca principal, 48K seguidores IG (#ExperienciaOZ). Categorías: lunas de miel, salidas grupales, cruceros, eventos, deporte.

**DestinoIcono** — URL separada. Misma funcionalidad, mismos módulos, misma UI. Santiago mencionó que "hasta el día de hoy la web de DestinoIcono no es fuerte, vendemos por otro lado", pero el backend debe ser igual.

Ambas marcas comparten el mismo hosting (Railway) y la misma base de código. Los datos son independientes (cada marca tiene sus propios paquetes, servicios, etc.). Un superusuario de TravelOz no ve datos de DestinoIcono y viceversa. El selector de marca vive en el topbar del admin.

---

## 3. Roles y permisos de usuario

Se definieron 3 roles en la reunión 2 (minuto 21:28 - 23:54):

### 3.1 Administrador (superusuario)
- **Cantidad:** 1 por marca (2 en total: 1 TravelOz + 1 DestinoIcono).
- **Acceso:** Control total sobre todos los módulos.
- **Puede:** Crear, editar, clonar, eliminar entidades. Publicar/despublicar paquetes. Gestionar usuarios. Configurar catálogos. Enviar notificaciones.
- **Ve:** Neto + Markup + Precio de venta. Toda la información financiera.

### 3.2 Vendedor
- **Cantidad:** 1 usuario compartido por marca (2 en total). Santiago explicó que tienen muchos vendedores y prefieren centralizar en un solo login compartido por marca para no gestionar usuarios individuales.
- **Acceso:** Solo lectura. Módulo de paquetes únicamente.
- **Puede:** Ver paquetes con su composición (aéreo, hotel, traslado, opciones hoteleras). Gerónimo lo describió como: "cuando le llega un lead de Playa del Carmen, el vendedor hace un clic y ve cómo está cotizado, con qué aéreo, qué traslados y qué opciones hoteleras".
- **No puede:** Crear, editar, eliminar nada. No ve botones de acción.
- **Ve:** Solo precio de venta. No ve neto ni markup.

### 3.3 Marketing / Reporting (propuesta Latitud Nómade)
- **Cantidad:** A definir. Santiago mostró interés en un rol intermedio.
- **Acceso:** Solo lectura sobre paquetes + acceso al módulo de reporting.
- **Puede:** Ver paquetes. Consultar reportes y gráficas.
- **No puede:** Modificar nada.
- **Ve:** Solo precio de venta. No ve costos internos.

**Nota sobre notificaciones de vencimiento:** Santiago descartó las notificaciones automáticas de "tu paquete vence en 5 días" porque el departamento de producto hace seguimiento diario y llegarían demasiados emails. Se acordó que los paquetes simplemente se desactivan solos al llegar la fecha de validez.

---

## 4. Navegación del sistema

Sidebar con 7 items de navegación planos agrupados en 3 secciones, sin dropdowns (definido en reunión 1, minuto 05:42 - 06:51):

**General:**
1. Dashboard — Vista resumen con stat cards, actividad reciente.
2. Paquetes — Entidad central del sistema.

**Servicios:**
3. Aéreos — Vuelos reutilizables entre destinos.
4. Alojamientos — Hoteles con fotos y precios por periodo.
5. Traslados — Transfers aeropuerto-hotel, tabla simple.
6. Circuitos y cruceros — Itinerarios día por día (pendiente definir specs completas).
7. Seguros — Planes de asistencia al viajero por día.

**Sistema (dentro de Dashboard o como sub-sección):**
- Perfiles y roles
- Catálogos administrables (temporadas, tipos de paquete, países, ciudades, regímenes, etiquetas)
- Proveedores
- Notificaciones a vendedores
- Reporting

---

## 5. Flujo completo: de los servicios al paquete publicado

Este es el flujo operativo de punta a punta tal como lo describieron Gerónimo y Santiago. El principio fundamental es: **los servicios son entidades independientes y reutilizables que se asignan a paquetes. Cambiar el precio de un servicio actualiza automáticamente TODOS los paquetes donde ese servicio está involucrado.**

### 5.1 Paso 1 — Cargar catálogos base

Antes de cargar cualquier servicio o paquete, el administrador debe tener configurados los catálogos:

- **Temporadas:** Labels como "Baja 2026", "Alta 2026", "Baja 2027". Son administrables — el cliente puede crear "Baja 2026" cuando quiera empezar a publicar para mayo-junio. Gerónimo pidió explícitamente autonomía al 100% para crear temporadas nuevas.
- **Tipos de paquete:** "Lunas de miel", "Salidas grupales", "Cruceros", "Eventos", "Deporte". Se usan como filtro tanto en el admin como en el frontend público.
- **Países y ciudades:** Catálogo para asignar a alojamientos, traslados y paquetes.
- **Regímenes hoteleros:** Desayuno, All Inclusive, Media Pensión, etc.
- **Etiquetas/Tags:** "Brasil", "Black Week", "Caribe", "Promo Reebok", etc. Son clave para el sistema de campañas y notificaciones. Gerónimo explicó que las etiquetas se asocian a URLs del frontend para campañas de marketing (ej: traveloz.com.uy/tag/black-friday muestra todos los paquetes con esa etiqueta).
- **Proveedores:** Nombre y datos de contacto. Vinculados directamente a traslados y seguros. Gerónimo pidió que sea una entidad separada "para que si quiero poner Sevens no aparezca una vez como 'siete', otra como 'Sevens' y otra como 'SEVENS'".

### 5.2 Paso 2 — Cargar servicios (aéreos, alojamientos, traslados, seguros)

Los servicios se cargan ANTES de los paquetes. Cada servicio tiene su propio módulo con su propia tabla y formulario.

#### 5.2.1 Aéreos

**Listado (tabla):**
- Columnas visibles: ID, ruta, destino, acciones (editar/clonar/eliminar).
- La aerolínea NO aparece en el listado (solo al editar). Gerónimo lo pidió así.
- La temporada NO aparece en el listado. Se define dentro del aéreo al crear los precios por periodo.
- Filtro inteligente que busca en todos los campos.

**Crear/Editar aéreo — todo en una sola pantalla:**
- Ruta (ej: "MVD → CUN → MVD"). Campo de texto manual.
- Destino (ej: "Cancún"). Esto es lo que se muestra en el listado para filtrar rápido.
- Aerolínea.
- Equipaje incluido (texto).

**Sub-entidad: PRECIO_AEREO (dentro del mismo aéreo):**
- periodo_desde / periodo_hasta (fechas).
- Precio neto adulto.
- Precio neto menor.

Un mismo aéreo "MVD → CUN" puede tener múltiples rangos de precio: septiembre-octubre a USD 700, enero-febrero a USD 900, vacaciones de septiembre (1 al 7) a USD 1100. Santiago fue muy enfático en que los precios de vacaciones son cupos especiales con precios completamente diferentes, y que al asignar ese aéreo a un paquete, el sistema debe chequear las fechas del paquete contra los periodos del aéreo para tomar el precio correcto.

**Regla crítica de propagación:** Si cambio el precio del aéreo "MVD → CUN" para septiembre-octubre, ese cambio se propaga automáticamente a TODOS los paquetes que usan ese aéreo en ese periodo. Gerónimo: "vos puedas únicamente modificando ese aéreo y te modifica todos los paquetes el cual está metido". Santiago: "nosotros vamos a actualizar el servicio, no el paquete".

#### 5.2.2 Alojamientos

**Listado (tabla):**
- Columnas: ID, hotel, ciudad, país, acciones (editar/clonar/eliminar).
- Se eliminó: proveedor (no va en hoteles), latitud, longitud.
- Se mantiene: categoría (estrellas).

**Crear/Editar alojamiento — todo en una sola pantalla (Gerónimo: "la idea como siempre es que figure todo en la misma pantalla"):**
- Hotel (nombre).
- Ciudad, país.
- Sitio web.
- Categoría (estrellas).
- Fotos del hotel (subida múltiple). Santiago: "nosotros sí aplica porque todos nuestros paquetes tienen fotos del hotel".

**Sub-entidad: PRECIO_ALOJAMIENTO (dentro del mismo alojamiento):**
- periodo_desde / periodo_hasta.
- Precio neto por noche.
- Régimen (desayuno, all inclusive, media pensión).

Misma lógica que aéreos: múltiples rangos de precio por periodo. Misma regla de propagación automática.

#### 5.2.3 Traslados

**Listado (tabla editable inline, sin formulario interno):**
- Gerónimo: "que sea así como una tablita y chau". "No tenga formulario interno".
- Columnas: ID, nombre del traslado, tipo (regular/privado), ciudad, país, proveedor (select de entidad), precio, acciones (editar/clonar/eliminar).
- Precio fijo (no varía por periodo, salvo excepciones de fin de año que se manejan creando un traslado nuevo).
- Edición inline directa en la tabla, sin abrir modal o formulario aparte.

**Relación con Proveedores:** Cada traslado se vincula a un proveedor de la entidad Proveedores. Gerónimo: "porque más allá que los traslados sean fijos según la ciudad, hay veces que nos manejamos con distintos proveedores".

#### 5.2.4 Seguros

**Estructura tipo wizard (propuesta de Santiago en reunión 2, minuto 41:14 - 43:38):**
- Proveedor de seguro (ej: Universal Assistants, Tarjetas Celeste, Assist Card, CX). Son ~4 proveedores.
- Plan / producto del proveedor.
- Cobertura (campo de texto libre, ej: "USD 40.000", "USD 80.000", "USD 300.000"). Santiago: "hay mil tipos, mejor texto libre".
- Costo por día por persona.

No se incluyen planes anuales multiviaje (Gerónimo: "los anuales no los vamos a sacar en paquete").

El seguro es un servicio más que se asigna al paquete. Gerónimo confirmó: "exacto, es un servicio más". El costo se calcula como precio_día × cantidad_de_días del paquete.

Los seguros aplican de forma global — si elijo el plan X de Universal Assistants, aplica para todos los paquetes donde esté asignado. No es por paquete individual. Gerónimo: "si quieres usar para los paquetes de Estados Unidos en vez del producto A el producto B del proveedor, eso se puede".

#### 5.2.5 Circuitos y cruceros (PENDIENTE)

Definido parcialmente en reunión 2 (minuto 44:42 - 49:09). Necesita otra llamada para specs completas.

Lo que se sabe:
- Un circuito es un itinerario provisto por un operador (ej: "Europa Mundo" provee "Portugal Magnífico").
- Campos: nombre del circuito, cantidad de noches, proveedor, itinerario día por día (día 1: Madrid, día 2: Barcelona, etc.).
- Precios por periodo (mismo razonamiento que hoteles — temporada alta/baja con fechas desde/hasta). Santiago: "no es la misma temporada alta que temporada baja, el circuito tiene un costo diferente". Gerónimo confirmó: "es el mismo razonamiento que los hoteles".
- Al asignar un circuito a un paquete, el itinerario se muestra automáticamente en el frontend como una pestaña "Itinerario" dentro del paquete. Gerónimo mostró el ejemplo de Turquía.

### 5.3 Paso 3 — Crear un paquete

Una vez que los servicios están cargados, el administrador crea un paquete asignándole servicios existentes.

**Crear paquete — datos generales:**
- Título (ej: "Búzios Relax").
- Descripción / texto visual para el frontend. Gerónimo explicó la diferencia: "la parte de texto es lo que queremos que esté en el front, y la otra parte es para el costeamiento interno". Se acordó unificar: al asignar un servicio, el sistema genera automáticamente el texto de "incluye" para el frontend, pero con la posibilidad de editar manualmente ese texto display. Gerónimo: "que internamente quede atado pero que el nombre visual se pueda cambiar".
- Noches (no días — Gerónimo: "que sea duración de noches, así trabajamos nosotros").
- Salidas (campo libre — ej: "Septiembre a noviembre", "Vacaciones de julio", "Temporada baja 2026"). No es una fecha específica. Santiago: "está bueno que sea un campo libre porque a veces manejamos por mes, a veces por evento".
- Tipo de paquete (seleccionar del catálogo: lunas de miel, grupales, cruceros, eventos, deporte).
- Temporada (seleccionar del catálogo: "Baja 2026", "Alta 2026"). Es un label, no tiene lógica de fechas directa. Se usa como filtro en admin y frontend.
- Validez desde/hasta (fechas). Al llegar la fecha "hasta", el paquete se desactiva automáticamente. Gerónimo: "ponemos validez 8 de octubre para que se nos den de baja automáticamente sin tener que desactivar cada uno".
- Estado: activo/inactivo. Los paquetes desactivados no se eliminan — se pueden reactivar editando la fecha y el precio. Gerónimo: "poder volver a un paquete desactivado del 2025 y únicamente editarlo y activarlo sin tener que cargar nuevamente".
- Destacado (toggle). Se usa para la sección de "paquetes destacados" en el frontend.
- Etiquetas/tags (multi-select del catálogo de etiquetas).
- Fotos del paquete (subida múltiple, drag-and-drop para reordenar).

**Asignar servicios al paquete — misma pantalla, debajo de datos generales:**

1. **Asignar aéreo:** Se abre selector/modal que muestra la tabla de aéreos. Se selecciona por ID. El sistema muestra ruta + precio (automático según las fechas del paquete vs. los periodos del aéreo). Un mismo vuelo MVD→CUN se reutiliza para paquetes de Cancún, Playa del Carmen, Costa Mujeres, Tulum.

2. **Asignar alojamiento:** Se abre selector de hoteles. Se pueden asignar múltiples hoteles (multi-destino: ej. un paquete "Río + Búzios" tiene hotel en Río y hotel en Búzios). Se muestra noches × precio_noche.

3. **Asignar traslado:** Se selecciona de la tabla de traslados. Precio fijo.

4. **Asignar seguro:** Se selecciona proveedor → plan. El precio se calcula como precio_día × noches del paquete.

5. **Asignar circuito (cuando esté definido):** Se selecciona el circuito, se carga automáticamente el itinerario día por día y el precio según periodo.

**Cada servicio asignado genera automáticamente la línea de "incluye" en el frontend** (ej: "Pasaje aéreo MVD / CUN / MVD", "7 noches de alojamiento con régimen desayuno"), pero con la posibilidad de editar el texto display sin romper la vinculación interna.

### 5.4 Paso 4 — Calcular precio

El flujo de precios es: **Neto → Markup → Precio de venta.**

- **Neto:** Se calcula automáticamente sumando los costos de todos los servicios asignados al paquete (aéreo + alojamiento × noches + traslado + seguro × días + circuito si aplica).
- **Markup:** Porcentaje que define el margen. Se puede editar por paquete individualmente. Santiago: "a nivel de estrategia puede cambiar, porque capaz que en un paquete queremos ir por abajo del markup habitual".
- **Precio de venta:** Neto × (1 + markup/100). Se auto-calcula pero se puede sobreescribir para redondear.

Moneda: se trabaja en USD (es la unidad principal de la agencia).

### 5.5 Paso 5 — Publicar

El administrador revisa el paquete completo y lo publica. Al publicar:
- El paquete aparece en el frontend público (traveloz.com.uy o destinoicono).
- Se muestra con sus fotos, servicios incluidos, precio desde, y opciones hoteleras.
- Si tiene etiquetas, aparece en las landing pages de esas etiquetas (ej: /tag/brasil).
- Si está marcado como destacado, aparece en la sección "paquetes destacados" del home.

### 5.6 Paso 6 — Actualizar precios (flujo diario)

Este es el flujo más importante del día a día. Santiago lo explicó perfectamente: "nosotros vamos a actualizar el servicio, no el paquete".

1. Llega una nueva tarifa de aerolínea → el admin va a **Aéreos**, busca el vuelo, edita el precio del periodo correspondiente.
2. El sistema automáticamente recalcula el neto de **todos los paquetes** que usan ese aéreo en ese periodo.
3. El precio de venta se actualiza según el markup de cada paquete.
4. Los paquetes se reflejan inmediatamente en el frontend con el nuevo precio.

Mismo flujo para hoteles, traslados y seguros. El admin nunca necesita editar paquetes uno por uno cuando cambia un precio de servicio.

### 5.7 Paso 7 — Gestionar campañas y notificar vendedores

Flujo semanal típico descrito por Gerónimo (reunión 2, minuto 29:41 - 33:44):

1. **Lunes:** El departamento de producto crea/actualiza paquetes para la campaña de la semana. Les asigna la etiqueta correspondiente (ej: "Promo Nordeste Marzo").
2. **Martes:** El admin entra al módulo de **Notificaciones**:
   - Selecciona la etiqueta de campaña.
   - El sistema filtra y muestra todos los paquetes con esa etiqueta.
   - Selecciona los paquetes que quiere notificar.
   - El sistema genera automáticamente un template con: resumen de servicios por paquete, vuelos utilizados, links directos a cada paquete en la web.
   - El admin revisa y puede editar el template.
   - Envía a "grupo ventas TravelOz" o "grupo ventas DestinoIcono" (un solo email por grupo).
3. **Simultáneamente:** Marketing toma los links y etiquetas para crear placas de pauta digital.

### 5.8 Paso 8 — Ciclo de vida del paquete

- **Borrador → Activo:** El admin completa los datos y publica.
- **Activo → Auto-desactivado:** Cuando llega la fecha de validez_hasta, el paquete se desactiva solo. No se elimina, queda como inactivo.
- **Inactivo → Reactivado:** Para la siguiente temporada, el admin busca el paquete desactivado del año anterior, le cambia las fechas, ajusta precios y lo reactiva. Gerónimo: "no tener que cargar nuevamente paquetes".
- **Cualquier estado → Clonado:** Se puede clonar un paquete existente como base para crear uno nuevo rápidamente.
- **Cualquier estado → Eliminado:** Eliminación permanente con confirmación.

---

## 6. Flujo por módulo: detalle de interacciones

### 6.1 Paquetes

**Vista listado:**
- Tabla con columnas: ID, título, destino, temporada, noches, estado (activo/inactivo/borrador), precio venta, acciones.
- Filtro inteligente global (busca en todos los campos). Gerónimo: "filtros inteligentes, ponés Miami y te aparecen todos los que digan Miami".
- Filtros rápidos por temporada, estado, tipo de paquete.
- Acciones por fila: editar, clonar, eliminar.
- Búsqueda instantánea.

**Vista detalle/edición:**
- Tabs internos: Datos generales, Servicios, Precios, Fotos, Publicación.
- Todo en una sola pantalla la mayor cantidad posible (principio del cliente).
- Los servicios se asignan desde la misma pantalla del paquete.
- El orden de los servicios en "incluye" se reordena con drag-and-drop (Latitud Nómade lo propuso, Gerónimo aceptó).

**Vista vendedor (solo lectura):**
- Misma estructura visual pero sin botones de acción.
- Solo ve precio de venta.
- Sirve para que cuando llega un lead, el vendedor haga clic y vea: "este paquete está cotizado con este aéreo, estos traslados y estas opciones hoteleras".

### 6.2 Aéreos

**Vista listado:**
- Tabla con: ID, ruta, destino, acciones.
- Sin temporada en listado (se ve al editar).
- Sin aerolínea en listado (se ve al editar).

**Vista edición:**
- Datos del vuelo: ruta, destino, aerolínea, equipaje.
- Tabla de precios por periodo (sub-entidad PRECIO_AEREO): periodo_desde, periodo_hasta, neto adulto, neto menor. Se pueden agregar múltiples filas.
- Todo en la misma pantalla.

### 6.3 Alojamientos

**Vista listado:**
- Tabla con: ID, hotel, ciudad, país, categoría (estrellas), acciones.

**Vista edición:**
- Datos del hotel: nombre, ciudad, país, sitio web, categoría.
- Tabla de precios por periodo (sub-entidad PRECIO_ALOJAMIENTO): periodo_desde, periodo_hasta, neto por noche, régimen.
- Fotos del hotel (subida múltiple).
- Todo en la misma pantalla.

### 6.4 Traslados

**Vista listado/edición combinada (tabla inline):**
- Tabla editable directamente: ID, nombre, tipo (regular/privado), ciudad, país, proveedor (select de entidad), precio, acciones.
- Sin formulario interno. Gerónimo: "que sea una tablita y chau".
- Editar/clonar/eliminar por fila.

### 6.5 Seguros

**Vista listado:**
- Tabla con: proveedor, plan, cobertura, costo/día, acciones.

**Vista edición/creación:**
- Proveedor (select del catálogo de proveedores de seguros).
- Plan / producto.
- Cobertura (texto libre).
- Costo por día por persona.
- ~4 proveedores en total, ~100 planes. No son más.

### 6.6 Circuitos y cruceros (PENDIENTE)

**Datos preliminares de la reunión 2:**
- Nombre del circuito (ej: "Portugal Magnífico").
- Proveedor (ej: Europa Mundo).
- Cantidad de noches.
- Itinerario día por día (día 1: texto, día 2: texto...). Se agrega día por día y se puede copiar/pegar.
- Precios por periodo (mismo que hoteles: desde/hasta + precio).
- Al asignar a un paquete, el itinerario se "chupa" y se muestra en el frontend.

**Falta definir:** Specs completas de campos, interacciones, y cómo se vincula con cruceros (si es la misma entidad o separada). Pendiente para próxima llamada.

### 6.7 Proveedores

- Nombre.
- Datos de contacto.
- Se vincula directamente a: Traslados (N:1), Seguros, Circuitos.
- No se vincula a Paquetes directamente, ni a Alojamientos.
- Evita duplicados de nombres (la razón principal de tenerlo como entidad separada).

### 6.8 Catálogos administrables

CRUD simple para cada catálogo. El cliente debe ser autónomo al 100%:
- Temporadas (labels).
- Tipos de paquete (categorías).
- Países y ciudades.
- Regímenes hoteleros.
- Etiquetas / tags.
- Aerolíneas (si se quiere normalizar).

### 6.9 Notificaciones a vendedores

Flujo de 6 pasos:
1. Ir a módulo de notificaciones.
2. Seleccionar etiqueta / campaña.
3. El sistema muestra paquetes asociados a esa etiqueta.
4. Seleccionar qué paquetes notificar.
5. Sistema genera template automático con resumen de servicios + links al frontend.
6. Revisar/editar template → Enviar a grupo de ventas (1 email por marca).

Santiago descartó notificaciones de vencimiento ("le llegarían muchos mails"). Se acordó que solo se hace la notificación manual de campañas semanales.

Destinos de envío: `grupo_ventas_traveloz@...` y `grupo_ventas_destinoicono@...`. Un solo email por grupo, no individual por vendedor.

### 6.10 Reporting

**Reportes confirmados por el cliente:**
- Paquetes por destino × temporada (Gerónimo quiere gráfica de torta).
- Hoteles más usados en paquetes.
- Proveedores menos utilizados.
- Visitas web por paquete (desde el frontend).

**Propuestas de Latitud Nómade para futuro:**
- Comparativas año vs año (necesita +1 año de datos).
- Forecast / tendencias de venta.
- Momento de compra (Santiago: "estudiamos el momento de compra hace un año y medio").
- Paquetes más vistos a través del frontend.

Gerónimo prefiere analizarlo más adelante: "lo vemos, ahí me cuesta visualizar qué podemos llegar a analizar".

---

## 7. Reglas de negocio críticas

### 7.1 Propagación automática de precios
Cuando se modifica el precio de un servicio (aéreo, hotel, traslado, seguro), el neto de TODOS los paquetes que usan ese servicio se recalcula automáticamente. El precio de venta se ajusta según el markup de cada paquete. Esto es la funcionalidad más importante del sistema.

### 7.2 Servicios reutilizables
Un aéreo MVD→CUN se usa en paquetes de Cancún, Playa del Carmen, Costa Mujeres y Tulum. No se crea un aéreo nuevo por paquete.

### 7.3 Precios por periodo en aéreos y alojamientos
Los rangos de fecha (periodo_desde/periodo_hasta) definen el precio aplicable. Un mismo aéreo puede tener precio de temporada baja (sept-oct), alta (ene-feb) y vacaciones (1-7 septiembre) con valores diferentes. El sistema matchea las fechas del paquete con los periodos del servicio.

### 7.4 Temporadas como labels
Las temporadas ("Baja 2026", "Alta 2026") son labels/etiquetas administrables. No tienen fechas asociadas directamente. Las fechas viven en los precios de cada servicio y en la validez del paquete.

### 7.5 Auto-desactivación por validez
Cuando la fecha validez_hasta de un paquete se cumple, el paquete se desactiva automáticamente del frontend. No se elimina.

### 7.6 Tags y URLs del frontend
Las etiquetas se asocian a URLs del frontend. Un paquete con tag "Black Friday" aparece en traveloz.com.uy/tag/black-friday. Las etiquetas son administrables desde el backend.

### 7.7 Texto visual vs. vinculación interna
Los servicios asignados a un paquete tienen una vinculación interna (para costos y propagación) y un texto display editable (para lo que se muestra en "incluye" del frontend). Gerónimo: "que internamente quede atado pero que el nombre visual se pueda cambiar".

### 7.8 Multi-marca con datos independientes
TravelOz y DestinoIcono son la misma app, mismo diseño, mismo código. Los datos son completamente separados. El hosting es compartido (Railway).

---

## 8. Lo que el cliente NO puede hacer

- Los vendedores no pueden editar nada. Solo ven paquetes en modo lectura con precio de venta.
- No hay auto-registro de usuarios. Los administradores crean las cuentas manualmente.
- No se pueden crear paquetes sin tener servicios cargados previamente (los servicios se cargan primero).
- Los vendedores no ven costos netos ni markup. Solo ven el precio de venta final.
- No se pueden eliminar proveedores que estén vinculados a traslados o seguros activos.
- No se puede publicar un paquete sin al menos un servicio asignado (regla sugerida).
- Los datos de una marca no son visibles para la otra marca.

---

## 9. Lo que queda pendiente por definir

1. **Circuitos y cruceros:** Specs completas, si son la misma entidad o separada, campos exactos, relación con paquete.
2. **Markup default:** ¿Hay un markup default configurable o siempre se pone por paquete?
3. **"Precio desde" del frontend:** ¿Se llena automáticamente con el precio de venta?
4. **Reglas de paquetes relacionados/destacados:** ¿Por precio similar, por ubicación, por tipo? Hay que definir las reglas de asociación para el frontend.
5. **Template exacto de notificaciones:** ¿Qué datos de cada paquete se incluyen en el email a vendedores?
6. **Reportes iniciales:** ¿Cuáles se implementan en v1 y cuáles quedan para después?
7. **Costo y propuesta de hosting:** Pendiente de enviar de Latitud Nómade a Gerónimo.

---

## 10. Stack técnico y timeline

**Stack:** Next.js 14 + PostgreSQL + Prisma, hosted en Railway (mismo hosting para ambas marcas).

**Timeline acordado:**
- Semana 1: Enviar documento de requerimientos para validación del cliente.
- Semana 2: Comenzar mockups (fase visual sin funcionalidad).
- Semana 3-4: Mockup completo validado por el cliente.
- Abril en adelante: Desarrollo con base de datos, servidor, conexión frontend. Capacitación del departamento de producto.
- Target: Mediados de abril 2026 para tener el sistema funcionando con paquetes cargados. Gerónimo: "para estos lanzamientos, la idea es que el backend esté funcionando, los paquetes cargados, ya esté capacitada la persona a cargo del departamento de producto".

---

*Documento generado por Latitud Nómade como referencia interna para el desarrollo del backend admin de TravelOz/DestinoIcono. Toda la información proviene de las reuniones con el cliente y las decisiones tomadas durante el proceso de relevamiento.*
