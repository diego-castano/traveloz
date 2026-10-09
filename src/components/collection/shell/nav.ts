// Módulos de Collection. Los que no tienen href todavía muestran "Pronto".
import {
  BookOpen,
  Compass,
  Handshake,
  House,
  Images,
  Inbox,
  MapPinned,
  MessageCircleQuestion,
  PanelsTopLeft,
  Quote,
  Settings2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface ModuloNav {
  id: string;
  label: string;
  icono: LucideIcon;
  href?: string;
  soloSuperAdmin?: boolean;
}

export const GRUPOS_NAV: { titulo: string | null; modulos: ModuloNav[] }[] = [
  { titulo: null, modulos: [{ id: "inicio", label: "Inicio", icono: House, href: "/backend/collection" }] },
  {
    titulo: "Contenido",
    modulos: [
      { id: "experiencias", label: "Experiencias", icono: Compass },
      { id: "destinos", label: "Destinos", icono: MapPinned },
      { id: "biblioteca", label: "Biblioteca", icono: Images, href: "/backend/collection/biblioteca" },
      { id: "especialistas", label: "Especialistas", icono: UserRound },
      { id: "aliados", label: "Aliados", icono: Handshake },
      { id: "testimonios", label: "Testimonios", icono: Quote },
      { id: "preguntas", label: "Preguntas", icono: MessageCircleQuestion },
      { id: "journal", label: "Journal", icono: BookOpen },
      { id: "paginas", label: "Páginas", icono: PanelsTopLeft },
    ],
  },
  {
    titulo: "Gestión",
    modulos: [
      { id: "consultas", label: "Consultas", icono: Inbox },
      { id: "equipo", label: "Equipo", icono: Users, href: "/backend/collection/equipo", soloSuperAdmin: true },
      { id: "ajustes", label: "Ajustes", icono: Settings2 },
    ],
  },
];

export const MODULOS = GRUPOS_NAV.flatMap((g) => g.modulos);

/** El módulo activo es el de href más largo que prefija la ruta. */
export function moduloActivo(pathname: string): ModuloNav | undefined {
  return MODULOS.filter((m) => m.href && (pathname === m.href || pathname.startsWith(m.href + "/")))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];
}
