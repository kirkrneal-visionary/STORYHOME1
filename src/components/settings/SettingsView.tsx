"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Building2, Save, Trash2, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { TextField, TextAreaField } from "@/components/broker/ui";
import {
  getMyProfile,
  updateMyProfile,
  type MyProfile,
} from "@/lib/supabase/profile";
import {
  createBrokerage,
  getBrokerageById,
  listBrokerageAgents,
  updateBrokerage,
  type Brokerage,
  type BrokerageAgent,
} from "@/lib/supabase/brokerage";
import {
  acceptInvite,
  addInvite,
  cancelInvite,
  listInvites,
  myPendingInvite,
  removeAgent,
  verifyAgentForBroker,
  type BrokerageInvite,
  type PendingInvite,
} from "@/lib/supabase/roster";
import { accountLabel } from "@/lib/auth";

const toList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);
const fromList = (a: string[]) => a.join(", ");

export function SettingsView() {
  const { user, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [pending, setPending] = useState<PendingInvite | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getMyProfile(user.id);
      setProfile(p);
      if (p?.brokerageId) setBrokerage(await getBrokerageById(p.brokerageId));
      else setBrokerage(null);
      if (p?.accountKind === "agent") setPending(await myPendingInvite());
      else setPending(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[120px] text-center md:px-6">
        <h1 className="font-serif text-3xl font-bold text-ink">Settings</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Log in to manage your account.</p>
        <Link href="/login?next=/settings" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy">Log in</Link>
      </div>
    );
  }

  const isPro = profile?.accountKind === "agent" || profile?.accountKind === "broker";
  const isBroker = profile?.accountKind === "broker";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-[96px] md:px-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.16em] text-gold uppercase">Account settings</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink md:text-4xl">Settings</h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          {user.name}
          <span className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
            {accountLabel(user)}
          </span>
        </p>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading your settings…</p>
      ) : (
        <div className="mt-8 space-y-6">
          {pending && (
            <AgentJoinBanner pending={pending} onJoined={load} />
          )}
          {profile && <AccountSection profile={profile} onSaved={load} />}
          {isPro && profile && <ProSection profile={profile} onSaved={load} />}
          {isPro && profile && <LicenseSection profile={profile} />}
          {isBroker && user && profile && (
            <BrokerageSection
              brokerId={user.id}
              brokerTrecLicense={profile.trecLicense}
              brokerage={brokerage}
              onSaved={load}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, children }: {
  icon: typeof UserRound; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="story-surface p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--muted)]" />
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SaveButton({ busy, note }: { busy: boolean; note: string }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button type="submit" disabled={busy} className="story-press inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60">
        <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
      </button>
      {note && <span className="text-sm text-teal-soft">{note}</span>}
    </div>
  );
}

function AccountSection({ profile, onSaved }: { profile: MyProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    fullName: profile.fullName,
    phone: profile.phone ?? "",
    website: profile.website ?? "",
    photoUrl: profile.photoUrl ?? "",
    bio: profile.bio ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <Card icon={UserRound} title="Account" subtitle="Your name, contact, and public bio.">
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await updateMyProfile(profile.id, { ...f, photoUrl: f.photoUrl || null }); setNote("Saved."); setTimeout(() => setNote(""), 2000); onSaved(); } finally { setBusy(false); } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id="s-name" label="Full name" value={f.fullName} onChange={(v) => setF((p) => ({ ...p, fullName: v }))} />
          <TextField id="s-phone" label="Phone" value={f.phone} onChange={(v) => setF((p) => ({ ...p, phone: v }))} />
          <TextField id="s-web" label="Website" value={f.website} onChange={(v) => setF((p) => ({ ...p, website: v }))} />
          <TextField id="s-photo" label="Photo URL" value={f.photoUrl} onChange={(v) => setF((p) => ({ ...p, photoUrl: v }))} />
        </div>
        <div className="mt-3">
          <TextAreaField id="s-bio" label="About / bio" rows={4} value={f.bio} onChange={(v) => setF((p) => ({ ...p, bio: v }))} />
        </div>
        <SaveButton busy={busy} note={note} />
      </form>
    </Card>
  );
}

function ProSection({ profile, onSaved }: { profile: MyProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    specialties: fromList(profile.specialties),
    serviceAreas: fromList(profile.serviceAreas),
    languages: fromList(profile.languages),
    designations: fromList(profile.designations),
    primaryMarketCity: profile.primaryMarketCity ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <Card icon={BadgeCheck} title="Professional profile" subtitle="Shown on your public profile. Separate items with commas.">
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await updateMyProfile(profile.id, { specialties: toList(f.specialties), serviceAreas: toList(f.serviceAreas), languages: toList(f.languages), designations: toList(f.designations), primaryMarketCity: f.primaryMarketCity }); setNote("Saved."); setTimeout(() => setNote(""), 2000); onSaved(); } finally { setBusy(false); } }}>
        <div className="grid gap-3">
          <TextField id="s-market" label="Primary market (city)" value={f.primaryMarketCity} onChange={(v) => setF((p) => ({ ...p, primaryMarketCity: v }))} />
          <TextField id="s-spec" label="Specialties" value={f.specialties} onChange={(v) => setF((p) => ({ ...p, specialties: v }))} />
          <TextField id="s-areas" label="Service areas" value={f.serviceAreas} onChange={(v) => setF((p) => ({ ...p, serviceAreas: v }))} />
          <TextField id="s-lang" label="Languages" value={f.languages} onChange={(v) => setF((p) => ({ ...p, languages: v }))} />
          <TextField id="s-desig" label="Designations / credentials" value={f.designations} onChange={(v) => setF((p) => ({ ...p, designations: v }))} />
        </div>
        <SaveButton busy={busy} note={note} />
      </form>
    </Card>
  );
}

