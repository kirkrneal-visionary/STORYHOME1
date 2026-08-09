/**
 * Informational, TREC-style Seller's Disclosure schema (data-driven).
 * Modeled on the current TREC Seller's Disclosure Notice (Form 55-1, §5.008)
 * but this is an informational homeowner record — NOT the official signed form
 * and not legal advice. Answers are stored as { [questionId]: value } JSON.
 */

export type DisclosureFieldType = "yn" | "tf" | "text" | "select";

export type DisclosureQuestion = {
  id: string;
  label: string;
  type: DisclosureFieldType;
  options?: string[];
};

export type DisclosureSection = {
  id: string;
  title: string;
  intro?: string;
  questions: DisclosureQuestion[];
};

const YN_ITEMS: [string, string][] = [
  ["range", "Range / Oven"],
  ["dishwasher", "Dishwasher"],
  ["disposal", "Disposal"],
  ["microwave", "Microwave"],
  ["washer_dryer", "Washer/Dryer hookups"],
  ["security", "Security system"],
  ["smoke", "Smoke detectors"],
  ["co", "Carbon monoxide alarms"],
  ["ceiling_fans", "Ceiling fans"],
  ["central_ac", "Central A/C"],
  ["central_heat", "Central heating"],
  ["plumbing", "Plumbing system"],
  ["pool", "Pool / Spa / Hot tub"],
  ["sprinkler", "Lawn sprinkler system"],
  ["fireplace", "Fireplace & chimney"],
  ["garage_opener", "Garage door opener"],
];

export const DISCLOSURE_SECTIONS: DisclosureSection[] = [
  {
    id: "items",
    title: "1. Property items & equipment",
    intro: "Mark whether the property has each item.",
    questions: YN_ITEMS.map(([id, label]) => ({ id: `item_${id}`, label, type: "yn" as const })),
  },
  {
    id: "systems",
    title: "2. Utilities & systems",
    questions: [
      { id: "water_supply", label: "Water supply", type: "select", options: ["City", "Well", "MUD", "Co-op", "Unknown"] },
      { id: "sewer", label: "Sewer", type: "select", options: ["Public sewer", "Septic", "Aerobic septic", "Unknown"] },
      { id: "water_heater", label: "Water heater", type: "select", options: ["Gas", "Electric", "Tankless", "Unknown"] },
      { id: "roof_type", label: "Roof type", type: "text" },
      { id: "roof_age", label: "Roof age (approx. years)", type: "text" },
    ],
  },
  {
    id: "defects",
    title: "3. Known defects",
    intro: "Are you aware of any defects/malfunctions in the following?",
    questions: [
      { id: "def_foundation", label: "Foundation / slab", type: "yn" },
      { id: "def_roof", label: "Roof", type: "yn" },
      { id: "def_walls", label: "Walls / ceilings / floors", type: "yn" },
      { id: "def_plumbing", label: "Plumbing", type: "yn" },
      { id: "def_electrical", label: "Electrical", type: "yn" },
      { id: "def_hvac", label: "Heating / cooling", type: "yn" },
      { id: "def_notes", label: "If yes, describe", type: "text" },
    ],
  },
  {
    id: "environmental",
    title: "4. Environmental",
    intro: "Are you aware of any of the following on the property?",
    questions: [
      { id: "env_lead_paint", label: "Lead-based paint (pre-1978)", type: "yn" },
      { id: "env_asbestos", label: "Asbestos", type: "yn" },
      { id: "env_radon", label: "Radon gas", type: "yn" },
      { id: "env_tanks", label: "Underground storage tanks", type: "yn" },
      { id: "env_hazard", label: "Toxic/hazardous materials", type: "yn" },
    ],
  },
  {
    id: "flooding",
    title: "5. Flooding & water",
    questions: [
      { id: "flood_ever", label: "Has the property ever flooded?", type: "yn" },
      { id: "flood_100", label: "In a 100-year floodplain?", type: "yn" },
      { id: "flood_500", label: "In a 500-year floodplain?", type: "yn" },
      { id: "flood_insurance", label: "Flood insurance currently in effect?", type: "yn" },
      { id: "flood_fema", label: "Prior FEMA/flood claims?", type: "yn" },
      { id: "flood_notes", label: "If yes, describe", type: "text" },
    ],
  },
  {
    id: "conditions",
    title: "6. Conditions affecting the property",
    intro: "Are you aware of any of the following?",
    questions: [
      { id: "cond_termites", label: "Termites / wood-destroying insects", type: "yn" },
      { id: "cond_drainage", label: "Improper drainage", type: "yn" },
      { id: "cond_structural_repairs", label: "Previous structural repairs", type: "yn" },
      { id: "cond_hoa", label: "Subject to an HOA", type: "yn" },
      { id: "cond_deed_restrictions", label: "Deed restrictions", type: "yn" },
      { id: "cond_easements", label: "Easements / encroachments", type: "yn" },
      { id: "cond_liens", label: "Unpaid liens / assessments", type: "yn" },
      { id: "cond_notes", label: "If yes, describe", type: "text" },
    ],
  },
];
