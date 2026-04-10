# MEGA PROMPT — TravelOz Backend Admin Prototype

## CONTEXTO

Sos el desarrollador principal de Latitud Nómade construyendo un prototipo funcional del panel de administración de TravelOz, una agencia de viajes uruguaya. Este prototipo se va a mostrar al cliente (Gerónimo Cassoni y Santiago Rodríguez) en una videollamada para validar la UX, los flujos y la visual antes de conectar el backend real.

**IMPORTANTE:** Lee COMPLETOS los 4 archivos adjuntos antes de escribir cualquier línea de código:
- `docs/design/design-system.json` — Design system v3 "Liquid Horizon" con tokens, colores, glass materials, animaciones, componentes
- `docs/arquitectura/modulos-backend.md` — Especificación exhaustiva de cada módulo (schemas, campos, reglas, endpoints, UI)
- `docs/negocio/flujo-administrador.md` — Flujo operativo completo de punta a punta
- `docs/negocio/contexto-operativo.md` — Contexto del negocio y dolores actuales

---

## OBJETIVO

Crear una aplicación Next.js 14 (App Router) con TypeScript que sea un **prototipo 100% funcional con datos hardcodeados**. No hay base de datos — todo vive en estado React (useState/useContext). El prototipo debe verse y sentirse como el producto final: glassmorphism, liquid glass, claymorphism, animaciones Apple-like, sidebar violeta→negro.

El cliente debe poder:
- Navegar entre todos los módulos
- Ver listados con datos realistas de paquetes de viaje uruguayos
- Crear, editar, clonar y eliminar entidades (todo en memoria)
- Asignar servicios a paquetes
- Ver el cálculo de precios en tiempo real (Neto → Markup → Venta)
- Filtrar y buscar
- Cambiar entre marcas (TravelOz / DestinoIcono)
- Ver la vista de vendedor (solo lectura)

---

## STACK TÉCNICO

```
Next.js 14 (App Router) + TypeScript
Tailwind CSS (extendido con tokens del design.json)
Framer Motion (animaciones spring, page transitions, stagger)
Lucide React (iconografía)
Radix UI (Dialog, Select, Dropdown, Tabs, Tooltip)
class-variance-authority + clsx + tailwind-merge (variantes de componentes)
date-fns (formateo de fechas)
```

---

## ESTRUCTURA DEL PROYECTO

