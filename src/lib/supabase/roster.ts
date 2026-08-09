"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

export type BrokerageInvite = {
  id: string;
  brokerageId: string;
  agentLicense: string;
  agentName: string | null;
  status: string;
};

export type PendingInvite = {
  id: string;
  brokerageId: string;
  brokerageName: string;
};

const digits = (s: string | null | undefined) => (s ?? "").replace(/[^\d]/g, "");

export async function listInvites(brokerageId: string): Promise<BrokerageInvite[]> {
  const s = getBrowserSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("brokerage_invites")
    .select("id, brokerage_id, agent_license, agent_name, status")
    .eq("brokerage_id", brokerageId)
    .eq("status", "active");
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((r: any) => ({
    id: r.id,
    brokerageId: r.brokerage_id,
    agentLicense: r.agent_license,
    agentName: r.agent_name,
    status: r.status,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function addInvite(
  brokerageId: string,
  agentLicense: string,
  agentName: string | null,
  invitedBy: string,
): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const { error } = await s
    .from("brokerage_invites")
    .upsert(
      {
        brokerage_id: brokerageId,
        agent_license: agentLicense,
        agent_name: agentName,
        invited_by: invitedBy,
        status: "active",
      },
      { onConflict: "brokerage_id,agent_license" },
    );
  if (error) throw error;
}

export async function cancelInvite(id: string): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const { error } = await s.from("brokerage_invites").delete().eq("id", id);
  if (error) throw error;
}

export async function acceptInvite(brokerageId: string): Promise<boolean> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const { data, error } = await s.rpc("accept_brokerage_invite", {
    p_brokerage: brokerageId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function removeAgent(agentId: string): Promise<boolean> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const { data, error } = await s.rpc("remove_agent_from_brokerage", {
    p_agent: agentId,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Active invite addressed to the logged-in agent (via RLS on their license). */
export async function myPendingInvite(): Promise<PendingInvite | null> {
  const s = getBrowserSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("brokerage_invites")
    .select("id, brokerage_id, status, brokerage:brokerages(name)")
    .eq("status", "active")
    .limit(1);
  if (error) return null;
  const row = (data ?? [])[0];
  if (!row) return null;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const r = row as any;
  return {
    id: r.id,
    brokerageId: r.brokerage_id,
    brokerageName: r.brokerage?.name ?? "a brokerage",
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export type AgentVerify = {
  ok: boolean;
  approved: boolean;
  licenseNumber: string | null;
  fullName: string | null;
  sponsorName: string | null;
  sponsorLicenseNumber: string | null;
  sponsorMatch: boolean;
  reason: string | null;
};

/**
 * Verify an agent's TREC license AND that their sponsoring broker matches the
 * broker's own TREC license — the anti-fraud check before creating an invite.
 */
export async function verifyAgentForBroker(
  agentLicense: string,
  brokerTrecLicense: string | null,
): Promise<AgentVerify> {
  const res = await fetch(
    `/api/verify-trec?license=${encodeURIComponent(agentLicense.trim())}`,
  );
  const d = await res.json();
  if (d.error) {
    return {
      ok: false,
      approved: false,
      licenseNumber: null,
      fullName: null,
      sponsorName: null,
      sponsorLicenseNumber: null,
      sponsorMatch: false,
      reason: d.error,
    };
  }
  const sponsorMatch =
    !!brokerTrecLicense &&
    digits(d.sponsorLicenseNumber) !== "" &&
    digits(d.sponsorLicenseNumber) === digits(brokerTrecLicense);
  return {
    ok: true,
    approved: Boolean(d.approved),
    licenseNumber: d.licenseNumber ?? null,
    fullName: d.fullName ?? null,
    sponsorName: d.sponsorName ?? null,
    sponsorLicenseNumber: d.sponsorLicenseNumber ?? null,
    sponsorMatch,
    reason: d.reason ?? null,
  };
}
