# TenderBase Phase 1 — Pro Bid Analyst Foundation

## Goal

Turn tender detail into a decision workspace before introducing deeper AI.

## Product rule: eTenders value

Tender/contract amounts are not treated as a required upstream field. An undisclosed amount is a normal state.

**Never penalise Fit Score because value is absent.**

Value is separated from fit:

- `Fit Score` answers: **Does this opportunity fit my business?**
- `Commercial Intelligence` answers: **What commercial information can we actually verify?**
- `Commercial Attractiveness` is `not_assessable` until reliable commercial evidence exists.
- Later document intelligence may populate BOQ, quantities, pricing schedules, contract duration and budget references.
- AI must label extracted facts and inferences; it must never invent a tender amount.

## Phase 1 delivered

### Opportunity engine

`src/lib/opportunities/score.ts`

- Uses the deterministic matcher as the current scoring source of truth.
- No tender-value scoring axis.
- Deadline and document signals are explanatory concerns/positives rather than hidden value penalties.
- Commercial analysis is separate from Fit Score.

### Tender detail analyst surface

`src/components/tender/TenderMatchRow.tsx`

The existing match row now acts as the first Pro Analyst surface and shows:

- Fit Score
- Strong fit / Worth qualifying / Review carefully interpretation
- Explicit `Fit score is independent of tender value`
- Commercial state: `Value published` or `Value not disclosed`
- Document readiness
- Qualification watch for CIDB, B-BBEE, tax and mandatory submission requirements
- Existing explainable match reasons

The UI deliberately does not claim that document-level requirements have already been extracted.

### Domain model

`src/types/analyst.ts`

Commercial state is represented independently with:

- `not_disclosed`
- `published`
- `document_evidence`
- `inferred`
- `unknown`

and separate commercial confidence/attractiveness values.

### Database

`supabase/migrations/0010_commercial_intelligence.sql`

Provides persistent commercial-analysis fields without conflating company estimates with published tender value.

## Phase 1 acceptance criteria

1. A tender with no published amount can receive a high Fit Score.
2. Changing only `valueCents` must not change Fit Score.
3. UI states `Value not disclosed` rather than implying missing system data.
4. No estimated tender amount is generated from absence of a published amount.
5. Commercial evidence can be added later from tender documents without changing the Fit Score model.
6. Document-level requirements remain explicitly unverified until extraction is implemented.

## Next phase

Build the document intelligence pipeline:

```text
Tender documents
  -> fetch
  -> text extraction
  -> classification
  -> chunking
  -> evidence/citations
  -> requirements
  -> risks
  -> commercial signals
  -> AI explanation
```

Only after that should TenderBase generate document-grounded recommendations such as bid/no-bid and Ask This Tender answers.
