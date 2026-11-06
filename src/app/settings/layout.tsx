import Link from "next/link";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">설정</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          오늘로 돌아가기
        </Link>
      </header>
      <nav className="flex gap-4 border-b text-sm">
        <Link href="/settings/categories" className="-mb-px border-b-2 border-foreground pb-2 font-medium">
          카테고리
        </Link>
      </nav>
      {children}
    </div>
  );
}
