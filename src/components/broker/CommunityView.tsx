"use client";

import { useEffect, useState } from "react";
import { Building2, LibraryBig, MessagesSquare, Settings, Globe } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import {
  getEffectiveMember,
  loadCommunity,
  useCommunity,
} from "@/components/broker/communityStore";
import { isBroker } from "@/lib/community";
import { CommunityChannels } from "@/components/broker/community/Channels";
import { CommunityLibrary } from "@/components/broker/community/Library";
import { CommunityQA } from "@/components/broker/community/QA";
import { CommunityAdmin } from "@/components/broker/community/Admin";
import { cn } from "@/lib/utils";

type Section = "channels" | "library" | "qa" | "admin";

export function CommunityView() {
  const { user } = useAuth();
  const state = useCommunity();
  const [section, setSection] = useState<Section>("channels");

  useEffect(() => {
    if (user) void loadCommunity(user);
  }, [user]);

  if (!user) return null;
  const member = state.me ?? getEffectiveMember(user);
  const broker = isBroker(member);
  const brokerageLabel = state.brokerageName || "Your brokerage";

  const sections: { id: Section; label: string; icon: typeof Building2 }[] = [
    { id: "channels", label: "Brokerage", icon: MessagesSquare },
    { id: "library", label: "Knowledge Library", icon: LibraryBig },
    { id: "qa", label: "Pro Q&A", icon: Globe },
    ...(broker
      ? [{ id: "admin" as const, label: "Broker Admin", icon: Settings }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Community</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {brokerageLabel} · signed in as {member.name}. Empty rooms mean no
            posts yet — not a public Story Home network.
          </p>
        </div>
        <span
          className={cn(
            "self-start rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase",
            broker
              ? "bg-gold text-navy"
              : "border border-hairline text-[var(--muted)]",
          )}
        >
          {member.credential}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-hairline pb-px">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "story-press -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              section === id
                ? "border-[var(--accent)] text-ink"
                : "border-transparent text-[var(--muted)] hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {!state.loaded ? (
          <p className="text-sm text-[var(--muted)]">Loading community…</p>
        ) : !member.brokerageId && section !== "qa" ? (
          <div className="story-well border-dashed p-8 text-center text-sm text-[var(--muted)]">
            Join a brokerage to access channels and the knowledge library. (Pro
            Q&amp;A is open to everyone.)
          </div>
        ) : (
          <>
            {section === "channels" && <CommunityChannels member={member} />}
            {section === "library" && <CommunityLibrary member={member} />}
            {section === "qa" && <CommunityQA member={member} />}
            {section === "admin" && broker && <CommunityAdmin member={member} />}
          </>
        )}
      </div>
    </div>
  );
}
