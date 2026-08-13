"use client";

import { AppProvider } from "@/components/AppContext";
import { AuthProvider } from "@/components/AuthContext";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SuitesProvider } from "@/components/SuitesContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AuthProvider>
        <SuitesProvider>
          <MotionProvider>{children}</MotionProvider>
        </SuitesProvider>
      </AuthProvider>
    </AppProvider>
  );
}
