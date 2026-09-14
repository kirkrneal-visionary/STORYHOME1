"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import {
  listBrokerageAgents,
  type BrokerageAgent,
} from "@/lib/supabase/brokerage";
import {
  addInvite,
  cancelInvite,
  listInvites,
  removeAgent,
  setTeamLeaderAuthorized,
  verifyAgentForBroker,
  type BrokerageInvite,
} from "@/lib/supabase/roster";

export function RosterManager({
  brokerageId,
  brokerId,
  brokerTrecLicense,
}: {
  brokerageId: string;
  brokerId: string;
  brokerTrecLicense: string | null;
}) {
  const [agents, setAgents] = useState<BrokerageAgent[]>([]);
  const [invites, setInvites] = useState<BrokerageInvite[]>([]);
  const [license, setLicense] = useState("");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setAgents(await listBrokerageAgents(brokerageId));
    setInvites(await listInvites(brokerageId));
  }, [brokerageId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function inviteByLicense() {
    setMsg(null);
    if (!brokerTrecLicense) {
      setMsg({
        kind: "err",
        text: "Your broker license isn't on file, so sponsorship can't be verified.",
      });
      return;
    }
    if (!license.trim()) return;
    setChecking(true);
    try {
      const v = await verifyAgentForBroker(license, brokerTrecLicense);
      if (!v.ok || !v.approved) {
        setMsg({
          kind: "err",
          text: v.reason ?? "That license is not an active TREC license.",
        });
        return;
      }
      if (!v.sponsorMatch) {
        setMsg({
          kind: "err",
          text: `TREC shows ${v.fullName ?? "this agent"} is sponsored by ${v.sponsorName ?? "another broker"} — not you. You can only add agents you sponsor.`,
        });
        return;
      }
      await addInvite(
        brokerageId,
        v.licenseNumber ?? license.trim(),
        v.fullName,
        brokerId,
      );
      setLicense("");
      setMsg({
        kind: "ok",
        text: `Invited ${v.fullName}. They'll see a Join button in Settings.`,
      });
      await refresh();
    } catch {
      setMsg({ kind: "err", text: "Couldn't create the invite. Try again." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <h3 className="type-card-title text-ink">Agent roster</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Add agents by TREC license. Story Home confirms with TREC that you
        sponsor them. This does not copy people from anywhere else.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="Agent TREC license # (e.g. 724479)"
          inputMode="numeric"
          className="h-11 w-full story-surface px-4 text-sm text-ink outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={() => void inviteByLicense()}
          disabled={checking}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold px-4 text-sm font-bold text-gold disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" /> {checking ? "Checking…" : "Verify & invite"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg.kind === "ok" ? "text-teal-soft" : "text-red-300"}`}
        >
          {msg.text}
        </p>
      )}

      {invites.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase text-[var(--muted)]">
            Pending invites
          </p>
          <ul className="mt-2 space-y-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-dashed border-hairline bg-[var(--background)] px-3 py-2"
              >
                <span className="text-sm text-ink">
                  {i.agentName ?? i.agentLicense}{" "}
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    · {i.agentLicense}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await cancelInvite(i.id);
                    await refresh();
                  }}
                  className="text-xs font-semibold text-[var(--muted)] hover:text-red-300"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase text-[var(--muted)]">
          Current agents ({agents.length})
        </p>
        {agents.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            No agents on your roster yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 story-well px-3 py-2"
              >
                <span className="text-sm text-ink">
                  {a.fullName}
                  {a.primaryMarketCity ? (
                    <span className="text-[var(--muted)]">
                      {" "}
                      · {a.primaryMarketCity}
                    </span>
                  ) : null}
                  {a.teamLeaderAuthorized ? (
                    <span className="ml-2 font-mono text-[10px] uppercase text-gold">
                      Team lead
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  {a.id !== brokerId && (
                    <button
                      type="button"
                      onClick={async () => {
                        await setTeamLeaderAuthorized(
                          a.id,
                          !a.teamLeaderAuthorized,
                        );
                        await refresh();
                      }}
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      {a.teamLeaderAuthorized ? "Remove lead" : "Make team lead"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (a.id !== brokerId) {
                        await removeAgent(a.id);
                        await refresh();
                      }
                    }}
                    disabled={a.id === brokerId}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-red-300 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