```
/app
  /layout.tsx              → Root layout con providers
  /(admin)
    /layout.tsx            → Admin layout: Sidebar + Topbar + BrandProvider + AnimatePresence
    /page.tsx              → Dashboard con stat cards
    /paquetes
      /page.tsx            → Listado de paquetes (tabla glass)
      /[id]/page.tsx       → Detalle/edición de paquete (tabs: Datos, Servicios, Precios, Fotos, Publicación)
      /nuevo/page.tsx      → Crear paquete nuevo
    /aereos
      /page.tsx            → Listado + edición de aéreos
      /[id]/page.tsx       → Detalle aéreo con precios por periodo
    /alojamientos
      /page.tsx            → Listado de hoteles
      /[id]/page.tsx       → Detalle hotel con precios, régimen, fotos
    /traslados
      /page.tsx            → Tabla editable inline (sin formulario interno)
    /seguros
      /page.tsx            → Listado y formulario de seguros
    /circuitos
      /page.tsx            → Listado de circuitos con itinerario día por día
    /proveedores
      /page.tsx            → CRUD de proveedores
    /catalogos
      /page.tsx            → Tabs para cada catálogo (temporadas, tipos, etiquetas, países, regímenes)
    /perfiles
      /page.tsx            → Gestión de usuarios y roles
    /notificaciones
      /page.tsx            → Flujo de notificación a vendedores
    /reportes
      /page.tsx            → Gráficas y métricas
  /login
    /page.tsx              → Página de login con liquid glass

/components
  /ui/                     → Componentes base del design system
    Button.tsx             → Clay buttons con variantes (primary/danger/secondary/ghost) + sheen hover
    Input.tsx              → Glass inputs con estados (default/hover/focus/error/disabled)
    Select.tsx             → Custom select con dropdown glass animado
    Textarea.tsx
    Toggle.tsx             → Spring bounce toggle
    Checkbox.tsx           → Pop animation checkbox
    Badge.tsx              → 9 variantes glass (activo/borrador/inactivo/temporada/promo/etc)
    Tag.tsx                → Tags pill removibles con colores
    Table.tsx              → Glass table con header oscuro, row hover gradient, stagger animation
    Modal.tsx              → Liquid glass modal con entrada espectacular
    Toast.tsx              → Frosted glass toast con slide spring
    Card.tsx               → Glass/Liquid/Stat card variants
    Tabs.tsx               → Tabs con indicador animado violet→teal
    SearchFilter.tsx       → Barra de búsqueda glass + filter chips
    PriceDisplay.tsx       → Componente Neto → Markup → Venta con flechas animadas
    ImageUploader.tsx      → Dropzone glass con thumbnails
    Breadcrumb.tsx
    Avatar.tsx
    Skeleton.tsx
    DatePicker.tsx
    Pagination.tsx         → Botones con clay active state
  /layout/
    Sidebar.tsx            → Sidebar violeta→negro con glow, nav items, collapse
    Topbar.tsx             → Frosted glass topbar con breadcrumb, brand selector, user menu
    PageHeader.tsx         → Título display + subtítulo + botón acción
  /modules/
    PaqueteForm.tsx        → Formulario completo de paquete con todas las secciones
    ServiceAssigner.tsx    → Modal para asignar aéreo/hotel/traslado/seguro a paquete
    AereoForm.tsx          → Formulario de aéreo con tabla de precios por periodo
    AlojamientoForm.tsx    → Formulario de hotel con precios, régimen, fotos
    CircuitoItinerario.tsx → Editor de itinerario día por día
    NotificacionWizard.tsx → Flujo paso a paso de notificación a vendedores
    ReportChart.tsx        → Gráficas de torta/barras para reportes

/lib
  /data.ts                 → TODOS los datos hardcodeados (ver sección DATOS)
  /types.ts                → TypeScript interfaces para todas las entidades
  /brand-context.tsx       → Context para marca activa (TravelOz/DestinoIcono)
  /store.ts                → Estado global con useContext para CRUD en memoria
  /utils.ts                → Helpers: formatCurrency, calcularNeto, calcularVenta, slugify
  /cn.ts                   → Utility: clsx + tailwind-merge

/public
  /assets/brands/          → Logos de TravelOz y DestinoIcono
```

---

## DATOS HARDCODEADOS (lib/data.ts)

Crear datos realistas basados en los paquetes REALES de TravelOz (ver flujo.md y traveloz.com.uy). TODOS los datos deben ser en español y con información que parezca real:

### Marcas
```typescript
const brands: Brand[] = [
  { id: "brand-1", name: "TravelOz", slug: "traveloz", domain: "traveloz.com.uy" },
  { id: "brand-2", name: "DestinoIcono", slug: "destinoicono", domain: "destinoicono.com" }
];
```

### Usuarios
```typescript
const users: User[] = [
  { id: "user-1", name: "Gerónimo Cassoni", email: "geronimo@traveloz.com.uy", role: "ADMIN", brandId: "brand-1" },
  { id: "user-2", name: "Santiago Rodríguez", email: "santiago@traveloz.com.uy", role: "ADMIN", brandId: "brand-1" },
  { id: "user-3", name: "Equipo Ventas TravelOz", email: "ventas@traveloz.com.uy", role: "VENDEDOR", brandId: "brand-1" },
  { id: "user-4", name: "Admin DestinoIcono", email: "admin@destinoicono.com", role: "ADMIN", brandId: "brand-2" },
  { id: "user-5", name: "Equipo Ventas DestinoIcono", email: "ventas@destinoicono.com", role: "VENDEDOR", brandId: "brand-2" },
];
```

