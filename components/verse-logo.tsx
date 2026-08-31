import { cn } from "@/lib/utils";

export function VerseLogo({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="size-10 shrink-0 drop-shadow-[0_10px_22px_rgba(184,0,255,.22)]"
      >
        <defs>
          <linearGradient id="verse-logo-gradient" x1="10" y1="6" x2="54" y2="58">
            <stop offset="0" stopColor="#20D7F2" />
            <stop offset=".34" stopColor="#2879F2" />
            <stop offset=".69" stopColor="#823AF0" />
            <stop offset="1" stopColor="#F000D2" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#verse-logo-gradient)" />
        <path
          d="M17.5 23.5 27.8 39c2.1 3.2 6.7 3.2 8.8 0l10-15.5"
          fill="none"
          stroke="white"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showName && (
        <span className="text-xl font-extrabold tracking-[-0.045em]">.verse</span>
      )}
    </span>
  );
}