function LicenseSection({ profile }: { profile: MyProfile }) {
  return (
    <Card icon={BadgeCheck} title="License (TREC)" subtitle="Verified from the Texas Real Estate Commission — read only.">
      {profile.trecLicense ? (
        <div className="grid gap-2 font-mono text-xs sm:grid-cols-2">
          <Fact label="License #" value={profile.trecLicense} />
          <Fact label="Status" value={profile.trecStatus ?? "—"} />
          <Fact label="Sponsoring broker" value={profile.sponsorName ?? "—"} />
          <Fact label="Sponsor license" value={profile.sponsorLicenseNumber ?? "—"} />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No TREC license on file for this account.</p>
      )}
    </Card>
  );
}

function BrokerageSection({ brokerId, brokerTrecLicense, brokerage, onSaved }: {
  brokerId: string; brokerTrecLicense: string | null; brokerage: Brokerage | null; onSaved: () => void;
}) {
  const [name, setName] = useState(brokerage?.name ?? "");
  const [f, setF] = useState({
    about: brokerage?.about ?? "",
    address: brokerage?.address ?? "",
    city: brokerage?.city ?? "",
    state: brokerage?.state ?? "TX",
    zip: brokerage?.zip ?? "",
    website: brokerage?.website ?? "",
    phone: brokerage?.phone ?? "",
    logoUrl: brokerage?.logoUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  return (
    <Card icon={Building2} title="Brokerage identity" subtitle="Your brokerage's own name & branding — this is what appears across the site and your community (not a generic label).">
      <form onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (!brokerage) {
            const created = await createBrokerage(brokerId, name.trim() || "My Brokerage");
            await updateBrokerage(created.id, { ...f, logoUrl: f.logoUrl || null });
          } else {
            await updateBrokerage(brokerage.id, { name: name.trim(), ...f, logoUrl: f.logoUrl || null });
          }
          setNote("Saved.");
          setTimeout(() => setNote(""), 2000);
          onSaved();
        } finally { setBusy(false); }
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id="b-name" label="Brokerage name" value={name} onChange={setName} />
          <TextField id="b-logo" label="Logo URL" value={f.logoUrl} onChange={(v) => setF((p) => ({ ...p, logoUrl: v }))} />
          <TextField id="b-addr" label="Office address" value={f.address} onChange={(v) => setF((p) => ({ ...p, address: v }))} />
          <TextField id="b-city" label="City" value={f.city} onChange={(v) => setF((p) => ({ ...p, city: v }))} />
          <TextField id="b-state" label="State" value={f.state} onChange={(v) => setF((p) => ({ ...p, state: v }))} />
          <TextField id="b-zip" label="ZIP" value={f.zip} onChange={(v) => setF((p) => ({ ...p, zip: v }))} />
          <TextField id="b-web" label="Website" value={f.website} onChange={(v) => setF((p) => ({ ...p, website: v }))} />
          <TextField id="b-phone" label="Phone" value={f.phone} onChange={(v) => setF((p) => ({ ...p, phone: v }))} />
        </div>
        <div className="mt-3">
          <TextAreaField id="b-about" label="About the brokerage" rows={4} value={f.about} onChange={(v) => setF((p) => ({ ...p, about: v }))} />
        </div>
        {brokerage?.slug && (
          <p className="mt-2 text-xs text-[var(--muted)]">Public page: <span className="font-mono text-ink">/b/{brokerage.slug}</span></p>
        )}
        <SaveButton busy={busy} note={note} />
      </form>

      {brokerage ? (
        <div className="mt-6 border-t border-hairline pt-5">
          <RosterManager
            brokerageId={brokerage.id}
            brokerId={brokerId}
            brokerTrecLicense={brokerTrecLicense}
          />
        </div>
      ) : (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Save your brokerage first to start managing your agent roster.
        </p>
      )}
    </Card>
  );
}

function AgentJoinBanner({ pending, onJoined }: { pending: PendingInvite; onJoined: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4">
      <p className="text-sm text-ink">
        <span className="font-semibold">{pending.brokerageName}</span> invited you to join their brokerage on Story Home.
      </p>
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr("");
          try {
            const ok = await acceptInvite(pending.brokerageId);
            if (ok) onJoined();
            else setErr("Could not join — the invite may have been removed.");
          } catch {
            setErr("Something went wrong joining the brokerage.");
          } finally {
            setBusy(false);
          }
        }}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Joining…" : `Join ${pending.brokerageName}`}
      </button>
    </div>
  );
}

