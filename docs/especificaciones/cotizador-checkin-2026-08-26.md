# Check-in del cotizador en producción: 26 y 27 de agosto de 2026

**Acta de decisiones.**
**Participantes:** Gerónimo Cassoni y Pablo (TravelOz), Diego Castaño (Latitud Nómade).
**Fecha de la llamada:** 26/08/2026. **Ajustes posteriores:** 26 y 27/08 por WhatsApp.
**Fuentes:** transcripción de la llamada, inventario de control de los 46 pedidos, y las entradas del [CHANGELOG](../../CHANGELOG.md) del 26 y 27 de agosto.

---

## 1. Contexto

El cotizador y el módulo de datos de pasajeros llevaban dos días en producción.
Gero y Pablo recorrieron las dos herramientas en vivo, con el sistema abierto,
y fueron marcando lo que había que cambiar antes de soltarlo al equipo de
ventas.

Se revisaron cinco cosas: el formulario público de datos de pasajeros, el
formulario de tarjeta y la bóveda, el editor del cotizador, la hoja del
pasajero con su PDF, y el circuito de envío a Administración.

Del relevamiento salieron **46 pedidos y observaciones**. Al cierre de la
jornada del 26/08 quedaron **33 hechos y desplegados** (commit `2c67319` y los
que siguieron), **8 descartados en la misma llamada** y **3 abiertos**
esperando una definición del cliente. El resto quedó pendiente de un insumo
externo.

Fechas del proceso acordado:

| Cuándo | Qué |
|---|---|
| Viernes 28/08 | Revisión de todo lo aplicado, con Gero |
| Lunes 31/08 | Piloto con un vendedor |
| Después | Apertura a todo el equipo |

---

## 2. Decisiones cerradas

### 2.1 Formulario de datos de pasajeros

- **Sale el bloque de datos del viaje** (destino, preferencia). El formulario
  pide solo datos de los pasajeros. Si el pasajero llegó por una solicitud del
  vendedor, el destino se guarda igual por detrás.
- **Un solo "Documento de viaje"**, con la ayuda "cédula o pasaporte". Se
  elimina el campo pasaporte separado.
- **Salen ciudad, país y dirección.** Quedan solo dentro del bloque de factura
  con RUT, que no cambió.
- **Un solo "Foto del documento" más un "Adjuntar archivo"**, los dos
  opcionales. Sin foto el pasajero puede enviar igual.
- **Cinco campos obligatorios por pasajero:** nombre y apellido, documento de
  viaje, fecha de nacimiento, email y teléfono. La validación corre en el
  formulario y en el servidor, con mensajes en español.
- **"Nombre y apellido" en un solo campo.** Las fichas y los emails muestran el
  nombre completo; los envíos anteriores al cambio se siguen leyendo.
- **Todos los pasajeros con los mismos campos**, verificado a 390 px de ancho
  con dos pasajeros.

### 2.2 Formulario de tarjeta y bóveda

- **Violeta, no rojo.** El botón y el aviso de "Datos de tarjeta" pasan a
  violeta, en la vista del vendedor y en el formulario público. El formulario
  de pasajeros sigue coral.
- **Orden del formulario:** arriba el pasajero (nombre y documento de quien
  viaja), abajo la tarjeta (titular tal cual figura, número, vencimiento,
  código y cuotas). **El registro se identifica por el pasajero**, no por el
  titular: muchas veces no coinciden.
- **Cuotas de 1 a 6.** Validado también en el servidor.
- **La bóveda guarda 96 horas**, antes 72. El motivo es cubrir el fin de
  semana. La cifra vive en una sola constante y los textos de las siete
  pantallas la leen de ahí.
- **El vendedor sigue viendo el número completo.** Enmascarado en la lista,
  completo al abrirlo. Gero revirtió su propio pedido de bloquearlo: el
  vendedor puede necesitar verificar la tarjeta por teléfono.
- **Cada apertura queda registrada.** Abrir "Ver datos" y mandar a ADM
  aparecen en la solapa "Accesos" de la ficha, con quién y cuándo.

### 2.3 "Enviar a ADM"

- Botón **al lado de "Ver datos"**. Pide el **número de file** a mano, manda los
  datos completos a la casilla de Administración y deja registrado quién lo
  envió y cuándo. Tope de envíos por hora.
- **La casilla es `adm@traveloz.com.uy`**, cargada en Web → Notificaciones. Se
  cambia desde ahí, sin desarrollo.
