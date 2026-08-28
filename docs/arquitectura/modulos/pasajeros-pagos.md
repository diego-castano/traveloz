# Módulo: Pasajeros y pagos

> **Rutas del panel:** `/backend/datos` (admin) y las solapas Pasajeros y Pagos de la vista del vendedor.
> **Rutas públicas:** `/datos-de-pasajeros/<slug>` y `/datos-de-pago/<slug>`.
> **Entró a producción:** 17 de agosto de 2026 (migración `20260817000000_datos_pasajeros_y_pagos`).
> **Última ronda de cambios documentada:** 26 de agosto de 2026.
> **Complementa:** [modulos-backend.md](../modulos-backend.md) · [cotizador.md](./cotizador.md) · [cotizador-checkin-2026-08-26.md](../../especificaciones/cotizador-checkin-2026-08-26.md)

---

## 1. Propósito

Cada vendedor tiene dos links públicos permanentes. Con uno, el pasajero carga
los datos de todo el grupo tal cual figuran en el documento de viaje. Con el
otro, carga los datos de la tarjeta con la que paga.

Los datos de pasajeros quedan en la bandeja del vendedor y el email se los
manda completos. Los datos de tarjeta entran a una **bóveda cifrada** que se
borra sola a las 96 horas: el vendedor recibe solo un aviso, abre el registro
con su PIN o su contraseña, y lo manda a Administración con el número de file
desde un botón que deja auditoría.

El módulo reemplaza el circuito manual de pedir los datos por WhatsApp y
reenviar la tarjeta a mano.

---

## 2. Modelos Prisma

Todos en [prisma/schema.prisma](../../../prisma/schema.prisma), bajo el
encabezado "Datos de pasajeros y datos de pago — links personales por
vendedor".

```prisma
enum TipoFormularioDato {
  PASAJEROS
  PAGO
}
```

### 2.1 `FormularioDato`

Dos filas, una por tipo. Definición editable de cada formulario público:
`titulo`, `texto` (`@db.Text`), `campos Json` y `publicado Boolean @default(false)`.

`campos` usa el mismo contrato `FormField` del cotizador
([src/lib/cotizador-form.ts](../../../src/lib/cotizador-form.ts)) y guarda solo
los campos **extra** que agregue el admin: los campos duros del pasajero van
tipados en `PasajeroDato`. Con `publicado: false` la página pública responde "no
disponible", que es lo que permite desplegar sin que nadie lo vea.

### 2.2 `SolicitudDato`

Un pedido dirigido a un pasajero concreto, el botón "Enviar por email" del
vendedor. El link permanente no pasa por acá.

`tipo`, `vendedorId`, `vendedorEmail`, `vendedorNombre`, `destinatarioEmail`,
`destinatarioNombre?`, `destino?`, `referencia?`, `token @unique`, `enviadoAt`,
`expiraAt`, `completadoAt?`. Índice `[vendedorId, enviadoAt desc]`.

El token es de un solo uso y viaja en la URL como `?s=<token>`: precarga
destinatario y sella `completadoAt` al enviar. `vendedorId` va como String
suelto, sin relación Prisma, misma convención que `asignadoAUserId`.

La `referencia` es el puente con el cotizador: ahí va el número `COT-2026-NNNN`.

### 2.3 `EnvioPasajeros` y `PasajeroDato`

`EnvioPasajeros` es el grupo que llegó de una sola pasada por el formulario:
`vendedorId`, `vendedorEmail`, `solicitudId?`, `destino?`, `referencia?`, los
cuatro campos de factura con RUT, `vistoAt?`, `createdAt`, `ip?`, `userAgent?`.
Índices por `[vendedorId, createdAt desc]`, `[destino]` y `[createdAt desc]`.
`vistoAt` se sella al abrir el detalle, marca automática.

`PasajeroDato` es un pasajero dentro del envío. Campos duros tipados porque se
buscan y se exportan: `nombres`, `apellidos`, `fechaNacimiento?`, `documento`,
`pasaporte?`, `email`, `telefono`, `direccion?`, `pais?`, `ciudad?`,
`documentoArchivoUrl?`, `pasaporteArchivoUrl?`, más `respuestas Json` con los
campos extra. Cascada desde `EnvioPasajeros`. Índices por `[envioId]` y
`[email]`.

Desde el 26/08 el formulario guarda el nombre entero en `nombres` y deja
`apellidos` en cadena vacía. `pasaporte`, `direccion`, `pais` y `ciudad` quedan
en null: se dejaron en el modelo para que los envíos anteriores se sigan
leyendo.

### 2.4 `DatosPagoCifrado`

La bóveda.

