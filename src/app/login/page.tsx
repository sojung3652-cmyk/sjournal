import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("common");
  return (
    <AuthCard title={t("appName")}>
      <LoginForm />
    </AuthCard>
  );
}
