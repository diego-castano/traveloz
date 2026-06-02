// ---------------------------------------------------------------------------
// sanitizeRichHtml — whitelist-based HTML sanitizer for admin-authored rich
// text (the small markup our RichTextEditor emits: bold/italic/underline/
// strike/lists/links/paragraphs). Dependency-free and DOM-free, so it runs
// identically on the server (SSR) and the client.
//
// Why string-based instead of DOMPurify: the project deliberately avoids heavy
// editor/sanitizer deps, the input space is tiny and trusted (admins only),
// and we need the exact same result on both runtimes. Anything outside the
// allowlist is stripped (the tag is removed but its inner text is preserved),
// every attribute except a per-tag allowlist is dropped, unsafe href schemes
// are blocked, and external links are forced to open safely in a new tab.
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "br",
  "p",
  "div",
  "span",
  "ul",
  "ol",
  "li",
  "a",
]);

// Attributes kept per tag. Anything not listed (style, class, on*, data-*, …)
// is dropped. Tags absent from this map keep no attributes at all.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
};

function isSafeHref(href: string): boolean {
  const v = href.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("/") ||
    v.startsWith("#")
  );
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sanitizeRichHtml(input: string | null | undefined): string {
  if (!input) return "";
  let html = input;

  // 1. Strip comments and dangerous element blocks (content included).
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(
    /<(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  // Any stray opening/closing of those (unbalanced) also goes.
  html = html.replace(
    /<\/?(script|style|iframe|object|embed|noscript|template)[^>]*>/gi,
    "",
  );

  // 2. Walk every tag: keep allowlisted ones (with filtered attributes), strip
  //    the rest while preserving their inner text.
  html = html.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_match, slash: string, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (slash) return `</${name}>`;

      const allowed = ALLOWED_ATTRS[name];
      let attrs = "";
      if (allowed && allowed.size > 0) {
        const attrRe =
          /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
        let m: RegExpExecArray | null;
        while ((m = attrRe.exec(rawAttrs)) !== null) {
          const attr = m[1].toLowerCase();
          if (!allowed.has(attr)) continue;
          const val = m[3] ?? m[4] ?? "";
          if (attr === "href") {
            if (!isSafeHref(val)) continue;
            attrs += ` href="${escapeAttr(val)}"`;
            // External links open in a new tab without leaking the opener.
            if (/^https?:/i.test(val.trim())) {
              attrs += ` target="_blank" rel="noopener noreferrer"`;
            }
          } else {
            attrs += ` ${attr}="${escapeAttr(val)}"`;
          }
        }
      }
      return `<${name}${attrs}>`;
    },
  );

  return html;
}
