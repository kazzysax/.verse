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
        "inline-flex h-10 items-center gap-[0.12em] text-xl font-extrabold tracking-[-0.065em]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="verse-gradient inline-block size-[0.48em] shrink-0 translate-y-[0.28em] rounded-full shadow-[0_5px_14px_rgba(184,0,255,.34)]"
      />
      <span className="text-[1em]">verse</span>
    </span>
  );
}
