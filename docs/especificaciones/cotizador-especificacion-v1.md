# Cotizador — Especificación funcional Fase 1

**Proyecto:** Latitud Nómade · TravelOz + Destínico
**Base:** llamada 28/07 (Gero) + llamada 30/07 (Santi, luego Gero) + revisión del repo `diego-castano/traveloz`
**Estado:** alcance cerrado, seña 50% confirmada. Mockup primero, integración después.

---

## 0. Principios rectores

Cuatro ideas que ordenan todas las decisiones de abajo. Si algo entra en conflicto, gana el principio.

1. **Un dato se carga una sola vez.** Si el vendedor ya escribió la fecha de salida, ningún otro bloque se la vuelve a pedir. Lo mismo con destino, noches, hotel y régimen.
2. **Todo lo precargado es editable.** Sin excepción. Venga del paquete o de la propagación automática, el vendedor lo pisa cuando quiere.
3. **Formato cerrado, contenido libre.** Lo que define la identidad de la cotización (título, fechas, estructura) se elige por clic, no se escribe. Lo que es contenido del viaje admite texto libre siempre.
4. **Nada obligatorio traba el guardado.** El cotizador actual obliga a cargar mail, nombre y apellido antes de avanzar. Eso se elimina: se guarda incompleto y se completa después.

**Objetivo medible:** ≤4 minutos una cotización de dos destinos con tres opciones hoteleras desde cero. ≤60 segundos si arranca desde un paquete.

---

## 1. Entradas al cotizador

### 1.1 Desde un paquete (camino principal)
Botón **"Armar cotización"** en la ficha del paquete dentro del backend. Precarga:

| Dato | Origen en el sistema |
|---|---|
| Título (destino + mes + año) | `Paquete.nombre` + período de vigencia |
| Destinos y noches por ciudad | `PaqueteDestino` |
| Servicios incluidos | `PaqueteServicio` + `CatalogoServicio` |
| Opciones hoteleras completas | `OpcionHotelera` → `OpcionHotel` → `Alojamiento` |
| Precio por opción y markup | factor divisor de `OpcionHotelera` |
| Fotos de hotel | `AlojamientoFoto` |

Es el diferencial contra cualquier cotizador de plaza: los datos ya están estructurados, no hay que rearmarlos.

### 1.2 En blanco (camino secundario, alto volumen)
Para productos que no están en la web. **No es un caso de borde:** en la llamada se remarcó que muchas cotizaciones arrancan de cero. Mismo formulario, campos vacíos, misma velocidad.

---

## 2. Bloques del armado

### Bloque 1 — Cliente
- Buscar cliente existente o crear al vuelo: nombre, apellido, email, teléfono.
- **Ningún campo obligatorio.** Se puede guardar la cotización sin cliente cargado.
- Alimenta el saludo automático de la salida.

### Bloque 2 — Encabezado (formato controlado)
Tres controles separados, no un campo de texto:

1. **Destino** — texto libre.
2. **Mes** — selector por clic, lista de meses.
3. **Año** — selector por clic, **solo año actual y siguiente** (los vuelos no se ven más allá de ~11 meses).

Resultado renderizado: `Punta Cana, Octubre 2026`. Nada más.

> Razón explícita: hoy uno escribe "7 noches", otro escribe el nombre de la agencia, otro escribe cualquier cosa. El formato se rompe y cada cotización sale distinta. El objetivo es que todas las cotizaciones de ambas marcas, con cualquier vendedor, salgan iguales.

Si viene de un paquete: los tres campos se autocompletan desde el nombre y el período del paquete, y quedan modificables.

**Fecha de salida** — es el disparador de toda la propagación (ver sección 3).

### Bloque 3 — Mensaje libre
Texto opcional del vendedor, con **formato normalizado**: si se pega desde afuera, la tipografía se limpia y adopta la de la cotización. Hoy se pega y rompe el diseño.

### Bloque 4 — Itinerario de vuelos
- Se pega el bloque de texto del PNR ("el chanchito") y se genera el itinerario con el formato de la marca: aerolínea, número de vuelo, salida, llegada.
- Las fechas del itinerario **alimentan al resto**: si están los vuelos, no hay que escribir la fecha del traslado en ningún lado.
- Editable línea por línea después de la conversión.

### Bloque 5 — Servicios (cápsulas)
Categorías: aéreo, traslado, alojamiento, vehículo, seguro, opcionales.

