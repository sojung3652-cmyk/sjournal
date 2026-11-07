import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./config";

/** The cookie mirrors profiles.locale (logged in) or the visitor's choice (logged out). */
export async function writeLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
