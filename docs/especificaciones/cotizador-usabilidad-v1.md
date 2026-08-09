# Cotizador — Documento de usabilidad

**Latitud Nómade · TravelOz + Destínico**
Base: llamadas del 28/07 (Gero) y 30/07 (Santi + Gero). Complemento de la especificación funcional.

---

## 0. La vara

Textual de la llamada:

> *"La idea es que la herramienta sea mejor que la que tienen ustedes. Si es peor, no vamos a hacer nada."*

Eso no es una aspiración, es el criterio de aceptación. El cotizador actual funciona y el equipo lo usa todos los días. Si el nuevo es más lindo pero tarda lo mismo, fracasó.

La segunda cita que ordena todo:

> *"Es clic, clic y se terminó la cotización. No te puede llevar tiempo."*
> *"Snappy, tipo videojuego — pa, pa, siguiente, todo guardado y listo."*

**Metas duras, cronómetro en mano:**

| Escenario | Meta |
|---|---|
| Cotización desde un paquete, 2 destinos, 3 opciones hoteleras | ≤ 60 segundos |
| Cotización en blanco, 2 destinos, 3 opciones hoteleras | ≤ 4 minutos |
| Duplicar una opción hotelera | 1 clic |
| Duplicar una cotización entera y cambiar fechas | ≤ 30 segundos |
| Enviar por WhatsApp una vez armada | ≤ 3 clics |

Si en el mockup no se cumplen, el mockup todavía no está pronto.

---

## 1. Dolor actual → solución concreta

Todo lo de esta tabla salió de las dos llamadas, no de suposiciones.

| Dolor hoy | Qué se hace |
|---|---|
| Obliga a poner mail, nombre, apellido y fechas antes de avanzar | Ningún campo obligatorio. Se guarda incompleto. |
| La fecha se escribe cuatro veces | Se escribe una vez y baja a todos los bloques |
| Se escribe la fecha del traslado teniendo el PNR cargado | Si están los vuelos, la fecha no se pide |
| Duplicar opción hotelera es copiar y pegar, y queda desordenado | Botón de duplicar en la card, orden intacto |
| Los "opcionales" no se agregan — bug nunca resuelto | Funciona, y es parte del checklist de aceptación |
| El texto pegado rompe la tipografía | Todo pegado se normaliza a texto plano |
| Se escriben a mano nombres de hotel, estrellas, régimen | Vienen del catálogo, con texto libre como escape |
| El PDF sale mal y hay que usar Ctrl+P y ajustar | El PDF sale bien de una |
| En celular la firma no carga y los logos bancarios salen estirados | Tamaños fijos, probado en celular real |
| La tabla de opciones scrollea de costado en el celular | Acordeón: se toca la fila y se abre |
| Cada vendedor escribe el título como quiere | Destino libre, mes y año por clic |
| Nada se conecta con los paquetes ya cargados | "Armar cotización" precarga todo |
| Fotos de hotel de cualquier tamaño descuadran el diseño | Relación de aspecto fija, se acomodan solas |
| 3 de 21 vendedores no lo usan por costumbre | Curva de aprendizaje cero (sección 8) |

---

## 2. Principios de interacción

**Una sola pantalla, un solo scroll.** Sin wizard de pasos, sin pestañas. El vendedor ve toda la cotización de arriba a abajo y salta a donde necesita. Los pasos obligan a memorizar dónde quedó cada cosa.

**Precargar en lugar de preguntar.** Cada campo vacío es una decisión que le estás pidiendo al vendedor. Si el dato existe en algún lado del sistema, se pone solo.

**Rellenar nunca bloquea.** Lo automático se pisa siempre, y lo pisado gana.

**Guardar es invisible.** Nunca hay un botón "Guardar" que se pueda olvidar de apretar. Autosave con indicador discreto — el componente ya existe en el sistema.

**La validación avisa, no traba.** Falta el precio de la opción 2 → un aviso suave. Nunca un modal que impide seguir.

**Confirmar solo lo destructivo.** Eliminar una opción pide confirmación o, mejor, se elimina con un "Deshacer" de 5 segundos. Todo lo demás es directo.

