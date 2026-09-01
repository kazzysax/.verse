import { Search, Store } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";

export default function MarketplacePage() {
  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[760px] px-4 pb-32 pt-12 sm:px-8">
        <div className="text-center">
          <div className="verse-gradient mx-auto grid size-16 place-items-center rounded-[22px] shadow-[0_18px_55px_rgba(132,58,240,.3)]"><Store className="size-7" /></div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.06em]">Marketplace</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">Discover and trade memorable .verse names.</p>
        </div>

        <section className="mt-9 rounded-[30px] border border-white/[.08] bg-[#13151f]/88 p-5 sm:p-7">
          <div className="flex h-13 items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.045] px-4 text-white/35">
            <Search className="size-5" />
            <span className="text-sm font-semibold">Search .verse names</span>
          </div>
          <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[.025] px-6 py-12 text-center">
            <Store className="mx-auto size-8 text-fuchsia-300" />
            <p className="mt-4 text-lg font-extrabold">Marketplace setup is next</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/40">Listings stay inactive until the pricing, offer, and purchase rules are confirmed.</p>
          </div>
        </section>
      </main>
    </VersePageShell>
  );
}