### Temporadas
"Baja 2026", "Alta 2026", "Vacaciones Julio 2026", "Baja 2027"

### Tipos de paquete
"Lunas de miel", "Salidas grupales", "Cruceros", "Eventos", "Deporte", "Escapadas"

### Etiquetas
"Brasil", "Caribe", "Argentina", "Europa", "Black Week", "Promo", "Beach", "Nieve", "Nordeste", "All Inclusive"

### Regímenes
"Desayuno" (BB), "All Inclusive" (AI), "Media Pensión" (MP), "Solo alojamiento" (SA)

### Países y ciudades
Brasil: Búzios, Río de Janeiro, Florianópolis, Salvador de Bahía, Natal, Porto de Galinhas, Maragogi, Fortaleza, Jericoacoara, Arraial do Cabo
México: Cancún, Playa del Carmen, Tulum, Costa Mujeres
Argentina: Buenos Aires, Bariloche, Mendoza, Calafate, Ushuaia, Salta
Rep. Dominicana: Punta Cana
Colombia: Cartagena de Indias
Chile: Santiago de Chile
USA: Miami
Italia: Roma
Turquía: Estambul, Capadocia

### Proveedores (mínimo 6)
"Transfers Brasil S.A.", "Europa Mundo", "Universal Assistants", "Tarjetas Celeste", "Assist Card", "CX Travel", "Receptivo Caribe", "Transfers Argentina"

### Aéreos (mínimo 10)
Crear vuelos reales desde Montevideo:
- MVD → GIG → MVD (Río de Janeiro) — LATAM, Azul
- MVD → CUN → MVD (Cancún) — Copa, Avianca
- MVD → EZE → MVD (Buenos Aires) — Aerolíneas Argentinas
- MVD → BRC → MVD (Bariloche) — LATAM
- MVD → MIA → MVD (Miami) — American Airlines
- MVD → FCO → MVD (Roma) — Air Europa
- MVD → PUJ → MVD (Punta Cana) — Copa
- MVD → FLN → MVD (Florianópolis) — Azul
- MVD → CTG → MVD (Cartagena) — Copa
- MVD → SCL → MVD (Santiago de Chile) — LATAM

Cada uno con 2-3 PrecioAereo con periodos diferentes (baja/alta/vacaciones).

### Alojamientos (mínimo 12)
Hoteles reales o realistas:
- Hotel Atlântica Búzios (Búzios, 4★, BB)
- Copacabana Palace (Río, 5★, BB)
- Hotel Jurerê Beach Village (Florianópolis, 4★, BB)
- Hard Rock Cancún (Cancún, 5★, AI)
- Grand Palladium (Punta Cana, 5★, AI)
- Llao Llao Resort (Bariloche, 5★, BB)
- Fontainebleau Miami Beach (Miami, 5★, BB)
- Hotel Noi Vitacura (Santiago, 4★, BB)
- Porto Bay Rio (Río, 4★, MP)
- Majestic Colonial (Punta Cana, 4★, AI)
- Resort Nannai (Porto de Galinhas, 5★, AI)
- Hotel Borgo Egnazia (Roma, 5★, BB)

Cada uno con 2 PrecioAlojamiento (temporada baja y alta) con precios por noche en USD.

### Traslados (mínimo 8)
Transfers típicos con precios reales:
- Aeropuerto Galeão ↔ Hotel Zona Sul (Río, Regular, USD 35)
- Aeropuerto Búzios ↔ Hotel (Búzios, Regular, USD 45)
- Aeropuerto Cancún ↔ Hotel Zona Hotelera (Cancún, Regular, USD 25)
- Aeropuerto Cancún ↔ Hotel Zona Hotelera (Cancún, Privado, USD 65)
- Aeropuerto Punta Cana ↔ Hotel (Punta Cana, Regular, USD 30)
- Aeropuerto Ezeiza ↔ Hotel Centro (Buenos Aires, Regular, USD 20)
- Aeropuerto Bariloche ↔ Hotel (Bariloche, Privado, USD 40)
- Aeropuerto Miami ↔ Hotel Miami Beach (Miami, Privado, USD 55)

