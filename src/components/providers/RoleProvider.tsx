"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ROLE_STORAGE_KEY, type UserRole } from "@/types/role";

type RoleContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  isConsumer: boolean;
  isProfessional: boolean;
  /** Demo unread flag until messaging is wired to Supabase */
  hasUnreadMessages: boolean;
  setHasUnreadMessages: (value: boolean) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

const ROLE_EVENT = "story-home-role-change";

function parseRole(value: string | null): UserRole {
  return value === "professional" || value === "consumer" ? value : "consumer";
}

function readStoredRole(): UserRole {
  return parseRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
}

function subscribeToRole(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(ROLE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ROLE_EVENT, handler);
  };
}

function applyTheme(role: UserRole) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.role = role;
}

function writeRole(role: UserRole) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  applyTheme(role);
  window.dispatchEvent(new Event(ROLE_EVENT));
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const role = useSyncExternalStore(
    subscribeToRole,
    readStoredRole,
    () => "consumer" as const,
  );
  const [hasUnreadMessages, setHasUnreadMessages] = useState(true);

  useEffect(() => {
    applyTheme(role);
  }, [role]);

  const setRole = useCallback((next: UserRole) => {
    writeRole(next);
  }, []);

  const toggleRole = useCallback(() => {
    writeRole(role === "consumer" ? "professional" : "consumer");
  }, [role]);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      setRole,
      toggleRole,
      isConsumer: role === "consumer",
      isProfessional: role === "professional",
      hasUnreadMessages,
      setHasUnreadMessages,
    }),
    [role, setRole, toggleRole, hasUnreadMessages],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return ctx;
}
