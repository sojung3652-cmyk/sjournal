"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Thumbnail with a fallback card (site name + favicon) when there is no image or it fails to load.
 * Third-party images are loaded with no referrer.
 */
export function LinkThumb({ imageUrl, faviconUrl, siteName, className }: { imageUrl: string | null; faviconUrl: string | null; siteName: string | null; className?: string }) {
  // Remember which URL failed (not a boolean): the URL can arrive later, after a pending fetch.
  const [failedImg, setFailedImg] = useState<string | null>(null);
  const [failedFav, setFailedFav] = useState<string | null>(null);
  if (imageUrl && failedImg !== imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party og:image
      <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImg(imageUrl)} className={cn("aspect-[1.91/1] w-full bg-muted object-cover", className)} />
    );
  }
  return (
    <div className={cn("flex aspect-[1.91/1] w-full flex-col items-center justify-center gap-2 bg-muted px-4", className)} data-fallback-thumb>
      {faviconUrl && failedFav !== faviconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party favicon
        <img src={faviconUrl} alt="" width={32} height={32} referrerPolicy="no-referrer" onError={() => setFailedFav(faviconUrl)} className="size-8 rounded" />
      ) : (
        <Globe className="size-8 text-accent-strong" />
      )}
      <span className="max-w-full truncate text-sm font-medium text-muted-foreground">{siteName ?? "Link"}</span>
    </div>
  );
}

export function Favicon({ url }: { url: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || failed === url) return <Globe className="size-3.5 shrink-0 text-muted-foreground" />;
  // eslint-disable-next-line @next/next/no-img-element -- third-party favicon
  return <img src={url} alt="" width={14} height={14} referrerPolicy="no-referrer" onError={() => setFailed(url)} className="size-3.5 shrink-0 rounded-sm" />;
}
