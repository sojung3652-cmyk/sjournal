"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { writeLocaleCookie } from "@/i18n/locale-cookie";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

async function origin() {
  return (await headers()).get("origin") ?? "http://localhost:3000";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth.errors");
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: t("missing") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: t("invalid") };

  // profiles.locale is the source of truth: mirror it into the cookie on login.
  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", data.user.id).maybeSingle();
  if (isLocale(profile?.locale)) await writeLocaleCookie(profile.locale);

  redirect("/");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: t("errors.missing") };
  if (password.length < 6) return { error: t("errors.shortPassword") };

  // The language in use becomes the profile locale and picks the default category names
  // (handle_new_user reads raw_user_meta_data.locale). Auth email templates branch on it too.
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback`, data: { locale } },
  });
  if (error) return { error: error.message };

  // Email confirmation on: no session until the link is clicked.
  if (!data.session) return { message: t("confirmSent") };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: t("errors.missing") };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?next=/auth/reset` });
  // Same message whether or not the account exists, so the form can't be used to find accounts.
  return { message: t("reset.sent") };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: t("errors.shortPassword") };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: t("reset.expired") };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: t("errors.generic") };
  redirect("/");
}