| Grupo | Columnas | Notas |
|---|---|---|
| Dueño | `vendedorId`, `vendedorEmail`, `solicitudId?` | |
| Identidad **en claro** | `pasajeroNombre?`, `pasajeroDocumento?`, `titular`, `emisor?`, `ultimos4` | Fuera del sobre cifrado |
| Sobre cifrado | `payload Bytes?`, `iv Bytes?`, `tag Bytes?` | AES-256-GCM |
| Rotación | `keyVersion Int @default(1)` | La columna existe; la rotación todavía no está implementada |
| Recordatorio | `recordatorioResendId?` | Id del email agendado en Resend |
| Ciclo | `createdAt`, `expiraAt`, `vistoAt?`, `purgadoAt?` | |
| Envío a ADM | `numeroFile?`, `enviadoAdmAt?`, `enviadoAdmPor?` | |

Índices por `[vendedorId, createdAt desc]` y `[expiraAt]`.

El payload cifrado guarda el número de tarjeta, el vencimiento, el código de
seguridad, el documento del titular, las cuotas y los campos extra. A las 96
horas el barrido pone `payload`, `iv`, `tag` y `pasajeroDocumento` en null y
sella `purgadoAt`. **La fila sobrevive como registro**: quedan el nombre del
pasajero, el titular, el emisor, los últimos 4 y las fechas.

### 2.5 Campos de `User`

| Campo | Para qué |
|---|---|
| `slug String? @unique` | El link personal, `traveloz.com.uy/datos-de-pasajeros/<slug>`. Nunca se recicla entre personas: si alguien se va, su slug queda muerto |
| `linkActivo Boolean @default(true)` | Interruptor del link público. Apagado muestra una página de cortesía, no un 404 |
| `pinHash String?` | PIN numérico de 4 a 6 dígitos, con hash bcrypt. Segundo factor del revelado |
| `passwordHash String` | El otro segundo factor aceptado |
| `fotoUrl`, `telefono`, `whatsapp`, `cargo` | La tarjeta del asesor en los emails y en el formulario público |

### 2.6 Auditoría

El módulo no tiene tabla propia: todo va a `AuditLog` con
`targetType: "datosPagoCifrado"` (o `"formularioDato"`).

| `action` | Cuándo |
|---|---|
| `datos.pago.revelado` | El vendedor abrió una tarjeta |
| `datos.pago.revelar.fail` | Falló el segundo factor. La metadata dice qué factor se intentó, nunca la credencial |
| `datos.pago.enviar_adm` | Envío a Administración: file, cantidad de destinos, pasajero |
| `datos.pago.enviar_adm.fail` | Resend rechazó el envío |
| `datos.formulario.update` | El admin editó un formulario |

### 2.7 Migraciones

| Migración | Qué hace |
|---|---|
| [20260817000000_datos_pasajeros_y_pagos](../../../prisma/migrations/20260817000000_datos_pasajeros_y_pagos/) | Crea el enum y las cinco tablas; agrega a `User` los campos `slug` (con índice único), `fotoUrl`, `telefono`, `whatsapp`, `linkActivo`, `mustChangePassword` y `passwordChangedAt` |
| [20260817000001_boveda_key_version](../../../prisma/migrations/20260817000001_boveda_key_version/) | `keyVersion INTEGER NOT NULL DEFAULT 1` en `DatosPagoCifrado` |
| [20260826200000_pago_pasajero_y_envio_adm](../../../prisma/migrations/20260826200000_pago_pasajero_y_envio_adm/) | Cinco columnas nullable (`pasajeroNombre`, `pasajeroDocumento`, `numeroFile`, `enviadoAdmAt`, `enviadoAdmPor`), el índice `AuditLog_targetType_targetId_createdAt_idx`, y un `UPDATE` acotado que reescribe "72 horas" por "96 horas" en el texto editable del formulario de pago |

---

## 3. Arquitectura

### 3.1 Los dos links del vendedor

`slugUnicoParaUsuario(nombre, opts)` en
[src/lib/slug-usuario.ts](../../../src/lib/slug-usuario.ts) normaliza el nombre,
esquiva los slugs reservados y prueba `base-2`, `base-3` hasta 50 veces; después
cae a un sufijo aleatorio. Vive fuera de `user.actions.ts` porque ese módulo es
`"use server"` y todo lo que exporta se vuelve endpoint.

`getMiLink(tipo, vendedorId?)` en
[datos-vendedor.actions.ts](../../../src/actions/datos-vendedor.actions.ts)
devuelve la URL más un QR en data URL (el servidor lo genera para no meter la
librería en el bundle). Trae adentro **la autocuración**: si el usuario no tiene
slug, `asegurarSlug()` lo genera, lo guarda y loguea `datos.slug.autocurado`. Si
choca contra el unique, atrapa el error y relee el slug fresco de la base. Sin
candidato posible, pide que un administrador lo genere desde Perfiles.