- **El email a Administración lleva la tarjeta completa, código de seguridad
  incluido.** Es lo que hoy hace el vendedor reenviando a mano. Quedó anotado
  como decisión operativa de TravelOz, para que la acepten por escrito de su
  lado.
- **Enviar a ADM no borra la tarjeta.** El registro sigue vivo hasta que se
  cumplen las 96 horas.

### 2.4 Cotizador

- **No se podía escribir "@" en el email del cliente** desde una Mac con
  teclado español: el atajo Alt+número para saltar de bloque se comía Option+2.
  Los atajos ya no actúan mientras se escribe en un campo.
- **Elegir un cliente del historial trae solo sus datos** (nombre, apellido,
  email y teléfono), nunca la cotización anterior. Copiar hoteles y vuelos pasó
  a ser una acción aparte y explícita.
- **"Régimen detallado"** como opción del encabezado, para cuando los hoteles
  no comparten régimen. La línea de servicios dice "07 noches de alojamiento ·
  según régimen detallado".
- **El régimen del encabezado cambia todos los hoteles**, en cascada de arriba
  hacia abajo. En modo detallado cada hotel se edita a mano. Lo de abajo no
  gobierna lo de arriba, como se acordó.
- **Check-in del hotel editable por destino**, al lado del régimen, para los
  vuelos nocturnos. Mueve el check-out y los tramos.
- **Las noches siguen al cambio de destino**, y lo que el vendedor editó a mano
  no se pisa.
- **"Agregar habitación" vive solo dentro de cada opción**, un botón al pie de
  las habitaciones. Agregar una habitación la **replica en las demás opciones**
  con la misma ocupación y tipo, con precio en 0 para cargar por hotel.
- **El selector de personas llega a 5** (Single, Doble, 3, 4, 5) y después
  "Más…" numérico.
- **El seguro deja de mostrar el plan.** Decía "master" porque es el nombre del
  plan en el catálogo; pasó a "Seguro de asistencia al viajero · Master" en la
  llamada y a "Seguro de asistencia al viajero" a secas el 27/08.
- **Se retiró el selector celular / tablet / escritorio** del panel "Lo que ve
  el pasajero" del editor. "Vista previa" sigue abriendo la previa completa. El
  chrome del editor ya no se imprime con Cmd+P.
- **"Mis links"** en el inicio y en el editor, con copiar y WhatsApp, para
  mandar los links de datos de pasajeros y de tarjeta sin entrar al modal de
  compartir.

### 2.5 PDF y página del pasajero

- **No se corta el itinerario ni las opciones entre páginas.** Cada trayecto y
  cada opción van enteros; una opción se parte entre hoteles solo si no entra
  en una hoja.
- **El logo se imprime bien.** El encabezado usa la imagen del logo del sitio,
  que sale igual desde el navegador y desde el servidor.
- **Notas solo si hay notas.** Se eliminó la precarga de texto automático; la
  sección aparece únicamente con contenido real.
- **Fuera la letra chica de validez**, del PDF y de la página del pasajero. La
  vigencia del link sigue corriendo por dentro y el email la menciona.
- **Revisado desde el celular:** texto mínimo de 9 pt en papel, página
  verificada a 390 px.

### 2.6 Vigencia

- **La vigencia por defecto pasa a 96 horas hábiles**, antes 48. El modal de
  compartir ofrece 24 / 48 / 72 / 96 y el valor inicial se edita en Ajustes.
  Las cotizaciones ya enviadas conservan la vigencia con la que salieron.

---

## 3. Pedidos posteriores por WhatsApp

### 3.1 Del 26 de agosto

- **La aerolínea sale de "Tu viaje incluye".** El catálogo armaba la línea de
  aéreo como "Copa Airlines · Montevideo - Cancún - Montevideo". La agencia
  cotiza el aéreo por ruta y se reserva cambiar de compañía manteniendo el
  precio, así que la línea queda con la ruta sola, igual que la ficha pública
  del paquete. Las cotizaciones ya guardadas conservan su texto; se corrigen
  editando la línea.
- **El título de la cotización lleva solo el destino final.** "Caribe › Jamaica
  › Jamaica, Noviembre 2026" queda "Jamaica, Noviembre 2026". Aplica en la hoja
  del pasajero, el PDF, el encabezado del editor, el texto de WhatsApp, el
  email, el listado de seguimiento con su filtro de destinos, y analytics. Las
  cotizaciones ya guardadas se muestran así. Un título escrito a mano por el
  vendedor no se toca; las tarjetas de paquetes del inicio conservan el camino
  completo.

