# TravelOz Backend — Registro de Desarrollo

> Documento generado: 2026-03-16 | Milestone v1.0 COMPLETO

---

## 1. Resumen Ejecutivo

**TravelOz Admin Panel** es un prototipo 100% funcional de panel administrativo para la agencia de viajes uruguaya TravelOz y su marca hermana DestinoIcono. Construido con Next.js 14 (App Router), datos hardcodeados en React Context, y un sistema de diseño glassmorphism premium ("Liquid Horizon v3.0").

- **Objetivo:** Validar UX/UI en videollamada con el cliente antes de construir el backend productivo.
- **Cliente:** Geronimo Cassoni & Santiago Rodriguez (co-fundadores TravelOz).
- **Estado:** 8 fases completadas, 28 planes ejecutados, 98 requerimientos cubiertos (100%).
- **Próximo paso:** Demo con cliente → feedback → backend productivo con PostgreSQL + Prisma.

---

## 2. Stack Técnico

| Tecnología | Versión | Propósito |
|---|---|---|
| Next.js | 14.2.25 | Framework (App Router) |
| React | 18.3.1 | UI Library |
| TypeScript | 5.8.2 | Type safety |
| Tailwind CSS | 3.4.18 | Utility-first CSS (pinned, NO v4 por incompatibilidad) |
| Motion (Framer Motion) | 12.4.7 | Animaciones y transiciones |
| Radix UI | 1.4.3 | Primitivos accesibles (Dialog, Select, Tabs, Tooltip) |
| Lucide React | 0.469.0 | Iconografía |
| CVA | 0.7.1 | Variantes de componentes |
| Recharts | 2.15.1 | Gráficos para reportes |
| date-fns | 4.1.0 | Formateo de fechas |
| react-day-picker | 9.5.1 | Calendario |
| tailwind-merge | 2.6.0 | Merge de clases Tailwind |
| clsx | — | Utilidad de classnames |

---

## 3. Arquitectura del Proyecto

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (fuentes, metadata)
│   ├── page.tsx                      # Homepage / redirect
│   ├── login/page.tsx                # Login con demo users
│   └── (admin)/                      # Route group admin
│       ├── layout.tsx                # Shell: Sidebar + Topbar + Background
│       ├── dashboard/page.tsx        # Dashboard con stats animados
│       ├── paquetes/
│       │   ├── page.tsx              # Lista de paquetes
│       │   ├── nuevo/page.tsx        # Crear paquete
│       │   └── [slug]/
│       │       ├── page.tsx          # Detalle con 5 tabs
│       │       └── _components/      # DatosTab, ServiciosTab, PreciosTab, FotosTab, PublicacionTab, ServiceSelectorModal
│       ├── aereos/                   # CRUD vuelos
│       ├── alojamientos/             # CRUD alojamientos
│       ├── traslados/                # CRUD traslados
│       ├── circuitos/                # CRUD circuitos
│       ├── seguros/                  # CRUD seguros
│       ├── proveedores/              # CRUD proveedores
│       ├── catalogos/                # 5 sub-catálogos tabulados
│       ├── perfiles/                 # Gestión usuarios/roles
│       ├── notificaciones/           # Wizard 4 pasos
│       └── reportes/                 # Stats + gráficos + tablas
├── components/
│   ├── ui/                           # 21 componentes UI reutilizables
│   ├── layout/                       # Sidebar, Topbar, PageHeader, AdminBackground, PageTransitionWrapper
│   ├── providers/                    # 7 Context providers
│   └── lib/                          # cn.ts, glass.ts, animations.ts
└── lib/
    ├── types.ts                      # 22 interfaces + 2 enums
    ├── utils.ts                      # Pricing, formateo, slugify
    ├── brands.ts                     # Tokens por marca
    ├── auth.ts                       # Roles, permisos, demo users
    └── data/                         # 9 archivos de datos seed
        ├── catalogos.ts
        ├── proveedores.ts
        ├── aereos.ts
        ├── alojamientos.ts
        ├── traslados.ts
        ├── seguros.ts
        ├── circuitos.ts
        ├── paquetes.ts
        └── index.ts