El slug lo asigna también el alta de usuario, y un admin puede regenerarlo con
`regenerarSlug(id)` desde [user.actions.ts](../../../src/actions/user.actions.ts).

### 3.2 Formularios públicos

[src/app/(formularios)](../../../src/app/%28formularios%29/) tiene las dos páginas y
sus componentes. Las dos van con `dynamic = "force-dynamic"` y
`robots: index:false, follow:false`.

La cadena de chequeos antes de dibujar el formulario:

1. El slug tiene que matchear `^[a-z0-9-]{1,60}$`, si no `notFound()`.
2. Si no existe ningún usuario con ese slug, `notFound()`.
3. Si el slug existe pero `linkActivo` está apagado, se muestra la página de
   cortesía: la persona del otro lado merece una explicación, no un 404 seco.
4. Si el `FormularioDato` no está publicado, misma pantalla con el detalle.
5. En `/datos-de-pago`, además, `bovedaDisponible()` tiene que dar true.

El layout no monta navegación, no carga el tracker de atribución ni el botón
flotante de WhatsApp: estas páginas manejan documentos y tarjetas, no son
superficie de marketing.

### 3.3 Formulario de pasajeros

Componente
[PasajerosForm.tsx](../../../src/app/%28formularios%29/_components/PasajerosForm.tsx),
validación de servidor en
[src/lib/datos-form.ts](../../../src/lib/datos-form.ts).

**Cinco campos obligatorios por pasajero y nada más**, decisión del cliente del
26/08:

| Campo | Detalle |
|---|---|
| Nombre y apellido | Un solo campo, hasta 200 caracteres, con la ayuda "tal cual figura en el documento de viaje". A 390 px, dos columnas partían el nombre en dos cajas angostas |
| Documento de viaje | Único, cédula o pasaporte, hasta 40 caracteres |
| Fecha de nacimiento | Entre 1900-01-01 y hoy. No se pide mayoría de edad: los menores viajan |
| Email | Hasta 254 caracteres |
| Teléfono | Hasta 40 caracteres, al menos 8 dígitos |

Opcionales: "Foto del documento" y "Adjuntar archivo", más los campos extra que
haya definido el admin. El bloque "Deseo factura con RUT" abre RUT, razón social
y email como obligatorios, y dirección como opcional. `destino` y `referencia`
viajan ocultos solo cuando el pasajero llegó por una solicitud.

Topes: `MAX_PASAJEROS = 12`, con aviso a partir de `AVISO_PASAJEROS = 9`.
Honeypot invisible llamado `website`.

### 3.4 Formulario de pago

Componente
[PagoForm.tsx](../../../src/app/%28formularios%29/_components/PagoForm.tsx),
validación en `datosPagoSchema`.

El orden lo pidió el cliente: **arriba el pasajero, abajo la tarjeta**.

| Bloque | Campos |
|---|---|
| Pasajero | Nombre y apellido del pasajero ("a nombre de quién es el viaje que se está pagando"), documento del pasajero |
| Tarjeta | Titular tal cual figura, documento del titular, número, vencimiento `MM/AA`, código de seguridad, cuotas |
| Cierre | Autorización obligatoria, campos extra |

El número se formatea de a 4 mientras se tipea y muestra un chip con el emisor
detectado. El servidor valida largo 13 a 19, dígitos, Luhn, y que el `MM/AA`
todavía esté vigente (una tarjeta vence al final del mes impreso). Las **cuotas
van de 1 a 6**: `CUOTAS_OPCIONES = [1,2,3,4,5,6]`, cortado por el cliente el
26/08 y validado también del lado del servidor.

**El violeta.** Los formularios de datos son coral (`#F43E55`, la constante
`ACENTO` de `_components/ui.tsx`). `PagoForm` es el único que lo rompe: define
`--form-acento: #785AE5` sobre el `<form>`. El motivo está escrito en el
componente: pide número de tarjeta y el cliente no quiere un pixel de rojo cerca
de eso, "transmite alarma". El foco de todos los campos ya era violeta
(`--fx-foco: #6d55c4`) por la misma razón. En el panel, el violeta de marca es
`#8B5CF6` a `#6C2BD9`.

### 3.5 Cifrado de la bóveda

[src/lib/datos-cifrado.ts](../../../src/lib/datos-cifrado.ts).

- **Algoritmo:** `aes-256-gcm`, IV de 12 bytes (GCM recomienda 96 bits; 16 bytes
  obliga a un GHASH extra sin sumar seguridad).
- **Clave:** `DATOS_PAGO_KEY`, en base64. Se acepta solo si al decodificar mide
  exactamente 32 bytes: `Buffer.from(base64)` no falla ante basura, así que el
  largo es la única validación confiable.
