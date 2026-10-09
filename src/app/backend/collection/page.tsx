// Inicio de Collection: saludo, números de la biblioteca, guía de arranque y
// los últimos medios subidos.

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { listarMedios } from "@/actions/collection/medios.actions";
import { getMiAccesoCollection } from "@/actions/collection/equipo.actions";
import { Eyebrow } from "@/components/collection/ui";
import { MedioImagen, aspectoDe } from "@/components/collection/biblioteca/MedioImagen";

const ZONA = "America/Montevideo";

function saludo() {
  const hora = Number(
    new Intl.DateTimeFormat("es-UY", { hour: "numeric", hourCycle: "h23", timeZone: ZONA }).format(new Date()),
  );
  if (hora >= 5 && hora < 12) return "Buen día";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function InicioCollection() {
  const [session, acceso, recientes] = await Promise.all([
    auth(),
    getMiAccesoCollection(),
    listarMedios({ take: 8 }),
  ]);
  // El layout ya validó el acceso; los conteos son lecturas simples que no
  // tienen action propia todavía.
  const [totalMedios, sinAlt] = acceso
    ? await Promise.all([
        prisma.colMedio.count(),
        prisma.colMedio.count({ where: { tipo: "FOTO", alt: "" } }),
      ])
    : [0, 0];

  const nombre = (session?.user?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const fecha = new Intl.DateTimeFormat("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ZONA,
  }).format(new Date());

  const medios = recientes.ok ? recientes.data.items : [];

  const numeros = [
    { valor: totalMedios, label: "Medios", nota: "Fotos y videos en la biblioteca", href: "/backend/collection/biblioteca" },
    {
      valor: sinAlt,
      label: "Fotos sin alt",
      nota: sinAlt > 0 ? "Describilas para Google" : "Todas descriptas",
      href: "/backend/collection/biblioteca?filtro=sin-alt",
      alerta: sinAlt > 0,
    },
    { valor: 0, label: "Experiencias", nota: "Pronto", pronto: true },
    { valor: 0, label: "Destinos", nota: "Pronto", pronto: true },
  ];

  const pasos = [
    {
      titulo: "Subí fotos a la biblioteca",
      texto: "Arrastrá tus fotos y videos. Les sacamos el color, las medidas y los tamaños para la web.",
      href: "/backend/collection/biblioteca",
      hecho: totalMedios > 0,
    },
    { titulo: "Creá los destinos", texto: "El mosaico de lugares que ordena el sitio." },
    { titulo: "Armá tu primera experiencia", texto: "Portada, relato, recorrido y día a día, con vista previa." },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="pb-12 pt-2">
        <Eyebrow>Traveloz Collection</Eyebrow>
        <h2 className="mt-5 font-col-display text-[44px] font-light leading-[1.05] text-col-ink md:text-[60px]">
          {saludo()}
          {nombre && (
            <>
              , <em className="font-normal italic">{nombre}</em>
            </>
          )}
          .
        </h2>
        <p className="mt-3 text-[15px] capitalize text-col-slate">{fecha}</p>
      </section>

      <section aria-label="Números" className="grid grid-cols-2 border-y border-col-line lg:grid-cols-4">
        {numeros.map((n, i) => {
          const cuerpo = (
            <>
              <span
                className={`block font-col-display text-[48px] font-light leading-none ${
                  n.pronto ? "text-col-slate/40" : "text-col-ink"
                }`}
              >
                {n.valor}
              </span>
              <span className="mt-4 block text-[13px] uppercase tracking-[0.12em] text-col-ink">{n.label}</span>
              <span className={`mt-1 block text-[13px] ${n.alerta ? "text-[#B07A2A]" : "text-col-slate"}`}>
                {n.alerta && <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-col-gold align-middle" />}
                {n.nota}
              </span>
            </>
          );
          const clases = `block px-5 py-7 md:px-7 ${i % 2 === 1 ? "border-l border-col-line" : ""} ${
            i >= 2 ? "border-t border-col-line lg:border-t-0" : ""
          } ${i === 2 ? "lg:border-l" : ""}`;
          return n.href ? (
            <Link
              key={n.label}
              href={n.href}
              className={`${clases} group transition-colors duration-200 ease-col hover:bg-col-surface`}
            >
              {cuerpo}
            </Link>
          ) : (
            <div key={n.label} className={clases}>
              {cuerpo}
            </div>
          );
        })}
      </section>

      <section className="grid gap-10 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h3 className="font-col-display text-[34px] font-light leading-tight text-col-ink">Empezá por acá</h3>
          <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-col-slate">
            Tres pasos para que el sitio tenga con qué contar sus viajes.
          </p>
        </div>
        <ol className="divide-y divide-col-line border-y border-col-line lg:col-span-8">
          {pasos.map((p, i) => {
            const contenido = (
              <>
                <span className="w-12 shrink-0 font-col-display text-[40px] font-light italic leading-none text-col-gold">
                  {p.hecho ? <Check className="mt-1 h-7 w-7" strokeWidth={1.25} aria-label="Hecho" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] text-col-ink">{p.titulo}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-col-slate">{p.texto}</span>
                </span>
                {p.href ? (
                  <ArrowRight
                    className="h-5 w-5 shrink-0 self-center text-col-slate transition-transform duration-200 ease-col group-hover:translate-x-1 group-hover:text-col-ink"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                ) : (
                  <span className="shrink-0 self-center text-[10px] uppercase tracking-[0.16em] text-col-slate/60">
                    Pronto
                  </span>
                )}
              </>
            );
            return (
              <li key={p.titulo}>
                {p.href ? (
                  <Link href={p.href} className="group flex gap-5 px-1 py-6 transition-colors duration-200 ease-col hover:bg-col-surface/60">
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex gap-5 px-1 py-6 opacity-70">{contenido}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="recientes" className="pb-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h3 id="recientes" className="font-col-display text-[34px] font-light leading-tight text-col-ink">
            Lo último en la biblioteca
          </h3>
          <Link
            href="/backend/collection/biblioteca"
            className="flex items-center gap-2 text-[13px] uppercase tracking-[0.12em] text-col-slate transition-colors duration-200 ease-col hover:text-col-ink"
          >
            Ver todo
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
        {!recientes.ok ? (
          <p className="text-[14px] text-col-alerta">{recientes.error}</p>
        ) : medios.length === 0 ? (
          <Link
            href="/backend/collection/biblioteca"
            className="flex h-56 flex-col items-center justify-center rounded border border-dashed border-col-slate/30 text-center transition-colors duration-200 ease-col hover:border-col-gold hover:bg-col-surface"
          >
            <span className="font-col-display text-[28px] font-light italic text-col-ink">Todavía no hay fotos</span>
            <span className="mt-2 text-[14px] text-col-slate">Subí las primeras desde la biblioteca.</span>
          </Link>
        ) : (
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {medios.map((m) => (
              <li key={m.id} className="shrink-0" style={{ width: `${Math.round(200 * aspectoDe(m))}px` }}>
                <Link
                  href={`/backend/collection/biblioteca?medio=${m.id}`}
                  aria-label={m.alt || m.nombre}
                  className="group block overflow-hidden rounded-sm"
                >
                  <MedioImagen
                    medio={m}
                    sizes="320px"
                    ancho={480}
                    className="h-[200px]"
                    imgClassName="group-hover:scale-[1.03]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
