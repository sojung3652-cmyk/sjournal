import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, fromAcceptLanguage, isLocale } from "./config";

/**
 * Locale order: profiles.locale (mirrored into the NEXT_LOCALE cookie at login and on change)
 * -> cookie -> Accept-Language -> en. No URL prefix.
 * Reads request data, so everything under NextIntlClientProvider renders inside <Suspense>
 * (see app/layout.tsx) — required by cacheComponents.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : (fromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // App code formats dates with an explicit timeZone (profiles.timezone); this only avoids
    // next-intl falling back to the server zone silently.
    timeZone: "UTC",
  };
});
