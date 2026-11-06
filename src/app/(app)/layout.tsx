import { BottomTabs, MobileTopBar, SideNav } from "@/components/app/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-10 md:pb-12">{children}</main>
      </div>
      <BottomTabs />
    </div>
  );
}
