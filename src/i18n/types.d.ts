import type en from "../../messages/en.json";
import type { LOCALES } from "./config";

// Type-checks every t("...") key against messages/en.json (ko.json must mirror it; see scripts/check-messages).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof LOCALES)[number];
    Messages: typeof en;
  }
}
