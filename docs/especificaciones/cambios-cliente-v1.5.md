# TravelOz Backend — Documento de Cambios Extendido
### Basado en la call del 25/03/2026 + revisión completa del mockup

**Fecha:** 30 de marzo de 2026  
**Revisado por:** Latitud Nómade  
**Fuente principal:** Transcripción call "Checkin de Admin" (25/mar/2026, 31 min)  
**Fuente secundaria:** Revisión completa del repositorio `traveloz` (Next.js 14 + mock data)  
**Estado del mockup:** Visual puro, sin base de datos. Datos de mentira en providers de React.

---

## RESUMEN EJECUTIVO

Se identificaron **34 cambios** organizados en 5 niveles de prioridad. Los más críticos son el rediseño del tab de precios para soportar múltiples opciones hoteleras (que es el cambio arquitectónico más grande), la corrección del modelo de markup (actualmente usa porcentaje cuando debería usar factor divisor), y la eliminación/adición de campos específicos pedidos explícitamente por Gerónimo y Santiago.

---

## PRIORIDAD 1 — CRÍTICOS (pedidos explícitamente en la call del 25/03)

### C01 · Tab de Precios: Rediseño completo por múltiples opciones hoteleras
**Origen:** Call 25/03, minutos 09:45–16:02 (Gerónimo + Santiago)  
**Estado actual:** `PreciosTab.tsx` muestra UN solo desglose de costos y UN solo markup para todo el paquete. El componente `PriceDisplay` muestra Neto → Markup% → Precio Venta como flujo lineal único.  
**Problema:** El negocio maneja múltiples opciones de alojamiento por paquete (típicamente 3+). Cada opción tiene su propia combinación de hoteles, su propio neto total, su propio factor de markup y su propio precio de venta. Ejemplo: un paquete Búzios+Río puede tener Opción 1 (hotel económico en Búzios + hotel económico en Río) con markup 0.88, Opción 2 (hotel medio + hotel medio) con markup 0.87, Opción 3 (hotel premium + premium) con markup 0.86.  
**Cambio requerido:**
- Eliminar el markup único a nivel de paquete (`Paquete.markup`, `Paquete.precioVenta`)
- Crear una entidad `OpcionHotelera` que agrupe 1 o más alojamientos con su markup y precio de venta
- En el tab de Precios, mostrar N bloques de desglose (uno por opción hotelera), cada uno con: nombre de la opción, hoteles incluidos, neto parcial de alojamientos, neto fijo compartido (aéreos + traslados + seguros + circuitos), total neto, markup factor, precio venta
- Los servicios que NO cambian entre opciones (aéreos, traslados, seguros, circuitos) se muestran una sola vez como "costos fijos" compartidos
- Cada bloque tiene su propio input de markup editable
- El `PriceDisplay` se debe duplicar/multiplicar por opción

**Impacto en tipos:**
```typescript
// NUEVO
interface OpcionHotelera {
  id: string;
  paqueteId: string;
  nombre: string; // "Opción 1", "Opción Económica", etc.
  alojamientoIds: string[]; // combinación de hoteles
  markupFactor: number; // ej: 0.88 (divisor, NO porcentaje)
  precioVenta: number; // calculado: netoTotal / markupFactor
  orden: number;
}

// MODIFICAR Paquete: eliminar markup y precioVenta de nivel paquete
// (o dejarlos como "precio desde" = el mínimo de las opciones)
```

### C02 · Modelo de Markup: Cambiar de porcentaje a factor divisor
**Origen:** Conocimiento del proyecto (confirmado por Santiago en calls anteriores)  
**Estado actual:** `calcularVenta()` en `utils.ts` línea 101-103 usa `neto * (1 + markup / 100)` — es decir, un porcentaje multiplicador. El `PriceDisplay` muestra "Markup 30%" y el input acepta 0-100.  
**Problema:** El modelo real de TravelOz/Destínico es **Neto ÷ Factor = Precio Venta**. Ejemplo: $2,450 ÷ 0.90 = $2,722. Un factor de 0.88 equivale a un 12% de markup, no un 88%.  
**Cambio requerido:**
- Cambiar `calcularVenta(neto, factor)` a `Math.round(neto / factor)`
- Cambiar el input de markup para aceptar valores decimales entre 0.01 y 1.00 (ej: 0.88, 0.90, 0.85)
- Actualizar el label del input de "Markup %" a "Factor" o "Divisor"
- Actualizar todos los datos mock en `paquetes.ts` para usar factores en vez de porcentajes
- Este cambio aplica a nivel de OpcionHotelera (C01), no a nivel de paquete

