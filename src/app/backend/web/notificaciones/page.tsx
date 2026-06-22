import { SettingsForm } from "../_components/SettingsForm";

export default function WebNotificacionesPage() {
  return (
    <SettingsForm
      group="notificaciones"
      title="Notificaciones de leads"
      blurb="Definí a qué casilla llega cada formulario del sitio. Cada uno puede tener su propio destino (por ejemplo, RRHH para “Trabajá con nosotros”). Separá varias casillas con comas; dejá un campo vacío para no notificar ese formulario. Los leads del cotizador por marca se configuran aparte, en cada cotizador."
    />
  );
}
