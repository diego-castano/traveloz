import { SettingsForm } from "../_components/SettingsForm";
import { ComingSoonToggle } from "../_components/ComingSoonToggle";
import { getSetting } from "@/actions/site-settings.actions";

export default async function WebGeneralPage() {
  // Estado actual del Coming Soon (ausente → activo, el sitio arranca en
  // "Próximamente"). Lo leemos por key, sin requerir rol — el write sí exige
  // admin dentro de setComingSoon.
  const cs = await getSetting("coming_soon_activo");
  const comingSoon = cs ? cs.value !== "false" : true;

  return (
    <>
      <div className="mx-auto max-w-3xl px-8 pt-8">
        <ComingSoonToggle initial={comingSoon} />
      </div>
      <SettingsForm
        group="general"
        title="Datos generales"
        blurb="WhatsApp, email, teléfono, dirección y horario que aparecen en footer y header."
        excludeKeys={["coming_soon_activo"]}
      />
    </>
  );
}
