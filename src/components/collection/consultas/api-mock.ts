"use client";

// Adaptador de prueba del panel de consultas: todo en memoria, con demora
// falsa. Solo para /dev/collection/consultas.

import type { ConsultaFila } from "@/actions/collection/consultas-admin.actions";
import type { ApiConsultas, DetalleConsulta, Suscriptor } from "./api";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.5));
const hace = (min: number) => new Date(Date.now() - min * 60_000);

type Semilla = Partial<DetalleConsulta> & Pick<DetalleConsulta, "nombre" | "email">;

const EXPS = {
  japon: { id: "exp-japon", slug: "japon-en-otono", titulo: "Japón en otoño: Kioto, Nara y Tokio" },
  filipinas: { id: "exp-filipinas", slug: "filipinas-manila-el-nido-boracay", titulo: "Filipinas: Manila, El Nido y Boracay" },
  patagonia: { id: "exp-patagonia", slug: "patagonia-glaciares-y-estancias", titulo: "Patagonia: glaciares y estancias" },
};
const ESPS = {
  lucia: { id: "esp-lucia", nombre: "Lucía Ferrer", email: "lucia.ferrer@traveloz.com.uy", whatsapp: "+59899412873" },
  martin: { id: "esp-martin", nombre: "Martín Abella", email: "martin.abella@traveloz.com.uy", whatsapp: "+59898117604" },
};

const SEMILLAS: (Semilla & { min: number })[] = [
  {
    min: 7,
    nombre: "Florencia Techera",
    email: "flor.techera@gmail.com",
    telefono: "99 318 442",
    paisCodigo: "+598",
    experiencia: EXPS.japon,
    especialista: ESPS.lucia,
    ocasion: "Aniversario",
    fechaTipo: "rango",
    fechaDesde: new Date("2027-03-12T00:00:00Z"),
    fechaHasta: new Date("2027-03-23T00:00:00Z"),
    noches: 11,
    canal: "whatsapp",
    inversion: "USD 8.000 a 12.000",
    comentarios: "Cumplimos 10 años. Nos gustaría un ryokan con onsen privado y algún día sin plan.",
    aceptaNovedades: true,
    pauta: "Meta Ads · japon-otono-2027 (primer contacto: Instagram)",
    origenUrl: "https://collection.traveloz.com.uy/experiencias/japon-en-otono?utm_source=instagram",
    crmEstado: "OK",
    crmDealId: "48213",
    crmModo: "nuevo",
    crmEnviadoEn: hace(6),
    crmIntentos: 1,
    avisoEnviado: true,
    confirmacionEnviada: true,
  },
  {
    min: 52,
    nombre: "Joaquín Rodríguez Bentancor",
    email: "jrodriguez@estudiorb.com.uy",
    telefono: "94 220 915",
    paisCodigo: "+598",
    tipo: "contacto",
    ocasion: "Familia",
    destinos: ["Patagonia", "Islandia"],
    estilo: "Naturaleza, Aventura suave",
    fechaTipo: "mes",
    mesAproximado: "Enero 2027",
    noches: 14,
    adultos: 2,
    ninos: 2,
    edadesNinos: [8, 11],
    canal: "llamada",
    comentarios: "",
    crmEstado: "ERROR",
    crmError: "Bitrix respondió 503 (servicio no disponible).",
    crmIntentos: 2,
    avisoEnviado: true,
    confirmacionEnviada: true,
  },
  {
    min: 60 * 5,
    nombre: "Valentina Silva",
    email: "vale.silva@outlook.com",
    telefono: "11 5482 3307",
    paisCodigo: "+54",
    experiencia: EXPS.filipinas,
    especialista: ESPS.martin,
    ocasion: "Luna de miel",
    fechaTipo: "",
    canal: "email",
    estado: "EN_CURSO",
    notaInterna: "Le mandé dos opciones de hotel en El Nido. Espera respuesta del novio.",
    crmEstado: "OK",
    crmDealId: "48190",
    crmModo: "comentario",
    crmEnviadoEn: hace(60 * 5),
    crmIntentos: 1,
    avisoEnviado: true,
    confirmacionEnviada: false,
  },
  {
    min: 60 * 30,
    nombre: "Martín Olivera",
    email: "molivera@gmail.com",
    telefono: "98 771 054",
    paisCodigo: "+598",
    experiencia: EXPS.patagonia,
    especialista: ESPS.lucia,
    ocasion: "Amigos",
    adultos: 6,
    canal: "whatsapp",
    estado: "CERRADA",
    crmEstado: "OK",
    crmDealId: "48011",
    crmModo: "nuevo",
    crmEnviadoEn: hace(60 * 30),
    crmIntentos: 1,
    avisoEnviado: true,
    confirmacionEnviada: true,
  },
  {
    min: 60 * 24 * 6,
    nombre: "Camila Duarte",
    email: "cami.duarte@gmail.com",
    telefono: "",
    tipo: "contacto",
    destinos: ["Grecia"],
    canal: "email",
    estado: "DESCARTADA",
    notaInterna: "Buscaba solo aéreo. Derivada a Traveloz.",
    crmEstado: null,
    avisoEnviado: false,
    confirmacionEnviada: true,
  },
];

