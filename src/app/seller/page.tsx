import type { Metadata } from "next";
import { SellerAccessForm } from "@/components/seller/SellerAccessForm";

export const metadata: Metadata = {
  title: "Seller Client Portal",
};

export default function SellerAccessPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-md">
        <p className="font-sans text-2xl font-extrabold tracking-tight">
          <span className="text-navy">STORY</span>
          <span className="text-gold">HOME</span>
        </p>
        <p className="mt-1 font-mono text-[10px] font-bold tracking-[0.14em] text-[var(--muted)]">
          SELLER CLIENT PORTAL
        </p>
        <h1 className="mt-8 font-serif text-3xl font-bold text-ink">
          See how your home is doing online
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Enter the access code from your agent. No Story Home account required.
          Access expires automatically if the listing is sold or withdrawn.
        </p>
        <SellerAccessForm />
      </div>
    </div>
  );
}