### C03 · Aéreos: Eliminar campo "Neto Menor / persona"
**Origen:** Call 25/03, minuto 17:38-17:55 (Gerónimo + Santiago)  
**Estado actual:** `PrecioAereo` tiene `precioAdulto` y `precioMenor`. La tabla de precios en `aereos/[id]/page.tsx` muestra ambas columnas. El formulario de agregar período incluye input para precioMenor.  
**Problema:** Santiago confirmó que los paquetes siempre se arman en base a 2 adultos. El menor paga el mismo precio que el adulto. El campo precioMenor sobra y confunde.  
**Cambio requerido:**
- Eliminar `precioMenor` del type `PrecioAereo`
- Eliminar la columna "Neto Menor / persona" de la tabla de precios en aereo detail
- Eliminar el input de precioMenor en la fila de edición y la fila de agregar
- Renombrar "Neto Adulto / persona" a simplemente "Neto / persona"
- Actualizar los datos mock en `aereos.ts`

### C04 · Aéreos: Equipaje como dropdown en vez de texto libre
**Origen:** Call 25/03, minutos 18:07-22:51 (Santiago + Gerónimo)  
**Estado actual:** El campo `equipaje` en `aereos/[id]/page.tsx` línea 245-251 es un `<Input>` de texto libre con placeholder "23kg bodega".  
**Problema:** Santiago mostró cómo lo hacen en el cotizador de Destínico: el equipaje se desglosa en 3 niveles seleccionables.  
**Cambio requerido:**
- Reemplazar el input de texto por un selector/dropdown con las opciones:
  1. Artículo personal
  2. Artículo personal + Equipaje de mano
  3. Equipaje de mano + Equipaje en bodega
- Cambiar el type `Aereo.equipaje` de `string` a un enum o string con valores predefinidos
- Actualizar los datos mock

### C05 · Alojamientos: Eliminar campo "Proveedor"
**Origen:** Call 25/03, minutos 24:03-25:10 (Gerónimo + Santiago)  
**Estado actual:** `alojamientos/[id]/page.tsx` incluye un Select de "Proveedor" (línea 342-348). El type `Alojamiento` tiene `proveedorId: string`. El formulario de nuevo alojamiento también lo incluye.  
**Problema:** Gerónimo dijo que proveedor en hoteles "no amerita que esté". Santiago confirmó que proveedor solo aplica para seguros, circuitos y traslados.  
**Cambio requerido:**
- Eliminar el campo `proveedorId` del type `Alojamiento`
- Eliminar el Select de Proveedor del formulario de detalle y de nuevo alojamiento
- Eliminar la referencia a proveedor en la vista de listado si existe
- El campo `sitioWeb` de alojamientos se mantiene (Gerónimo lo confirmó como "no mandatorio pero dejarlo")

### C06 · Proveedores: Agregar columna "Servicio" (categoría)
**Origen:** Call 25/03, minutos 29:09-31:44 (Santiago + Gerónimo)  
**Estado actual:** `proveedores/page.tsx` muestra una tabla simple con columnas: Nombre, Contacto, Email, Acciones. No hay forma de diferenciar si un proveedor es de seguros, traslados o circuitos. El type `Proveedor` no tiene campo de categoría.  
**Problema:** Santiago pidió que cuando se abre el selector de proveedor en, por ejemplo, Seguros, solo aparezcan proveedores de seguros. Y viceversa.  
**Cambio requerido:**
- Agregar `servicio: 'TRASLADOS' | 'SEGUROS' | 'CIRCUITOS'` al type `Proveedor`
- Agregar columna "Servicio" a la tabla de proveedores
- Agregar filtro por categoría de servicio en la tabla (chips de filtro)
- En los selectores de proveedor dentro de Traslados, Seguros y Circuitos, filtrar la lista para mostrar solo los proveedores de esa categoría
- Agregar campo Select de "Servicio" al modal de crear/editar proveedor
- Actualizar datos mock

---

## PRIORIDAD 2 — IMPORTANTES (discutidos en la call, acordados)