### 3.2 Del 27 de agosto

- **"Paquetes por vencer" del dashboard tiene que abrir esa lista.** El pill ya
  era un link, pero el listado ignoraba el parámetro y mostraba todos los
  paquetes, así que parecía que no era clickeable. Ahora abre el listado con la
  alerta "Por vencer (próximos 14 días)": solo los activos con validez entre hoy
  y 14 días, ordenados por el que vence antes, cada uno con su pastilla "Vence
  3 sep · en 6 días" en rojo si vence hoy o mañana.
- **La tabla "Precios por periodo" del hotel tiene que entrar en la pantalla.**
  Tenía un ancho mínimo de 980 px y en una laptop los botones de editar y
  eliminar quedaban fuera de la vista: parecía que no se podía editar ni borrar
  un período. Ahora la tabla se adapta al ancho, la columna de acciones queda
  siempre visible, y al agregar o editar una tarifa la fila muestra "Guardar
  tarifa" y "Cancelar". La tabla de precios de circuitos hereda el arreglo.
- **El seguro va sin plan.** La línea dice "Seguro de asistencia al viajero". Si
  el paquete tiene un texto propio para el pasajero, se respeta.

Como operación aparte, se corrigieron a mano desde el editor las líneas de
servicios de las cotizaciones anteriores al cambio: COT-2026-0006, 0018 y 0026
por el aéreo con aerolínea, y COT-2026-0025 por el seguro con plan.

---

## 4. Decisiones del 27 de agosto (Diego)

Cierran las tres preguntas que la llamada dejó abiertas.

| Tema | Decisión |
|---|---|
| Aviso al vendedor cuando entra una tarjeta | **Se mantiene.** El vendedor recibe el aviso sin número ni código; los datos completos salen a Administración por el botón "Enviar a ADM" |
| Tarjeta rechazada por Administración | **Se maneja fuera del sistema.** Administración avisa al vendedor y este reconfirma con el pasajero. No se construye un flujo propio por ahora |
| Estado de la tarjeta en la lista | **"Enviado a ADM" con el número de file y la fecha**, más la auditoría de accesos. Aprobada / rechazada requiere que alguien lo marque y queda afuera |
| Usuario de QA | **Se mantiene activo** para la revisión del viernes y el piloto |
| Retención de la bóveda | **96 horas fijas.** No se extiende para las tarjetas ya enviadas a ADM |

---

## 5. Descartados, con el motivo

| Pedido | Motivo |
|---|---|
| País de emisión del pasaporte | Lo bajó Gero en la misma llamada: el vendedor lo pregunta |
| Vista previa del formulario para el vendedor | "No hay que darle vuelta": el formulario es siempre el mismo |
| Bloquear el número de tarjeta al vendedor | Gero lo revirtió: el vendedor puede necesitar verificar por teléfono |
| No borrar las tarjetas de la bóveda | "Elimina": se mantiene el borrado automático a las 96 horas |
| Cargar el vuelo del back en la cotización | El dato no es confiable y puede haber más de un aéreo por paquete |
| Renombrar las ocupaciones a triple y cuádruple | Se mantiene "3 personas / 4 personas" para no comprometer tipologías |

---

## 6. Lo que queda abierto

1. **Itinerarios reales para probar el lector de PNR.** Falta que Gero pase 3 o
   4 itinerarios complejos (Europa a medida, Asia, escalas largas) para correr
   el lector con volumen antes del piloto. Los casos que hay hoy viven en
   [docs/pnr-ejemplos/](../pnr-ejemplos/).
2. **Credenciales al equipo.** Falta definir cuándo y cómo se reparten los
   accesos a los vendedores. Hoy el módulo corre con el admin y un usuario de
   prueba.
3. **Rol de Amparo.** Sin definir qué permisos necesita ni sobre qué módulos.

---

## 7. Documentos relacionados

- [Módulo Cotizador de vendedores](../arquitectura/modulos/cotizador.md)
- [Módulo Pasajeros y pagos](../arquitectura/modulos/pasajeros-pagos.md)
- [Cotizador — Especificación funcional Fase 1](./cotizador-especificacion-v1.md)
- [Cotizador — Documento de usabilidad](./cotizador-usabilidad-v1.md)
- [CHANGELOG](../../CHANGELOG.md), entradas del 26 y 27 de agosto de 2026
