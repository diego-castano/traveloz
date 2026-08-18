/**
 * seed-usuarios-traveloz.ts — Alta idempotente del equipo TravelOz.
 *
 * Fuente: Excel "TravelOZ - Administrador — Lista de usuarios" (14-ago-2026).
 * Lista completa de 26 personas (22 VENDEDOR + 4 ADMIN) hardcodeada abajo —
 * es un alta puntual de equipo, no un catálogo que vaya a crecer por script.
 *
 * Reglas (ver encargo):
 *   - Busca por email (lowercase). Si NO existe → create con passwordHash
 *     bcrypt(temporal, 10), role, slug, brandId "brand-1", isActive true,
 *     mustChangePassword true.
 *   - Si YA existe (ej. Gerónimo) → update SOLO de role y slug (slug solo si
 *     hoy es null). JAMÁS se toca passwordHash, mustChangePassword ni
 *     isActive de un usuario existente: ya tiene su contraseña real en uso.
 *   - Colisión de slug con OTRO usuario (email distinto) → sufijo "-2" +
 *     warning en el resumen.
 *   - No manda ningún email (nada de invitationEmail).
 *
 * Uso:
 *   source .env.local && npx tsx scripts/seed-usuarios-traveloz.ts             # aplica
 *   source .env.local && npx tsx scripts/seed-usuarios-traveloz.ts --dry-run   # solo muestra
 *
 * Salida:
 *   - Tabla resumen en consola (creado / actualizado / salteado por fila).
 *   - CSV `credenciales-equipo-traveloz.csv` en la raíz del repo con las
 *     credenciales temporales y los links personales de cada persona.
 *     ESE ARCHIVO NUNCA SE COMMITEA (ver aviso al final + .gitignore).
 */

import { PrismaClient, type Role } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertSeedAllowed } from "../prisma/seed-guard";
import { logAudit } from "../src/lib/audit";

assertSeedAllowed("seed-usuarios-traveloz");

