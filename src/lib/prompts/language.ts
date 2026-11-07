// AI output language follows the user's UI locale (profiles.locale / cookie), not the language
// of the notes. Technical terms may keep the original in parentheses. Already-saved AI results
// are never re-translated (they are displayed as stored).
const NAMES: Record<string, string> = { en: "English", ko: "Korean" };

export function outputLanguageRule(locale: string): string {
  const lang = NAMES[locale] ?? NAMES.en;
  return `- Write every output string in ${lang}, even if the source material is in another language. Technical terms may keep the original term in parentheses (e.g. "역전파 (backpropagation)").`;
}
