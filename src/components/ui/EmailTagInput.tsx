"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/components/lib/cn";

// Email validation — same shape that the public-forms parser accepts on the
// server (see `parseEmails` in src/actions/public-forms.actions.ts). Kept
// intentionally loose so addresses like `name+tag@sub.example.co.uk` pass.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEPARATOR_RE = /[,;\s]+/;

function parseCsv(value: string): string[] {
  return value
    .split(SEPARATOR_RE)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function unique(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

type Props = {
  value: string;
  onChange: (nextCsv: string) => void;
  placeholder?: string;
  /** When set, invalid (non-email) tokens are highlighted but not auto-removed. */
  ariaInvalid?: boolean;
  className?: string;
};

/**
 * EmailTagInput — a tag input for comma-separated email lists. Renders each
 * email as a removable chip and a trailing text input that accepts
 * comma/semicolon/whitespace separators (the same separators the server-side
 * `parseEmails` accepts). Pasted strings like "a@x.com, b@y.com" are split
 * into separate chips immediately.
 *
 * Storage is a CSV string — we don't change the wire format used by
 * SiteSetting.value, so the server-side `submitQuoteForm` /
 * `notifyLead` flow keeps working unchanged.
 */
export function EmailTagInput({
  value,
  onChange,
  placeholder = "Escribí un email y apretá coma o enter…",
  ariaInvalid,
  className,
}: Props) {
  const chips = useMemo(() => unique(parseCsv(value)), [value]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (raw: string) => {
      const tokens = unique(parseCsv(raw));
      if (tokens.length === 0) return;
      // Merge with existing, dedupe, preserve order.
      const merged = unique([...chips, ...tokens]);
      onChange(merged.join(", "));
      setDraft("");
    },
    [chips, onChange],
  );

  const removeChip = useCallback(
    (email: string) => {
      const next = chips.filter((c) => c !== email);
      onChange(next.join(", "));
    },
    [chips, onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      // Convenience: backspace on an empty input removes the last chip.
      e.preventDefault();
      const next = chips.slice(0, -1);
      onChange(next.join(", "));
    }
  };

  const onChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // If the user pasted a multi-email string, the browser typically fires
    // a single change event with the full content — split on separators
    // and commit everything except the last partial token.
    if (SEPARATOR_RE.test(v)) {
      const tokens = parseCsv(v);
      if (tokens.length > 0) {
        const merged = unique([...chips, ...tokens]);
        onChange(merged.join(", "));
        // Keep the trailing fragment (after the last separator) as the new
        // draft so the user can keep typing.
        const lastSep = v.search(SEPARATOR_RE.source + "(?!.*" + SEPARATOR_RE.source + ")");
        setDraft(lastSep >= 0 ? v.slice(lastSep + 1).trim() : "");
        return;
      }
    }
    setDraft(v);
  };

  const onBlur = () => {
    if (draft.trim()) commit(draft);
  };

  // Show pending draft as a faded ghost chip if it doesn't look like a real
  // email yet — gives the user feedback that the value is buffered.
  const draftIsValid = draft.trim() && EMAIL_RE.test(draft.trim());

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 min-h-[38px] w-full border rounded-md px-2 py-1.5 bg-white transition-colors",
        "focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400",
        ariaInvalid
          ? "border-red-400 ring-red-200"
          : "border-neutral-300",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {chips.map((email) => {
        const valid = EMAIL_RE.test(email);
        return (
          <span
            key={email}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium border",
              valid
                ? "bg-violet-50 border-violet-200 text-violet-800"
                : "bg-red-50 border-red-200 text-red-700",
            )}
            title={valid ? email : `${email} — formato inválido`}
          >
            {email}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeChip(email);
              }}
              className="inline-flex items-center justify-center rounded-sm opacity-60 hover:opacity-100"
              aria-label={`Quitar ${email}`}
            >
              <X size={12} />
            </button>
          </span>
        );
      })}

      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={onChangeInput}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={chips.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[180px] bg-transparent outline-none text-sm py-1 placeholder:text-neutral-400"
        aria-label="Email"
      />

      {draft && !draftIsValid && (
        <span className="text-[11px] text-amber-600">enter o coma para agregar</span>
      )}
    </div>
  );
}
