import { cn } from "@/lib/utils";

export function VerseLogo({
  className,
  showName: _showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  void _showName;
  return (
    <span
      aria-label=".verse"
      className={cn(
        "inline-flex items-baseline gap-[0.1em] text-xl font-extrabold tracking-[-0.065em]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="verse-gradient inline-block size-[0.35em] shrink-0 rounded-full shadow-[0_2px_8px_rgba(184,0,255,.4)] translate-y-[-0.04em]"
      />
      <span className="text-[1em]">verse</span>
    </span>
  );
}
