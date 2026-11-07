"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While some links are still being fetched, re-render the page every few seconds (max ~1 min). */
export function PendingRefresher({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let n = 0;
    const t = setInterval(() => {
      n++;
      router.refresh();
      if (n >= 20) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
