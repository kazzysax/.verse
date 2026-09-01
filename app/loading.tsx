import { VerseLoader } from "@/components/verse-loader";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080910] text-white">
      <VerseLoader className="size-20" />
    </main>
  );
}