- **Formato:** `JSON.stringify` del objeto de tarjeta en utf8, cifrado, y las
  tres partes a tres columnas `Bytes` separadas: `payload`, `iv` y `tag` (el
  auth tag de GCM). Sin concatenación ni prefijo de versión.
- **Qué entra al sobre:** número, vencimiento, código de seguridad, documento
  del titular, cuotas y los campos extra. Los extra van adentro porque el modelo
  no tiene columna `respuestas` y todo lo que se tipea en esa pantalla se trata
  como sensible por defecto.

Funciones exportadas: `bovedaDisponible()`, `cifrar()`, `descifrar()`,
`soloDigitos()`, `ultimos4()`, `detectarEmisor()`, `luhnValido()`,
`vencimientoADate()`, `vencimientoVigente()`.

La regla dura del archivo: **prohibido guardar en claro como fallback**. Si
falta la clave o es inválida, `bovedaDisponible()` devuelve false y el
formulario de pago no se muestra. Es preferible perder un envío que dejar un
número de tarjeta legible en la base.

### 3.6 Retención de 96 horas y purga

[src/lib/datos-constantes.ts](../../../src/lib/datos-constantes.ts) exporta dos
cosas y nada más:

```ts
export const HORAS_BOVEDA = 96;
export const TEXTO_HORAS_BOVEDA = `${HORAS_BOVEDA} horas`;
```

El módulo es puro a propósito, sin `node:crypto` ni Prisma, para que lo pueda
importar un componente cliente, una pantalla del cotizador o un email del
servidor. La vida de la bóveda se dice en siete pantallas distintas: con el
número como literal en cada una, cambiarlo obligaba a acordarse de las siete, y
el día que se olvida una la promesa que lee el pasajero deja de ser la que
cumple el barrido.

[src/lib/datos-purga.ts](../../../src/lib/datos-purga.ts) tiene el barrido:

- `purgarBovedaVencida()` corre **un solo `updateMany`**, con el `where`
  `{ expiraAt: { lt: ahora }, purgadoAt: null }` y el `data`
  `{ payload: null, iv: null, tag: null, pasajeroDocumento: null, purgadoAt: ahora }`.
- `barridoOportunista()` lo dispara con probabilidad 0,05 en cada lectura, y
  nunca propaga el error.

El archivo lleva un cartel en caja: **ese es el único `updateMany` permitido
sobre `DatosPagoCifrado`, y siempre con ese mismo `where`**. Sin el
`expiraAt < ahora` se borra la bóveda entera y no hay backup posible, porque el
payload cifrado es la única copia. Sin el `purgadoAt: null` se pierde la fecha
real de borrado. La base de este proyecto es producción.

`pasajeroDocumento` se borra con la tarjeta porque también es dato personal. El
nombre del pasajero queda: identifica la fila.

**La red diaria** es
[.github/workflows/purga-boveda.yml](../../../.github/workflows/purga-boveda.yml):
cron `0 6 * * *` (06:00 UTC, 03:00 en Montevideo) más disparo manual. Hace un
`POST` a `https://traveloz.com.uy/api/datos/purgar` con el header
`x-purga-secret` tomado del secret `PURGA_SECRET`, y falla el job si la
respuesta no es 200. Existe para el caso "nadie abrió el panel en todo el fin de
semana"; en minutos de Actions es efectivamente gratis, que fue el criterio
frente a un cron pago en Railway.

El endpoint [/api/datos/purgar](../../../src/app/api/datos/purgar/route.ts) es
solo POST, porque un GET que borra datos es un accidente esperando a un preload.
Acepta el header con el secreto o una sesión de ADMIN. Si la env
`PURGA_SECRET` falta del lado del servidor responde 503 pidiendo definirla y
forzar redeploy; si el secreto no coincide, 401. Es idempotente.

### 3.7 Emails

[src/lib/datos-email.ts](../../../src/lib/datos-email.ts). Remitente
`TravelOz <notificaciones@app.traveloz.com.uy>`.

**Regla dura de las cuatro primeras plantillas:** el número de tarjeta, el
código de seguridad y el documento del titular nunca salen por email. Solo
viajan pasajero, titular, emisor y los últimos 4. Para ver el resto hay que
entrar al panel con sesión.

