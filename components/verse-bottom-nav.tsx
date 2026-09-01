"use client";

import { Clock3, Home, Store, UserRound, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Clock3 },
  { href: "/friends", label: "Friends", icon: UsersRound },
  { href: "/marketplace", label: "Market", icon: Store },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function VerseBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-4 left-1/2 z-40 grid h-[72px] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 grid-cols-5 items-center rounded-[32px] border border-white/50 bg-white/[.93] p-2 text-[#181721] shadow-[0_22px_70px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      {destinations.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            title={label}
            className={cn(
              "relative mx-auto flex size-14 items-center justify-center overflow-hidden rounded-[22px] transition-[color,transform,background-color] duration-300",
              active
                ? "verse-nav-active verse-gradient text-white shadow-[0_10px_30px_rgba(132,58,240,.38)]"
                : "text-[#565462] hover:-translate-y-0.5 hover:bg-black/[.04]",
            )}
          >
            {active && <span aria-hidden="true" className="absolute -left-4 -top-8 size-16 rounded-full bg-white/30 blur-xl" />}
            <Icon className={cn("relative z-10 shrink-0", active ? "size-5.5" : "size-6")} strokeWidth={active ? 2.5 : 2} />
          </a>
        );
      })}
    </nav>
  );
}
