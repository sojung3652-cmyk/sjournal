"use client";

import { useActionState, useRef } from "react";
import { addLink, type LinkResult } from "@/app/(app)/links/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddLinkForm({ categories }: { categories: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<LinkResult, FormData>(async (prev, fd) => {
    const res = await addLink(prev, fd);
    if (res.ok) formRef.current?.reset();
    return res;
  }, {});
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
      <Input name="url" type="url" inputMode="url" placeholder="https://…" aria-label="Link URL" required className="sm:flex-1" />
      <div className="flex gap-2">
        <select name="category_id" defaultValue="" aria-label="Category" className="h-8 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {/* The one primary (pink) button on this screen. */}
        <Button type="submit" disabled={pending}>
          Add link
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
