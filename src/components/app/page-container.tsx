import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Content width per page: text pages are narrow, the board is wide. */
export function PageContainer({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto w-full", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</div>;
}
