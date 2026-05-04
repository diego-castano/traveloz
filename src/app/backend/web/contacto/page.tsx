import { SettingsForm } from "../_components/SettingsForm";

export default function WebContactoPage() {
  return (
    <SettingsForm
      group="contacto"
      title="Página de Contacto"
      blurb="Datos de contacto (email, teléfono, WhatsApp, dirección, mapa) que aparecen en /contact."
      publicHref="/contact"
    />
  );
}
