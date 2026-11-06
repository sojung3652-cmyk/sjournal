"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Desktop: left sidebar. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-card px-3 py-6 md:flex">
      <Link href="/" className="px-3 pb-6 text-base font-semibold">
        Study Journal
      </Link>
      <Link
        href="/search"
        className={cn(
          "mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted",
          isActive(pathname, "/search") && "border-accent-strong text-foreground",
        )}
      >
        <Search className="size-4" />
        검색
      </Link>
      <nav className="flex flex-col gap-1" aria-label="주요 메뉴">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-accent-strong")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Mobile: top bar (title + search) and bottom tab bar. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Link href="/" className="text-sm font-semibold">
        Study Journal
      </Link>
      <Link href="/search" aria-label="검색" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
        <Search className="size-5" />
      </Link>
    </header>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
              active && "font-medium text-foreground",
            )}
          >
            <Icon className={cn("size-5", active && "text-accent-strong")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
