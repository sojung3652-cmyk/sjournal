import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// '오늘' (home). Setup phase: date + logout only. Features come in later phases.
export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <Suspense fallback={<div className="h-12" />}>
        <TodayHeader />
      </Suspense>
      <section className="flex-1" aria-label="오늘" />
    </main>
  );
}

async function TodayHeader() {
  // Stop prerendering here: everything below (session, new Date()) is per-request.
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, locale")
    .eq("id", userId)
    .single();

  // '오늘' is computed in the user's timezone (PRD risk: KR/US travel).
  const timezone = profile?.timezone ?? "Asia/Seoul";
  const today = new Intl.DateTimeFormat("ko-KR", {
    timeZone: timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">오늘</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          로그아웃
        </Button>
      </form>
    </header>
  );
}