---

## 3. Entrada de datos: velocidad real

### Teclado antes que mouse
- Foco automático en el primer campo al abrir.
- Orden de tabulación que sigue el orden visual, sin saltos raros.
- En las cápsulas de servicios: escribir + **Enter** agrega y deja el cursor listo para el siguiente. Así lo usan hoy y así tiene que seguir.
- **Escape** cierra cualquier panel sin perder lo escrito.
- Command palette (`Cmd/Ctrl+K`) para saltar entre bloques — ya está en el sistema.

### Selección
- Buscador de hoteles con resultados que muestran **foto, ciudad y categoría**, no solo el nombre. Reconocer visualmente es más rápido que leer.
- Al final de cada lista de resultados, siempre la opción **"Usar como texto libre"**. El vendedor nunca queda trabado porque el hotel no está cargado.
- Los componentes ya existen en el sistema: `SearchableSelect`, `CreatableSelect`, `MultiSelectCombobox`.

### Números y precios
- El markup muestra el **precio de venta calculado en vivo** al lado del neto, mientras se escribe. Sin recalcular mentalmente ni esperar a guardar.
- El formato de moneda se aplica al salir del campo, no mientras se escribe (formatear en vivo pelea con el que teclea).

### Fechas
- Un solo selector de fecha de salida, prominente, arriba de todo.
- Al lado, las noches calculadas automáticamente: *"15 jun → 22 jun · 7 noches"*.
- Si el vendedor pisa a mano una fecha propagada, esa fecha queda marcada como manual. Y si después cambia la fecha de salida, aparece un aviso con un botón **"Actualizar todo"** — un clic para volver a propagar, o se deja como está. Sin esto, el vendedor no entiende por qué un campo no se actualizó.

### Pegado
- Todo lo que se pega entra como texto plano. El mensaje libre nunca vuelve a llegar con otra tipografía.
- El PNR va en un textarea grande, con botón **Convertir**. Si el parseo falla, **no se pierde lo pegado** y se puede editar a mano. Este es el punto con más chance de fallar en producción; que falle sin destruir el trabajo es innegociable.
- El itinerario convertido queda editable línea por línea.

---

## 4. Reordenar y duplicar

- **Drag handle siempre visible**, no solo al pasar el mouse. Si aparece con hover, en touch no existe.
- Al arrastrar, indicador claro de dónde va a caer.
- Alternativa por teclado o por botones ↑↓ para quien no quiere arrastrar.
- **Duplicar opción hotelera:** botón visible en la card, no escondido en un menú de tres puntos. La copia aparece inmediatamente debajo, con el foco en su nombre para renombrarla. El orden del resto no se toca.
- **Duplicar cotización entera:** desde el listado, un clic, abre la copia lista para cambiar fechas.

`dnd-kit` ya está en el stack, así que esto es configuración, no desarrollo.

---

## 5. Ver el resultado mientras se arma

El vendedor tiene que poder ver cómo va quedando sin perder el lugar donde estaba.

- Botón **Vista previa** fijo, siempre accesible.
- La vista previa abre exactamente lo que va a ver el pasajero, en formato celular por defecto — porque ahí se lee.
- Cerrar la vista previa devuelve al mismo punto del formulario.
- Las notas internas nunca aparecen en la vista previa. Que se vea que no aparecen es parte de la confianza en la herramienta.

---

## 6. La salida en celular

El 100% de las cotizaciones se comparte por WhatsApp. La salida **es** el producto.

- Tabla de opciones como **acordeón**: se toca la fila y se despliega. Nunca scroll horizontal.
- Firma del vendedor con tamaño fijo y carga garantizada.
- Logos bancarios con relación de aspecto fija, sin estirar.
- Fotos de hotel recortadas a una proporción única — cualquier original queda igual.
- Tipografía única en toda la pieza.
- El link abre sin login, sin app, y carga rápido con conexión de datos.
- Probado en celular real, no en el simulador del navegador.

