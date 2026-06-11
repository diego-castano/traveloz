"use client";

import { Tabs } from "radix-ui";
import {
  RadixAccordion,
  type AccordionItem,
} from "@/components/public/RadixAccordion";

export type FaqTopic = {
  id: string;
  label: string;
  iconBlue: string;
  bodyHtml: string;
};

type Props = { topics: FaqTopic[] };

const TabsRootAny = Tabs.Root as unknown as React.FC<
  React.ComponentProps<typeof Tabs.Root>
>;

export function FaqContent({ topics }: Props) {
  const accordionItems: AccordionItem[] = topics.map((t) => ({
    id: t.id,
    title: t.label,
    bodyHtml: `<div class="faq-tab-content"><div class="plain-content">${t.bodyHtml}</div></div>`,
  }));

  return (
    <>
      {/* Desktop: Radix Tabs (CSS adapter maps [data-state=active] → .active) */}
      <div className="d-none d-md-block">
        <TabsRootAny defaultValue={topics[0]?.id} orientation="vertical">
          <div className="row">
            <div className="col-md-4">
              <div className="faq-tabs">
                <Tabs.List asChild>
                  <ul role="tablist">
                    {topics.map((t) => (
                      <li className="nav-item" key={t.id}>
                        <Tabs.Trigger value={t.id} asChild>
                          <button type="button" className="nav-link">
                            {t.label}{" "}
                            {t.iconBlue ? <img src={t.iconBlue} alt="" loading="lazy" decoding="async" /> : null}
                          </button>
                        </Tabs.Trigger>
                      </li>
                    ))}
                  </ul>
                </Tabs.List>
              </div>
            </div>
            <div className="col-md-8">
              <div className="faq-tab-content">
                <div className="tab-content">
                  {topics.map((t) => (
                    <Tabs.Content key={t.id} value={t.id}>
                      <div
                        className="plain-content"
                        dangerouslySetInnerHTML={{ __html: t.bodyHtml }}
                      />
                    </Tabs.Content>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsRootAny>
      </div>

      {/* Mobile: same content as accordion */}
      <div className="d-md-none">
        <RadixAccordion
          parentId="faq-accordion-mobile"
          items={accordionItems}
        />
      </div>
    </>
  );
}
