# TravelOz — Documentacion

> Indice central de toda la documentacion del proyecto.

---

## Estructura

```
docs/
├── negocio/              Contexto de negocio, flujos operativos
├── arquitectura/         Stack tecnico, infra, modulos, decisiones
│   └── modulos/          Un archivo por modulo grande (cotizador, pasajeros y pagos)
├── design/               Sistema de diseno (tokens, colores, UI)
├── especificaciones/     Requerimientos y feedback del cliente
├── auditorias/           Auditorias de QA, readiness y funcionalidad
├── planning/             Planes, briefs y prompts historicos
├── changelog/            Historial de cambios por version
└── sesiones/             Log de sesiones de trabajo
```

> El estado vivo de pendientes para el go-live se mantiene en
> [PRODUCTION-PENDING.md](./PRODUCTION-PENDING.md).

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
| [modulos/cotizador.md](arquitectura/modulos/cotizador.md) | Cotizador de vendedores: modelo Presupuesto, editor, hoja del pasajero, link público, PDF, analytics |
| [modulos/pasajeros-pagos.md](arquitectura/modulos/pasajeros-pagos.md) | Links personales, formularios públicos, bóveda cifrada de tarjetas, envío a ADM, purga |

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
| [cotizador-especificacion-v1.md](especificaciones/cotizador-especificacion-v1.md) | Especificación funcional Fase 1 del cotizador: principios, alcance cerrado y objetivo de ≤4 minutos por cotización (llamadas del 28/07 y 30/07) |
| [cotizador-usabilidad-v1.md](especificaciones/cotizador-usabilidad-v1.md) | Documento de usabilidad del cotizador: la vara del cliente, ritmo de uso y criterios de aceptación |
| [cotizador-checkin-2026-08-26.md](especificaciones/cotizador-checkin-2026-08-26.md) | Decisiones del check-in en producción con Gero y Pablo, 26/08, y ajustes del 27/08 |

---

## Auditorias

Snapshots de QA y auditorias pre-release. El doc vivo de pendientes es
[PRODUCTION-PENDING.md](./PRODUCTION-PENDING.md).

| Archivo | Contenido |
|---------|-----------|
| [auditoria-2026-06-10.md](auditorias/auditoria-2026-06-10.md) | Auditoria funcional completa pre-produccion: paquetes, servicios, frontend, backend/seguridad, CMS e imagenes |
| [readiness-report-2026-05-27.md](auditorias/readiness-report-2026-05-27.md) | Reporte de readiness del 27/05 |
| [qa-report-2026-05-26.md](auditorias/qa-report-2026-05-26.md) | QA visual del 24-26/05 (fixes ya aplicados) |

---

## Planning

| Archivo | Contenido |
|---------|-----------|
| [frontend.md](planning/frontend.md) | Plan del frontend publico |
| [prompt-inicial-2026-05-18.md](planning/prompt-inicial-2026-05-18.md) | Brief/prompt original del proyecto (historico) |

---

## Changelog

Historial de cambios versionado. Un archivo por release mayor.

| Archivo | Contenido |
|---------|-----------|
| [v2.4.0.md](changelog/v2.4.0.md) | 2026-08-27 — Cotizador en producción, Pasajeros y pagos, atribución de pauta, check-in con el cliente |
| [v2.3.0.md](changelog/v2.3.0.md) | 2026-07-08 — Video en work-with-us, alineación del listing de región, robustez del newsletter (LGPD/GDPR) y pulido del admin |
| [v2.2.0.md](changelog/v2.2.0.md) | 2026-06-27 — Correcciones de carga y alineación con la referencia (FAQ, work-with-us, cotizar) |
| [v2.1.0.md](changelog/v2.1.0.md) | 2026-06-23 — Cotizadores dinámicos, emails branded y pulido del armador |
| [v2.0.0.md](changelog/v2.0.0.md) | 2026-04-10 — Migracion a produccion: PostgreSQL, Prisma, NextAuth v5, Railway |

---

## Sesiones

Registro de sesiones de trabajo para trackear progreso incremental.
Ver [_TEMPLATE.md](sesiones/_TEMPLATE.md) para el formato estandar.

| Archivo | Contenido |
|---------|-----------|
| [2026-08-26-checkin-cotizador.md](sesiones/2026-08-26-checkin-cotizador.md) | Check-in en producción con Gero y Pablo: formularios más cortos, bóveda de 96 h, "Enviar a ADM", PDF con membrete, y los fixes del 27/08 |
| [2026-08-24-cotizador-a-produccion.md](sesiones/2026-08-24-cotizador-a-produccion.md) | El cotizador deja el mockup: modelo Presupuesto, link público, PDF con Chromium, lector de itinerarios y analytics |
| [2026-05-18b-creador-paquetes-followups.md](sesiones/2026-05-18b-creador-paquetes-followups.md) | Creador de paquetes: fixes críticos post-audit |
| [2026-05-18-cms-connectivity.md](sesiones/2026-05-18-cms-connectivity.md) | CMS connectivity completa y cobertura frontend↔backend |
| [2026-04-15b.md](sesiones/2026-04-15b.md) | Tests E2E, fixes de UI, eliminación multi-marca, favicon custom |
| [2026-04-15.md](sesiones/2026-04-15.md) | Refactor de Alojamientos, seed real y modernización de UI |

---

## Convenciones

- **Idioma:** Espanol sin tildes en nombres de archivo, con tildes en contenido si aplica
- **Nombres de archivo:** kebab-case, descriptivos, sin mayusculas
- **Changelog:** Un archivo por version mayor (vX.Y.Z.md)
- **Sesiones:** Un archivo por sesion, formato `YYYY-MM-DD-descripcion.md`
- **Nuevos docs:** Ubicar en la carpeta que corresponda segun la tabla de arriba
- **Escalabilidad:** Si una carpeta crece mucho, subdividir por dominio (ej: `arquitectura/modulos/aereos.md`)