### C07 · Buscador global tipo Spotlight (Cmd+K)
**Origen:** Call 25/03, minutos 07:24-07:57  
**Estado actual:** No existe. El `Topbar.tsx` solo tiene breadcrumb, selector de marca y menú de usuario. No hay ningún componente de búsqueda global.  
**Cambio requerido:**
- Agregar un botón/shortcut en el Topbar que abra un modal de búsqueda global
- El modal debe buscar en: paquetes (por título, destino), aéreos (por ruta, destino), alojamientos (por nombre, ciudad), traslados, seguros, circuitos
- Atajo de teclado: Cmd+K / Ctrl+K
- Resultados agrupados por tipo con icono
- Click en resultado navega al detalle
- Estilo: modal centered con input autoenfocado, resultados debajo

### C08 · Modal de agregar servicio: Agregar buscador
**Origen:** Call 25/03, minuto 09:10 (Santiago: "tiene que tener buscadores")  
**Estado actual:** `ServiceSelectorModal.tsx` muestra todos los servicios disponibles en listas planas por tab. No hay campo de búsqueda dentro del modal.  
**Cambio requerido:**
- Agregar un campo de búsqueda dentro de cada tab del ServiceSelectorModal
- Filtrar los servicios disponibles en tiempo real según el texto ingresado
- El buscador debe filtrar por nombre/ruta/destino según el tipo de servicio

### C09 · Auto-guardado (Auto-save)
**Origen:** Call 25/03, minutos 25:56-26:42  
**Estado actual:** Todos los formularios requieren hacer click en "Guardar Cambios" manualmente. No hay auto-save.  
**Cambio requerido:**
- Implementar auto-guardado con debounce (ej: 2 segundos después del último cambio)
- Mostrar indicador visual de estado: "Guardado", "Guardando...", "Sin guardar"
- El paquete se guarda como BORRADOR automáticamente
- Esto aplica especialmente al formulario de paquetes (DatosTab, ServiciosTab, PreciosTab)
- Nota: en el mockup esto es simulado, pero la lógica de debounce + indicador visual debe existir

### C10 · Campos obligatorios mínimos + validación por estado
**Origen:** Call 25/03, minutos 25:24-25:53  
**Estado actual:** El formulario de nuevo paquete solo valida que el título no esté vacío. No hay validación diferenciada por estado.  
**Cambio requerido:**
- BORRADOR: solo título obligatorio. Todo lo demás es opcional.
- ACTIVO: requiere título, al menos 1 aéreo asignado, al menos 1 alojamiento, precio de venta > 0
- Mostrar indicador visual de "campos faltantes para activar" cuando el paquete está en borrador
- No bloquear el guardado, solo advertir

---

## PRIORIDAD 3 — MEJORAS DE UI (detectadas en la revisión del código)

### C11 · Tabla de paquetes: Markup muestra porcentaje, debe mostrar factor
**Estado actual:** `paquetes/page.tsx` línea 319 muestra `{paquete.markup}%` en la columna Markup.  
**Cambio:** Mostrar el factor divisor (ej: "0.88") en vez de un porcentaje. Relacionado con C02.

### C12 · Tabla de paquetes: Falta columna "Destino" directa
**Estado actual:** La columna Destino se calcula buscando el primer aéreo asignado al paquete. Si no hay aéreo, muestra "--".  
**Mejora:** Agregar campo `destino` directo al paquete (puede auto-completarse desde el primer aéreo pero también editarse manualmente). Esto es especialmente útil para paquetes que aún no tienen aéreo asignado.

### C13 · DatosTab: Faltan campos de validez (validezDesde, validezHasta)
**Estado actual:** El type `Paquete` tiene `validezDesde` y `validezHasta` pero el formulario `DatosTab.tsx` NO los muestra ni permite editarlos. Se setean automáticamente al crear (hoy + 1 año).  
**Cambio:** Agregar dos DatePickers para validez desde/hasta en el formulario de datos del paquete.

### C14 · DatosTab: Falta campo "Estado" editable
**Estado actual:** El estado del paquete (ACTIVO/BORRADOR/INACTIVO) se muestra como Badge en el header pero NO es editable desde el formulario.  
**Cambio:** Agregar un Select de estado en el DatosTab. La transición a ACTIVO debe validar campos mínimos (C10).

### C15 · DatosTab: Falta campo "Destacado"
**Estado actual:** `Paquete.destacado` existe en el type pero no se muestra ni edita en ningún formulario.  
**Cambio:** Agregar un Toggle/Switch de "Destacado" en DatosTab.

### C16 · DatosTab: Falta campo "Moneda"
**Estado actual:** `Paquete.moneda` existe (default "USD") pero no se muestra ni edita.  
**Cambio:** Agregar Select con opciones USD/UYU u otras según lo que manejen.

