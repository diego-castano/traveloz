import { SettingsForm } from "../_components/SettingsForm";

export default function WebGeneralPage() {
  return (
    <SettingsForm
      group="general"
      title="Datos generales"
      blurb="WhatsApp, email, teléfono, dirección y horario que aparecen en footer y header."
      // El modo "Próximamente" tiene su propio control arriba del módulo
      // (header de Frontend), así que no se edita acá como campo crudo.
      excludeKeys={["coming_soon_activo"]}
    />
  );
}
