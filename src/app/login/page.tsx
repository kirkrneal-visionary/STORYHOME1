import { Suspense } from "react";
import { LoginClient } from "@/components/LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-[96px] text-sm text-[var(--muted)]">
          Loading sign-in…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
