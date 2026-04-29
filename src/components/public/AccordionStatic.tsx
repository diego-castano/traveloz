// ---------------------------------------------------------------------------
// Bootstrap-compatible accordion
//
// Renders the exact markup that html_inicial uses for terms.html / faq.html
// accordion items. Interactivity is provided by Bootstrap JS (loaded in the
// (public) layout). Fase 4 swaps the implementation for Radix Accordion
// without changing how pages call it.
//
// Each item's content is HTML (uses <p>, <a>, <strong>, etc. from the
// original copy), so it's injected via dangerouslySetInnerHTML. Markup comes
// from html_inicial which is trusted source.
// ---------------------------------------------------------------------------

export type AccordionItem = {
  /** Stable id used for the data-bs-target / aria attributes */
  id: string;
  /** Heading text rendered inside the toggle button */
  title: string;
  /** Inner HTML for the body (paragraphs, lists, etc.) */
  bodyHtml: string;
};

type Props = {
  /** id="" of the wrapping <div class="accordion">, used by data-bs-parent */
  parentId?: string;
  items: AccordionItem[];
};

export function AccordionStatic({ parentId = "accordion", items }: Props) {
  return (
    <div className="faq-accordion style2">
      <div className="accordion" id={parentId}>
        {items.map((item) => {
          const headingId = `heading-${item.id}`;
          const collapseId = `collapse-${item.id}`;
          return (
            <div className="accordion-item" key={item.id}>
              <div className="accordion-header" id={headingId}>
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#${collapseId}`}
                  aria-expanded="false"
                  aria-controls={collapseId}
                >
                  {item.title}
                </button>
              </div>
              <div
                id={collapseId}
                className="accordion-collapse collapse"
                aria-labelledby={headingId}
                data-bs-parent={`#${parentId}`}
              >
                <div
                  className="accordion-body"
                  dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