### Seguros (mínimo 6)
- Universal Assistants — Plan 40K (USD 40.000 cobertura, USD 8/día)
- Universal Assistants — Plan 80K (USD 80.000, USD 12/día)
- Universal Assistants — Plan 150K (USD 150.000, USD 18/día)
- Assist Card — Plan Silver (USD 60.000, USD 10/día)
- Assist Card — Plan Gold (USD 120.000, USD 15/día)
- Tarjetas Celeste — Plan Premium (USD 300.000, USD 22/día)

### Paquetes (mínimo 15)
Paquetes realistas combinando los servicios anteriores:
1. Búzios Relax — 7N, Baja 2026, Brasil, USD 579
2. Cancún All Inclusive — 7N, Baja 2026, Caribe, USD 1165
3. Punta Cana Premium — 7N, Baja 2026, Caribe, USD 1335
4. Río de Janeiro — 7N, Baja 2026, Brasil, USD 654
5. Bariloche Nieve — 6N, Baja 2026, Argentina, USD 685
6. Miami Beach — 6N, Baja 2026, USA, USD 1036
7. Roma Imperial — 6N, Alta 2026, Europa, USD 1490
8. Buenos Aires Escapada — 3N, Baja 2026, Argentina, USD 263
9. Florianópolis — 7N, Baja 2026, Brasil, USD 604
10. Playa del Carmen — 7N, Baja 2026, Caribe, USD 969
11. Natal & Pipa — 8N, Baja 2026, Brasil, USD 761
12. Cartagena de Indias — 7N, Baja 2026, Colombia, USD 849
13. Santiago + Valparaíso — 7N, Baja 2026, Chile, USD 639
14. Río + Búzios Combinado — 7N, Baja 2026, Brasil, USD 680 (multi-destino)
15. Porto de Galinhas — 8N, Baja 2026, Brasil, USD 741