function armar(s: Semilla & { min: number }, i: number): DetalleConsulta {
  const numero = 412 - i;
  const { min, ...resto } = s;
  return {
    id: `c${i + 1}`,
    numero,
    numeroTexto: `TC-${String(numero).padStart(4, "0")}`,
    tipo: s.experiencia ? "experiencia" : "contacto",
    experienciaId: s.experiencia?.id ?? null,
    especialistaId: s.especialista?.id ?? null,
    telefono: "",
    paisCodigo: null,
    ocasion: "",
    destinos: [],
    estilo: "",
    fechaTipo: "",
    fechaDesde: null,
    fechaHasta: null,
    mesAproximado: "",
    noches: null,
    adultos: 2,
    ninos: 0,
    edadesNinos: [],
    inversion: "",
    canal: "email",
    comentarios: "",
    aceptaNovedades: false,
    origenUrl: "https://collection.traveloz.com.uy/contacto",
    visitanteId: null,
    estado: "NUEVA",
    notaInterna: "",
    crmEstado: null,
    crmDealId: null,
    crmContactId: null,
    crmModo: null,
    crmError: null,
    crmEnviadoEn: null,
    crmIntentos: 0,
    avisoEnviado: false,
    confirmacionEnviada: false,
    createdAt: hace(min),
    updatedAt: hace(min),
    experiencia: null,
    especialista: null,
    pauta: null,
    ...resto,
  } as DetalleConsulta;
}

const SUSCRIPTORES: Suscriptor[] = [
  ["ana.laura.pintos@gmail.com", "CONFIRMADO", "newsletter /", 3],
  ["flor.techera@gmail.com", "PENDIENTE", "consulta", 0],
  ["sebastian.ferreira@adinet.com.uy", "CONFIRMADO", "newsletter /nosotros", 11],
  ["lmendez@vera.com.uy", "BAJA", "newsletter /", 40],
  ["paula.correa@hotmail.com", "CONFIRMADO", "consulta", 18],
].map(([email, estado, origen, dias], i) => ({
  id: `s${i}`,
  email: email as string,
  estado: estado as string,
  origen: origen as string,
  createdAt: hace((dias as number) * 1440 + 30).toISOString(),
  confirmadoEn: estado === "PENDIENTE" ? null : hace((dias as number) * 1440).toISOString(),
}));

export function crearApiConsultasMock(): {
  api: ApiConsultas;
  inicial: { items: ConsultaFila[]; siguiente: null };
  nuevas: () => number;
} {
  const datos = SEMILLAS.map(armar);
  const fila = (c: DetalleConsulta): ConsultaFila => ({
    id: c.id,
    numero: c.numeroTexto,
    fecha: c.createdAt.toISOString(),
    nombre: c.nombre,
    email: c.email,
    telefono: [c.paisCodigo, c.telefono].filter(Boolean).join(" "),
    tipo: c.tipo,
    experiencia: c.experiencia?.titulo ?? null,
    especialista: c.especialista?.nombre ?? null,
    estado: c.estado,
    crmEstado: c.crmEstado,
    avisoEnviado: c.avisoEnviado,
  });
  const api: ApiConsultas = {
    async listar(f) {
      await esperar(250);
      const q = f?.q?.toLowerCase() ?? "";
      const items = datos
        .filter((c) => (!f?.estado || c.estado === f.estado) && (!q || `${c.nombre} ${c.email} ${c.numeroTexto}`.toLowerCase().includes(q)))
        .map(fila);
      return { ok: true, data: { items, siguiente: null } };
    },
    async obtener(id) {
      await esperar(200);
      const c = datos.find((x) => x.id === id);
      return c ? { ok: true, data: structuredClone(c) } : { ok: false, error: "La consulta no existe." };
    },
    async actualizar(id, input) {
      await esperar(300);
      const c = datos.find((x) => x.id === id);
      if (!c) return { ok: false, error: "La consulta no existe." };
      Object.assign(c, input);
      return { ok: true, data: null };
    },
    async reintentarBitrix(id) {
      await esperar(900);
      const c = datos.find((x) => x.id === id);
      if (!c) return { ok: false, error: "La consulta no existe." };
      Object.assign(c, { crmEstado: "OK", crmDealId: "48230", crmModo: "nuevo", crmError: null, crmEnviadoEn: new Date(), crmIntentos: c.crmIntentos + 1 });
      return { ok: true, data: { resultado: "OK" } };
    },
    async listarSuscriptores(f) {
      await esperar(200);
      return { ok: true, data: SUSCRIPTORES.filter((s) => !f?.estado || s.estado === f.estado) };
    },
    async exportarCsv() {
      await esperar(300);
      const filas = SUSCRIPTORES.filter((s) => s.estado === "CONFIRMADO");
      return { ok: true, data: ["email,origen,alta,confirmado", ...filas.map((s) => `"${s.email}","${s.origen}",${s.createdAt},${s.confirmadoEn}`)].join("\n") };
    },
  };
  return { api, inicial: { items: datos.map(fila), siguiente: null }, nuevas: () => datos.filter((c) => c.estado === "NUEVA").length };
}
