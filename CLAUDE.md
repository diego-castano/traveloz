# Traveloz — Guía para Claude

**Traveloz** (TravelOz / `traveloz-admin`) es el panel de administración + sitio
público de la agencia de viajes uruguaya TravelOz. Es un **proyecto totalmente
independiente**.

## ⛔ Regla #1 — Aislamiento de Destinico

Este repo vive en el mismo workspace que `../destinico` **solo por comodidad de
desarrollo**. NO son el mismo sistema. Son dos marcas con todo separado:

| Recurso        | Traveloz                               | Destinico (NO tocar desde acá) |
| -------------- | -------------------------------------- | ------------------------------ |
| GitHub         | `diego-castano/traveloz`               | `diego-castano/destinico`      |
| Railway        | proyecto propio                        | proyecto propio                |
| Base de datos  | `DATABASE_URL` propia (`.env.local`)   | DB distinta                    |
| Storage/bucket | bucket propio                          | bucket distinto                |
| Dominio        | `traveloz.com.uy`                      | `destinico.com` (def.)         |

Al trabajar en este repo:

- **NUNCA** importes, copies, leas como fuente de verdad, ni edites archivos de
  `../destinico`. Si algo de Destinico parece relevante, avisá — no lo cruces.
- **NUNCA** ejecutes comandos (`git`, `prisma`, `railway`, scripts) apuntando al
  repo, la DB o el deploy de Destinico.
- Destinico es un **fork** de Traveloz, así que hoy comparten casi todo el código.
  Eso es temporal: **cada repo evoluciona por su cuenta**. Un cambio en Traveloz
  NO se propaga a Destinico (ni al revés) salvo pedido explícito del usuario.

## Infra (fuente de verdad)

- Repo: `https://github.com/diego-castano/traveloz`
- URL producción: `traveloz-production.up.railway.app`
- DB / auth / storage: definidos en `.env.local` (no commiteado).
- Deploy: Railway, auto-deploy on push a `main`.

## Stack

Next.js 14 (App Router) · Prisma + PostgreSQL · next-auth v5 · S3/Tigris ·
Tailwind (admin) + template CSS (público) · Railway.
