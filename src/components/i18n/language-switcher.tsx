"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/i18n-actions";
import { LOCALES, LOCALE_LABEL } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** English / 한국어 toggle. Labels are shown in their own language on purpose. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t("language")} className={cn("inline-flex items-center gap-1 rounded-lg border bg-card p-0.5", className)}>
      <Languages className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          disabled={pending}
          onClick={() => locale !== l && start(async () => void (await setLocale(l)))}
          className={cn("rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground", locale === l && "bg-muted font-medium text-foreground")}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
