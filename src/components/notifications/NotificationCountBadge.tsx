import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NotificationCountBadgeProps = {
  count: number;
  className?: string;
};

function formatCount(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

export function NotificationCountBadge({
  count,
  className,
}: NotificationCountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <Badge
      className={cn(
        "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-0 bg-breneo-blue p-0 px-1 text-[10px] font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {formatCount(count)}
    </Badge>
  );
}
