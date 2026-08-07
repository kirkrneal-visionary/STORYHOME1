import type { Metadata } from "next";
import { DEMO_AGENT } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-white px-6 pb-16 pt-[96px] md:pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-navy">
            {DEMO_AGENT.initials}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-navy">
              {DEMO_AGENT.fullName}
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wider text-slate-400 uppercase">
              {DEMO_AGENT.primaryMarketCity} · Reputation{" "}
              {DEMO_AGENT.reputationScore}
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-text">
          {DEMO_AGENT.bio}
        </p>
      </div>
    </div>
  );
}
