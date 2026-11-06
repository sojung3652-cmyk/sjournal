import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted-foreground">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
        오늘로 돌아가기
      </Link>
    </main>
  );
}
