import { CalendarDays, Columns3, Home, Link2, Settings, Tags } from "lucide-react";

// `tab: false` = not in the mobile bottom tab bar (Settings lives in the mobile top bar).
export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: Home, tab: true },
  { href: "/board", label: "Board", icon: Columns3, tab: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, tab: true },
  { href: "/categories", label: "Categories", icon: Tags, tab: true },
  { href: "/links", label: "Links", icon: Link2, tab: true },
  { href: "/settings", label: "Settings", icon: Settings, tab: false },
] as const;

export const TAB_ITEMS = NAV_ITEMS.filter((i) => i.tab);

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/day/") || pathname.startsWith("/notes/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
