"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type SettingsState } from "./actions";

export function ProfileForm({ timezone, displayName, timezones }: { timezone: string; displayName: string | null; timezones: string[] }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">{t("displayName")}</Label>
        <Input id="display_name" name="display_name" defaultValue={displayName ?? ""} maxLength={40} />
        <p className="text-xs text-muted-foreground">{t("displayNameHint")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("timezone")}</Label>
        <select id="timezone" name="timezone" defaultValue={timezone} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t("timezoneHint")}</p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-muted-foreground">{tc("saved")}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