- Precargados con los habituales de cada categoría.
- **Texto libre siempre disponible** para lo no catalogado.
- Alta rápida: escribir + Enter agrega y deja el foco listo para el siguiente.
- **Reordenables arrastrando** (`dnd-kit` ya está en el stack).
- Los "opcionales" tienen que funcionar — en el cotizador actual directamente no se agregan y nunca se resolvió.

**Traslados — mejora pedida:** hoy son fijos (llegada / salida / llegada+salida / +interhotel, en regular o privado) pero **no permiten indicar la ciudad**. Se agrega el campo ciudad. Para multi-destino tipo Europa, donde algunos tramos tienen traslado y otros no, el vendedor agrega manualmente los que correspondan.

### Bloque 6 — Notas internas
- Netos por servicio y total de costos fijos.
- **Nunca se comparte con el pasajero.** No aparece en la salida pública, ni en el PDF, ni en el link.

### Bloque 7 — Opciones hoteleras
Estructura: Opción 1..n, cada una con un hotel por tramo (ej. Río + Búzios).

Por hotel: nombre, categoría (estrellas), tipo de habitación, régimen, **foto**.
Por opción: precio por adulto en base doble, markup con el factor divisor que ya usa el sistema (`Precio Venta = Neto ÷ Factor`).

- **Duplicar opción en un clic**, sin desordenar nada. Hoy se copia y pega y queda mal.
- **Fotos de hotel:** Destínico ya tiene ~1.900 hoteles con foto cargada manualmente por producto y vendedores. Se mantienen. La foto se normaliza automáticamente: cualquier tamaño de original renderiza igual en la cotización. El repo ya tiene `AlojamientoFoto` y punto focal en `PaqueteFoto`, así que la infraestructura está.
- Hotel del catálogo o texto libre, indistintamente.

---

## 3. Motor de propagación automática

Esta es la pieza que ahorra el tiempo. Se carga **una vez** arriba y baja a todo lo demás:

```
Fecha de salida
    ├─→ check-in de la primera opción de alojamiento
    ├─→ fechas de todos los bloques de servicios
    ├─→ fechas de traslado (o las toma del itinerario de vuelo)
    └─→ + noches por destino = check-out y check-in del tramo siguiente

Destino + noches
    └─→ se replican en todas las opciones hoteleras

Régimen (ej. all inclusive)
    └─→ se replica hacia arriba en el bloque correspondiente

Itinerario de vuelo (PNR)
    └─→ alimenta fechas donde no haya dato manual
```

Ejemplo textual de la llamada: salida 15 de junio → la opción de alojamiento arranca con check-in 15 de junio, sin que nadie lo escriba. Punta Cana + 7 noches + all inclusive cargado una vez → replicado en todas las opciones.

**Regla de oro:** la propagación llena, no bloquea. El vendedor sobreescribe cualquier valor propagado y ese valor manual gana.

---

## 4. Salida al pasajero

### Contenido
1. Logo de la marca
2. Título (`Destino, Mes Año`)
3. Saludo personalizado
4. Mensaje libre, si lo hay
5. Bloque "Incluye" con iconos
6. Itinerario de vuelos
7. Tabla de opciones hoteleras con fotos y precios
8. Letra chica
9. Formas de pago con logos bancarios
10. Firma del vendedor

### Reglas de presentación
- **Mobile-first, sin negociación.** El 100% de las cotizaciones se comparte por WhatsApp y se lee en celular.
- Tabla de opciones: **acordeón por fila**, se toca y se abre. Nunca scroll horizontal.
- Firma y logos bancarios con tamaños fijos, no estirados.
- Fotos de hotel con relación de aspecto fija.
- Tipografía única en toda la pieza.
- Identidad diferenciada por marca: logo, colores, iconos, letra chica, formas de pago, firmas. La lógica es idéntica; solo cambia la piel.

---

## 5. Compartir, enviar y seguir

- **Link para WhatsApp** — el canal principal. Es lo primero que tiene que funcionar bien.
- **Envío por email** — copia fija a `cotizaciones@` + destinatarios adicionales. Con el PDF adjunto.
- **PDF** — descargable e imprimible. Requisito explícito: **tiene que salir bien**. El sistema actual genera mal el PDF y los vendedores terminan usando Ctrl+P y ajustando a mano. Eso no puede pasar.
- **Analytics del link** — registrar si el pasajero abrió la cotización, cuándo y cuántas veces. Aviso al vendedor si no se abrió pasado un plazo. *(Agregado en la llamada del 30/07.)*

---

## 6. Gestión

