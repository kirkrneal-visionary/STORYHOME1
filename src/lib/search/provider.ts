/**
 * Paid interpretation stays locked off until Kirk approves billing.
 * Ordinary search uses interpretSearch() and never consults this flag.
 */
export const SMART_SEARCH_MODEL_ENABLED = false;
export const SMART_SEARCH_MODEL_PROVIDER = "none" as const;
export const SMART_SEARCH_FIXED_MONTHLY_USD = 0;
export const SMART_SEARCH_USAGE_USD = 0;

export type PaidInterpretStatus = {
  allowed: false;
  provider: "none";
  reason: string;
  monthlyFixedUsd: 0;
  usageUsd: 0;
};

export function paidInterpretStatus(): PaidInterpretStatus {
  return {
    allowed: false,
    provider: "none",
    reason:
      "Paid interpretation is not approved. First-party interpretSearch is the only route.",
    monthlyFixedUsd: 0,
    usageUsd: 0,
  };
}

/** If a model is ever approved, only these keys may leave our servers. */
export const MODEL_PAYLOAD_ALLOWLIST = ["q", "advanced"] as const;
