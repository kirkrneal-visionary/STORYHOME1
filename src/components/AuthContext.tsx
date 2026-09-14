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
import {
  parseAssuranceLevel,
  signInPublicMessage,
} from "@/lib/account/assurance";
import { signUpPublicMessage } from "@/lib/account/password-strength";
import { navRoleForAccount, type AccountPurpose } from "@/lib/account/purpose";
import { useApp } from "@/components/AppContext";
import { track, type AccountKindProp } from "@/lib/analytics";
import {
  getBrowserSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

function accountKindForAnalytics(user: AuthUser): AccountKindProp {
  if (user.kind === "broker") return "broker";
  if (user.kind === "pro") return "agent";
  if (user.kind === "seller") return "seller";
  if (user.kind === "consumer") return "consumer";
  return "unknown";
}

export type AuthResult =
  | { ok: true; needsMfa?: boolean; emailUnconfirmed?: boolean }
  | { ok: false; error: string; emailUnconfirmed?: boolean };

type AuthContextType = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** Whether real Supabase Auth is active (vs demo mode). */
  supabaseConfigured: boolean;
  loginAs: (user: AuthUser) => void;
  loginSellerWithCode: (code: string) => Promise<AuthResult>;
  loginPro: (proRole: ProRole, name?: string) => void;
  loginConsumer: (name?: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    opts: {
      fullName: string;
      accountKind: AccountKind;
      professionalRole?: ProRole;
      trecLicense?: string;
      trecStatus?: string;
      sponsorLicenseNumber?: string;
      sponsorName?: string;
    },
  ) => Promise<AuthResult>;
  resetPasswordForEmail: (email: string) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOutEverywhere: () => Promise<void>;
  refreshAssurance: () => Promise<void>;
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

    const promoted = new Set<string>();

    async function applySession(userId: string | null, email: string | null) {
      if (!userId) {
        if (active) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      let emailConfirmed = false;
      let aal: AuthUser["aal"];
      let mfaEnrolled = false;
      try {
        const { data: authUser } = await supabase!.auth.getUser();
        emailConfirmed = Boolean(authUser.user?.email_confirmed_at);
        const { data: aalData } =
          await supabase!.auth.mfa.getAuthenticatorAssuranceLevel();
        aal = parseAssuranceLevel(aalData?.currentLevel) ?? undefined;
        const { data: factors } = await supabase!.auth.mfa.listFactors();
        mfaEnrolled = Boolean(
          factors?.totp?.some((f) => f.status === "verified"),
        );
      } catch {
        emailConfirmed = false;
      }

      if (emailConfirmed && !promoted.has(userId)) {
        promoted.add(userId);
        try {
          await fetch("/api/account/promote-pro", { method: "POST" });
        } catch {
          // Stay consumer until the next sign-in.
        }
      }
      let name = email?.split("@")[0] ?? "Member";
      let kind: AccountKind = "consumer";
      let purpose: AccountPurpose | undefined;
      let proRole: ProRole | undefined;
      try {
        const { data } = await supabase!
          .from("profiles")
          .select("full_name, account_kind, account_purpose, professional_role")
          .eq("id", userId)
          .maybeSingle();
        if (data) {
          name = data.full_name || name;
          kind = kindFromAccount(data.account_kind);
          purpose = (data.account_purpose as AccountPurpose | null) ?? undefined;
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
        purpose,
        proRole,
        emailConfirmed,
        aal,
        mfaEnrolled,
      });
      setRole(navRoleForAccount(purpose, kind));
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
      setRole(navRoleForAccount(next.purpose, next.kind));
      track("auth_login_succeeded", {
        account_kind: accountKindForAnalytics(next),
      });
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
    async (code: string): Promise<AuthResult> => {
      try {
        const res = await fetch("/api/seller/access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          accessCode?: string;
          addressLabel?: string;
        };
        if (!res.ok || !data.ok || !data.accessCode) {
          return {
            ok: false,
            error: "Unable to open this portal. Check the code and try again.",
          };
        }
        loginAs({
          id: `seller-${data.accessCode}`,
          name: `Seller · ${data.addressLabel || "listing"}`,
          email: "seller@storyhome.app",
          initials: "SE",
          kind: "seller",
          sellerListingCode: data.accessCode,
        });
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "Unable to open this portal. Check the code and try again.",
        };
      }
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
      if (error) {
        const emailUnconfirmed =
          error.message.toLowerCase().includes("not confirmed");
        return {
          ok: false,
          error: signInPublicMessage(error.message),
          emailUnconfirmed,
        };
      }
      let emailUnconfirmed = false;
      let needsMfa = false;
      try {
        const { data: authUser } = await supabase.auth.getUser();
        emailUnconfirmed = !authUser.user?.email_confirmed_at;
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        needsMfa =
          aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2";
      } catch {
        // session still established
      }
      return { ok: true, needsMfa, emailUnconfirmed };
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
        trecLicense?: string;
        trecStatus?: string;
        sponsorLicenseNumber?: string;
        sponsorName?: string;
      },
    ): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Auth is not configured." };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: opts.fullName,
            account_kind: "consumer",
            professional_role: opts.professionalRole ?? null,
            trec_license: opts.trecLicense ?? null,
            sponsor_license_number: opts.sponsorLicenseNumber ?? null,
            sponsor_name: opts.sponsorName ?? null,
          },
        },
      });
      if (error) {
        return {
          ok: false,
          error: signUpPublicMessage(error),
        };
      }
      return { ok: true, emailUnconfirmed: true };
    },
    [supabase],
  );

  const resetPasswordForEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Auth is not configured." };
      const origin = window.location.origin;
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/login?mode=recovery`,
      });
      return { ok: true };
    },
    [supabase],
  );

  const resendConfirmation = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Auth is not configured." };
      if (email.trim()) {
        await supabase.auth.resend({ type: "signup", email: email.trim() });
      } else {
        await fetch("/api/account/resend-confirmation", { method: "POST" });
      }
      return { ok: true };
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Auth is not configured." };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        return { ok: false, error: signUpPublicMessage(error) };
      }
      await supabase.auth.signOut({ scope: "others" });
      return { ok: true };
    },
    [supabase],
  );

  const signOutEverywhere = useCallback(async () => {
    if (supabase) {
      await fetch("/api/account/sign-out-all", { method: "POST" });
      await supabase.auth.signOut({ scope: "global" });
    }
    setUser(null);
    persistUser(null);
    setRole("consumer");
  }, [supabase, setRole]);

  const refreshAssurance = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) return;
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, account_kind, account_purpose, professional_role")
        .eq("id", session.user.id)
        .maybeSingle();
      const purpose = (profile?.account_purpose as AccountPurpose | null) ?? undefined;
      const kind = profile
        ? kindFromAccount(profile.account_kind)
        : undefined;
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: profile?.full_name || prev.name,
              email: authUser.user?.email ?? prev.email,
              emailConfirmed: Boolean(authUser.user?.email_confirmed_at),
              aal: parseAssuranceLevel(aal?.currentLevel) ?? prev.aal,
              mfaEnrolled: Boolean(
                factors?.totp?.some((f) => f.status === "verified"),
              ),
              purpose: purpose ?? prev.purpose,
              kind: kind ?? prev.kind,
              proRole:
                (profile?.professional_role as ProRole | null) ?? prev.proRole,
            }
          : prev,
      );
      if (kind || purpose) {
        setRole(navRoleForAccount(purpose, kind ?? "consumer"));
      }
    } catch {
      // keep last known user
    }
  }, [supabase, setRole]);

  const logout = useCallback(() => {
    if (supabase) {
      void supabase.auth.signOut({ scope: "local" });
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
      resetPasswordForEmail,
      resendConfirmation,
      updatePassword,
      signOutEverywhere,
      refreshAssurance,
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
      resetPasswordForEmail,
      resendConfirmation,
      updatePassword,
      signOutEverywhere,
      refreshAssurance,
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
