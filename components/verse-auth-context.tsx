"use client";

import { createContext, useContext } from "react";

export type VerseAuthUser = {
  id: string;
  email?: { address: string };
  twitter?: { username: string | null };
  telegram?: { username: string | null };
};

export type VerseAuthValue = {
  ready: boolean;
  authenticated: boolean;
  user: VerseAuthUser | null;
  login: (options?: { loginMethods?: Array<"email" | "twitter" | "telegram"> }) => void;
  logout: () => Promise<void>;
  linkEmail: () => void;
  getAccessToken: () => Promise<string | null>;
};

export const emptyVerseAuth: VerseAuthValue = {
  ready: false,
  authenticated: false,
  user: null,
  login: () => undefined,
  logout: async () => undefined,
  linkEmail: () => undefined,
  getAccessToken: async () => null,
};

export const VerseAuthContext = createContext<VerseAuthValue>(emptyVerseAuth);

export function useVerseAuth() {
  return useContext(VerseAuthContext);
}
