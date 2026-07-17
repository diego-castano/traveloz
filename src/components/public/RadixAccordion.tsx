"use client";

import { Accordion } from "radix-ui";
import { useState } from "react";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export type AccordionItem = {
  id: string;
  title: string;
  /** Inner HTML for the body. Source is trusted (html_inicial copy / admin). */
  bodyHtml: string;
  /** Ícono mostrado con el trigger cerrado (solo variant="alt"). */
  iconBlue?: string;
  /** Ícono mostrado con el trigger abierto (solo variant="alt"). */
  iconRed?: string;
};

type Props = {
  /** Wrapper id (kept for parity with the Bootstrap version) */
  parentId?: string;
  items: AccordionItem[];
  /** Allow multiple items open at once. Default: single (collapsible). */
  multiple?: boolean;
  /**
   * Variante visual de .faq-accordion (clases ya portadas a site.css):
   * "style2" (default, usado en /terms) o "alt" (usado en /faq, con
   * íconos por item que se togglean según el estado abierto/cerrado).
   */
  variant?: "style2" | "alt";
};

/**
 * Drop-in replacement for the Bootstrap accordion that html_inicial uses.
 * Renders the same .accordion / .accordion-item / .accordion-button /
 * .accordion-collapse / .accordion-body class structure so the existing
 * site.css rules keep styling it; we only add/remove the `.collapsed`
 * class on the button based on Radix open state, which is what the CSS
 * arrow-rotation rule (`.accordion-button:not(.collapsed)::after`) keys off.
 */
export function RadixAccordion({
  parentId = "accordion",
  items,
  multiple = false,
  variant = "style2",
}: Props) {
  // Controlled state so we can mirror open/closed onto the .collapsed class.
  const [openValues, setOpenValues] = useState<string[]>([]);

  const isOpen = (id: string) => openValues.includes(id);

  const onValueChange = (value: string | string[]) => {
    setOpenValues(
      Array.isArray(value) ? value : value ? [value] : [],
    );
  };

  // The radix-ui umbrella's Accordion.Root has a discriminated union for the
  // `type` / `value` props that TS can't narrow at runtime — cast once.
  const RootAny = Accordion.Root as unknown as React.FC<
    React.ComponentProps<typeof Accordion.Root>
  >;

  return (
    <div className={`faq-accordion ${variant}`}>
      <RootAny
        id={parentId}
        className="accordion"
        {...(multiple
          ? {
              type: "multiple" as const,
              value: openValues,
              onValueChange,
            }
          : {
              type: "single" as const,
              collapsible: true,
              value: openValues[0] ?? "",
              onValueChange,
            })}
      >
        {items.map((item) => {
          const open = isOpen(item.id);
          return (
            <Accordion.Item
              key={item.id}
              value={item.id}
              className={`accordion-item ${open ? "active" : ""}`}
            >
              <Accordion.Header className="accordion-header">
                <Accordion.Trigger
                  className={`accordion-button ${open ? "" : "collapsed"}`}
                >
                  {variant === "alt" && item.iconBlue ? (
                    <>
                      <img src={item.iconBlue} alt="" className="blue-icon" />
                      <img
                        src={item.iconRed || "/site/img/faq-icon-red.png"}
                        alt=""
                        className="red-icon"
                      />
                    </>
                  ) : null}
                  {item.title}
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="accordion-collapse">
                <div
                  className="accordion-body"
                  // Sanitiza en render: limpia el HTML pegado desde Word
                  // (spans .SpellingError con un wavy rojo embebido como
                  // background-image) que aparecía como falsa línea roja.
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(item.bodyHtml),
                  }}
                />
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </RootAny>
    </div>
  );
}
