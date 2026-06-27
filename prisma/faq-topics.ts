// ---------------------------------------------------------------------------
// FAQ topics — fuente de verdad del contenido de /faq.
// Copiado COMPLETO de html_inicial/faq.html (las 6 pestañas del panel
// desktop, que traen el texto íntegro). Lo consume:
//   - prisma/seed-fase9.ts        → carga inicial en DB nueva
//   - prisma/fix-faq-textos.ts    → sincroniza el contenido en una DB existente
// Si hay que editar un texto del FAQ, hacerlo acá (o desde /backend/web/faq).
// ---------------------------------------------------------------------------

export interface FaqTopicSeed {
  slug: string;
  label: string;
  iconUrl: string;
  bodyHtml: string;
  orden: number;
}

export const FAQ_TOPICS: FaqTopicSeed[] = [
  {
    slug: "documentacion",
    label: "Documentación",
    iconUrl: "/site/img/faq-icon-1-blue.webp",
    bodyHtml: `<h2>Documentación</h2><p>El pasajero es responsable de contar con la documentación adecuada y vigente para su viaje. A continuación, detallamos los aspectos fundamentales que deben ser considerados antes de la salida:</p><h3>Verificación de Datos Personales</h3><p>Es indispensable que los <strong>nombres, apellidos, número de documento y demás datos personales</strong> coincidan exactamente con los que figuran en el documento de identidad (cédula o pasaporte) que se utilizará para viajar. Inconsistencias pueden resultar en la invalidez del pasaje, sin posibilidad de reembolso.</p><h3>Confirmación del Itinerario</h3><p>Revise cuidadosamente que los destinos, fechas, horarios y escalas coincidan con lo solicitado. Tenga en cuenta que modificaciones posteriores pueden generar costos adicionales significativos, en algunos casos superiores al valor original del pasaje.</p><h3>Condiciones del Documento de Viaje</h3><p>El documento de identidad debe cumplir con los siguientes requisitos:</p><ul><li>Vigencia mínima de seis (6) meses a partir de la fecha de regreso.</li><li>Legibilidad total.</li><li>Buen estado físico.</li><li>Fotografía actual y claramente reconocible.</li></ul><h3>Requisitos por Región</h3><ul><li><strong>Estados Parte y Asociados del MERCOSUR</strong> (Brasil, Argentina, Paraguay, Bolivia, Chile, Colombia, Ecuador, Perú y Venezuela): Se permite el ingreso únicamente con cédula de identidad vigente.</li><li><strong>Importante:</strong> Si su itinerario incluye escalas en países fuera del MERCOSUR, será obligatorio viajar con pasaporte vigente, aun cuando el destino final esté dentro del bloque.</li><li><strong>Resto del mundo:</strong> El ingreso está sujeto a la presentación de pasaporte válido y, en algunos casos, visado. Consulte los requisitos específicos de cada país con la debida antelación.</li></ul><h3>Recomendación Adicional</h3><p>Sugerimos conservar copias digitales de todos sus documentos (pasaporte, cédula, visas, tarjetas de crédito, entre otros) en su correo electrónico y dispositivo móvil. Esta práctica puede ser de gran utilidad en caso de pérdida o robo.</p>`,
    orden: 1,
  },
  {
    slug: "menores",
    label: "Menores de edad",
    iconUrl: "/site/img/faq-icon-2.webp",
    bodyHtml: `<h2>Menores de edad</h2><p>Todo menor de edad con nacionalidad uruguaya o extranjera, y con residencia habitual en Uruguay, requiere una autorización expresa de sus padres o representantes legales para salir del país cuando viaja acompañado por sólo uno de ellos o sin la compañía de ambos.</p><h3>¿Quiénes deben gestionarlo?</h3><p>Según la normativa vigente, deben tramitar este permiso:</p><ul><li>Menores de nacionalidad uruguaya.</li><li>Menores extranjeros con residencia legal o en trámite.</li><li>Menores extranjeros que, sin tener residencia formal, demuestren haber vivido en Uruguay por más de un año.</li></ul><p>Este permiso será necesario cuando el menor viaje con cédula de identidad y no cuente con pasaporte vigente. Para iniciar el trámite y conocer los requisitos específicos, puede consultar el portal oficial: <a href="https://www.gub.uy/tramites/permiso-menor-edad" target="_blank" rel="noopener">Permiso de menor de edad - gub.uy</a></p><h3>Consideraciones Especiales</h3><ul><li><strong>Destinos con requisitos adicionales:</strong> Algunos países, como Chile, exigen documentación complementaria como la partida de nacimiento, incluso si el menor viaja con pasaporte. Se recomienda consultar previamente con los consulados o embajadas de los países de destino.</li><li><strong>Menores con pasaporte extranjero:</strong> Si el menor viaja con pasaporte extranjero (por ejemplo, español o italiano) pero reside en Uruguay, la Dirección Nacional de Migración podrá requerir, además, la partida de nacimiento al momento de la salida del país.</li></ul>`,
    orden: 2,
  },
  {
    slug: "visados",
    label: "Visados",
    iconUrl: "/site/img/faq-icon-3.webp",
    bodyHtml: `<h2>Visados</h2><p>Al planificar su viaje, es fundamental verificar los requisitos migratorios de todos los países incluidos en el itinerario, incluyendo aquellos en los que se realicen escalas, incluso si estas son únicamente en tránsito.</p><p>Las visas pueden ser requeridas tanto en el país de destino como en países de tránsito. La falta de una visa adecuada puede resultar en la denegación del embarque, cancelaciones de último momento o la invalidación total del viaje.</p><h3>¿Qué verificar?</h3><p>Se recomienda consultar directamente con las representaciones diplomáticas o consulares de los países a visitar para obtener información actualizada sobre:</p><ul><li>Requisitos de visado.</li><li>Tiempo de estadía permitido.</li><li>Documentación adicional (cartas de invitación, reserva de hotel, seguro de viaje, prueba de solvencia económica, entre otros).</li></ul><p>Puede acceder a la información de contacto de embajadas y consulados extranjeros en: <a href="https://mapaconsular.mrree.gub.uy/" target="_blank" rel="noopener">Embajadas y Consulados Extranjeros - gub.uy</a></p><h3>Recomendación Adicional</h3><p>Se sugiere identificar previamente la representación diplomática o consular uruguaya más cercana al destino de viaje, para contar con asistencia en caso de emergencia.</p>`,
    orden: 3,
  },
  {
    slug: "sanitarios",
    label: "Requisitos Sanitarios",
    iconUrl: "/site/img/faq-icon-4.webp",
    bodyHtml: `<h2>Requisitos Sanitarios</h2><p>Algunos países exigen la presentación de certificados de vacunación específicos como condición de ingreso. Esto aplica tanto para el destino final como para escalas en tránsito.</p><h3>Vacunas y salud</h3><p>Las exigencias sanitarias pueden variar, por lo que se recomienda:</p><ul><li>Verificar las recomendaciones de vacunación internacionales emitidas por la OMS.</li><li>Consultar con las autoridades sanitarias nacionales o su médico de cabecera.</li><li>Contactar a las embajadas o consulados correspondientes para conocer los requisitos específicos de entrada.</li></ul><h3>Recomendación Adicional</h3><p>Se sugiere identificar previamente la representación diplomática o consular uruguaya más cercana al destino de viaje, para contar con asistencia en caso de emergencia.</p>`,
    orden: 4,
  },
  {
    slug: "mascotas",
    label: "Mascotas",
    iconUrl: "/site/img/faq-icon-5.webp",
    bodyHtml: `<h2>Mascotas</h2><p>Si tiene previsto viajar con su mascota, le recomendamos gestionar con antelación todos los requisitos necesarios, ya que estos pueden variar según el medio de transporte, el país de destino y las características del animal.</p><h3>Consideraciones Generales</h3><ul><li>Las condiciones para el transporte de mascotas varían según la aerolínea, naviera o empresa de transporte terrestre.</li><li>Factores como el tipo de mascota, raza, tamaño y si viajará en cabina o en bodega, pueden influir en las restricciones o autorizaciones.</li><li>Algunas compañías imponen límites en la cantidad de mascotas permitidas por pasajero y todas las solicitudes están sujetas a disponibilidad y aprobación previa.</li></ul><h3>Documentación Requerida</h3><p>Es obligatorio contar con el <strong>Certificado Veterinario Internacional (CVI)</strong> emitido por el Ministerio de Ganadería, Agricultura y Pesca (MGAP) para la salida de mascotas desde Uruguay. Puede iniciar el trámite en: <a href="https://www.gub.uy/tramites/solicitud-egreso-mascotas-uruguay" target="_blank" rel="noopener">Solicitud de egreso de mascotas - gub.uy</a></p><h3>Contenedor / Canil</h3><p>El contenedor (canil) debe cumplir con los estándares exigidos por la compañía transportadora en cuanto a dimensiones, ventilación, seguridad y comodidad del animal. Las medidas específicas pueden variar entre compañías y medios de transporte, por lo que es indispensable verificar las condiciones previamente.</p><h3>Importante</h3><p>El transporte de mascotas implica cargos adicionales que no están incluidos en la tarifa del pasaje. Recomendamos confirmar disponibilidad y requisitos antes de emitir su pasaje, para evitar inconvenientes o restricciones de último momento.</p>`,
    orden: 5,
  },
  {
    slug: "embarazadas",
    label: "Embarazadas",
    iconUrl: "/site/img/faq-icon-6.webp",
    bodyHtml: `<h2>Mujeres Embarazadas</h2><p>Las condiciones para viajar durante el embarazo pueden variar según la aerolínea u otro medio de transporte. Por ello, es fundamental consultar con anticipación para asegurar el cumplimiento de los requisitos y evitar contratiempos al momento del embarque.</p><h3>Consideraciones Generales</h3><ul><li><strong>Hasta la semana 28</strong> de embarazo, las pasajeras generalmente pueden viajar sin restricciones, siempre que se encuentren en buen estado de salud.</li><li><strong>A partir de la semana 28 y hasta la semana 36,</strong> se requerirá la presentación de un certificado médico emitido por el ginecólogo o profesional tratante, que indique la aptitud para viajar y la ausencia de complicaciones.</li><li><strong>Desde la semana 36</strong> de embarazo (o la semana 32 en embarazos múltiples sin complicaciones), la Asociación Internacional de Transporte Aéreo (IATA) no recomienda viajar en avión.</li></ul><h3>Recomendaciones</h3><p>Cada aerolínea puede tener políticas específicas en cuanto a viajes durante el embarazo (inclusive con respecto a certificados, formularios médicos o autorizaciones especiales). Le sugerimos consultar con su asesor de viajes al momento de planificar el itinerario, para verificar los requisitos de la compañía transportadora y asegurar un viaje sin inconvenientes.</p>`,
    orden: 6,
  },
];
