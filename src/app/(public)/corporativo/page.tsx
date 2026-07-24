// ---------------------------------------------------------------------------
// /corporativo — server component.
//
// Fetches everything server-side (SiteSettings group "corporativo", clientes
// corporativos, equipo de contacto) so the hero text, the "Confían en
// nosotros" logos and the team cards are in the SSR HTML. The interactive
// parts (typewriter, sliders, contact form) live in the CorporativoView
// client island.
// ---------------------------------------------------------------------------

import {
  getSiteSettings,
  getClientesCorporativos,
  getPersonasContacto,
} from "@/lib/public-data";
import { CorporativoView } from "./_components/CorporativoView";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("corporativo", { path: "/corporativo" });
}

export default async function CorporativoPage() {
  const [settings, clientes, equipo] = await Promise.all([
    getSiteSettings("corporativo"),
    getClientesCorporativos(),
    getPersonasContacto(),
  ]);

  return (
    <CorporativoView
      settings={settings}
      clientes={clientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        logoUrl: c.logoUrl,
        link: c.link,
      }))}
      equipo={equipo.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        rol: p.rol,
        email: p.email,
        photoUrl: p.photoUrl,
      }))}
    />
  );
}
