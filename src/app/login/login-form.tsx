"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { login, signup, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, undefined);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <form action={isLogin ? loginAction : signupAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={6} required />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {isLogin ? t("login") : t("signup")}
      </Button>
      <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode(isLogin ? "signup" : "login")}>
        {isLogin ? t("toSignup") : t("toLogin")}
      </button>
      {isLogin && (
        <Link href="/auth/forgot" className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
          {t("forgot")}
        </Link>
      )}
    </form>
  );
}
