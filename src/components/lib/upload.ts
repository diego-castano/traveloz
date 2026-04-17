export interface UploadedFile {
  key: string;
  url: string;
}

export async function uploadFile(
  file: File,
  folder?: string,
): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  if (folder) form.append("folder", folder);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }
  return (await res.json()) as UploadedFile;
}

export async function uploadFiles(
  files: File[] | FileList,
  folder?: string,
): Promise<UploadedFile[]> {
  const list = Array.from(files);
  const results = await Promise.allSettled(list.map((f) => uploadFile(f, folder)));
  const ok: UploadedFile[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") ok.push(r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  if (errors.length && !ok.length) throw new Error(errors.join("; "));
  return ok;
}
