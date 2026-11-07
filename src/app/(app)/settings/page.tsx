import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { logout } from "@/app/auth/actions";
import { PageContainer } from "@/components/app/page-container";
import { PageHeader } from "@/components/app/page-header";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { AI_DAILY_LIMIT } from "@/lib/ai-limits";
import { dayRangeUtc } from "@/lib/dates";
import { getUserContext } from "@/lib/user";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <PageContainer>
      <PageHeader title={t("title")} />
      <Suspense fallback={<span />}>
        <SettingsContent />
      </Suspense>
    </PageContainer>
  );
}

async function SettingsContent() {
  const { supabase, timezone, displayName, today } = await getUserContext();
  const [t, ta] = await Promise.all([getTranslations("settings"), getTranslations("auth")]);
  const { start, end } = dayRangeUtc(today, timezone);
  const [{ count }, { data: claims }] = await Promise.all([
    supabase.from("ai_runs").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
    supabase.auth.getClaims(),
  ]);
  const email = (claims?.claims?.email as string | undefined) ?? "";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">{t("profile")}</h2>
        <ProfileForm timezone={timezone} displayName={displayName} timezones={Intl.supportedValuesOf("timeZone")} />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-2 text-sm font-medium">{t("language")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("languageHint")}</p>
        <LanguageSwitcher />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-2 text-sm font-medium">{t("aiUsage")}</h2>
        <p className="text-sm text-muted-foreground">{t("aiUsed", { count: count ?? 0, limit: AI_DAILY_LIMIT })}</p>
      </section>

      <section className="flex items-center justify-between rounded-xl border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">{t("account")}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            {ta("logout")}
          </Button>
        </form>
      </section>
    </div>
  );
}
