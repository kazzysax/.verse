import type { Metadata } from "next";
import { VerseOnboarding } from "@/components/verse-onboarding";

export const metadata: Metadata = {
  title: "Create your .verse account",
  description: "Sign up with email or an optional social identity, claim a free .verse username, and create your wallet.",
};

export default function SignupPage() {
  return <VerseOnboarding />;
}
