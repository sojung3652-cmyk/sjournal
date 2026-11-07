import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">The address changed or the page was deleted.</p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Back to Today
      </Link>
    </main>
  );
}
