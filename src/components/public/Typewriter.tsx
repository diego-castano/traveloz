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
 * 1:1 port of the html_inicial/main.js .anim-text typewriter:
 *   speed = 80ms per char, single run on mount, removes the .anim-text
 *   class once the full text is shown (which the original CSS uses to
 *   strip a blinking-cursor style).
 */
export function Typewriter({
  text,
  speedMs = 80,
  className = "",
  as: Tag = "span",
}: Props) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    setShown("");
    setDone(false);
    idxRef.current = 0;
    const id = setInterval(() => {
      idxRef.current += 1;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  const cls = `${className} ${done ? "" : "anim-text"}`.trim();
  const TagAny = Tag as React.ElementType;
  return <TagAny className={cls}>{shown}</TagAny>;
}