| Plantilla | Va a | Qué lleva |
|---|---|---|
| `solicitudDatosEmail` | Pasajero | Tarjeta del asesor con foto y WhatsApp, destino y referencia si los hay, y el botón al formulario con `?s=<token>`. En la variante de pago agrega el microcopy de las 96 horas |
| `envioPasajerosEmail` | Vendedor | Un bloque por pasajero con documento, nacimiento, email, teléfono y los campos extra; los adjuntos como links al proxy con la leyenda "se abren con tu sesión del panel"; bloque de factura con RUT si corresponde |
| `avisoPagoEmail` | Vendedor | Pasajero, documento del pasajero, titular, `emisor •••• 1234`, destino, referencia y hasta cuándo está disponible. **Sin número, sin código, sin vencimiento, sin documento del titular, sin cuotas.** Botón "Abrir la bóveda" a `/backend/datos/pagos/<id>` |
| `recordatorioPagoEmail` | Vendedor | Lo mismo, con el texto "te queda 1 día" |
| `datosPagoAdmEmail` | Administración | El único con la tarjeta completa. Ver 3.9 |

**El recordatorio de 24 horas** se agenda con Resend en el momento en que el
pasajero envía el formulario
([datos-publico.actions.ts](../../../src/actions/datos-publico.actions.ts)):

```ts
const recordarAt = new Date(
  Math.min(expiraAt.getTime() - 24 * 60 * 60 * 1000, Date.now() + 71 * 60 * 60 * 1000),
);
```

El parámetro es `scheduledAt`, que `sendEmail` serializa como `scheduled_at`. El
tope de 71 horas existe porque el `scheduled_at` de Resend admite hasta 72 y con
la bóveda de 96 horas caía justo en el borde. El id que devuelve Resend se
guarda en `recordatorioResendId`, y `revelarPago` lo cancela contra la API
cuando el vendedor abre la bóveda antes.

Los asuntos pasan por `asuntoSeguro()`, que saca saltos de línea y tabulaciones
y corta a 120 caracteres: un salto de línea en el medio de un header SMTP parte
el mensaje en dos.

### 3.8 Revelado con segundo factor

[src/actions/datos-boveda.actions.ts](../../../src/actions/datos-boveda.actions.ts),
action `revelarPago({ id, credencial })`.

La secuencia, en orden:

1. `requireAuth()`.
2. `barridoOportunista()` **antes de leer**: si este registro ya venció, la
   purga tiene que alcanzarlo antes de que alguien lo lea.
3. Rate limit propio: 10 fallos por usuario cada 15 minutos, en memoria del
   proceso. Solo los fallos consumen cupo. Vive acá y no en `rate-limit.ts`
   porque la clave es un `userId` y no una IP, y el techo es distinto.
4. Se lee la fila y se aplica el alcance: dueño o ADMIN. Decisión cerrada con el
   cliente, el superadmin también abre la bóveda.
5. Se corta si el registro está purgado, vencido o sin payload.
6. **Segundo factor:** si el usuario tiene PIN y lo que tipeó son 4 a 6 dígitos,
   se compara contra el hash del PIN; si no, contra el hash de la contraseña. Un
   PIN mal tipeado cae en la rama de contraseña y falla igual: el mensaje es el
   mismo, así que no revela cuál de los dos factores se esperaba.
7. Se descifra, se cancela el recordatorio agendado y se sellan `vistoAt` y
   `recordatorioResendId: null`, las dos cosas best-effort.

La auditoría registra el intento fallido con qué factor se usó y el éxito con el
id del pago. **La credencial no se loguea: ni en el fallo, ni truncada, ni
hasheada.** El payload descifrado no toca el logger, ni el audit log, ni un
mensaje de error: vive solo en el estado local del componente que lo muestra, no
va a un provider, ni a localStorage, ni a la URL.

### 3.9 "Enviar a ADM"

`enviarPagoAAdm(id, { numeroFile })` en
[datos-vendedor.actions.ts](../../../src/actions/datos-vendedor.actions.ts).

**Por qué el email lleva todo.** Las otras plantillas van al vendedor, que tiene
usuario y abre la bóveda con su PIN. Administración no tiene usuario en el
sistema, y el flujo real de la agencia es que el vendedor le pasa la tarjeta a
mano por WhatsApp o reenviando el mail. Este envío reemplaza ese reenvío manual
por uno auditado, a una única casilla configurada. Decisión del cliente del
26/08/2026.

**No pide PIN.** La sesión del vendedor alcanza; la contrapartida es el registro
en `AuditLog`.

La secuencia:

1. Valida el número de file: obligatorio, hasta 40 caracteres, solo letras,
   números, espacios y `. / -`, sin saltos de línea.
2. Lee el SiteSetting **`notificaciones_email_adm`**, parte el valor por comas,
   punto y coma o espacios, valida cada dirección y deduplica. Si no queda
   ninguna, devuelve "Configurá la casilla de ADM en Web → Notificaciones" y no
   manda nada. El ajuste se siembra **vacío a propósito**: es la única casilla
   que recibe datos de tarjeta completos.
3. Aplica el alcance dueño o ADMIN, con la misma respuesta que a un registro
   inexistente.
