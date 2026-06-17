"use client";

import { useEffect, useMemo, useState } from "react";
import {
  usePhoneInput,
  defaultCountries,
  parseCountry,
  FlagImage,
  type CountryIso2,
} from "react-international-phone";
import "react-international-phone/style.css";
import { Search, X, ChevronDown } from "lucide-react";

const PREFERRED: CountryIso2[] = ["uy", "ar", "br", "cl", "py", "us", "es"];

// Teléfono internacional con selector de país full-screen (tipo app) + buscador.
// Submite el número completo (E.164) en `telefono` y el código en `paisCodigo`.
export function PhoneField() {
  const [value, setValue] = useState("");
  const { inputValue, phone, country, setCountry, handlePhoneValueChange, inputRef } =
    usePhoneInput({
      defaultCountry: "uy",
      value,
      countries: defaultCountries,
      forceDialCode: true,
      onChange: (data) => setValue(data.phone),
    });

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const countries = useMemo(() => {
    const parsed = defaultCountries.map(parseCountry);
    // Países preferidos primero.
    return [...parsed].sort((a, b) => {
      const ia = PREFERRED.indexOf(a.iso2);
      const ib = PREFERRED.indexOf(b.iso2);
      if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return countries;
    const num = s.replace(/\D/g, "");
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(s) || (num && c.dialCode.includes(num)),
    );
  }, [q, countries]);

  // Bloquear scroll del fondo mientras el selector está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const digits = phone.replace(/\D/g, "");
  const hasNumber = digits.length > country.dialCode.replace(/\D/g, "").length;

  function pick(iso2: CountryIso2) {
    setCountry(iso2);
    setOpen(false);
    setQ("");
  }

  return (
    <div>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-neutral-300 bg-white transition focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 border-r border-neutral-200 px-3 transition active:bg-neutral-100 hover:bg-neutral-50"
          aria-label="Elegir país"
        >
          <FlagImage iso2={country.iso2} style={{ width: 22, height: 22 }} />
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        </button>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handlePhoneValueChange}
          type="tel"
          inputMode="tel"
          placeholder="Número de teléfono"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
      <input type="hidden" name="telefono" value={hasNumber ? phone : ""} />
      <input type="hidden" name="paisCodigo" value={hasNumber ? `+${country.dialCode}` : ""} />

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white sm:items-center sm:justify-center sm:bg-black/40 sm:p-4"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[78vh] sm:max-w-md sm:rounded-2xl sm:shadow-2xl">
            {/* Header con buscador */}
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar país…"
                  className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista */}
            <ul className="flex-1 overflow-y-auto overscroll-contain py-1">
              {filtered.map((c) => {
                const active = c.iso2 === country.iso2;
                return (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      onClick={() => pick(c.iso2)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-neutral-100 hover:bg-neutral-50 ${
                        active ? "bg-neutral-50" : ""
                      }`}
                    >
                      <FlagImage iso2={c.iso2} style={{ width: 26, height: 26 }} />
                      <span className="flex-1 text-[15px] text-neutral-800">{c.name}</span>
                      <span className="text-sm text-neutral-400">+{c.dialCode}</span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-neutral-400">
                  Sin resultados para “{q}”.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
