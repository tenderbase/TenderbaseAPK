# TenderBase Blueprint Amendment — Commercial Value & eTenders Reality

This amendment supersedes any earlier blueprint language that treats tender/contract value as a required Opportunity Engine scoring dimension.

## 1. Core rule

eTenders commonly does not disclose tender or contract amounts as a standard tender field. Therefore:

> **Undisclosed tender value is a normal state in TenderBase, not missing data that should lower confidence or Fit Score.**

TenderBase must be designed around this source-data reality.

## 2. Fit Score

Tender value is **not** a Fit Score axis.

Fit should be based on evidence such as:

- business/category fit
- geography
- locality
- services/keywords
- organisation relevance
- CIDB and eligibility information when verified
- company capability/profile information
- deadline suitability
- tender/document availability

The deterministic Opportunity Engine must never subtract points merely because `valueCents` is null.

## 3. Commercial Intelligence is separate

Commercial analysis is a separate layer from Fit Score:

```text
FIT SCORE
Should we bid?

COMMERCIAL INTELLIGENCE
What commercial signals can we verify?

BID RISK
What could disqualify or hurt us?

EFFORT
How difficult will this bid be?
```

When the standard tender record has no value, the UI should display:

```text
Tender Value
Not disclosed
```

It should not imply that TenderBase failed to find a value.

## 4. Document-grounded commercial analysis

When tender documents are available, the AI/document pipeline may extract:

- BOQ or pricing schedules
- quantities
- rates
- contract duration
- estimated volumes
- budget ceilings or indications
- framework ceilings
- pricing instructions
- resource requirements
- other explicit commercial signals

These facts must carry evidence and source references.

The AI must never invent a tender value.

## 5. Commercial value states

The domain model now uses:

```ts
type CommercialValueStatus =
  | 'not_disclosed'
  | 'published'
  | 'document_evidence'
  | 'inferred'
  | 'unknown';
```

Interpretation:

- `not_disclosed` — normal eTenders/default state.
- `published` — explicitly present in the tender record.
- `document_evidence` — commercial information found in tender documents.
- `inferred` — a carefully bounded inference, clearly labelled as such.
- `unknown` — source processing has not established the state.

`inferred` must never be rendered as a verified tender amount.

## 6. Commercial confidence

Commercial confidence is independent from Fit Confidence:

```ts
type CommercialConfidence =
  | 'high'
  | 'medium'
  | 'low'
  | 'not_available';
```

A tender can therefore have:

```text
Fit Score: 94%
Fit Confidence: High

Tender Value: Not disclosed
Commercial Confidence: Not available
```

This is a valid, high-quality analysis state.

## 7. Pipeline values

`estimated_bid_value_cents` in `bid_opportunities` means a **user/company estimate**, not an automatically assumed tender value.

The product must not populate it from a null upstream tender amount.

Later, users may enter their own expected bid/contract value, or document intelligence may provide a clearly sourced commercial estimate.

## 8. AI architecture consequence

The deeper AI layer should therefore follow:

```text
Tender record
    ↓
Verified tender facts
    ↓
Document extraction
    ↓
Commercial evidence
    ↓
Explainable rules
    ↓
AI interpretation
    ↓
User decision
```

Missing tender value does not block:

- Fit analysis
- eligibility analysis
- requirements extraction
- risk detection
- deadline analysis
- document Q&A
- bid/no-bid recommendation
- bid preparation

It only limits the amount of commercial analysis that can be responsibly claimed.

## 9. Implementation

Implemented in the current codebase:

- `src/types/analyst.ts` now models commercial state explicitly.
- `src/lib/opportunities/score.ts` uses `opportunity-v2-no-value-penalty` and explicitly excludes tender value from Fit Score.
- `getCommercialAnalysis()` separates published value from normal undisclosed state.
- Opportunity tests verify identical Fit Scores for otherwise identical tenders with and without a published value.
- `supabase/migrations/0010_commercial_intelligence.sql` adds persistent commercial-analysis fields and database constraints.

This amendment should be treated as the governing commercial/value rule for all future TenderBase AI and scoring work.
