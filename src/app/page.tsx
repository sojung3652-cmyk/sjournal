import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
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
  // createClient() calls connection(), so new Date() below is request-time.
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
      <div className="flex items-center gap-1">
        <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          설정
        </Link>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}
