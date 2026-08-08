"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  loginSellerWithCode: (
    code: string,
  ) => { ok: true } | { ok: false; error: string };
  loginPro: (proRole: ProRole, name?: string) => void;
  loginConsumer: (name?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistUser(user: AuthUser | null) {
  try {
    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setRole } = useApp();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setUser(parseStoredUser(window.localStorage.getItem(AUTH_STORAGE_KEY)));
    } catch {
      setUser(null);
    }
    setReady(true);
  }, []);

  const loginAs = useCallback(
    (next: AuthUser) => {
      setUser(next);
      persistUser(next);
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
    setUser(null);
    persistUser(null);
    setRole("consumer");
  }, [setRole]);

  const value = useMemo(
    () => ({
      user: ready ? user : null,
      isLoggedIn: ready && Boolean(user),
      loginAs,
      loginSellerWithCode,
      loginPro,
      loginConsumer,
      logout,
    }),
    [
      ready,
      user,
      loginAs,
      loginSellerWithCode,
      loginPro,
      loginConsumer,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