Cada paquete debe tener:
- Servicios asignados (aereo_ids, alojamiento_ids, traslado_ids, seguro_ids)
- netoCalculado (suma de servicios)
- markup (entre 30-40%)
- precioVenta
- estado (ACTIVO la mayoría, 2-3 BORRADOR, 1 INACTIVO)
- etiquetas
- temporada
- tipo de paquete
- validezDesde/Hasta
- fotos (usar URLs de placeholder tipo https://images.unsplash.com/photo-XXXXX?w=800)

### Circuitos (mínimo 2)
- "Turquía al Completo" — Europa Mundo — 9 noches — itinerario día por día
- "Portugal Magnífico" — Europa Mundo — 7 noches — itinerario día por día

### Notificaciones (historial, mínimo 3)
Emails enviados previamente con fecha, etiqueta, paquetes seleccionados, estado ENVIADO.

---

## FUNCIONALIDADES REQUERIDAS

### Cada módulo debe tener:

1. **Listado con tabla glass** — Header oscuro, rows con stagger animation, hover gradient violet→teal, búsqueda instantánea, filter chips, paginación clay.

2. **Crear** — Modal o página con formulario glass. Inputs con todos los estados (focus ring teal, error con shake). Selects con dropdown liquid glass animado. Al guardar, se agrega al estado en memoria y aparece toast de éxito.

3. **Editar** — Misma UI que crear pero con datos precargados. Al guardar, se actualiza en memoria + toast.

4. **Clonar** — Botón que duplica la entidad con título "Copia de {nombre}" y estado BORRADOR.

5. **Eliminar** — Modal de confirmación con shake animation. Al confirmar, soft delete (se oculta) + toast.

### Módulo Paquetes (el más completo):

- **Tab Datos generales:** Formulario con título, noches, salidas (campo libre), temporada (select), tipo (select), descripción, texto visual (textarea).
- **Tab Servicios:** Lista de servicios asignados + botón "Agregar servicio" que abre modal con tabs (Aéreo/Hotel/Traslado/Seguro). Al asignar, se muestra en la lista con nombre + precio + textoDisplay editable. Drag para reordenar.
- **Tab Precios:** Componente PriceDisplay grande con Neto (auto-calculado) → Markup (input editable %) → Venta (auto-calculado, editable). Cambiar markup recalcula venta en tiempo real.
- **Tab Fotos:** Grid de fotos con upload simulado (usar URLs de Unsplash hardcodeadas) y drag-and-drop reorder.
- **Tab Publicación:** Toggle publicado, fechas validez (date pickers), estado, destacado toggle, etiquetas (multi-select con tags removibles).

### Módulo Aéreos:
- Listado: ID, ruta, destino, acciones.
- Detalle: datos del vuelo + tabla de precios por periodo (agregar fila, editar inline, eliminar).

### Módulo Alojamientos:
- Listado: ID, hotel, ciudad, país, categoría (estrellas), acciones.
- Detalle: datos + precios por periodo con régimen + grid de fotos.

### Módulo Traslados:
- Tabla editable inline (sin formulario separado). Crear = nueva fila. Editar = inline.

### Módulo Seguros:
- Listado + formulario modal simple (proveedor, plan, cobertura, costo/día).

### Módulo Circuitos:
- Listado + detalle con itinerario día por día (agregar día, editar, reordenar) + precios por periodo.

### Módulo Proveedores:
- CRUD simple con tabla + modal.

### Módulo Catálogos:
- Tabs para cada catálogo (temporadas, tipos, etiquetas, países, regímenes). CRUD simple por tab.

### Módulo Perfiles:
- Tabla de usuarios con nombre, email, rol (badge), marca, acciones. Modal crear/editar.

### Módulo Notificaciones:
- Wizard paso a paso: 1) Seleccionar etiqueta → 2) Ver paquetes filtrados → 3) Seleccionar paquetes → 4) Preview del email → 5) Enviar (simulado) + toast.

### Módulo Reportes:
- Stat cards: total paquetes activos, aéreos, alojamientos, visitas web simuladas.
- Gráfica de paquetes por destino (usar recharts con barras).
- Tabla de hoteles más usados.

### Dashboard:
- 4 stat cards liquid glass con números animados.
- Actividad reciente (últimos paquetes creados/editados).
- Accesos rápidos a módulos.

### Login:
- Página con fondo mesh gradient animado + noise overlay.
- Card liquid glass centrada con logo, título "Bienvenido", inputs de email y contraseña, botón "Ingresar".
- Al hacer login, setear el rol (ADMIN/VENDEDOR) y la marca.

### Vista vendedor:
- Cuando el rol es VENDEDOR, ocultar: botones crear/editar/eliminar/clonar, columnas de neto y markup, todos los módulos excepto Paquetes. Mostrar badge "Solo lectura".

### Selector de marca:
- Dropdown en el topbar para cambiar entre TravelOz y DestinoIcono. Al cambiar, se filtran los datos por marca.

---

## DESIGN SYSTEM — REGLAS VISUALES CRÍTICAS

Lee el `design.json` v3 completo. Las reglas más importantes:

