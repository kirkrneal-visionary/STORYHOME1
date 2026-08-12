# ARCHIE-TRUTH-MARKET — Truth lane · thin market context

## Promise
Show **what county files support** for a parcel, how strong that support is, and an **illustrative** financing carry under the agent’s own assumptions.

## Honesty
- CAD `market_value` is an appraisal observation — not MLS list or sale price
- No seller probability, no “will sell”, no black-box AVM
- Frame comparison uses CAD medians inside a drawn boundary
- Carry payment is math on CAD value + user rate/down/term — not a quote

## This increment
1. Server `buildCadEvidenceLane` → `property.cadEvidence`
2. UI **CAD evidence · market context** on Research property record
3. Optional **Vs active market frame** when a frame is analyzed
4. **Illustrative carry** inputs (rate / down / term)

## Out of scope (later)
- Odds / risk scores without stated assumptions
- Treating MLS comps as CAD truth
