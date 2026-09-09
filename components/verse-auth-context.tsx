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
  sendEmailCode: (email: string) => Promise<void>;
  loginWithEmailCode: (code: string) => Promise<void>;
  loginWithTwitter: () => Promise<void>;
  loginWithTelegram: () => Promise<void>;
  linkEmail: () => void;
  linkTwitter: () => void | Promise<void>;
  linkTelegram: () => void | Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

function authenticationUnavailable(): never {
  throw new Error("Sign-in is not connected. Please reload and try again.");
}

export const emptyVerseAuth: VerseAuthValue = {
  ready: false,
  authenticated: false,
  user: null,
  login: authenticationUnavailable,
  logout: async () => undefined,
  sendEmailCode: async () => authenticationUnavailable(),
  loginWithEmailCode: async () => authenticationUnavailable(),
  loginWithTwitter: async () => authenticationUnavailable(),
  loginWithTelegram: async () => authenticationUnavailable(),
  linkEmail: authenticationUnavailable,
  linkTwitter: authenticationUnavailable,
  linkTelegram: authenticationUnavailable,
  getAccessToken: async () => null,
};

export const VerseAuthContext = createContext<VerseAuthValue>(emptyVerseAuth);

export function useVerseAuth() {
  return useContext(VerseAuthContext);
}
