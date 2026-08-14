"use client";

import { Suspense } from "react";
import { AppProvider } from "@/components/AppContext";
import { AuthProvider } from "@/components/AuthContext";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { SuitesProvider } from "@/components/SuitesContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AuthProvider>
        <SuitesProvider>
          <MotionProvider>
            <Suspense fallback={null}>
              <SoundProvider>{children}</SoundProvider>
            </Suspense>
          </MotionProvider>
        </SuitesProvider>
      </AuthProvider>
    </AppProvider>
  );
}
