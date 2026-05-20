import { SettingsForm } from "../_components/SettingsForm";

export default function WebPagosPage() {
  return (
    <SettingsForm
      group="pagos"
      title="Formas de pago"
      blurb="Logos de tarjetas y bancos que aparecen en el bloque 'Formas de pago' del detalle de cada paquete. Los logos se editan como JSON [{src, alt}]."
    />
  );
}
