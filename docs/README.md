# TravelOz — Documentacion

> Indice central de toda la documentacion del proyecto.

---

## Estructura

```
docs/
├── negocio/              Contexto de negocio, flujos operativos
├── arquitectura/         Stack tecnico, infra, modulos, decisiones
├── design/               Sistema de diseno (tokens, colores, UI)
├── especificaciones/     Requerimientos y feedback del cliente
├── changelog/            Historial de cambios por version
└── sesiones/             Log de sesiones de trabajo
```

---

## Negocio

Documentacion orientada a entender el negocio sin contexto tecnico.

| Archivo | Contenido |
|---------|-----------|
| [contexto-operativo.md](negocio/contexto-operativo.md) | Que es TravelOz, como opera hoy, dolores actuales, estructura del equipo |
| [flujo-administrador.md](negocio/flujo-administrador.md) | Flujo completo del admin backend: roles, permisos, modulos, reglas de negocio |

---

## Arquitectura

Decisiones tecnicas, infraestructura y especificaciones de implementacion.

| Archivo | Contenido |
|---------|-----------|
| [desarrollo.md](arquitectura/desarrollo.md) | Stack, evolucion del proyecto, patrones usados, estructura de carpetas |
| [infraestructura.md](arquitectura/infraestructura.md) | Railway, PostgreSQL, variables de entorno, pipeline de deploy |
| [modulos-backend.md](arquitectura/modulos-backend.md) | Especificacion exhaustiva de cada modulo: schemas, campos, reglas, endpoints, UI |

---

## Design

Sistema de diseno visual del proyecto.

| Archivo | Contenido |
|---------|-----------|
| [design-system.json](design/design-system.json) | Design System v3 "Liquid Horizon" — tokens, colores, glass materials, animaciones, componentes |

---

## Especificaciones

Requerimientos del cliente y feedback de reuniones.

| Archivo | Contenido |
|---------|-----------|
| [cambios-cliente-v1.5.md](especificaciones/cambios-cliente-v1.5.md) | 34 cambios identificados en call del 25/03/2026 (opciones hoteleras, markup, campos) |

---

## Changelog

Historial de cambios versionado. Un archivo por release mayor.

| Archivo | Contenido |
|---------|-----------|
| [v2.0.0.md](changelog/v2.0.0.md) | Migracion a produccion: PostgreSQL, Prisma, NextAuth v5, Railway |

---

## Sesiones

Registro de sesiones de trabajo para trackear progreso incremental.
Ver [_TEMPLATE.md](sesiones/_TEMPLATE.md) para el formato estandar.

---

## Convenciones

- **Idioma:** Espanol sin tildes en nombres de archivo, con tildes en contenido si aplica
- **Nombres de archivo:** kebab-case, descriptivos, sin mayusculas
- **Changelog:** Un archivo por version mayor (vX.Y.Z.md)
- **Sesiones:** Un archivo por sesion, formato `YYYY-MM-DD-descripcion.md`
- **Nuevos docs:** Ubicar en la carpeta que corresponda segun la tabla de arriba
- **Escalabilidad:** Si una carpeta crece mucho, subdividir por dominio (ej: `arquitectura/modulos/aereos.md`)
