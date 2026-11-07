import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { HtmlLang } from "@/components/i18n/html-lang";
import "./globals.css";

// Pretendard (OFL-1.1) covers Latin and Hangul; bundled locally (not on Google Fonts).
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Study Journal",
  description: "A study journal you can keep in five minutes a day",
};

/**
 * The locale comes from the request (cookie / Accept-Language), which cacheComponents
 * only allows inside <Suspense>. The <html lang> attribute is static and corrected on
 * the client by <HtmlLang>.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pretendard.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <IntlRoot>{children}</IntlRoot>
        </Suspense>
      </body>
    </html>
  );
}

async function IntlRoot({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <NextIntlClientProvider>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
