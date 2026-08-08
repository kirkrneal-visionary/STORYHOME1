"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  AUTH_STORAGE_KEY,
  type AuthUser,
  type ProRole,
  parseStoredUser,
} from "@/lib/auth";
import { findSellerListingByCode } from "@/lib/seller-portal";
import { useApp } from "@/components/AppContext";

type AuthContextType = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  loginAs: (user: AuthUser) => void;
  loginSellerWithCode: (code: string) => { ok: true } | { ok: false; error: string };
  loginPro: (proRole: ProRole, name?: string) => void;
  loginConsumer: (name?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_EVENT = "story-home-auth-change";

function readUser(): AuthUser | null {
  return parseStoredUser(window.localStorage.getItem(AUTH_STORAGE_KEY));
}

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(AUTH_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTH_EVENT, handler);
  };
}

function writeUser(user: AuthUser | null) {
  if (user) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setRole } = useApp();
  const user = useSyncExternalStore(subscribe, readUser, () => null);

  const loginAs = useCallback(
    (next: AuthUser) => {
      writeUser(next);
      setRole(next.kind === "pro" ? "professional" : "consumer");
    },
    [setRole],
  );

  const loginConsumer = useCallback(
    (name = "Jordan Hale") => {
      loginAs({
        id: "user-buyer",
        name,
        email: "jordan@storyhome.demo",
        initials: name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        kind: "consumer",
      });
    },
    [loginAs],
  );

  const loginPro = useCallback(
    (proRole: ProRole, name = "Sarah Jenkins") => {
      loginAs({
        id: `user-pro-${proRole}`,
        name,
        email: `${proRole}@storyhome.demo`,
        initials: name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        kind: "pro",
        proRole,
      });
    },
    [loginAs],
  );

  const loginSellerWithCode = useCallback(
    (code: string) => {
      const listing = findSellerListingByCode(code);
      if (!listing) {
        return { ok: false as const, error: "Invalid seller access code." };
      }
      if (
        listing.status === "Sold" ||
        listing.status === "Withdrawn" ||
        listing.status === "Terminated" ||
        listing.status === "Expired"
      ) {
        return {
          ok: false as const,
          error: "This listing access code is no longer active.",
        };
      }
      loginAs({
        id: `seller-${listing.accessCode}`,
        name: `Seller · ${listing.addressSerif}`,
        email: "seller@storyhome.demo",
        initials: "SE",
        kind: "seller",
        sellerListingCode: listing.accessCode,
      });
      return { ok: true as const };
    },
    [loginAs],
  );

  const logout = useCallback(() => {
    writeUser(null);
    setRole("consumer");
  }, [setRole]);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      loginAs,
      loginSellerWithCode,
      loginPro,
      loginConsumer,
      logout,
    }),
    [user, loginAs, loginSellerWithCode, loginPro, loginConsumer, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
