"use client";

// ---------------------------------------------------------------------------
// /work-with-us -- 1:1 port of html_inicial/work-with-us.html.
//
// Multipart form (CV upload). Stub action logs filename + size; Fase 5 wires
// it to S3 via /api/upload + persists Postulacion in Prisma.
// ---------------------------------------------------------------------------

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import { submitWorkWithUsForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="contact-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export default function WorkWithUsPage() {
  const [result, formAction] = useFormState(submitWorkWithUsForm, null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <section className="content-area gradient-page-bg">
      <div className="container">
        <div className="content-box">
          <div className="text-center mb_50">
            <h1 className="section-heading">¡Queremos conocerte!</h1>
            <div className="sub-text">
              <p>
                Estamos transformando la experiencia de viajar, <br />y queremos
                hacerlo con personas como vos.
              </p>
            </div>
          </div>
        </div>
        <div className="row gx-lg-5 gx-4">
          <div className="col-sm-6 order-sm-2 order-1">
            <div className="content-box style3">
              <form action={formAction} encType="multipart/form-data">
                <ul className="row">
                  <li className="col-sm-12">
                    <label htmlFor="f_name">Nombre Completo</label>
                    <input
                      type="text"
                      id="f_name"
                      name="nombre"
                      placeholder="Nombre completo *"
                      required
                    />
                  </li>
                  <li className="col-sm-12">
                    <label htmlFor="phn">Teléfono</label>
                    <input
                      type="text"
                      id="phn"
                      name="telefono"
                      placeholder="Teléfono *"
                    />
                  </li>
                  <li className="col-sm-12">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="Email *"
                      required
                    />
                  </li>
                  <li className="col-sm-12">
                    <label htmlFor="msg">Mensaje</label>
                    <textarea
                      id="msg"
                      name="motivacion"
                      placeholder="¿Qué te motiva a trabajar en Traveloz? *"
                      required
                    />
                  </li>
                  <li className="col-sm-12">
                    <div className="file-up">
                      <input
                        ref={fileRef}
                        type="file"
                        name="cv"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) =>
                          setFileName(e.target.files?.[0]?.name ?? null)
                        }
                        required
                      />
                      <span className="placeholder-title">Adjuntá tu CV *</span>
                      <div className="inner">
                        <img src="/site/img/file-cv.svg" alt="" />
                        <span className="file-label">
                          {fileName ?? "Explorar"}
                        </span>
                      </div>
                    </div>
                  </li>
                </ul>
                <div className="text-start mt-4">
                  <SubmitButton />
                </div>
                <FormStatus result={result} />
              </form>
            </div>
          </div>
          <div className="col-sm-6 order-sm-1 order-2">
            <div className="content-img work-with-img video-placeholder">
              <img src="/site/img/work-with-us.webp" alt="Equipo TravelOz" />
              <div className="video-overlay">
                <span>Video</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
