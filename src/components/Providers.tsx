"use client";

import { AppProvider } from "@/components/AppContext";
import { AuthProvider } from "@/components/AuthContext";
import { SuitesProvider } from "@/components/SuitesContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AuthProvider>
        <SuitesProvider>{children}</SuitesProvider>
      </AuthProvider>
    </AppProvider>
  );
}
