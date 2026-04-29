/**
 * Custom next/image loader for assets served by the `/api/image/[...path]`
 * proxy. Lets us use `<Image src={url} fill ... />` instead of the bare
 * `<img>` so we get automatic responsive `srcset`, lazy loading, and
 * blur-up placeholder support without rebuilding the proxy to support
 * variants right now.
 *
 * Pass it via the `loader` prop on a per-image basis (we don't want it
 * applied globally because public hero images coming from `/header-logo.webp`
 * are already optimized).
 *
 *   import { bucketImageLoader } from "@/components/lib/image-loader";
 *
 *   <Image
 *     loader={bucketImageLoader}
 *     src="/api/image/paquetes/123/foto.webp"
 *     alt={alt}
 *     fill
 *     sizes="(min-width: 1024px) 25vw, 50vw"
 *   />
 *
 * The proxy currently doesn't transform on the fly, so `?w=` is informational
 * — but we still pass it so we can later add server-side resize without
 * touching every callsite.
 */

import type { ImageLoaderProps } from "next/image";

export function bucketImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Already absolute? Pass through unchanged.
  if (/^https?:\/\//i.test(src)) return src;

  const u = new URL(
    src.startsWith("/") ? src : `/${src}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (width) u.searchParams.set("w", String(width));
  if (quality) u.searchParams.set("q", String(quality));
  return `${u.pathname}${u.search}`;
}
