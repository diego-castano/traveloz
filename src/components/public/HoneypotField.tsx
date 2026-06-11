/**
 * Campo honeypot anti-spam. Invisible para humanos (fuera de pantalla, sin
 * tab, sin autocomplete); los bots que completan todo el form lo llenan y la
 * server action los descarta en silencio (ver guardForm en
 * public-forms.actions.ts). El name "website" es deliberadamente tentador.
 */
export default function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "auto",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label>
        No completar este campo
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
}
