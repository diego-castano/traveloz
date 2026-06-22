import { SettingsForm } from "../_components/SettingsForm";

export default function WebNotificacionesPage() {
  return (
    <SettingsForm
      group="notificaciones"
      title="Notificaciones de leads"
      blurb="Email(es) que reciben los formularios del sitio: Contacto, Corporativo, Trabajá con nosotros y Cotización. Separá varias casillas con comas. Los leads del cotizador por marca se configuran aparte, en cada cotizador."
    />
  );
}
