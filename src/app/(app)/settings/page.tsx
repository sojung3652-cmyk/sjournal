import { Suspense } from "react";
import { logout } from "@/app/auth/actions";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AI_DAILY_LIMIT } from "@/lib/ai-limits";
import { dayRangeUtc } from "@/lib/dates";
import { getUserContext } from "@/lib/user";
import { PageContainer } from "@/components/app/page-container";
import { ProfileForm } from "./profile-form";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="Settings" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <SettingsContent />
      </Suspense>
    </PageContainer>
  );
}

async function SettingsContent() {
  const { supabase, timezone, displayName, today } = await getUserContext();
  const { start, end } = dayRangeUtc(today, timezone);
  const [{ count }, { data: claims }] = await Promise.all([
    supabase.from("ai_runs").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
    supabase.auth.getClaims(),
  ]);
  const email = (claims?.claims?.email as string | undefined) ?? "";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Profile</h2>
        <ProfileForm
          timezone={timezone}
          displayName={displayName}
          timezones={Intl.supportedValuesOf("timeZone")}
        />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-2 text-sm font-medium">AI usage</h2>
        <p className="text-sm text-muted-foreground">
          Today: {count ?? 0} / {AI_DAILY_LIMIT} used
        </p>
      </section>

      <section className="flex items-center justify-between rounded-xl border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">Account</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Log out
          </Button>
        </form>
      </section>
    </div>
  );
}