### C17 · Paquete Nuevo: Falta selector de etiquetas
**Estado actual:** El type `PaqueteEtiqueta` existe para la relación muchos-a-muchos con `Etiqueta`, pero no hay UI para asignar etiquetas a un paquete ni en el formulario nuevo ni en el detalle.  
**Cambio:** Agregar un selector de etiquetas (multi-select con chips) en DatosTab. Las etiquetas son las que se usan para campañas y URLs del frontend.

### C18 · Aereo: Faltan campos de la call del 16/03
**Estado actual:** El formulario de aéreo tiene: Ruta, Destino, Aerolínea, Equipaje, Itinerario. Según discusiones anteriores, faltan campos relevantes.  
**Campos faltantes a evaluar:**
- Escalas (número de escalas o texto)
- Código de vuelo (ida y vuelta)
- Duración del vuelo
- Nota: confirmar con cliente cuáles son necesarios

### C19 · Alojamientos: Fotos no tienen funcionalidad real
**Estado actual:** `ImageUploader.tsx` existe y se renderiza en el detalle de alojamiento, pero las fotos son placeholder URLs. No hay upload real.  
**Cambio para mockup:** Mantener el componente visual pero agregar la lógica de reordenar fotos (drag & drop) y simular la eliminación. La foto de portada debe marcarse visualmente como "principal".

### C20 · Circuitos: Falta tabla de itinerario (días)
**Estado actual:** El type `CircuitoDia` existe (con numeroDia, titulo, descripcion, orden) pero hay que verificar si el formulario de detalle de circuito incluye la edición de días.  
**Cambio:** Asegurar que el detalle de circuito tenga una sección de "Itinerario" con una lista editable de días, cada uno con número, título y descripción.

### C21 · Seguros: Verificar campos de formulario
**Estado actual:** El type `Seguro` tiene plan, cobertura, costoPorDia. Verificar que el formulario de detalle incluya todos estos campos editables.  
**Nota:** El pricing de seguros es "costo por día" — confirmar con cliente si es por persona o por póliza/grupo.

### C22 · Traslados: Verificar modelo de precio
**Estado actual:** El type `Traslado` tiene `precio: number` como precio fijo único.  
**Nota:** Confirmar con cliente si el precio es por persona, por servicio o por grupo. La call del 25/03 no lo aclaró para traslados.

---

## PRIORIDAD 4 — FUNCIONALIDAD FALTANTE (no mencionada en call pero necesaria)

### C23 · Dashboard: Pendiente de definición por cliente
**Origen:** Call 25/03, minutos 04:17-06:44  
**Estado actual:** El dashboard tiene stats cards (paquetes activos, por vencer, sin asignar), feed de actividad reciente, acciones rápidas y donut chart de estados.  
**Acción:** Gerónimo y Santiago se comprometieron a definir qué quieren ver. Esperar su input. El dashboard actual es un placeholder funcional aceptable.  
**Posibles mejoras si no llega feedback:**
- Dashboard diferenciado por rol (Admin vs Vendedor)
- Para Vendedor: últimos paquetes agregados, más vendidos, destinos a atacar
- Para Admin: métricas de negocio, alertas de servicios vencidos

### C24 · Notificaciones: Verificar flujo completo
**Estado actual:** `notificaciones/page.tsx` tiene 524 líneas — parece completo. Incluye envío a vendedores, selección de etiquetas.  
**Acción:** Revisar que el flujo de "seleccionar etiqueta → generar link → enviar a vendedores" funcione visualmente en el mockup.

### C25 · Catálogos: Verificar completitud
**Estado actual:** `catalogos/page.tsx` tiene 1489 líneas — es el archivo más grande. Maneja Temporadas, Tipos de Paquete, Etiquetas, Países/Ciudades, Regímenes.  
**Acción:** Verificar que todos los ABM funcionen visualmente.

### C26 · Perfiles: Verificar roles y permisos
**Estado actual:** `perfiles/page.tsx` tiene 382 líneas. El `AuthProvider` maneja 3 roles: Admin (geronimo@traveloz), Vendedor (ventas@traveloz), Admin Destínico.  
**Problema potencial:** Falta el rol "Marketing" que se discutió en calls anteriores.  
**Cambio:** Evaluar si se agrega ahora o después.

### C27 · Reportes: Verificar contenido
**Estado actual:** `reportes/page.tsx` tiene 320 líneas.  
**Acción:** Verificar que muestre información útil y no sea solo placeholder.

