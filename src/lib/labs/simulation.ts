/**
 * Session-scoped Story Labs simulation. Honored only when Story Labs is isolated.
 * Never reads this cookie in production.
 */

export const LABS_SIM_COOKIE = "sh_labs_sim";

export const LABS_PERSONAS = [
  "consumer",
  "agent",
  "broker",
  "seller",
] as const;

export const LABS_ACCOUNT_STATES = [
  "new",
  "empty",
  "active_pro",
  "trial",
  "past_due",
  "canceled",
  "with_data",
  "heavy",
] as const;

export const LABS_ARCHIE_STATES = [
  "normal",
  "no_history",
  "refreshing",
  "stale",
  "source_degraded",
  "source_failed",
  "partial_pull",
  "no_change",
  "loading",
  "request_failed",
] as const;

export const LABS_MAP_STATES = [
  "normal",
  "slow_tiles",
  "imagery_unavailable",
  "terrain_unavailable",
  "parcel_failure",
  "map_2d",
  "map_3d",
] as const;

export const LABS_PAYMENT_STATES = [
  "none",
  "checkout_success",
  "card_failure",
  "subscription_active",
  "past_due",
  "canceled",
  "webhook_delay",
  "duplicate_webhook",
] as const;

export const LABS_SELLER_STATES = [
  "zero",
  "verified",
  "unavailable",
  "loading",
  "access_failure",
] as const;

export const LABS_DEVICES = ["phone", "tablet", "desktop"] as const;

export type LabsPersona = (typeof LABS_PERSONAS)[number];
export type LabsAccountState = (typeof LABS_ACCOUNT_STATES)[number];
export type LabsArchieState = (typeof LABS_ARCHIE_STATES)[number];
export type LabsMapState = (typeof LABS_MAP_STATES)[number];
export type LabsPaymentState = (typeof LABS_PAYMENT_STATES)[number];
export type LabsSellerState = (typeof LABS_SELLER_STATES)[number];
export type LabsDevice = (typeof LABS_DEVICES)[number];

export type LabsSimulation = {
  persona: LabsPersona;
  account: LabsAccountState;
  archie: LabsArchieState;
  map: LabsMapState;
  payment: LabsPaymentState;
  seller: LabsSellerState;
  device: LabsDevice;
};

export const DEFAULT_LABS_SIMULATION: LabsSimulation = {
  persona: "consumer",
  account: "empty",
  archie: "normal",
  map: "normal",
  payment: "none",
  seller: "zero",
  device: "desktop",
};

function pick<T extends string>(allowed: readonly T[], raw: unknown, fallback: T): T {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

export function parseLabsSimulation(raw: unknown): LabsSimulation {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    persona: pick(LABS_PERSONAS, o.persona, DEFAULT_LABS_SIMULATION.persona),
    account: pick(LABS_ACCOUNT_STATES, o.account, DEFAULT_LABS_SIMULATION.account),
    archie: pick(LABS_ARCHIE_STATES, o.archie, DEFAULT_LABS_SIMULATION.archie),
    map: pick(LABS_MAP_STATES, o.map, DEFAULT_LABS_SIMULATION.map),
    payment: pick(LABS_PAYMENT_STATES, o.payment, DEFAULT_LABS_SIMULATION.payment),
    seller: pick(LABS_SELLER_STATES, o.seller, DEFAULT_LABS_SIMULATION.seller),
    device: pick(LABS_DEVICES, o.device, DEFAULT_LABS_SIMULATION.device),
  };
}

export function parseLabsSimulationCookie(value: string | undefined | null): LabsSimulation {
  if (!value) return { ...DEFAULT_LABS_SIMULATION };
  try {
    return parseLabsSimulation(JSON.parse(decodeURIComponent(value)));
  } catch {
    return { ...DEFAULT_LABS_SIMULATION };
  }
}

export function serializeLabsSimulation(sim: LabsSimulation): string {
  return encodeURIComponent(JSON.stringify(parseLabsSimulation(sim)));
}
