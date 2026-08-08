/**
 * Demo buyer-lead inquiries for Story Pro.
 *
 * In production these rows come from consumer activity (a logged-in buyer
 * sending their first message on a listing). Here we synthesize a realistic set
 * relative to the current time so the 15-minute claim windows are live in the
 * UI. Timings are chosen to exercise the routing algorithm:
 *   - one lead currently claimable by the logged-in agent,
 *   - one lead reassigned to the logged-in agent after another agent's window
 *     expired,
 *   - one lead the logged-in agent already missed (now with another agent).
 */

import type { Inquiry } from "@/lib/lead-routing";

export type ConsumerContact = {
  consumerId: string;
  name: string;
  phone: string;
  lastMessage: string;
};

const OTHER_AGENTS = {
  cole: { id: "agent-cole", name: "Marcus Cole" },
  desai: { id: "agent-desai", name: "Priya Desai" },
} as const;

const min = (n: number) => n * 60_000;

export const LEAD_CONSUMERS: ConsumerContact[] = [
  {
    consumerId: "lead-alex",
    name: "Alex Rivera",
    phone: "(936) 555-0142",
    lastMessage:
      "Is 1402 Willow Street still available? We'd love a showing this weekend.",
  },
  {
    consumerId: "lead-jamie",
    name: "Jamie Fox",
    phone: "(936) 555-0178",
    lastMessage: "What are the property taxes on the Garden Court home?",
  },
  {
    consumerId: "lead-morgan",
    name: "Morgan Lee",
    phone: "(936) 555-0199",
    lastMessage: "Interested in the Willow Street listing — can we talk today?",
  },
];

export function getConsumerContact(consumerId: string): ConsumerContact | null {
  return LEAD_CONSUMERS.find((c) => c.consumerId === consumerId) ?? null;
}

/**
 * Build the demo inquiry log relative to `now`, with the logged-in agent as the
 * owner of listing L1 ("1402 Willow Street").
 */
export function seedInquiries(
  now: number,
  currentAgentId: string,
  currentAgentName: string,
): Inquiry[] {
  const self = { id: currentAgentId, name: currentAgentName };

  return [
    // Alex Rivera — inquired the agent's listing 5 min ago (window active now),
    // then another agent's listing 4 min ago (still upcoming in the queue).
    {
      id: "inq-alex-1",
      consumerId: "lead-alex",
      consumerName: "Alex Rivera",
      listingId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      listingLabel: "1402 Willow Street",
      agentId: self.id,
      agentName: self.name,
      createdAt: now - min(5),
    },
    {
      id: "inq-alex-2",
      consumerId: "lead-alex",
      consumerName: "Alex Rivera",
      listingId: "listing-cliffside",
      listingLabel: "88 Overlook Ridge",
      agentId: OTHER_AGENTS.cole.id,
      agentName: OTHER_AGENTS.cole.name,
      createdAt: now - min(4),
    },

    // Jamie Fox — inquired another agent's listing 20 min ago (that window has
    // expired), then the agent's listing 19 min ago -> now reassigned to the
    // logged-in agent, whose window is currently active.
    {
      id: "inq-jamie-1",
      consumerId: "lead-jamie",
      consumerName: "Jamie Fox",
      listingId: "listing-garden",
      listingLabel: "411 Garden Court",
      agentId: OTHER_AGENTS.desai.id,
      agentName: OTHER_AGENTS.desai.name,
      createdAt: now - min(20),
    },
    {
      id: "inq-jamie-2",
      consumerId: "lead-jamie",
      consumerName: "Jamie Fox",
      listingId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      listingLabel: "1402 Willow Street",
      agentId: self.id,
      agentName: self.name,
      createdAt: now - min(19),
    },

    // Morgan Lee — inquired the agent's listing 25 min ago (agent missed the
    // window), then another agent's listing 20 min ago -> now with that agent.
    {
      id: "inq-morgan-1",
      consumerId: "lead-morgan",
      consumerName: "Morgan Lee",
      listingId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      listingLabel: "1402 Willow Street",
      agentId: self.id,
      agentName: self.name,
      createdAt: now - min(25),
    },
    {
      id: "inq-morgan-2",
      consumerId: "lead-morgan",
      consumerName: "Morgan Lee",
      listingId: "listing-piney-ranch",
      listingLabel: "9200 Piney Creek Ranch",
      agentId: OTHER_AGENTS.cole.id,
      agentName: OTHER_AGENTS.cole.name,
      createdAt: now - min(20),
    },
  ];
}
