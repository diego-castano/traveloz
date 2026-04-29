"use client";

// ---------------------------------------------------------------------------
// Inline result message for public forms (under the submit button).
// Mirrors the original HTML pattern of <p id="success-msg" style="display:none">
// that the legacy main.js toggled after a fake submit -- here it's driven by
// the Server Action's return value via useFormState.
// ---------------------------------------------------------------------------

import type { FormResult } from "@/actions/public-forms.actions";

export function FormStatus({ result }: { result: FormResult | null }) {
  if (!result) return null;
  return (
    <p
      style={{
        color: result.ok ? "white" : "#ffb8bf",
        marginTop: 15,
        textAlign: "center",
      }}
      role={result.ok ? "status" : "alert"}
    >
      {result.message}
    </p>
  );
}
