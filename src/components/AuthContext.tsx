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
  type AccountKind,
  type AuthUser,
  type ProRole,
  parseStoredUser,
} from "@/lib/auth";
import { findSellerListingByCode } from "@/lib/seller-portal";
import { useApp } from "@/components/AppContext";
import {
  getBrowserSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextType = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** Whether real Supabase Auth is active (vs demo mode). */
  supabaseConfigured: boolean;
  loginAs: (user: AuthUser) => void;
  loginSellerWithCode: (code: string) => AuthResult;
  loginPro: (proRole: ProRole, name?: string) => void;
  loginConsumer: (name?: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    opts: { fullName: string; accountKind: AccountKind; professionalRole?: ProRole },
  ) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function kindFromAccount(accountKind: string | null | undefined): AccountKind {
  if (accountKind === "broker") return "broker";
  if (accountKind === "agent") return "pro";
  return "consumer";
}

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

  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => getBrowserSupabase(), []);

  // Load session: real Supabase when configured, otherwise demo localStorage.
  useEffect(() => {
    if (!configured || !supabase) {
      try {
        setUser(parseStoredUser(window.localStorage.getItem(AUTH_STORAGE_KEY)));
      } catch {
        setUser(null);
      }
      setReady(true);
      return;
    }

    let active = true;

    async function applySession(userId: string | null, email: string | null) {
      if (!userId) {
        if (active) {
          setUser(null);
          setReady(true);
        }
        return;
      }
      let name = email?.split("@")[0] ?? "Member";
      let kind: AccountKind = "consumer";
      let proRole: ProRole | undefined;
      try {
        const { data } = await supabase!
          .from("profiles")
          .select("full_name, account_kind, professional_role")
          .eq("id", userId)
          .maybeSingle();
        if (data) {
          name = data.full_name || name;
          kind = kindFromAccount(data.account_kind);
          proRole = (data.professional_role as ProRole | null) ?? undefined;
        }
      } catch {
        // fall back to session-derived defaults
      }
      if (!active) return;
      setUser({
        id: userId,
        name,
        email: email ?? "",
        initials: initialsOf(name),
        kind,
        proRole,
      });
      setRole(kind === "consumer" ? "consumer" : "professional");
      setReady(true);
    }

    supabase.auth
      .getSession()
      .then(({ data }) =>
        applySession(
          data.session?.user?.id ?? null,
          data.session?.user?.email ?? null,
        ),
      );

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, supabase, setRole]);

  const loginAs = useCallback(
    (next: AuthUser) => {
      setUser(next);
      persistUser(next);
      setRole(
        next.kind === "pro" || next.kind === "broker"
          ? "professional"
          : "consumer",
      );
    },
    [setRole],
  );

  const loginConsumer = useCallback(
    (name = "Jordan Hale") => {
      loginAs({
        id: "user-buyer",
        name,
        email: "jordan@storyhome.demo",
        initials: initialsOf(name),
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
        initials: initialsOf(name),
        kind: "pro",
        proRole,
      });
    },
    [loginAs],
  );

  const loginSellerWithCode = useCallback(
    (code: string): AuthResult => {
      const listing = findSellerListingByCode(code);
      if (!listing) {
        return { ok: false, error: "Invalid seller access code." };
      }
      if (
        listing.status === "Sold" ||
        listing.status === "Withdrawn" ||
        listing.status === "Terminated" ||
        listing.status === "Expired"
      ) {
        return {
          ok: false,
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
      return { ok: true };
    },
    [loginAs],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Auth is not configured." };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      opts: {
        fullName: string;
        accountKind: AccountKind;
        professionalRole?: ProRole;
      },
    ): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Auth is not configured." };
      const account_kind =
        opts.accountKind === "pro" ? "agent" : opts.accountKind;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: opts.fullName,
            account_kind,
            professional_role: opts.professionalRole ?? null,
          },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase],
  );

  const logout = useCallback(() => {
    if (supabase) {
      void supabase.auth.signOut();
    }
    setUser(null);
    persistUser(null);
    setRole("consumer");
  }, [supabase, setRole]);

  const value = useMemo(
    () => ({
      user: ready ? user : null,
      isLoggedIn: ready && Boolean(user),
      supabaseConfigured: configured,
      loginAs,
      loginSellerWithCode,
      loginPro,
      loginConsumer,
      signInWithPassword,
      signUp,
      logout,
    }),
    [
      ready,
      user,
      configured,
      loginAs,
      loginSellerWithCode,
      loginPro,
      loginConsumer,
      signInWithPassword,
      signUp,
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
