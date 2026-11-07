import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { NewPasswordForm } from "@/components/auth/password-forms";

// Reached from the reset email via /auth/callback, which signs the user in with the link's code.
export default async function ResetPage() {
  const t = await getTranslations("auth.reset");
  return (
    <AuthCard title={t("newTitle")}>
      <NewPasswordForm />
    </AuthCard>
  );
}
