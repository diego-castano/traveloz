"use client";

import { useState } from "react";

type Props = {
  name: string;
  accept?: string;
  required?: boolean;
  iconSrc?: string;
  placeholderTitle?: string;
  defaultLabel?: string;
};

/**
 * Styled file upload — same .file-up markup the html_inicial CSS expects,
 * with React-driven label that swaps "Explorar" for the picked filename.
 */
export function FileUploadField({
  name,
  accept = ".pdf,.doc,.docx",
  required,
  iconSrc = "/site/img/file-cv.svg",
  placeholderTitle = "Adjuntá tu CV *",
  defaultLabel = "Explorar",
}: Props) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="file-up">
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <span className="placeholder-title">{placeholderTitle}</span>
      <div className="inner">
        <img src={iconSrc} alt="" loading="lazy" decoding="async" />
        <span className="file-label">{fileName ?? defaultLabel}</span>
      </div>
    </div>
  );
}
