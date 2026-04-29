"use client";

import { Accordion } from "radix-ui";
import { useState } from "react";

export type AccordionItem = {
  id: string;
  title: string;
  /** Inner HTML for the body. Source is trusted (html_inicial copy / admin). */
  bodyHtml: string;
};

type Props = {
  /** Wrapper id (kept for parity with the Bootstrap version) */
  parentId?: string;
  items: AccordionItem[];
  /** Allow multiple items open at once. Default: single (collapsible). */
  multiple?: boolean;
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
    <div className="faq-accordion style2">
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
                  {item.title}
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="accordion-collapse">
                <div
                  className="accordion-body"
                  dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                />
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </RootAny>
    </div>
  );
}
