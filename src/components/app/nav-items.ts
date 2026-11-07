import { CalendarDays, Columns3, Home, Link2, Settings, Tags } from "lucide-react";

// `key` = messages nav.<key>. `tab: false` = not in the mobile bottom tab bar (Settings is in the top bar).
export const NAV_ITEMS = [
  { href: "/", key: "today", icon: Home, tab: true },
  { href: "/board", key: "board", icon: Columns3, tab: true },
  { href: "/calendar", key: "calendar", icon: CalendarDays, tab: true },
  { href: "/categories", key: "categories", icon: Tags, tab: true },
  { href: "/links", key: "links", icon: Link2, tab: true },
  { href: "/settings", key: "settings", icon: Settings, tab: false },
] as const;

export const TAB_ITEMS = NAV_ITEMS.filter((i) => i.tab);

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/day/") || pathname.startsWith("/notes/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
