// Inicio de Collection: junta los datos y los pasa a <Inicio>, que también
// usa la ruta de desarrollo (/dev/collection/inicio) con datos de mentira.

import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { listarMedios } from "@/actions/collection/medios.actions";
import { listarExperiencias } from "@/actions/collection/experiencias.actions";
import { contarConsultasNuevas } from "@/actions/collection/consultas-admin.actions";
import { getMiAccesoCollection } from "@/actions/collection/equipo.actions";
import { Inicio } from "@/components/collection/inicio/Inicio";

const ZONA = "America/Montevideo";

function saludo() {
  const hora = Number(
    new Intl.DateTimeFormat("es-UY", { hour: "numeric", hourCycle: "h23", timeZone: ZONA }).format(new Date()),
  );
  if (hora >= 5 && hora < 12) return "Buen día";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function InicioCollection() {
  const [session, acceso, recientes, experiencias, nuevas] = await Promise.all([
    auth(),
    getMiAccesoCollection(),
    listarMedios({ take: 8 }),
    listarExperiencias(),
    contarConsultasNuevas(),
  ]);
  // El layout ya validó el acceso; los conteos son lecturas simples que no
  // tienen action propia todavía.
  const [totalMedios, sinAlt, destinos] = acceso
    ? await Promise.all([
        prisma.colMedio.count(),
        prisma.colMedio.count({ where: { tipo: "FOTO", alt: "" } }),
        prisma.colDestino.count({ where: { estado: { not: "ARCHIVADO" } } }),
      ])
    : [0, 0, 0];

  return (
    <Inicio
      d={{
        saludo: saludo(),
        nombre: (session?.user?.name ?? "").trim().split(/\s+/)[0] ?? "",
        fecha: new Intl.DateTimeFormat("es-UY", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA }).format(new Date()),
        // Sin permiso para ver consultas, la tarjeta no aparece.
        consultasNuevas: nuevas.ok ? nuevas.data : null,
        experiencias: experiencias.ok ? experiencias.data : [],
        destinos,
        medios: { total: totalMedios, sinDescripcion: sinAlt, ultimos: recientes.ok ? recientes.data.items : { error: recientes.error } },
      }}
    />
  );
}
