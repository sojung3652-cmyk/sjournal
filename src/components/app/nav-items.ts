import { CalendarDays, Columns3, Home, Settings, Tags } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/board", label: "Board", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/day/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
