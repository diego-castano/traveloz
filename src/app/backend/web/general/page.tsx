import { SettingsForm } from "../_components/SettingsForm";

export default function WebGeneralPage() {
  return (
    <SettingsForm
      group="general"
      title="Datos generales"
      blurb="WhatsApp, email, teléfono, dirección y horario que aparecen en footer y header."
    />
  );
}
