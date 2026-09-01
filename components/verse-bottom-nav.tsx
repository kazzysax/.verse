"use client";

import Link from "next/link";
import { Clock3, Home, Store, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Clock3 },
  { href: "/marketplace", label: "Market", icon: Store },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function VerseBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-4 left-1/2 z-40 flex h-[72px] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 items-center gap-1 rounded-[28px] border border-white/45 bg-white/[.92] p-2 text-[#181721] shadow-[0_22px_70px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      {destinations.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex h-14 items-center justify-center rounded-[22px] transition-[width,background-color,color,transform] duration-300",
              active
                ? "verse-gradient w-[42%] min-w-[116px] gap-2.5 px-5 font-extrabold text-white shadow-[0_10px_28px_rgba(132,58,240,.34)]"
                : "w-[19.33%] text-[#565462] hover:-translate-y-0.5 hover:bg-black/[.04]",
            )}
          >
            <Icon className={cn("shrink-0", active ? "size-5" : "size-6")} strokeWidth={active ? 2.5 : 2} />
            {active && <span className="text-sm">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
