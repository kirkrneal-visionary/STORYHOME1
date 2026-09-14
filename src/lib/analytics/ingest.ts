/**
 * Server-side ingest for product analytics events.
 * Soft-fails when table/migration is missing — never blocks UX.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import { scrubAnalyticsProps } from "@/lib/analytics/scrub";
import { resolveStoryHomeEnv } from "@/lib/labs/env";

const EVENT_SET = new Set<string>(ANALYTICS_EVENTS);

export type IngestResult =
  | { ok: true; id?: number }
  | { ok: false; reason: string };

export function isCatalogEvent(name: unknown): name is AnalyticsEventName {
  return typeof name === "string" && EVENT_SET.has(name);
}

export async function ingestProductAnalyticsEvent(
  supabase: SupabaseClient,
  opts: {
    event: string;
    props?: Record<string, unknown>;
    clientAt?: string | null;
    userId?: string | null;
  },
): Promise<IngestResult> {
  if (!isCatalogEvent(opts.event)) {
    return { ok: false, reason: "unknown_event" };
  }

  const scrubbed = scrubAnalyticsProps(opts.props);
  const rest = { ...scrubbed };
  delete rest.env;
  const props = { ...rest, env: resolveStoryHomeEnv() };
  const clientAt =
    opts.clientAt && !Number.isNaN(Date.parse(opts.clientAt))
      ? opts.clientAt
      : null;

  const row = {
    event_name: opts.event,
    props,
    client_at: clientAt,
    user_id: opts.userId || null,
  };

  const { data, error } = await supabase
    .from("product_analytics_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (/does not exist|product_analytics_events/i.test(error.message)) {
      return { ok: false, reason: "table_missing" };
    }
    return { ok: false, reason: error.message.slice(0, 160) };
  }

  return {
    ok: true,
    id: data?.id != null ? Number(data.id) : undefined,
  };
}
