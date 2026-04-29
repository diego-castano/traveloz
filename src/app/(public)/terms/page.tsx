// ---------------------------------------------------------------------------
// /terms (Términos y condiciones) -- 1:1 port of html_inicial/terms.html.
//
// Banner section + collapsible accordion (Bootstrap classes preserved). The
// 13 sections live as an array fed into <AccordionStatic>; in Fase 4 the
// AccordionStatic component itself swaps to Radix without changing this page.
// ---------------------------------------------------------------------------

import { AccordionStatic, type AccordionItem } from "@/components/public/AccordionStatic";

export const metadata = {
  title: "Términos y condiciones | TravelOz",
  description:
    "Términos y condiciones de compra de TravelOz. Información sobre contratación de servicios, pagos, cancelaciones y responsabilidades.",
};

const TERMS: AccordionItem[] = [
  {
    id: "identificacion",
    title: "Identificación de la agencia",
    bodyHtml: `<p>TravelOz Uruguay (en adelante, la "Agencia"), con razón social Jaderito S.A. con domicilio en Luis Alberto de Herrera 1343 oficina 301 es una agencia de viajes minorista, debidamente registrada ante el Ministerio de Turismo de la República Oriental del Uruguay, que ofrece a sus clientes la contratación de servicios turísticos tales como pasajes aéreos, alojamiento, traslados, alquiler de vehículos, seguros de viaje, excursiones, paquetes turísticos y otros servicios relacionados, a través de sus oficinas comerciales, su sitio web <a href="https://traveloz.com.uy/" target="_blank" rel="noopener noreferrer">https://traveloz.com.uy/</a></p>`,
  },
  {
    id: "aceptacion",
    title: "Aceptación de los términos",
    bodyHtml: `<p>La solicitud de reservas y/o contratación de cualquier servicio turístico implica la aceptación plena y sin reservas de los presentes Términos y Condiciones.</p><p>En caso de no aceptar los mismos, el Cliente deberá abstenerse de contratar los servicios ofrecidos por la Agencia.</p><p>A los efectos del presente documento, se entiende por "Cliente" a toda persona con derecho a recibir los servicios turísticos contratados, independientemente de quién realice la gestión o el pago de los mismos.</p>`,
  },
  {
    id: "procedimiento",
    title: "Procedimiento de contratación",
    bodyHtml: `<p>Una vez seleccionado el servicio turístico, el Cliente deberá realizar una solicitud de reserva proporcionando los datos requeridos y el medio de pago indicado.</p><p>Las solicitudes realizadas a través del sitio web y/o aplicación no implican confirmación automática, y serán procesadas por personal de la Agencia dentro de su horario hábil de atención.</p><p>La Agencia transmitirá la solicitud al proveedor correspondiente (compañía aérea, hotel, operador, etc.), quien confirmará o rechazará la disponibilidad y condiciones del servicio. Hasta tanto se reciba el pago total y, en consecuencia, se emitan los pasajes y/o vouchers; el precio, la disponibilidad de lugares y las condiciones no están garantizados.</p><p>Los importes abonados antes de la confirmación se consideran pagos en concepto de reserva.</p>`,
  },
  {
    id: "precios",
    title: "Precios, pagos y medios de pago",
    bodyHtml: `<p>Los precios están sujetos a disponibilidad, modificaciones tarifarias, variaciones en el tipo de cambio, impuestos y condiciones impuestas por los proveedores hasta la confirmación definitiva del servicio.</p><p>Los medios de pago aceptados serán los informados por la Agencia. El pago se considerará efectuado únicamente cuando el importe sea efectivamente recibido por la Agencia.</p><p>Los cargos o gastos derivados del medio de pago utilizado serán asumidos exclusivamente por el Cliente.</p><p>El Cliente autoriza expresamente a la Agencia y a los proveedores a debitar los importes correspondientes del medio de pago indicado.</p>`,
  },
  {
    id: "cancelaciones",
    title: "Cancelaciones, modificaciones y reembolsos",
    bodyHtml: `<p>Las cancelaciones, modificaciones y reembolsos se rigen por las políticas específicas de cada proveedor de servicios.</p><p>Las penalidades pueden incluir desde cargos mínimos hasta la pérdida total del importe abonado, situación que el Cliente declara conocer y aceptar.</p><p>En caso de corresponder algún reintegro, la Agencia podrá retener los gastos administrativos y operativos por la gestión realizada.</p>`,
  },
  {
    id: "intermediacion",
    title: "Condición de intermediación y responsabilidad",
    bodyHtml: `<p>La Agencia actúa exclusivamente como intermediaria entre el Cliente y los proveedores de los servicios turísticos.</p><p>La prestación efectiva de los servicios es responsabilidad exclusiva de dichos proveedores.</p><p>La Agencia no será responsable por:</p><ul><li>Cambios de horarios, itinerarios o condiciones</li><li>Cancelaciones o demoras</li><li>Incumplimientos totales o parciales de los proveedores</li><li>Daños, pérdidas, accidentes, lesiones o perjuicios de cualquier naturaleza</li><li>Casos fortuitos o de fuerza mayor (clima, huelgas, conflictos, disposiciones gubernamentales, etc.)</li></ul>`,
  },
  {
    id: "aereos",
    title: "Pasajes aéreos",
    bodyHtml: `<p>La compra de pasajes aéreos implica la celebración de un contrato directo entre el Cliente y la compañía aérea, aceptando sus términos y condiciones, políticas de equipaje, cambios, cancelaciones y reembolsos.</p><p>Una vez emitidos los pasajes, cualquier modificación o cancelación estará sujeta a penalidades y a las condiciones de la aerolínea, pudiendo implicar la pérdida total del importe abonado.</p>`,
  },
  {
    id: "alojamiento",
    title: "Alojamiento",
    bodyHtml: `<p>La contratación de alojamiento implica la aceptación de las condiciones del establecimiento hotelero, incluyendo horarios de ingreso y egreso, políticas de cancelación y servicios incluidos.</p><p>La Agencia no garantiza características, categoría, estado, ni servicios distintos a los informados por el proveedor.</p>`,
  },
  {
    id: "otros",
    title: "Otros servicios turísticos",
    bodyHtml: `<p>Para traslados, alquiler de vehículos, seguros de viaje, excursiones u otros servicios, el Cliente celebra contrato directo con el prestador correspondiente, aceptando sus condiciones específicas.</p>`,
  },
  {
    id: "documentacion",
    title: "Documentación personal y requisitos de viaje",
    bodyHtml: `<p>Es responsabilidad exclusiva del Cliente contar con la documentación necesaria, en condiciones y vigente para viajar (pasaporte, visas, permisos, certificados sanitarios, seguros, etc.), así como cumplir con los requisitos migratorios, aduaneros y sanitarios del país de destino.</p><p>La Agencia no será responsable por la denegación de embarque o ingreso a un país ni por los perjuicios derivados de la falta de documentación.</p>`,
  },
  {
    id: "seguro",
    title: "Seguro de viaje",
    bodyHtml: `<p>Se recomienda enfáticamente la contratación de un seguro de viaje adecuado al destino y duración del viaje.</p>`,
  },
  {
    id: "propiedad",
    title: "Propiedad intelectual",
    bodyHtml: `<p>Todos los contenidos del sitio web y/o aplicación (textos, imágenes, marcas, logotipos, diseños) son propiedad de la Agencia o de terceros autorizantes y se encuentran protegidos por la legislación vigente.</p><p>Queda prohibida su reproducción o utilización sin autorización expresa.</p>`,
  },
  {
    id: "modificaciones",
    title: "Modificaciones",
    bodyHtml: `<p>La Agencia se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento. Serán aplicables aquellos vigentes al momento de la solicitud de la reserva.</p>`,
  },
  {
    id: "aceptacion-final",
    title: "Aceptación",
    bodyHtml: `<p>El Cliente declara haber leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones, quedando dicha aceptación confirmada al solicitar la reserva o contratar los servicios turísticos.</p>`,
  },
];

export default function TermsPage() {
  return (
    <>
      <section className="terms-banner-area">
        <img
          className="bg_image d-md-none"
          src="/site/img/faq-mobile-banner.png"
          alt=""
        />
        <div className="container">
          <img
            src="/site/img/terms-banner.webp"
            alt=""
            className="terms_bg_img d-none d-md-block"
          />
          <img
            src="/site/img/terms-mobile-banner.png"
            alt=""
            className="terms_bg_img d-md-none"
          />
          <div className="row align-items-lg-center">
            <div className="col-lg-10 col-10">
              <div className="banner-text text_white">
                <h1 className="h1 text_white">
                  <strong>Términos y condiciones de compra</strong>
                </h1>
                <div className="inner-text">
                  <p>
                    Todo lo que necesitás saber acerca de las contrataciones de
                    tus servicios
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-area">
        <div className="container smalls">
          <AccordionStatic parentId="terms-accordion" items={TERMS} />
        </div>
      </section>
    </>
  );
}
