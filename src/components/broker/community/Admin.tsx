"use client";

import { useState } from "react";
import { ShieldCheck, UserCog, Users } from "lucide-react";
import { type Member } from "@/lib/community";
import {
  useCommunity,
  createTeam,
  setTeamLeaderAuthorized,
} from "@/components/broker/communityStore";
import { formatDate } from "@/components/broker/community/shared";
import { cn } from "@/lib/utils";

export function CommunityAdmin({ member }: { member: Member }) {
  const state = useCommunity();

  const [teamName, setTeamName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState(true);

  const agents = state.members.filter((m) => m.role === "agent");

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submitTeam() {
    if (!teamName.trim() || !leaderId) return;
    createTeam({
      name: teamName.trim(),
      leaderId,
      memberIds,
      authorized,
    });
    setTeamName("");
    setLeaderId("");
    setMemberIds([]);
    setAuthorized(true);
  }

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-hairline bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--muted)]">
        Broker Admin · {member.name}. Your authority here applies across the whole
        community — roster, teams, channels, and the library.
      </p>

      {/* Roster */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold text-ink">
          <UserCog className="h-5 w-5" /> Roster &amp; team authorization
        </h3>
        <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-[var(--surface)]">
          {state.members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-xs font-bold text-navy">
                  {m.initials}
                </span>
                <div>
                  <p className="font-semibold text-ink">{m.name}</p>
                  <p className="font-mono text-[11px] text-[var(--muted)]">
                    {m.role === "broker" ? "Broker of Record" : "Agent"} ·{" "}
                    {m.credential}
                  </p>
                </div>
              </div>
              {m.role === "agent" ? (
                <button
                  type="button"
                  onClick={() =>
                    setTeamLeaderAuthorized(m.id, !m.teamLeaderAuthorized)
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold",
                    m.teamLeaderAuthorized
                      ? "bg-teal-soft text-paper"
                      : "border border-hairline text-ink",
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {m.teamLeaderAuthorized
                    ? "Team-authorized"
                    : "Authorize as team leader"}
                </button>
              ) : (
                <span className="font-mono text-[10px] font-bold text-gold uppercase">
                  Full authority
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Teams */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold text-ink">
          <Users className="h-5 w-5" /> Teams
        </h3>

        <div className="grid gap-4 lg:grid-cols-2">
          {state.teams.map((t) => {
            const leader = state.members.find((m) => m.id === t.leaderId);
            return (
              <div
                key={t.id}
                className="rounded-xl border border-hairline bg-[var(--surface)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-serif text-lg font-bold text-ink">
                    {t.name}
                  </p>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                      t.authorized
                        ? "bg-teal-soft text-paper"
                        : "bg-gold/20 text-gold",
                    )}
                  >
                    {t.authorized ? "Authorized" : "Pending"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  Leader: {leader?.name ?? t.leaderId} · {t.memberIds.length}{" "}
                  members · created {formatDate(t.createdAt)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Create team */}
        <div className="mt-4 space-y-3 rounded-xl border border-hairline bg-[var(--surface)] p-4">
          <p className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Create &amp; authorize a team
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="h-10 rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink outline-none focus:border-gold"
            />
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="h-10 rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink outline-none focus:border-gold"
            >
              <option value="">Choose team leader…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
              Members
            </p>
            <div className="flex flex-wrap gap-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleMember(a.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    memberIds.includes(a.id)
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "border border-hairline text-ink",
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Broker-authorized (required for the team to be active)
          </label>
          <button
            type="button"
            disabled={!teamName.trim() || !leaderId}
            onClick={submitTeam}
            className={cn(
              "h-10 rounded-lg px-5 text-sm font-bold",
              teamName.trim() && leaderId
                ? "bg-gold text-navy"
                : "cursor-not-allowed bg-gold/30 text-navy/50",
            )}
          >
            Create team
          </button>
        </div>
      </section>
    </div>
  );
}
