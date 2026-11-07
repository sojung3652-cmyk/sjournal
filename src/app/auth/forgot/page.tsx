import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/password-forms";

export default async function ForgotPage({ searchParams }: PageProps<"/auth/forgot">) {
  const t = await getTranslations("auth.reset");
  return (
    <AuthCard title={t("title")}>
      <Suspense fallback={<ForgotForm expired={false} />}>
        <Forgot searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Forgot({ searchParams }: { searchParams: PageProps<"/auth/forgot">["searchParams"] }) {
  return <ForgotForm expired={(await searchParams).error === "expired"} />;
}
