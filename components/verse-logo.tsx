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
        "inline-flex h-10 items-center font-extrabold tracking-[-0.065em]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="verse-gradient-text -mr-[0.03em] inline-block translate-y-[-0.015em] text-[3.75rem] leading-[0] drop-shadow-[0_8px_18px_rgba(184,0,255,.24)]"
      >
        .
      </span>
      <span className="text-xl">verse</span>
    </span>
  );
}
