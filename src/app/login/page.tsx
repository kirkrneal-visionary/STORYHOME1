import { Suspense } from "react";
import { LoginClient } from "@/components/LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-[calc(var(--story-safe-top)+1.5rem)] text-sm text-[var(--muted)]">
          Loading sign-in…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
