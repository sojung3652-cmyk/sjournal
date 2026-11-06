"use client";

import { useActionState, useState } from "react";
import { saveReflection, type ReflectionResult } from "@/app/(app)/today-actions";
import { Button } from "@/components/ui/button";

/** '하루 마무리': one-line reflection. AI journal + guide attach here in stage 6. */
export function DayClose({ day, reflection, children }: { day: string; reflection: string | null; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReflectionResult, FormData>(saveReflection, {});

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {reflection && <p className="text-sm">&ldquo;{reflection}&rdquo;</p>}
        <div>
          {/* The one primary (pink) button on the today screen. */}
          <Button onClick={() => setOpen(true)}>하루 마무리</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="day" value={day} />
        <label htmlFor="reflection" className="text-sm font-medium">
          오늘의 한 줄 소감
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
        {state.ok && <p className="text-sm text-muted-foreground">저장했습니다.</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            소감 저장
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </form>
      {children}
    </div>
  );
}
