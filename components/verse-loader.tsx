import { cn } from "@/lib/utils";

export function VerseLoader({
  className,
  label = "Loading .verse",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-grid place-items-center", className)}>
      <span aria-hidden="true" className="verse-loading-dot verse-gradient block size-8 rounded-full" />
    </span>
  );
}