4. Corta si el registro está purgado, vencido o sin payload.
5. **Cooldown de 10 minutos** para reintentar el mismo registro con el mismo
   file. Cambiar el file habilita un envío nuevo.
6. **Tope de 20 envíos por vendedor por hora**, contados sobre `AuditLog`. Los
   `.fail` no gastan cupo.
7. Descifra, arma el email y lo manda con `sensible: true`.
8. **Chequea `delivered`.** Si Resend rechazó, no sella la fila, audita
   `datos.pago.enviar_adm.fail` y devuelve el error: la auditoría no puede decir
   que Administración recibió algo que Resend rechazó.
9. Si salió, sella `numeroFile`, `enviadoAdmAt` y `enviadoAdmPor`, y audita
   `datos.pago.enviar_adm`. La metadata guarda solo el qué: id, file, cuántos
   destinos y el nombre del pasajero. Nada de la tarjeta entra ahí.

El email a Administración lleva número de file, pasajero, documento del
pasajero, destino, referencia, titular, documento del titular, emisor, **número
agrupado de a 4, vencimiento, código de seguridad**, cuotas y los campos extra.
Cierra pidiendo que borren el email al terminar y recordando que los datos se
eliminan solos a las 96 horas. El `replyTo` va al vendedor. El flag `sensible`
hace que, en un entorno sin `RESEND_API_KEY`, el cuerpo no se imprima en el log.

**Enviar a ADM no borra ni acorta la tarjeta**: sigue viva hasta `expiraAt`.

### 3.10 Adjuntos

Los archivos suben por `POST /api/datos/upload`
([route.ts](../../../src/app/api/datos/upload/route.ts)), un route handler y no
una server action porque las server actions de Next 14 bufean el body entero en
RAM con un tope de 1 MB.

Es público pero endurecido: 20 subidas por hora por slug e IP, slug validado, el
lote con forma de UUID v4, el vendedor tiene que estar activo con link activo, el
formulario publicado, tope de 8 MB, y el tipo se verifica **por magic bytes**,
nunca por el `file.type` del cliente. Los JPG, PNG y WEBP se convierten a WebP
(sin EXIF ni GPS); los PDF pasan tal cual. El nombre lo pone el servidor.

La descarga va por `GET /api/image/<key>`
([route.ts](../../../src/app/api/image/%5B...path%5D/route.ts)). El prefijo
`leads/datos-pasajeros/` exige sesión **y pertenencia**: si el rol no es ADMIN,
busca el `PasajeroDato` que referencia esa URL y compara el vendedor del envío
con el usuario de la sesión. El path se normaliza para que `leads/../foo` no
esquive el chequeo.

---

## 4. Reglas de negocio

### 4.1 La tarjeta se identifica por el pasajero

`nombrePago({ pasajeroNombre, titular })` en
[src/lib/datos-nombre.ts](../../../src/lib/datos-nombre.ts) devuelve el nombre
del pasajero, y si no lo hay, el del titular. Lo usan el listado del vendedor, la
bandeja del admin, la ficha, los avisos y el envío a ADM.

El cliente lo pidió por pasajero, no por titular de la tarjeta (26/08). Los
registros anteriores no tienen `pasajeroNombre`: para esos, el titular sigue
siendo la identidad. Por eso `pasajeroNombre` y `pasajeroDocumento` se guardan en
claro, fuera del sobre cifrado. La UI muestra "Titular: X" en chico solo cuando
difiere del pasajero.

### 4.2 Qué ve el vendedor en la lista

El listado devuelve un select explícito que jamás incluye `payload`, `iv` ni
`tag`: id, pasajero, titular, emisor, últimos 4, fechas y los tres campos del
envío a ADM. En pantalla se lee `Tarjeta •••• 1234` en fuente monoespaciada, el
nombre del pasajero en grande, y un reloj con las horas que quedan. El número
completo, el vencimiento y el código aparecen únicamente dentro del modal de
revelado.

### 4.3 Estados de un registro de pago

No hay enum: los estados se derivan de las fechas.

| Estado | Condición |
|---|---|
| Sin abrir (`vivo`) | `vistoAt` en null, todavía no venció |
| Visto | Alguien lo abrió con su segundo factor |
| Vencido | Pasaron las 96 horas y el barrido todavía no corrió |
| Borrado (`purgado`) | `purgadoAt` sellado. Ya no hay payload |

**"Enviado a ADM" no es un estado**, es la terna `enviadoAdmAt`, `numeroFile` y
`enviadoAdmPor`. La UI muestra "Enviado a ADM · file X · hace N min" y la ficha
del admin una banda verde con quién y cuándo. El estado del registro no cambia
por el envío.

