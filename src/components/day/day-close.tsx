"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveReflection, type ReflectionResult } from "@/app/(app)/today-actions";
import { Button } from "@/components/ui/button";

/** Day close: one-line reflection, plus the AI journal and guide passed as children. */
export function DayClose({ day, reflection, children }: { day: string; reflection: string | null; children?: React.ReactNode }) {
  const t = useTranslations("today");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReflectionResult, FormData>(saveReflection, {});

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {reflection && <p className="text-sm">&ldquo;{reflection}&rdquo;</p>}
        <div>
          {/* The one primary (pink) button on the today screen. */}
          <Button onClick={() => setOpen(true)}>{t("wrapUp")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="day" value={day} />
        <label htmlFor="reflection" className="text-sm font-medium">
          {t("reflection")}
        </label>
        <textarea
          id="reflection"
          name="reflection"
          rows={2}
          maxLength={2000}
          defaultValue={reflection ?? ""}
          className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.ok && <p className="text-sm text-muted-foreground">{tc("saved")}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {t("saveReflection")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {tc("close")}
          </Button>
        </div>
      </form>
      {children}
    </div>
  );
}
