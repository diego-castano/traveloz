// ---------------------------------------------------------------------------
// Fix puntual: sincroniza el contenido de los FaqTopic de la DB con el texto
// COMPLETO de html_inicial/faq.html (ver prisma/faq-topics.ts).
//
// Necesario porque seed-fase9 cargó versiones truncadas y su upsert usaba
// update:{}, así que las filas existentes nunca se actualizaron. Es idempotente
// (solo hace update/create por slug) y NO toca ninguna otra tabla.
//
// Correr con: npx tsx prisma/fix-faq-textos.ts
// Usa el DATABASE_URL del entorno (.env.local → Railway).
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { FAQ_TOPICS } from "./faq-topics";

const prisma = new PrismaClient();

async function main() {
  for (const t of FAQ_TOPICS) {
    const before = await prisma.faqTopic.findUnique({ where: { slug: t.slug } });
    await prisma.faqTopic.upsert({
      where: { slug: t.slug },
      update: { label: t.label, iconUrl: t.iconUrl, bodyHtml: t.bodyHtml, orden: t.orden },
      create: t,
    });
    const action = before ? "actualizado" : "creado";
    const oldLen = before?.bodyHtml.length ?? 0;
    console.log(
      `✔ ${t.slug.padEnd(14)} ${action}  (${oldLen} → ${t.bodyHtml.length} chars)`,
    );
  }
  console.log(`\n${FAQ_TOPICS.length} FaqTopic sincronizados con el texto completo.`);
}

main()
  .catch((e) => {
    console.error("✖ Error sincronizando FAQ:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
