"use client";

import { useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Input tipo Gmail: escribís un email + Enter/coma y queda en un chip; pegás
// varios separados por coma/; /espacio/salto y los separa en chips. Backspace
// con el input vacío borra el último.
export function EmailChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);

  function addTokens(raw: string): boolean {
    const tokens = raw
      .split(/[\s,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) return true;

    const valid: string[] = [];
    let hadInvalid = false;
    for (const t of tokens) {
      if (!EMAIL_RE.test(t)) {
        hadInvalid = true;
        continue;
      }
      if (!value.includes(t) && !valid.includes(t)) valid.push(t);
    }
    if (valid.length) onChange([...value, ...valid]);
    setError(hadInvalid);
    return !hadInvalid;
  }

  function commitDraft() {
    if (!draft.trim()) return;
    if (addTokens(draft)) setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    } else if (error) {
      setError(false);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[\s,;]/.test(text)) {
      e.preventDefault();
      addTokens(text);
      setDraft("");
    }
  }

  function remove(email: string) {
    onChange(value.filter((v) => v !== email));
  }

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border bg-white px-2.5 py-2 transition focus-within:ring-2 focus-within:ring-neutral-900/10 ${
          error ? "border-red-400" : "border-neutral-300 focus-within:border-neutral-900"
        }`}
      >
        <AnimatePresence initial={false}>
          {value.map((email) => (
            <motion.span
              key={email}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-3 pr-1.5 text-sm text-neutral-800"
            >
              {email}
              <button
                type="button"
                onClick={() => remove(email)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-300 hover:text-neutral-700"
                aria-label={`Quitar ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={commitDraft}
          type="email"
          placeholder={value.length ? "" : "ventas@marca.com, otra@marca.com…"}
          className="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-sm outline-none placeholder:text-neutral-400"
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">
          Alguno no es un email válido — revisalo.
        </p>
      )}
    </div>
  );
}