**"Tarjeta rechazada" no existe en el sistema.** No hay campo, estado ni
pantalla: el rechazo de Administración se maneja fuera, por decisión del cliente
del 27/08. Lo más cercano en la herramienta es reintentar el envío a ADM, que
queda bloqueado 10 minutos si el file es el mismo, o pedirle al pasajero que
cargue la tarjeta de nuevo con el link.

### 4.4 Solicitudes

Un vendedor manda hasta **30 solicitudes cada 24 horas**. La vigencia de la
solicitud depende del tipo: **7 días** para pasajeros, **48 horas** para pago. El
token se genera con 32 bytes aleatorios y el email va con `replyTo` al vendedor.

### 4.5 Quién ve qué

| | ADMIN | VENDEDOR | MARKETING |
|---|---|---|---|
| Bandeja de pasajeros | Global, con búsqueda por pasajero y filtros | Solo la suya | No |
| Detalle de un envío | Sí | Solo los suyos | No |
| Export CSV | Sí | No | No |
| Registro de la bóveda | Global | Solo el suyo | No |
| Abrir una tarjeta | Sí, con su segundo factor | Solo las suyas, con su segundo factor | No |
| Enviar a ADM | Sí | Solo las suyas | No |
| Editar los formularios | Sí | No | No |
| Publicar un formulario | Sí, con confirmación aparte | No | No |

El corte lo aplica el servidor en cada action. A un registro ajeno se le
responde lo mismo que a uno inexistente.

---

## 5. Vistas

### 5.1 Panel del administrador

[src/app/backend/datos](../../../src/app/backend/datos/):

| Archivo | Qué es |
|---|---|
| `layout.tsx` | Si el usuario no es ADMIN devuelve solo el contenido, sin cabecera ni solapas: el vendedor llega hasta acá por el deep-link de un email y ve solo el detalle |
| `_components/DatosTabs.tsx` | Solapas Pasajeros, Datos de pago y Formularios, con contadores |
| `_components/EnviosBandeja.tsx` | Bandeja global: búsqueda de pasajero, filtro por vendedor y por destino, paginado, export CSV |
| `_components/EnvioDrawer.tsx` | Panel lateral. Abrirlo marca el envío como visto. Sin botón de borrar |
| `_components/EnvioDetalleView.tsx` | El render del detalle, compartido entre el drawer y la página `[id]` |
| `pasajeros/[id]/page.tsx` | Deep-link de los emails. Bifurca por rol y muestra el chip a la cotización cuando la referencia matchea |
| `_components/PagosTabla.tsx` | Registro global de la bóveda, con filtro por vendedor |
| `pagos/[id]/page.tsx` | Ficha de un pago. Datos no sensibles, banda de "Enviado a Administración" y la lista de accesos |
| `_components/PagoAbrirButton.tsx` | Abre el modal de revelado desde la ficha |
| `_components/FormulariosEditor.tsx` | Edita título, texto y campos extra con el mismo constructor de formularios del cotizador. El toggle de publicar se confirma en un modal aparte: es la llave del go-live |

### 5.2 Panel del vendedor

Viven en
[src/app/backend/dashboard/_components/datos/](../../../src/app/backend/dashboard/_components/datos/)
y los monta `VendedorDashboard`. El admin reusa los mismos componentes de
revelado y de envío, así que hay una sola implementación de cada cosa.

| Componente | Qué hace |
|---|---|
| `PasajerosTab.tsx` | Bandeja propia. El detalle se pide al expandir la fila y ahí se sella `vistoAt` |
| `PagosTab.tsx` | Grilla de tarjetas con chips "Sin abrir", "Visto" y "Borrado", reloj refrescado cada minuto, y los botones "Ver datos" y "Enviar a ADM" mientras la tarjeta esté viva |
| `RevelarModal.tsx` | Tres pasos: confirmar, pedir el segundo factor, mostrar. Avisa que la apertura queda registrada. Exporta también la lista de accesos que reusa la ficha del admin |
| `EnviarAdmModal.tsx` | Un solo campo, el número de file. Precarga el file anterior si ya se había mandado. De acá no sale ni un dígito de la tarjeta: manda el id y el file |
| `LinkModal.tsx` | Tres pestañas: QR y copiar link, pedir por email, y abrir el formulario. Se abre desde los botones del shell del vendedor |

---

## 6. Rutas, acciones y permisos

### 6.1 Endpoints HTTP

| Método y ruta | Quién | Qué |
|---|---|---|
| `POST /api/datos/purgar` | Header `x-purga-secret` o sesión ADMIN | Dispara el barrido de la bóveda |
| `POST /api/datos/upload` | Público, con rate limit y validación por magic bytes | Sube un adjunto del formulario de pasajeros |
| `GET /api/image/<key>` | Sesión; para `leads/datos-pasajeros/` además pertenencia | Descarga un adjunto |

