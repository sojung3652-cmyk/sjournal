import { categoryStyle } from "@/lib/categories";
import { cn } from "@/lib/utils";

// Pill badge in the category's fixed color. Text tone is computed to keep
// >= 4.5:1 contrast (see src/lib/categories.ts). Same look in light and dark.
export function CategoryBadge({ name, color, className }: { name: string; color: string; className?: string }) {
  const { bg, fg } = categoryStyle(color);
  return (
    <span
      className={cn("inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}