**PDF:** tiene que salir bien directo, sin Ctrl+P ni ajustes. Saltos de página controlados, sin cortar una tabla de opciones al medio, sin dejar la firma huérfana en la última hoja.

---

## 7. Consistencia entre vendedores

Pedido explícito: que todas las cotizaciones de ambas marcas, con cualquier vendedor, salgan iguales.

Se resuelve por diseño, no por instructivo:

- **El título no se escribe libre.** Destino en texto, mes y año por clic. No hay forma de que salga distinto.
- Los servicios habituales están precargados: escribir a mano es la excepción.
- La letra chica, las formas de pago y la estructura son de la marca, no editables por el vendedor.
- Lo único personal es la firma.

Regla general: **si un vendedor puede romper el formato, tarde o temprano lo rompe.** Todo lo que define identidad se elige, no se escribe.

---

## 8. Que un vendedor nuevo lo use sin capacitación

Son 21 vendedores y 3 no usan el actual por costumbre. Ingresan personas nuevas en agosto. La prueba real es que alguien arme una cotización sin que nadie le explique.

- **Estados vacíos que enseñan:** en lugar de un bloque en blanco, "Pegá acá el PNR y lo convertimos" o "Agregá la primera opción hotelera".
- **Etiquetas en el idioma del negocio:** "Opción hotelera", "Régimen", "Neto", "Factor". No inventar vocabulario nuevo.
- Textos de ayuda breves debajo de los campos ambiguos, no tooltips que hay que descubrir.
- Nada escondido detrás de un menú contextual: las acciones frecuentes están a la vista.
- El camino desde el paquete tiene que ser tan evidente que se descubra solo — un botón claro en la ficha del paquete.

---

## 9. Nunca perder trabajo

Es lo que destruye la confianza en una herramienta y hace que la gente vuelva a la anterior.

- Autosave permanente con indicador de estado.
- El borrador sobrevive a cerrar la pestaña, quedarse sin batería o perder conexión.
- Al volver, se reabre exactamente donde estaba.
- Eliminar algo ofrece **Deshacer**.
- Nunca un error que borre lo cargado. Si algo falla, falla mostrando el dato.

---

## 10. Detalles chicos que se notan

- Toasts breves para confirmar acciones — el componente ya está.
- Contador visible: *"3 opciones hoteleras"*, *"7 servicios"*.
- Numeración de cotización visible desde el inicio, no asignada al guardar.
- Al enviar por mail, mostrar a quién se envía antes de mandar, con la copia fija a `cotizaciones@` ya puesta y visible.
- El link de WhatsApp se copia con un clic y confirma que se copió.
- Indicador de si el pasajero abrió la cotización, visible en el listado y en la ficha.
- Estado de la cotización visible de un vistazo: borrador, enviada, abierta, confirmada.

---

## 11. Checklist para validar el mockup

Para la llamada con Santi y Gero. Si algo de esto no pasa, no está pronto:

- [ ] Se arma una cotización desde un paquete en menos de 60 segundos
- [ ] Se arma una en blanco en menos de 4 minutos
- [ ] La fecha de salida se escribe una sola vez y aparece en todos lados
- [ ] Se duplica una opción hotelera con un clic y el orden queda intacto
- [ ] Se agregan opcionales y funcionan
- [ ] Se pega texto con formato de afuera y sale con la tipografía correcta
- [ ] Se pega un PNR y sale el itinerario con el formato de la marca
- [ ] Se agrega un hotel que no está en el catálogo, escribiéndolo
- [ ] Se cierra la pestaña a mitad de camino y al volver está todo
- [ ] Nada obliga a completar un campo para poder guardar
- [ ] El título sale igual lo arme quien lo arme
- [ ] Las fotos de hotel de distintos tamaños se ven todas iguales
- [ ] La salida se abre en un celular real y la tabla no scrollea de costado
- [ ] La firma y los logos bancarios se ven bien en celular
- [ ] El PDF sale bien sin tocar nada
- [ ] Las notas internas no aparecen por ningún lado en la salida
- [ ] Alguien que nunca lo vio arma una cotización sin que le expliquen

Este último es el que más importa.
