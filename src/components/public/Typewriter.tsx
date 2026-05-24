"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  speedMs?: number;
  className?: string;
  /** HTML tag to render — defaults to span */
  as?: keyof JSX.IntrinsicElements;
};

/**
 * Typewriter — 1:1 port of the html_inicial/main.js .anim-text effect.
 *
 * SSR / pre-hydration renders an EMPTY element with no `.anim-text` class,
 * so there is no lone blinking cursor before JS runs (the cursor comes from
 * `.anim-text::after`). On mount the typing animation kicks off: the class
 * is added, characters appear one by one at `speedMs`, and once the full
 * text is shown the class is removed (stops the blinking cursor).
 */
export function Typewriter({
  text,
  speedMs = 80,
  className = "",
  as: Tag = "span",
}: Props) {
  // Start "settled & empty" — this matches the SSR output exactly (no
  // hydration mismatch) and avoids painting a cursor with no text.
  const [shown, setShown] = useState("");
  const [animating, setAnimating] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    setShown("");
    setAnimating(true);
    idxRef.current = 0;
    const id = setInterval(() => {
      idxRef.current += 1;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) {
        clearInterval(id);
        setAnimating(false);
      }
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  const cls = `${className} ${animating ? "anim-text" : ""}`.trim();
  const TagAny = Tag as React.ElementType;
  return <TagAny className={cls}>{shown}</TagAny>;
}