### C28 · Responsive / Mobile
**Origen:** Call 25/03, minutos 22:11-22:37  
**Estado actual:** El layout usa CSS grid con breakpoints (`md:grid-cols-2`, `lg:flex-row`), pero no se ha testeado en móvil. El sidebar no tiene comportamiento de hamburger menu.  
**Cambio:** Agregar sidebar colapsable en mobile, verificar que todas las tablas sean scrolleables horizontalmente, verificar que los modales funcionen en pantallas chicas.

---

## PRIORIDAD 5 — DEUDA TÉCNICA Y PREPARACIÓN PARA BACKEND REAL

### C29 · Sidebar: Falta item "Cruceros" en navegación
**Estado actual:** El sidebar importa `Ship` de lucide pero en `navGroups` no aparece ningún item de Cruceros.  
**Cambio:** Si cruceros es un servicio que manejan, agregar el item al sidebar y crear el módulo. Si no, eliminar el import.

### C30 · Types: PrecioAereo.precioMenor en toda la cadena
**Estado actual:** `precioMenor` aparece en el type, en los datos mock, en el cálculo de neto, y en la UI. Al eliminarlo (C03), hay que limpiarlo en toda la cadena: type → mock data → calcularNeto → ServiceProvider → PreciosTab → AereoDetail.

### C31 · Datos mock: Actualizar con datos reales uruguayos
**Estado actual:** Los datos mock usan rutas y destinos genéricos. Según el proyecto, deben usar datos reales: rutas desde Montevideo/Buenos Aires, hoteles reales, destinos reales del catálogo de TravelOz.  
**Cambio:** Pedir al cliente un export de sus paquetes más vendidos para poblar el mockup con datos reales.

### C32 · Login: Password visible en pantalla
**Estado actual:** La password "admin" se muestra en texto plano debajo del formulario de login. Esto es intencional para el mockup/demo.  
**Nota:** Remover antes de pasar a producción. Para el mockup está bien.

### C33 · Multi-tenancy: Verificar que el filtro de brand_id funcione
**Estado actual:** Los providers filtran datos por `activeBrandId` del `BrandProvider`. Al cambiar de marca en el topbar, los datos deberían cambiar.  
**Acción:** Verificar que al loguearse como admin@destinoicono.com se vean datos distintos.

### C34 · FotosTab de Paquete: Funcionalidad básica
**Estado actual:** `FotosTab.tsx` tiene solo 98 líneas — probablemente es un placeholder mínimo.  
**Cambio:** Asegurar que permita: agregar fotos con URL, reordenar, marcar foto de portada, eliminar.

---

## MATRIZ DE IMPACTO

| ID | Cambio | Complejidad | Archivos afectados | Visible al cliente |
|----|--------|-------------|--------------------|--------------------|
| C01 | Múltiples opciones hoteleras | ALTA | types.ts, PreciosTab, ServiciosTab, PackageProvider, paquetes data, PriceDisplay | ✅ Muy visible |
| C02 | Markup factor divisor | MEDIA | utils.ts, PriceDisplay, PreciosTab, paquetes data | ✅ Visible |
| C03 | Eliminar precioMenor | BAJA | types.ts, aereos data, aereo detail, calcularNeto | ✅ Visible |
| C04 | Equipaje dropdown | BAJA | aereo detail, types.ts, aereos data | ✅ Visible |
| C05 | Eliminar proveedor hotel | BAJA | alojamiento detail, alojamiento nuevo, types.ts | ✅ Visible |
| C06 | Proveedores por servicio | MEDIA | Proveedor type, proveedores page, selectores | ✅ Visible |
| C07 | Buscador global | MEDIA | Topbar, nuevo componente SearchModal | ✅ Visible |
| C08 | Buscador en modal servicios | BAJA | ServiceSelectorModal | ✅ Visible |
| C09 | Auto-save | MEDIA | DatosTab, nuevo hook useAutoSave | ✅ Visible |
| C10 | Validación por estado | MEDIA | DatosTab, NuevoPaquete, PackageProvider | ⚠️ Parcialmente |

---

## ORDEN DE EJECUCIÓN SUGERIDO

**Fase 1 — Cambios rápidos visibles (antes del próximo miércoles):**
C03, C04, C05, C06, C08

**Fase 2 — Cambio arquitectónico core:**
C01, C02 (estos dos van juntos)

**Fase 3 — UX improvements:**
C07, C09, C10, C13, C14, C15, C17

**Fase 4 — Completitud del mockup:**
C11, C12, C16, C18, C19, C20, C28, C34

**Fase 5 — Preparación producción:**
C23 (esperar input cliente), C29–C33
