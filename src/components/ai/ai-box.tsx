"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Everything AI-generated is shown on ai-surface with an 'AI draft' label (PRD 6). */
export function AiBox({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  const t = useTranslations("ai");
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl bg-ai-surface p-4 text-ai-foreground", className)} data-ai-draft>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-ai-foreground/30 px-2 py-0.5 text-[11px] font-medium">{t("draft")}</span>
        {title && <span className="text-sm font-medium">{title}</span>}
      </div>
      {children}
    </div>
  );
}

/** Textarea edited as "one line per item". */
export function LinesField({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
}) {
  const t = useTranslations("ai");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label} <span className="font-normal opacity-70">{t("onePerLine")}</span>
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        className="w-full resize-y rounded-lg border border-ai-foreground/20 bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export const cleanLines = (v: string[]) => v.map((s) => s.trim()).filter(Boolean);

export function AiList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium">{label}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
