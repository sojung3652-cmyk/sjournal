import { CalendarDays, Columns3, Home, Settings, Tags } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "오늘", icon: Home },
  { href: "/board", label: "보드", icon: Columns3 },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/categories", label: "카테고리", icon: Tags },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/day/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
