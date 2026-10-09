"use client";

// Equipo dentro del shell con miembros en memoria. Guardar espera un rato y
// responde bien (o mal con ?falla=1); no toca la base.

import type { MiembroCollection } from "@/actions/collection/equipo.actions";
import type { PermisoCollection } from "@/lib/collection/permisos";
import type { InfoPermiso } from "@/components/collection/equipo/Equipo";
import { Equipo } from "@/components/collection/equipo/Equipo";
import { DevShell } from "../DevShell";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function miembro(id: string, name: string, role: string, superAdmin: boolean, permisos: PermisoCollection[]): MiembroCollection {
  return {
    id,
    name,
    email: `${name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@traveloz.com.uy`,
    role,
    fotoUrl: null,
    superAdmin,
    permisos,
    conFila: superAdmin || permisos.length > 0,
  };
}

// Copia de PERMISOS_INFO: lib/collection/permisos importa prisma y no entra al navegador.
const PERMISOS: InfoPermiso[] = [
  { id: "panel", label: "Entrar al panel", descripcion: "Abre Collection y ve el inicio y la biblioteca. Hace falta para todo lo demás." },
  { id: "experiencias.editar", label: "Editar experiencias", descripcion: "Crea y modifica experiencias y destinos, sin publicarlos." },
  { id: "experiencias.publicar", label: "Publicar experiencias", descripcion: "Publica, pausa y archiva experiencias en el sitio." },
  { id: "sitio.editar", label: "Editar el sitio", descripcion: "Cambia páginas, aliados, testimonios, preguntas, journal y ajustes." },
  { id: "medios.editar", label: "Gestionar medios", descripcion: "Sube, edita y elimina fotos y videos de la biblioteca." },
  { id: "consultas.ver", label: "Ver consultas", descripcion: "Lee las consultas que llegan desde el sitio de Collection." },
];

const MIEMBROS: MiembroCollection[] = [
  miembro("dev", "Diego Castaño", "ADMIN", true, []),
  miembro("u2", "Agustina Pereira", "MARKETING", false, ["panel", "experiencias.editar", "medios.editar"]),
  miembro("u3", "Lucía Fernández", "VENDEDOR", false, ["panel", "consultas.ver"]),
  miembro("u4", "Martín Sosa", "VENDEDOR", false, ["panel"]),
  miembro("u5", "Gerónimo Ruiz", "ADMIN", false, []),
];

export function EquipoDemo({ falla }: { falla: boolean }) {
  return (
    <DevShell lectura={false} ruta="/backend/collection/equipo">
      <Equipo
        inicial={MIEMBROS}
        permisos={PERMISOS}
        guardarPermisos={async () => {
          await esperar(500);
          return falla ? { ok: false as const, error: "No autorizado. Debe iniciar sesion." } : { ok: true as const, data: null };
        }}
      />
    </DevShell>
  );
}
