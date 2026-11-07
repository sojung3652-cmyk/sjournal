// Finds hardcoded UI text that should live in messages/*.json, and checks key parity.
// Run: npm run check:i18n   (exits 1 on findings)
import fs from "node:fs";
import path from "node:path";

const ROOT = "src";
const SKIP = [/src[\\/]components[\\/]ui[\\/]/, /src[\\/]types[\\/]/, /src[\\/]lib[\\/]prompts[\\/]/, /\.d\.ts$/];
// Words/strings that are not translatable UI copy.
const ALLOW = new Set(["Study Journal", "English", "한국어", "404", "PDF", "AI", "https://…", "—", "·", "e.g."]);

const files: string[] = [];
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name) && !SKIP.some((r) => r.test(p))) files.push(p);
  }
};
walk(ROOT);

const findings: string[] = [];
const hangul = /[가-힣]/;
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    const at = `${f}:${i + 1}`;
    if (hangul.test(line) && !/LOCALE_LABEL|"한국어"/.test(line)) findings.push(`${at} hangul: ${trimmed}`);
    // JSX text node on its own line: starts with a capital letter word, no code characters
    if (/^[A-Z][A-Za-z ,.'’?!:;&()-]{2,}$/.test(trimmed) && !/^[A-Z]\w*,?$/.test(trimmed) && f.endsWith(".tsx") && !ALLOW.has(trimmed)) findings.push(`${at} jsx text: ${trimmed}`);
    // string literals in ternaries / JSX expressions: {cond ? "Text" : ...}
    if (f.endsWith(".tsx")) for (const m of line.matchAll(/[?:]\s*"([A-Z][a-z][^"]{2,})"/g)) if (!ALLOW.has(m[1])) findings.push(`${at} ternary literal: ${m[1]}`);
    // inline >Text< between tags
    for (const m of line.matchAll(/>([A-Z][A-Za-z ,.'’?!:-]{2,})</g)) if (!ALLOW.has(m[1].trim())) findings.push(`${at} jsx text: ${m[1]}`);
    // user-facing attributes with string literals
    for (const m of line.matchAll(/\b(aria-label|placeholder|title|label|alt|description|empty)="([^"]*[A-Za-z]{2,}[^"]*)"/g)) {
      if (!ALLOW.has(m[2])) findings.push(`${at} attr ${m[1]}: ${m[2]}`);
    }
    // error/message strings returned from actions
    for (const m of line.matchAll(/\b(error|message):\s*"([^"]*[A-Za-z]{3,}[^"]*)"/g)) findings.push(`${at} ${m[1]} literal: ${m[2]}`);
  });
}

// key parity
const keys = (o: Record<string, unknown>, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
const en = new Set(keys(JSON.parse(fs.readFileSync("messages/en.json", "utf8"))));
const ko = new Set(keys(JSON.parse(fs.readFileSync("messages/ko.json", "utf8"))));
for (const k of en) if (!ko.has(k)) findings.push(`messages: ko.json missing ${k}`);
for (const k of ko) if (!en.has(k)) findings.push(`messages: en.json missing ${k}`);

for (const f of findings) console.log(f);
console.log(findings.length ? `\n${findings.length} finding(s)` : `ok — ${files.length} files scanned, ${en.size} keys in both locales`);
process.exit(findings.length ? 1 : 0);