### 6.2 Server actions

Todas devuelven el error como valor, nunca como excepción: en producción Next
enmascara el mensaje de una server action que tira y el usuario termina viendo
"An error occurred in the Server Components render".

**[datos-publico.actions.ts](../../../src/actions/datos-publico.actions.ts)** (sin sesión):
`getVendedorPublico(slug)`, `getSolicitud(token)`, `submitEnvioPasajeros(...)`,
`submitDatosPago(...)`.

**[datos-vendedor.actions.ts](../../../src/actions/datos-vendedor.actions.ts)**
(ADMIN o VENDEDOR; el vendedor queda clavado en lo suyo):

| Action | Qué hace |
|---|---|
| `getMisDatosCounts` | Envíos, envíos sin ver, pagos vivos |
| `getMisEnvios` · `getMiEnvioDetalle` | Bandeja y detalle. El detalle sella `vistoAt` |
| `getMisPagos` | Registro de la bóveda, sin payload |
| `getMiLink` | URL y QR de un formulario, con autocuración del slug |
| `crearSolicitud` · `getMisSolicitudes` · `previewSolicitudEmail` | Pedidos por email |
| `getAccesosPago` | Lista de accesos de una tarjeta |
| `enviarPagoAAdm` | Envío a Administración |

**[datos-boveda.actions.ts](../../../src/actions/datos-boveda.actions.ts)**:
`getPagoMeta(id)` y `revelarPago({ id, credencial })`.

**[datos-admin.actions.ts](../../../src/actions/datos-admin.actions.ts)** (todas
con `requireAdmin()`): `getDatosAdminCounts`, `getFiltrosEnviosAdmin`,
`getEnviosAdmin`, `getEnvioAdmin`, `marcarVistoAdmin`, `getPagosAdmin`,
`exportEnviosCsv`, `getFormulariosAdmin`, `updateFormularioDato`.

El export CSV usa punto y coma como separador, BOM UTF-8, una fila por pasajero,
y escapa las celdas que empiezan con `=`, `+`, `-` o `@` para que Excel no las
interprete como fórmula.

### 6.3 Configuración

| Dónde | Qué |
|---|---|
| `DATOS_PAGO_KEY` (env) | Clave AES de 32 bytes en base64. Sin ella la bóveda no funciona y el formulario de pago no se muestra |
| `PURGA_SECRET` (env + secret de GitHub) | Autentica el cron de la purga. Los dos lados tienen que coincidir |
| SiteSetting `notificaciones_email_adm` | Casilla de Administración, editable en `/backend/web/notificaciones`. Se siembra vacía |
| `FormularioDato.publicado` | La llave del go-live de cada formulario público |
| `User.linkActivo` | Interruptor del link de un vendedor |

---

## 7. Riesgos y decisiones técnicas

**El payload cifrado es la única copia.** Un `updateMany` mal escrito sobre
`DatosPagoCifrado` borra la bóveda entera y no se recupera ni con la clave.
Por eso el barrido tiene un único `where` marcado como inmutable en el código.

**Sin transacción interactiva.** La `DATABASE_URL` de producción pasa por
pgbouncer en modo transacción con `connection_limit=1`, así que un callback
largo se come la única conexión. Todo el módulo escribe operaciones sueltas.
Detalle en [pgbouncer-setup.md](../../pgbouncer-setup.md).

**Nada sensible llega al logger.** Ni el objeto descifrado, ni la credencial del
vendedor, ni el cuerpo del request del formulario de pago. A los logs solo van
ids. El flag `sensible` de `sendEmail` existe para lo mismo: sin él, un entorno
sin clave de Resend escupiría el número completo a stdout.

**El rate limit del revelado vive en memoria del proceso.** Alcanza mientras
Railway corra una sola instancia. Si el servicio escala horizontal, este limiter
y los de `rate-limit.ts` se mudan juntos a Redis.

**La rotación de clave está a medias.** `DatosPagoCifrado.keyVersion` existe en
el schema y en su migración con la promesa de elegir la clave según la columna,
pero `datos-cifrado.ts` usa siempre `DATOS_PAGO_KEY` y no lee ni escribe ese
campo. Rotar la clave hoy invalidaría los registros vivos.

**El comentario del workflow de purga quedó desactualizado.** Dice "el contrato
de la bóveda es 72 horas" cuando la constante ya está en 96. Solo afecta a quien
lea el archivo, no al comportamiento.

**La lista de accesos no distingue el tipo de evento.** `getAccesosPago`
devuelve el tipo (`revelar` o `adm`) y el número de file, pero el componente que
la dibuja los ignora: un envío a Administración se lee en la lista como si
fuera una apertura.