// Guard explícito: sin DATABASE_URL no tiene sentido ni siquiera armar el
// PrismaClient (el error nativo de Prisma es menos claro que este).
if (!process.env.DATABASE_URL) {
  console.error(
    "[seed-usuarios-traveloz] Falta DATABASE_URL. Corré con:\n" +
      "  source .env.local && npx tsx scripts/seed-usuarios-traveloz.ts",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const BRAND_ID = "brand-1";
const BCRYPT_ROUNDS = 10;
const SITE_BASE = "https://traveloz.com.uy";
const CSV_PATH = join(process.cwd(), "credenciales-equipo-traveloz.csv");

interface PersonaSeed {
  nombre: string;
  email: string;
  role: Role;
  slug: string;
  passwordTemporal: string;
}

// Lista EXACTA del Excel. Nombres van SIN el prefijo "Lic." que aparecía en
// dos filas (Anaclara Arrieta, Matias Sosa) — el prefijo es un tratamiento,
// no parte del nombre que queremos guardar en `User.name`.
const PERSONAS: PersonaSeed[] = [
  // ── VENDEDOR ──
  { nombre: "Alexander Van der Ouw", email: "alexander.v@traveloz.com.uy", role: "VENDEDOR", slug: "alexander-van-der-ouw", passwordTemporal: "Alexander1343" },
  { nombre: "Bianca Romano", email: "bianca.romano@traveloz.com.uy", role: "VENDEDOR", slug: "bianca-romano", passwordTemporal: "Bianca1343" },
  { nombre: "Bruno Bonavida", email: "bruno.bonavida@traveloz.com.uy", role: "VENDEDOR", slug: "bruno-bonavida", passwordTemporal: "Bruno1343" },
  { nombre: "Carla Varela", email: "carla.varela@traveloz.com.uy", role: "VENDEDOR", slug: "carla-varela", passwordTemporal: "Carla1343" },
  { nombre: "Diego Vilizzio", email: "diego.vilizzio@traveloz.com.uy", role: "VENDEDOR", slug: "diego-vilizzio", passwordTemporal: "Diego1343" },
  { nombre: "Federico Hornes", email: "federico.hornes@traveloz.com.uy", role: "VENDEDOR", slug: "federico-hornes", passwordTemporal: "Federico1343" },
  { nombre: "Felipe Sanchez", email: "felipe.sanchez@traveloz.com.uy", role: "VENDEDOR", slug: "felipe-sanchez", passwordTemporal: "Felipe1343" },
  { nombre: "Florencia Encina", email: "florencia.encina@traveloz.com.uy", role: "VENDEDOR", slug: "florencia-encina", passwordTemporal: "Florencia1343" },
  { nombre: "Florencia Costanzo", email: "florencia.costanzo@traveloz.com.uy", role: "VENDEDOR", slug: "florencia-costanzo", passwordTemporal: "Florencia1343" },
  { nombre: "Gimena Pintos", email: "gimena.pintos@traveloz.com.uy", role: "VENDEDOR", slug: "gimena-pintos", passwordTemporal: "Gimena1343" },
  { nombre: "Helena Haller", email: "helena.haller@traveloz.com.uy", role: "VENDEDOR", slug: "helena-haller", passwordTemporal: "Helena1343" },
  { nombre: "Juan Manuel Rodriguez", email: "juan.rodriguez@traveloz.com.uy", role: "VENDEDOR", slug: "juan-manuel-rodriguez", passwordTemporal: "Juan1343" },
  { nombre: "Leonardo Miglionico", email: "leonardo.miglionico@traveloz.com.uy", role: "VENDEDOR", slug: "leonardo-miglionico", passwordTemporal: "Leonardo1343" },
  { nombre: "Lucía Rodríguez", email: "lucia.rodriguez@traveloz.com.uy", role: "VENDEDOR", slug: "lucia-rodriguez", passwordTemporal: "Lucia1343" },
  { nombre: "Luciana Coitiño", email: "luciana.coitino@traveloz.com.uy", role: "VENDEDOR", slug: "luciana-coitino", passwordTemporal: "Luciana1343" },
  { nombre: "María Eugenia Morás", email: "maria.moras@traveloz.com.uy", role: "VENDEDOR", slug: "maria-eugenia-moras", passwordTemporal: "Maria1343" },
  { nombre: "Nicolás Silva", email: "nicolas.silva@traveloz.com.uy", role: "VENDEDOR", slug: "nicolas-silva", passwordTemporal: "Nicolas1343" },
  { nombre: "Nicolas Maciel", email: "nicolas.maciel@traveloz.com.uy", role: "VENDEDOR", slug: "nicolas-maciel", passwordTemporal: "Nicolas1343" },
  { nombre: "Nicolas Fernandez", email: "nicolas.fernandez@traveloz.com.uy", role: "VENDEDOR", slug: "nicolas-fernandez", passwordTemporal: "Nicolas1343" },
  { nombre: "Sofia Giammarchi", email: "sofia.giammarchi@traveloz.com.uy", role: "VENDEDOR", slug: "sofia-giammarchi", passwordTemporal: "Sofia1343" },
  { nombre: "Anaclara Arrieta", email: "anaclara.arrieta@traveloz.com.uy", role: "VENDEDOR", slug: "anaclara-arrieta", passwordTemporal: "Anaclara1343" },
  { nombre: "Candela Felipe", email: "candela.felipe@traveloz.com.uy", role: "VENDEDOR", slug: "candela-felipe", passwordTemporal: "Candela1343" },
  // ── ADMIN ──
  { nombre: "Francisco Calviño", email: "francisco.calvino@traveloz.com.uy", role: "ADMIN", slug: "francisco-calvino", passwordTemporal: "Francisco1343" },
  { nombre: "Gerónimo Cassoni", email: "geronimo.cassoni@traveloz.com.uy", role: "ADMIN", slug: "geronimo-cassoni", passwordTemporal: "Geronimo1343" },
  { nombre: "Leandro Lencina", email: "leandro.lencina@traveloz.com.uy", role: "ADMIN", slug: "leandro-lencina", passwordTemporal: "Leandro1343" },
  { nombre: "Matias Sosa", email: "matias.sosa@traveloz.com.uy", role: "ADMIN", slug: "matias-sosa", passwordTemporal: "Matias1343" },
];

type Resultado = "creado" | "actualizado" | "salteado";

interface FilaResumen {
  nombre: string;
  email: string;
  role: Role;
  slug: string;
  resultado: Resultado;
  detalle: string;
  passwordParaCsv: string; // password real solo si se creó; si no, "(la que ya tenía)"
}

// Chequea que un slug no esté en uso por OTRO usuario (email distinto).
// Devuelve el slug final a usar (con sufijo -2 si hubo choque) y si hubo
// choque, para poder loguear el warning.
async function resolverSlugSinChoque(
  slugDeseado: string,
  emailDueño: string,
): Promise<{ slug: string; huboChoque: boolean }> {
  const existente = await prisma.user.findUnique({
    where: { slug: slugDeseado },
    select: { email: true },
  });
  if (!existente || existente.email.toLowerCase() === emailDueño.toLowerCase()) {
    return { slug: slugDeseado, huboChoque: false };
  }
  // Choque real con otra persona: sufijo -2. No contemplamos -3+ porque la
  // lista es fija y conocida — si hiciera falta, se ve en el warning.
  return { slug: `${slugDeseado}-2`, huboChoque: true };
}

async function main() {
  console.log(
    `[seed-usuarios-traveloz] ${DRY_RUN ? "DRY RUN — no se escribe nada" : "APLICANDO cambios"} — ${PERSONAS.length} personas.\n`,
  );

  const resumen: FilaResumen[] = [];

  for (const persona of PERSONAS) {
    const email = persona.email.toLowerCase();
    const existente = await prisma.user.findUnique({ where: { email } });

    const { slug: slugFinal, huboChoque } = await resolverSlugSinChoque(persona.slug, email);
    if (huboChoque) {
      console.warn(
        `  ⚠ Slug "${persona.slug}" ya está en uso por otro usuario — se usa "${slugFinal}" para ${persona.nombre}.`,
      );
    }

    if (!existente) {
      // Alta nueva: contraseña temporal + mustChangePassword true.
      if (!DRY_RUN) {
        const nuevo = await prisma.user.create({
          data: {
            email,
            passwordHash: hashSync(persona.passwordTemporal, BCRYPT_ROUNDS),
            name: persona.nombre,
            role: persona.role,
            brandId: BRAND_ID,
            slug: slugFinal,
            isActive: true,
            mustChangePassword: true,
          },
        });
        // Mismo funnel de auditoría que usa el resto del sistema (ver
        // src/actions/user.actions.ts) — deja rastro de que este alta vino
        // del seed puntual del equipo, no de la UI.
        await logAudit({
          action: "user.create",
          userId: null,
          targetType: "user",
          targetId: nuevo.id,
          metadata: { email, role: persona.role, source: "seed-usuarios-traveloz" },
        });
      }
      resumen.push({
        nombre: persona.nombre,
        email,
        role: persona.role,
        slug: slugFinal,
        resultado: "creado",
        detalle: "usuario nuevo, contraseña temporal + mustChangePassword",
        passwordParaCsv: persona.passwordTemporal,
      });
      continue;
    }

    // Ya existe: SOLO tocamos role y slug (slug solo si hoy es null). Nunca
    // pisamos passwordHash / mustChangePassword / isActive — la persona ya
    // tiene su contraseña real y la está usando (caso Gerónimo).
    const data: { role?: Role; slug?: string } = {};
    if (existente.role !== persona.role) data.role = persona.role;
    if (existente.slug === null) data.slug = slugFinal;

    const huboCambios = Object.keys(data).length > 0;
    if (huboCambios && !DRY_RUN) {
      await prisma.user.update({ where: { id: existente.id }, data });
      await logAudit({
        action: "user.update",
        userId: null,
        targetType: "user",
        targetId: existente.id,
        metadata: { email, changed: Object.keys(data), source: "seed-usuarios-traveloz" },
      });
    }

    resumen.push({
      nombre: persona.nombre,
      email,
      role: persona.role,
      slug: existente.slug ?? slugFinal,
      resultado: huboCambios ? "actualizado" : "salteado",
      detalle: huboCambios
        ? `ya existía — se actualizó: ${Object.keys(data).join(", ")}`
        : "ya existía — sin cambios (role y slug ya estaban correctos)",
      passwordParaCsv: "(la que ya tenía)",
    });
  }

  // ── Tabla resumen en consola ──
  console.log("\nResumen:\n");
  const anchoNombre = Math.max(...resumen.map((r) => r.nombre.length), "Nombre".length);
  const anchoEmail = Math.max(...resumen.map((r) => r.email.length), "Email".length);
  const header = `${"Nombre".padEnd(anchoNombre)}  ${"Email".padEnd(anchoEmail)}  Rol       Resultado    Detalle`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const fila of resumen) {
    console.log(
      `${fila.nombre.padEnd(anchoNombre)}  ${fila.email.padEnd(anchoEmail)}  ${fila.role.padEnd(9)} ${fila.resultado.padEnd(12)} ${fila.detalle}`,
    );
  }

  const creados = resumen.filter((r) => r.resultado === "creado").length;
  const actualizados = resumen.filter((r) => r.resultado === "actualizado").length;
  const salteados = resumen.filter((r) => r.resultado === "salteado").length;
  console.log(`\nTotales: ${creados} creado(s), ${actualizados} actualizado(s), ${salteados} salteado(s) sin cambios.\n`);

  // ── CSV de credenciales ──
  const filasCsv = [
    ["nombre", "email", "rol", "contraseña temporal", "link pasajeros", "link pago"],
    ...resumen.map((r) => [
      r.nombre,
      r.email,
      r.role,
      r.passwordParaCsv,
      `${SITE_BASE}/datos-de-pasajeros/${r.slug}`,
      `${SITE_BASE}/datos-de-pago/${r.slug}`,
    ]),
  ];
  const csvContent = filasCsv
    .map((fila) => fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  if (!DRY_RUN) {
    writeFileSync(CSV_PATH, csvContent, "utf-8");
    console.log(`CSV escrito en: ${CSV_PATH}`);
  } else {
    console.log(`[dry-run] CSV NO escrito (se hubiera escrito en: ${CSV_PATH})`);
  }

  console.log(
    "\n" +
      "⚠️⚠️⚠️  ATENCIÓN — ese CSV tiene contraseñas en texto plano.  ⚠️⚠️⚠️\n" +
      "NO SE COMMITEA. Está cubierto por .gitignore (credenciales-*.csv).\n" +
      "Compartilo por un canal seguro y borralo del repo local cuando termines.\n",
  );
}

main()
  .catch((err) => {
    console.error("[seed-usuarios-traveloz] FALLÓ:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