- Listado de cotizaciones con buscador y filtros.
- Numeración automática secuencial (reusa `IdCounter` / `sequential-id.ts`).
- Duplicar una cotización entera.
- Plantillas por destino.
- Reportes por vendedor.
- Guardado automático y borradores que sobreviven a cerrar la pestaña (reusa `AutoSaveIndicator`).
- Acceso para todos los perfiles del sistema — principalmente ventas, pero visible para todos.

---

## 7. Rendimiento y usabilidad

Cita textual de la definición de velocidad: *snappy, tipo videojuego — pa, pa, siguiente, todo guardado y listo.*

- Teclado primero: tab/enter para agregar servicios, sin tocar el mouse.
- UI optimista, guardado en background.
- Cero modales evitables.
- Defaults sensatos en todo campo que los admita.
- **Prueba de fuego:** un vendedor nuevo arma una cotización completa sin capacitación. Son 21 vendedores y 3 ya no usan el cotizador actual por costumbre; la barrera de entrada tiene que ser cero.

---

## 8. Convivencia con el sistema actual

- Módulo **interno del backend**: mismo login, mismo design system, sin plataformas ni accesos nuevos.
- **Colisión de nombres a resolver:** `/backend/cotizadores` ya existe en el repo y es otra cosa (landings de captación con form builder, `CotizadorLanding` / `CotizadorLead`). El módulo nuevo necesita ruta y modelos propios — sugerido `/backend/cotizaciones` — y conviene renombrar el módulo viejo a "Landings de captación" en la UI antes de que se mezclen.
- **Bitrix queda por fuera del cotizador.** La cotización vive en el sistema; el seguimiento del lead sigue en Bitrix. La automatización de formularios web → deal en Entrada caliente ya está terminada y es independiente de esto.
- Recomendación técnica: guardar `bitrixDealId` en el modelo desde el día uno aunque no se use. Agregarlo después sale mucho más caro.
- El cotizador viejo sigue operativo hasta que el nuevo esté probado internamente.

---

## 9. Proceso

1. **Mockup navegable, desconectado de la web** — proyecto aparte, para romper y jugar sin tocar producción.
2. **Llamada de revisión con Santi y Gero** — iterativa, como se hizo con la web.
3. **Integración a ambos backends** una vez aprobado.
4. Producción TravelOz → replicación Destínico.

El mockup aprobado congela el alcance del desarrollo.

---

## 10. Fuera de alcance de la Fase 1

- **Confirmador** — proyecto aparte. (Ver sección 11; la presión del cliente es alta.)
- Migración del histórico de cotizaciones — se puede hacer, se cotiza aparte.
- Ocupaciones triple, single y menores — Fase 1 trabaja con precio por adulto en base doble, igual que el cotizador actual.
- Multi-moneda — todo en dólares.
- Vinculación de la etapa "cotización enviada" con Bitrix.
- Todo cambio posterior a la aprobación del mockup.

---

## 11. Confirmador — lo que se sabe hasta ahora

No es Fase 1, pero conviene que el modelo de datos de la cotización nazca preparado, porque el confirmador **spawnea desde la última cotización enviada**.

Alcance real según la llamada del 30/07 — es más grande de lo conversado antes:

- Se dispara cuando el cliente dice que sí.
- No solo confirma al pasajero: **dispara a todos los departamentos internos** que reservan vuelos, hoteles, traslados, tours y cruceros. Hoy todo eso es por mail, a mano.
- Requiere pantalla de reservas pendientes con estados, asignación por persona (ej. Belén) y alertas de atraso.
- Se resolvería con un back propio o automatizando Bitrix — sin definir.
- La información tiene que ser milimétrica: es lo que ejecutan los otros departamentos.

Campos a dejar previstos en el modelo de cotización: itinerario elegido, opción hotelera elegida, precio final, seña, vencimiento, datos de pago.

---

## 12. Decisiones pendientes

| Tema | Estado |
|---|---|
| Conversión de PNR: parser propio vs. API externa | Sin definir. Es el ítem con más riesgo de tiempo imprevisto. |
| Acceso al cotizador de TravelOz | Ofrecido, no enviado. |
| Acceso visual al cotizador de Destínico | Prometido, para replicar el manejo de imágenes. |
| Numeración: ¿continúa la serie actual o arranca de cero? | Sin definir. |
| Migración del histórico: ¿se migra o se corta por fecha? | Sin definir. Fase 1 asume corte por fecha. |
| Verificación del apex en Resend | Pendiente. Hoy los mails salen desde `notificaciones@app.traveloz.com.uy`; si la cotización va al pasajero conviene dominio verificado. |
| Generación de PDF: servidor vs. CSS de impresión | Sin definir. No hay infra de PDF en el stack. |
