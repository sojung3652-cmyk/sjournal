"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type SettingsState } from "./actions";

export function ProfileForm({
  timezone,
  displayName,
  timezones,
}: {
  timezone: string;
  displayName: string | null;
  timezones: string[];
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Name</Label>
        <Input id="display_name" name="display_name" defaultValue={displayName ?? ""} maxLength={40} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Time zone</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={timezone}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">&apos;Today&apos; is calculated in this time zone.</p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-muted-foreground">Saved.</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