```

---

## 4. Módulos Implementados

### 4.1 Login
- Fondo mesh gradient + noise overlay + tarjeta glass animada
- Botones de demo rápido (seleccionar usuario pre-configurado)
- Autenticación simulada (password: "admin" para todos)
- Redirección automática según rol

### 4.2 Dashboard
- 4 stat cards con animación de conteo (paquetes, vuelos, hoteles, traslados)
- Feed de actividad reciente
- Quick links a todos los módulos
- Saludo según hora del día

### 4.3 Paquetes (módulo más complejo)
- **Lista:** Tabla glass, búsqueda instantánea, filtros por temporada/estado/tipo, paginación
- **Detalle — 5 tabs:**
  - **Datos:** Nombre, slug, temporada, tipo, estado, fechas, noches, descripción
  - **Servicios:** Modal selector con tabs (vuelos, hoteles, traslados, seguros, circuitos)
  - **Precios:** Cálculo en tiempo real: Neto → Markup % → Venta
  - **Fotos:** Upload simulado con grid y reordenamiento
  - **Publicación:** Toggle publicado/borrador con vista previa
- **Acciones:** Crear, editar, clonar, eliminar (soft delete con confirmación shake)
- **Vista vendedor:** Solo lectura, sin columnas neto/markup

### 4.4 Aéreos (Vuelos)
- CRUD completo de rutas aéreas
- Tabla de precios por período (adulto/menor)
- Datos: origen, destino, aerolínea, escalas, equipaje, itinerario
- 16 rutas seed desde MVD

### 4.5 Alojamientos
- CRUD completo de hoteles/resorts
- Tabla de precios por noche + régimen alimenticio
- Galería de fotos con alt text
- Categoría por estrellas, ciudad, proveedor
- 10 alojamientos seed

### 4.6 Traslados
- Lista con edición inline de precios
- Tipos: REGULAR y PRIVADO
- Precio fijo por transfer (no por período)
- Origen → destino con proveedor

### 4.7 Seguros
- Planes con costo diario + monto cobertura
- Proveedor asociado
- Cálculo: días × costo diario

### 4.8 Circuitos
- Itinerarios multi-día con editor día-por-día
- Precios por período
- Drag-and-drop nativo para reordenar días
- 6 circuitos seed

### 4.9 Proveedores
- Entidad normalizada para evitar duplicados
- Soft delete (campo deletedAt)
- Referenciado por traslados, seguros, circuitos

### 4.10 Catálogos
- 5 sub-catálogos en tabs: Temporadas, Tipos de Paquete, Etiquetas, Países/Ciudades, Regímenes
- CRUD completo por sub-catálogo
- Datos compartidos entre marcas (países/ciudades duplicados por brand)

### 4.11 Perfiles
- Gestión de usuarios con roles (ADMIN, VENDEDOR, MARKETING)
- Asignación de marca
- Tabla de permisos por rol

### 4.12 Notificaciones
- Wizard de 4 pasos:
  1. Seleccionar etiqueta de campaña
  2. Filtrar paquetes por etiqueta
  3. Seleccionar paquetes a incluir
  4. Preview de email → envío simulado (toast)

### 4.13 Reportes
- Stat cards: total paquetes, vuelos, hoteles, visitas web (simulado)
- Gráfico de barras: paquetes por destino (Recharts)
- Tabla: hoteles más utilizados

---

## 5. Sistema de Diseño — "Liquid Horizon v3.0"

### 5.1 Filosofía
Interacciones Apple-like, glassmorphism premium, efectos liquid glass y claymorphism.

### 5.2 Marcas

| Propiedad | TravelOz | DestinoIcono |
|---|---|---|
| Color primario | Violet (#6C2BD9) | Teal (#0D9488) |
| Gradiente sidebar | Violet → Purple → Black | Teal → Dark → Black |
| Glow effect | Violet pulse | Teal pulse |
| Login background | Violet mesh gradients | Teal mesh gradients |

### 5.3 Materiales Glass

| Variante | Background | Blur | Uso |
|---|---|---|---|
| frosted | rgba(255,255,255,0.72) | 20px | Cards, elementos UI |
| frostedSubtle | rgba(255,255,255,0.45) | 12px | Botones secundarios |
| frostedDark | rgba(26,26,46,0.78) | 24px | Sidebar, top nav |
| liquid | rgba(255,255,255,0.55) | 30px | Stat cards, highlights |
| liquidModal | rgba(18,18,38,0.82) | 40px | Modales, diálogos |

### 5.4 Animaciones (Motion/Framer Motion)

| Preset | Config | Uso |
|---|---|---|
| snappy | stiffness: 500, damping: 30 | Botones, dropdowns |
| gentle | stiffness: 260, damping: 25 | Cards hover, modales |
| bouncy | stiffness: 400, damping: 20 | Toast, checkboxes |
| slow | stiffness: 150, damping: 25 | Página entrada |
| micro | stiffness: 600, damping: 35 | Iconos, micro-interacciones |

### 5.5 Componentes UI (21 componentes)

Button, Card, Modal, Input, Select, Checkbox, Toggle, Tabs, Badge, Tag, Table, Pagination, SearchFilter, Breadcrumb, Avatar, PriceDisplay, PriceImpactModal, DatePicker, ImageUploader, Skeleton, Toast

---

## 6. Gestión de Estado

### Patrón: React Context + useReducer

Cada dominio tiene su propio provider para evitar re-renders cruzados:

| Provider | Responsabilidad | Patrón |
|---|---|---|
| AuthProvider | Login/logout, roles, permisos | useState |
| BrandProvider | Marca activa, tokens visuales | useState |
| CatalogProvider | Temporadas, tipos, regímenes, países, ciudades, etiquetas | useState |
| ServiceProvider | Vuelos, hoteles, traslados, circuitos, seguros + precios | useReducer |
| PackageProvider | Paquetes + asignaciones de servicios | useReducer |
| UserProvider | Usuario logueado actual | useState |
| ToastProvider | Cola de notificaciones toast | useState |

### Composición (Providers.tsx):
```
Auth > Brand > Catalog > Service > Package > User > Toast
```

---

## 7. Control de Acceso (RBAC)

| Permiso | ADMIN | VENDEDOR | MARKETING |
|---|---|---|---|
| Ver todos los módulos | Si | Solo Paquetes | Paquetes + Reportes |
| Crear/Editar/Eliminar | Si | No | No |
| Ver precio neto | Si | No | No |
| Ver markup | Si | No | No |
| Ver precio venta | Si | Si | Si |
| Clonar paquetes | Si | No | No |

---

## 8. Modelo de Datos

### Entidad central: Paquete (Hub)
```
Paquete
├── → N Aereo (vuelos asignados)
├── → N Alojamiento (hoteles asignados)
├── → N Traslado (transfers asignados)
├── → N Seguro (seguros asignados)
├── → N Circuito (circuitos asignados)
├── → N PaqueteFoto (fotos del paquete)
└── → N Etiqueta (tags de campaña)
```

### Jerarquías
```
Pais → Ciudad
Proveedor → Traslados, Seguros, Circuitos
Temporada / TipoPaquete → referenciados por Paquete
Regimen → referenciado por PrecioAlojamiento
```

### Pricing
```
Neto = SUM(vuelo + hotel×noches + traslado + seguro×días + circuito)
Venta = Neto × (1 + markup%)
```

### Datos Seed
- 16 paquetes (10 TravelOz, 6 DestinoIcono)
- 16 rutas aéreas desde MVD
- 10 hoteles/resorts
- 8+ traslados
- 6+ seguros
- 6 circuitos
- 5 usuarios demo

---

## 9. Fases de Desarrollo

### Fase 1 — Foundation & Design System (8 planes)
- Configuración proyecto Next.js 14 + TypeScript + Tailwind 3.4.18
- Componentes base: Button (CVA), Card (glass), Modal (Radix), Input, Select
- Utilidades: cn.ts, glass.ts (5 materiales), animations.ts (springs + interacciones)
- Componentes adicionales: Badge, Tag, Table, Pagination, Toast, SearchFilter, Tabs
- **Decisión clave:** Tailwind v3.4.18 fijado por incompatibilidad con v4

### Fase 2 — Layout, Navigation, Auth & Multi-Brand (5 planes)
- Sidebar con navegación filtrada por rol, grupos (General, Servicios, Sistema)
- Topbar con breadcrumb, selector de marca, perfil de usuario
- AdminBackground con orbes animados + SVG noise
- PageTransitionWrapper con AnimatePresence
- Login page con mesh gradient, cards animadas, demo users
- AuthProvider con roles y permisos
- BrandProvider con tokens por marca (TravelOz vs DestinoIcono)

### Fase 3 — Data Layer & Types (5 planes)
- 22 interfaces TypeScript + 2 enums (EstadoPaquete, TipoTraslado)
- 9 archivos de datos seed con datos realistas uruguayos
- utils.ts: formatCurrency, calcularNeto, calcularVenta, slugify
- brands.ts: BrandTokens con gradientes, colores, logos por marca
- auth.ts: RoleConfig con permisos granulares, 5 DEMO_USERS

### Fase 4 — Paquetes Module (5 planes)
- Lista con tabla glass, búsqueda, filtros, paginación
- Página detalle con 5 tabs (URL-based state: `?tab=servicios`)
- ServiceSelectorModal: modal con tabs para asignar servicios
- Cálculo de precios en tiempo real (neto → markup → venta)
- Acciones: crear, editar, clonar (deep copy), eliminar (soft delete)
- Vista VENDEDOR: solo lectura, precios ocultos

### Fase 5 — Aereos & Alojamientos (2 planes)
- Aéreos: lista + crear + editar con tabla de precios por período
- Alojamientos: lista + crear + editar con fotos y régimen
- Precios con fechas desde/hasta, adulto/menor (aéreos), por noche (hoteles)

### Fase 6 — Supporting Services (3 planes)
- Traslados: lista con edición inline, tipos regular/privado
- Seguros: CRUD con costo diario × días = total
- Circuitos: editor día-por-día con drag-and-drop nativo
- Proveedores: entidad normalizada con soft delete

### Fase 7 — Catálogos & Perfiles (2 planes)
- Catálogos: 5 sub-catálogos en tabs con CRUD completo
- Perfiles: gestión de usuarios, roles, asignación de marca
- Tabla de permisos visualizada

### Fase 8 — Dashboard, Notificaciones & Reportes (3 planes)
- Dashboard: 4 stat cards animados, actividad reciente, quick links
- Notificaciones: wizard 4 pasos (etiqueta → filtrar → seleccionar → enviar)
- Reportes: stat cards + gráfico barras (Recharts) + tabla hoteles
- **Decisión:** Wizard de notificaciones colapsado de 5 a 4 pasos

---

## 10. Decisiones Técnicas Clave

| Decisión | Razón |
|---|---|
| Tailwind v3.4.18 (no v4) | Incompatibilidad con tokens de diseño glass |
| Radix UI paquete unificado | Simplifica gestión de 5+ paquetes individuales |
| Glass materials como inline styles | `backdrop-filter` complejo necesita JS, no solo clases Tailwind |
| WebkitBackdropFilter incluido | Compatibilidad Safari |
| Context por entidad (no global) | Evitar re-renders cruzados entre módulos |
| Soft delete para paquetes | Preservar integridad referencial en asignaciones |
| HTML5 drag-and-drop nativo | Apropiado para scope de prototipo (no @dnd-kit) |
| URL-based tab state | Permite browser back/forward correcto |
| Destino derivado del primer aéreo | No almacenado en Paquete directamente |
| Estado publicado = `estado === ACTIVO` | Sin boolean separado |

---

## 11. Documentación del Proyecto

| Archivo | Propósito |
|---|---|
| `docs/flujo.md` | Flujo completo del sistema, reglas de negocio, roles |
| `docs/explicacion.md` | Contexto empresarial, diagnóstico operativo, dolores |
| `docs/modulos_backend.md` | Especificación técnica exhaustiva por módulo |
| `docs/design.json` | Sistema de diseño "Liquid Horizon" completo |
| `docs/DEVELOPMENT.md` | Este documento — registro de todo lo desarrollado |
| `PROMPT_CLAUDE_CODE.md` | Mega-prompt de desarrollo con todas las specs |
| `.planning/PROJECT.md` | Definición del proyecto y propuesta de valor |
| `.planning/ROADMAP.md` | 8 fases, 28 planes, dependencias, criterios de éxito |
| `.planning/REQUIREMENTS.md` | 98 requerimientos v1 con trazabilidad |
| `.planning/STATE.md` | Estado actual, métricas de velocidad, log de decisiones |
| `.planning/research/` | Investigación de stack, arquitectura, features, pitfalls |
| `.planning/phases/01-08/` | Planes, summaries y verificaciones por fase |

---

## 12. Reglas de Negocio Críticas

1. **Propagación automática de precios** — cuando cambia el costo de un servicio, TODOS los paquetes que lo usan recalculan automáticamente (v2 productivo)
2. **Multi-marca** — un codebase, dos marcas independientes con datos filtrados por brandId
3. **Precios en USD** — todo el sistema opera en dólares americanos
4. **Markup sobre neto** — Venta = Neto × (1 + markup%), típicamente 30-40%
5. **Vendedores solo ven precio venta** — neto y markup son información confidencial
6. **Soft delete** — paquetes y proveedores usan deletedAt, no eliminación física
7. **Paquetes por temporada** — cada paquete pertenece a una temporada específica
8. **Servicios reutilizables** — un vuelo/hotel/transfer puede estar en múltiples paquetes
9. **Etiquetas = campañas** — las etiquetas agrupan paquetes para notificaciones masivas
10. **Destino derivado** — el destino del paquete se extrae del primer vuelo asignado

---

## 13. Limitaciones del Prototipo (Fuera de Scope v1)

| Limitación | Razón |
|---|---|
| Sin base de datos | Prototipo de validación UX, datos en React state |
| Sin localStorage | Sin persistencia entre sesiones |
| Sin envío real de emails | Notificaciones simuladas con toast |
| Sin upload real de imágenes | URLs de Unsplash como placeholder |
| Sin autenticación real | Login setea rol/marca en state |
| Sin responsive mobile | Desktop-first para demo en videollamada |
| Sin tests automatizados | Validación visual en llamada con cliente |
| Sin rol MARKETING funcional | Solo ADMIN y VENDEDOR implementados |
| Sin i18n | UI exclusivamente en español |

---

## 14. Métricas de Desarrollo

| Métrica | Valor |
|---|---|
| Total archivos TypeScript/TSX | ~80 |
| Líneas de código estimadas | ~19,660 |
| Fases completadas | 8/8 |
| Planes ejecutados | 28/28 |
| Requerimientos cubiertos | 98/98 (100%) |
| Componentes UI | 21 |
| Context providers | 7 |
| Rutas admin | 15+ |
| Datos seed | 16 paquetes, 16 vuelos, 10 hoteles, 8 traslados, 6 seguros, 6 circuitos |
| Commits git | ~50+ |

---

## 15. Roadmap v2 (Backend Productivo)

Funcionalidades diferidas para la versión productiva:

- PostgreSQL + Prisma ORM como base de datos
- API REST/tRPC para todas las operaciones
- Autenticación real (NextAuth / Clerk)
- Envío real de emails (Resend / SendGrid)
- Upload real de imágenes (S3 / Cloudinary)
- Propagación automática de precios al modificar servicios
- Auto-desactivación de paquetes al vencer fecha de validez
- Reportes año-vs-año con datos históricos
- Integración con analytics web
- Módulo de cruceros
- Responsive mobile
- Tests E2E con Playwright
- CI/CD pipeline

---

*Milestone v1.0 — Completado 2026-03-16*
