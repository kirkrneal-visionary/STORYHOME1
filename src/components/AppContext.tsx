"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type Role = "consumer" | "professional";

const ROLE_STORAGE_KEY = "story-home-role";
const ROLE_EVENT = "story-home-role-change";

interface AppContextType {
  role: Role;
  toggleRole: () => void;
  setRole: (role: Role) => void;
  unreadMessages: boolean;
  setUnreadMessages: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function parseRole(value: string | null): Role {
  return value === "professional" || value === "consumer" ? value : "consumer";
}

function readStoredRole(): Role {
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

function writeRole(role: Role) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event(ROLE_EVENT));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const role = useSyncExternalStore(
    subscribeToRole,
    readStoredRole,
    () => "consumer" as const,
  );
  const [unreadMessages, setUnreadMessages] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.role = role;
  }, [role]);

  const setRole = useCallback((next: Role) => {
    writeRole(next);
  }, []);

  const toggleRole = useCallback(() => {
    writeRole(role === "consumer" ? "professional" : "consumer");
  }, [role]);

  const value = useMemo(
    () => ({
      role,
      toggleRole,
      setRole,
      unreadMessages,
      setUnreadMessages,
    }),
    [role, toggleRole, setRole, unreadMessages],
  );

  return (
    <AppContext.Provider value={value}>
      <div className="min-h-screen bg-white font-sans text-slate-text transition-colors duration-300">
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
