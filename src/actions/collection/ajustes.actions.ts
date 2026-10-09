"use server";

// Ajustes de Collection (WhatsApp, mails de consultas, Bitrix, redes, SEO).
// Contrato { ok, data } | { ok, error }. Sin prisma.$transaction (pgbouncer).

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import {
  CLAVES_AJUSTES,
  GRUPO_AJUSTES,
  TAG_SITIO,
  clave,
  leerAjustesSinCache,
  type AjustesCollection,
} from "@/lib/collection/ajustes";

export async function obtenerAjustesCollection(): Promise<Resultado<AjustesCollection>> {
  return ejecutar("obtenerAjustesCollection", async () => {
    await requireCollection("panel");
    return leerAjustesSinCache();
  });
}

const texto = (max: number) => z.string().trim().max(max);
const emailOk = z.string().email();

const ajustesSchema = z.object({
  whatsapp: texto(20).refine((v) => v === "" || /^\+\d{8,15}$/.test(v), "El WhatsApp va en formato +59899123456."),
  emailsConsultas: texto(500).refine(
    (v) => v === "" || v.split(",").every((e) => emailOk.safeParse(e.trim()).success),
    "Revisá los emails de consultas (separados por coma).",
  ),
  bitrixOrigen: texto(60),
  instagram: texto(300),
  facebook: texto(300),
  linkedin: texto(300),
  textoFooter: texto(600),
  seoTitulo: texto(120),
  seoDescripcion: texto(320),
  seoImagenId: texto(40),
  indexar: z.enum(["0", "1"]),
  horario: texto(120),
});

export async function guardarAjustesCollection(
  input: z.input<typeof ajustesSchema>,
): Promise<Resultado<AjustesCollection>> {
  return ejecutar("guardarAjustesCollection", async () => {
    const { userId, acceso } = await requireCollection("sitio.editar");
    const p = ajustesSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");

    const actuales = await leerAjustesSinCache();
    // "Indexar" lo decide solo un super admin: los demás no lo pueden cambiar.
    if (!acceso.superAdmin && p.data.indexar !== actuales.indexar) {
      fallar("Solo un super admin puede cambiar si el sitio se indexa.");
    }

    const emails = Array.from(
      new Set(p.data.emailsConsultas.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
    ).join(", ");
    const nuevos: AjustesCollection = { ...p.data, emailsConsultas: emails };

    const cambios: string[] = [];
    for (const k of CLAVES_AJUSTES) {
      if (nuevos[k] === actuales[k]) continue;
      cambios.push(k);
      await prisma.siteSetting.upsert({
        where: { key: clave(k) },
        update: { value: nuevos[k], group: GRUPO_AJUSTES },
        create: { key: clave(k), value: nuevos[k], group: GRUPO_AJUSTES, label: `Collection: ${k}` },
      });
    }

    if (cambios.length) {
      revalidateTag(TAG_SITIO);
      await registrarEventoCol({
        entidad: "ajustes",
        entidadId: "collection",
        accion: "guardar",
        userId,
        detalle: { campos: cambios },
      });
    }
    return nuevos;
  });
}