### Sidebar
- Gradiente: violeta intenso (#6C2BD9) → violeta oscuro (#441496) → negro (#0F081E)
- Animación: `sidebarGlow` que pulsa suavemente
- Top glow: gradiente radial violeta en la parte superior
- Item activo: fondo violeta semi-transparente + borde violeta + glow
- Logo icon: fondo violeta glass con glow

### Superficies Glass
- **Cards:** `background: rgba(255,255,255,0.72)`, `backdrop-filter: blur(20px) saturate(180%)`, borde blanco semi-transparente, sombra multi-capa. Pseudo-element `::before` con línea gradiente violet→teal en el borde superior. Animación `breathe` sutil.
- **Stat cards (liquid):** `backdrop-filter: blur(30px) saturate(200%) brightness(1.05)`, `::after` con sheen diagonal, animación `liquidFloat` + `borderGlow`. Al hover: glow cónico rotatorio violeta.
- **Modals:** `backdrop-filter: blur(40px) saturate(220%)`, sombra con tint violeta, línea gradiente top accent. Entrada: scale(0.88) + blur(8px) → scale(1) con spring.
- **Toasts:** `backdrop-filter: blur(30px) saturate(200%)`, slide spring desde la derecha.

### Botones Clay
- Primary (teal): gradiente 145deg + sombras 3D (light + shadow) + inset highlight. Sheen que cruza al hover. Press: scale(0.96) + sombra hundida.
- Danger (red): mismo clay pero rojo.
- Secondary: glass frosted subtle con borde.
- Ghost: transparente con hover glow.

### Inputs Glass
- `background: rgba(255,255,255,0.7)`, `backdrop-filter: blur(8px)`, borde sutil.
- Focus: double ring (blanco + teal) — `0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(59,191,173,0.4)`.
- Error: ring rojo + background rosado + texto de error con micro-bounce animation.

### Tabla
- Header: `rgba(26,26,46,0.94)` con `backdrop-filter: blur(12px)`, texto blanco uppercase.
- Rows: hover con gradiente violet→teal sutil, selected con borde izquierdo violeta.
- Stagger animation al cargar filas (cada fila aparece con 40ms de delay).

### Animaciones (Framer Motion)
- **Page transition:** `initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}` → `animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}`
- **Modal:** overlay blur in + content scale spring
- **Dropdown:** scale(0.92) + translateY(-8) + blur(4px) → normal
- **Toast:** translateX(80) + scale(0.9) + blur → normal con spring bouncy
- **Stat numbers:** Animated counter que sube con spring
- **Stagger children:** 40ms entre items, 80ms delay inicial

### Background global
- Color base: #F5F6FA
- Noise overlay: SVG fractalNoise a 2.5% opacidad
- 3 color orbs: teal (top-right), violet (bottom-left), violet sutil (center)

### Tab indicator
- Gradiente: violet→teal (`linear-gradient(90deg, #8B5CF6, #3BBFAD)`)
- Layout animation con Framer Motion layoutId

### Form section titles
- Barra vertical izquierda con gradiente violet→teal
- Borde inferior sutil

---

## INSTRUCCIONES DE EJECUCIÓN

1. Inicializar proyecto Next.js 14 con TypeScript y Tailwind.
2. Instalar dependencias: `framer-motion lucide-react @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip class-variance-authority clsx tailwind-merge date-fns recharts`.
3. Configurar `tailwind.config.ts` con los tokens del `design.json` (sección `tailwindExtend`).
4. Crear types en `lib/types.ts` basándose en los schemas Prisma del `modulos_backend.md`.
5. Crear datos hardcodeados en `lib/data.ts` con toda la información de prueba.
6. Crear el store en `lib/store.ts` con useContext para CRUD en memoria.
7. Construir los componentes UI base siguiendo estrictamente el design system.
8. Construir los layouts (Sidebar, Topbar, Admin layout con AnimatePresence).
9. Construir cada página de módulo con toda su funcionalidad.
10. Testear que todo funcione: navegación, crear/editar/eliminar, filtros, cambio de marca, vista vendedor.

**PRIORIDAD:** Que se vea ESPECTACULAR y que sea FUNCIONAL. El cliente va a ver esto en una videollamada. Cada interacción debe sentirse premium — los glass effects, las animaciones, el feedback visual. Es un producto Apple-level.

**NO HACER:**
- No usar base de datos ni API externa
- No usar localStorage
- No crear archivos CSS separados (todo Tailwind + inline styles para glass)
- No usar componentes genéricos sin estilizar (todo debe seguir el design system)
- No dejar módulos vacíos con "Coming soon" — todos deben tener contenido funcional

**IDIOMA:** Toda la UI en español (labels, placeholders, botones, mensajes, datos).
