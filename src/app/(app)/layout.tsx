import { Suspense } from "react";
import { BottomTabs, BottomTabsView, MobileTopBar, SideNav, SideNavView } from "@/components/app/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1">
      {/* usePathname() is request data on dynamic routes, so the nav needs a boundary. */}
      <Suspense fallback={<SideNavView pathname="" />}>
        <SideNav />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="w-full flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-10 md:pb-12">{children}</main>
      </div>
      <Suspense fallback={<BottomTabsView pathname="" />}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}
