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
      { id: "experiencias", label: "Experiencias", icono: Compass, href: "/backend/collection/experiencias" },
      { id: "destinos", label: "Destinos", icono: MapPinned, href: "/backend/collection/destinos" },
      { id: "biblioteca", label: "Biblioteca", icono: Images, href: "/backend/collection/biblioteca" },
      { id: "especialistas", label: "Especialistas", icono: UserRound, href: "/backend/collection/especialistas" },
      { id: "aliados", label: "Aliados", icono: Handshake, href: "/backend/collection/aliados" },
      { id: "testimonios", label: "Testimonios", icono: Quote, href: "/backend/collection/testimonios" },
      { id: "preguntas", label: "Preguntas", icono: MessageCircleQuestion, href: "/backend/collection/preguntas" },
      { id: "journal", label: "Journal", icono: BookOpen, href: "/backend/collection/journal" },
      { id: "paginas", label: "Páginas", icono: PanelsTopLeft, href: "/backend/collection/paginas" },
    ],
  },
  {
    titulo: "Gestión",
    modulos: [
      { id: "consultas", label: "Consultas", icono: Inbox, href: "/backend/collection/consultas" },
      { id: "equipo", label: "Equipo", icono: Users, href: "/backend/collection/equipo", soloSuperAdmin: true },
      { id: "ajustes", label: "Ajustes", icono: Settings2, href: "/backend/collection/ajustes" },
    ],
  },
];

export const MODULOS = GRUPOS_NAV.flatMap((g) => g.modulos);

/** El módulo activo es el de href más largo que prefija la ruta. */
export function moduloActivo(pathname: string): ModuloNav | undefined {
  return MODULOS.filter((m) => m.href && (pathname === m.href || pathname.startsWith(m.href + "/")))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];
}