function RosterManager({ brokerageId, brokerId, brokerTrecLicense }: {
  brokerageId: string; brokerId: string; brokerTrecLicense: string | null;
}) {
  const [agents, setAgents] = useState<BrokerageAgent[]>([]);
  const [invites, setInvites] = useState<BrokerageInvite[]>([]);
  const [license, setLicense] = useState("");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
      setMsg({ kind: "err", text: "Your broker license isn't on file, so sponsorship can't be verified." });
      return;
    }
    if (!license.trim()) return;
    setChecking(true);
    try {
      const v = await verifyAgentForBroker(license, brokerTrecLicense);
      if (!v.ok || !v.approved) {
        setMsg({ kind: "err", text: v.reason ?? "That license is not an active TREC license." });
        return;
      }
      if (!v.sponsorMatch) {
        setMsg({
          kind: "err",
          text: `TREC shows ${v.fullName ?? "this agent"} is sponsored by ${v.sponsorName ?? "another broker"} — not you. You can only add agents you sponsor.`,
        });
        return;
      }
      await addInvite(brokerageId, v.licenseNumber ?? license.trim(), v.fullName, brokerId);
      setLicense("");
      setMsg({ kind: "ok", text: `Invited ${v.fullName}. They'll see a "Join" button in their Settings.` });
      await refresh();
    } catch {
      setMsg({ kind: "err", text: "Couldn't create the invite. Try again." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <h3 className="font-serif text-lg font-bold text-ink">Agent roster</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Add agents by TREC license #. Story Home confirms with TREC that the agent is actually sponsored by you before inviting them.
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
          onClick={inviteByLicense}
          disabled={checking}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold px-4 text-sm font-bold text-gold disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" /> {checking ? "Checking…" : "Verify & invite"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-xs ${msg.kind === "ok" ? "text-teal-soft" : "text-red-300"}`}>{msg.text}</p>
      )}

      {invites.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase text-[var(--muted)]">Pending invites</p>
          <ul className="mt-2 space-y-2">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-lg border border-dashed border-hairline bg-[var(--background)] px-3 py-2">
                <span className="text-sm text-ink">{i.agentName ?? i.agentLicense} <span className="font-mono text-[11px] text-[var(--muted)]">· {i.agentLicense}</span></span>
                <button type="button" onClick={async () => { await cancelInvite(i.id); await refresh(); }} className="text-xs font-semibold text-[var(--muted)] hover:text-red-300">Cancel</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase text-[var(--muted)]">Current agents ({agents.length})</p>
        {agents.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No agents on your roster yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {agents.map((a) => (
              <li key={a.id} className="flex items-center justify-between story-well px-3 py-2">
                <span className="text-sm text-ink">{a.fullName}{a.primaryMarketCity ? <span className="text-[var(--muted)]"> · {a.primaryMarketCity}</span> : null}</span>
                <button
                  type="button"
                  onClick={async () => { if (a.id !== brokerId) { await removeAgent(a.id); await refresh(); } }}
                  disabled={a.id === brokerId}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-red-300 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="story-well px-3 py-2">
      <p className="text-[10px] uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}
