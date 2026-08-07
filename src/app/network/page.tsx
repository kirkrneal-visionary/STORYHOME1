import type { Metadata } from "next";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Network",
};

export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-white px-6 pb-16 pt-[96px] md:pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-accent">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-navy">Network</h1>
        <p className="mt-2 text-sm text-slate-500">
          Professional directory and relationship graph. Supabase-backed follows
          and introductions land here next.
        </p>
      </div>
    </div>
  );
}
