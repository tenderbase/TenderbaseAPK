# TenderBase — Project History, Process & Product Blueprint

> Living project record for the TenderBase build. This document captures the product direction, implementation decisions, deployment context, testing approach, and the agreed technical blueprint so future development can continue without losing the reasoning behind previous work.

**Repository:** `tenderbase/TenderbaseAPK`

**Web app:** `https://tenderbase-web.onrender.com/`

**API:** `https://tenderbase-api-rqrh.onrender.com/`

**Render workspace:** `tenderbase`

---

## 1. Product Vision

TenderBase is being built as a premium tender intelligence and bid-management platform.

The core positioning is:

> **TenderBase does the work of a tender analyst for me.**

The product should not simply show users a large list of tenders. It should help a company decide **which opportunities are worth pursuing**, understand the tender pack, identify compliance risk, prepare the bid, and manage the opportunity through submission.

The target workflow is:

```text
DISCOVER
   ↓
RANK
   ↓
ANALYSE
   ↓
QUALIFY
   ↓
PURSUE
   ↓
PREPARE
   ↓
SUBMIT
   ↓
WIN / LOSE
```

The strategic product loop is:

```text
Company Profile
      ↓
Opportunity Engine
      ↓
Bid Analyst
      ↓
Bid Desk / Pipeline
      ↓
Tasks + Alerts
      ↓
Submission
      ↓
Outcome data
      ↓
Better recommendations
```

---

## 2. Initial Product State

TenderBase already had the basic tender-discovery product structure:

- Tender feed/discovery
- Tender detail pages
- Saved tenders
- Saved searches
- Alerts
- Calendar-related functionality
- Company profile/preferences
- Pipeline navigation
- Billing/subscription state
- Today experience
- Deep Analysis section
- Supabase persistence
- Render deployment
- GitHub source control

The application uses a normalized Tender domain model. The current model includes tender number, title, description, organisation, category, province, location, value, publication/closing dates, source URL, documents, contact information, lifecycle status and CIDB grade. User-enriched tender results also include saved state and a match score.

The application taxonomy intentionally separates the app's coarse category from the verbatim upstream category so the UI can remain simple while upstream querying stays accurate.

---

## 3. Authentication, Billing & Tier Architecture

TenderBase has a server-side tier resolution system.

The intended production hierarchy is:

```text
Real authenticated subscription
        ↓
Entitlement calculation
        ↓
Free / Basic / Pro
```

During development/testing, the product needs to behave as Pro so premium workflows can be built without artificial restrictions.

### Test override

A Render environment variable was introduced:

```text
TENDERBASE_TEST_PRO=true
```

The server tier resolver checks this explicit test flag before normal billing/subscription resolution and returns Pro for testing.

This does **not** replace the real billing logic. When the test variable is removed or set to false, production entitlement logic resumes.

The test override was implemented in:

```text
src/lib/tier-server.ts
```

Relevant development commit:

```text
dbc4dc0f5a8c46d78cc4361d403bedea476c50ce
```

The purpose is strictly development/testing and it must be disabled before real paid production use.

---

## 4. Deployment History

The project is deployed to Render with automatic deployment from GitHub.

### Earlier TypeScript deployment issue

A Render build failed because `TodayExperience.tsx` referenced `t.value`, while the domain model exposes `valueCents`.

The fix changed the display logic to use `valueCents` and added a ZAR formatter using `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })`.

Fix commit:

```text
a5bc7e3570a45b302836a7b7704a660785a7e6ff
```

That fix deployed successfully.

### Pro positioning deployment

The next major product commit positioned the Pro experience around the Bid Analyst workflow.

Latest deployment observed during this planning process:

```text
Commit: 948b2a5f5fca17d4ede49c2a07d7194124af7b94
Message: Position Pro around Bid Analyst workflow
```

At the time of this document's creation, Render reported the deployment as building. Deployment should always be verified in Render before describing a new commit as live.

---

## 5. Typography / Brand UI

The requested application font is **Poppins**.

The app already has Poppins globally configured with weights including 400, 500, 600 and 700, and the root font family uses Poppins.

No additional typography replacement is required unless a specific component overrides it.

---

## 6. Premium Product Direction

The decision was made to build the **entire product** around the Bid Analyst concept rather than treating Pro as simply a larger version of Basic.

The premium proposition is:

> **Stop searching for tenders. Start deciding which ones to bid.**

A premium user should open TenderBase and immediately understand:

1. Which opportunities match their company.
2. Why each opportunity matches.
3. What could disqualify them.
4. What documents and requirements are needed.
5. What the next action is.
6. Which bids need attention today.
7. How much potential value sits in the pipeline.

The product should feel like a **digital bid analyst and bid desk**, not a tender directory.

---

# 7. Premium User Experience

## Today — Command Centre

The authenticated home experience should become the user's daily bid command centre.

Example structure:

```text
GOOD MORNING

Your TenderBase Bid Desk

🔥 3 High-confidence opportunities

94%  KZN Road Rehabilitation
91%  Municipal Maintenance
88%  Facilities Contract

⚠ 5 bids need attention

2 requirements missing
1 tender closes tomorrow
2 documents awaiting review

📊 Pipeline

12 active bids
R18.4m potential value
3 submitted
```

The actual figures must come from real data. The above values are illustrative only.

---

## Tender Detail — Premium Workspace

The tender detail experience should evolve into:

```text
Tender Header
    ↓
Fit Score
    ↓
Executive Summary
    ↓
Why this fits
    ↓
Risks & Red Flags
    ↓
Eligibility
    ↓
Requirements
    ↓
Documents
    ↓
Important Dates
    ↓
Evaluation Criteria
    ↓
Ask This Tender
    ↓
AI Bid Assistant
    ↓
Add to Bid Desk
```

The current Deep Analysis cards are the beginning of this workflow.

---

# 8. Opportunity Engine

This becomes the intelligence layer that ranks opportunities for each company.

Recommended code structure:

```text
src/lib/opportunities/
├── score.ts
├── explain.ts
├── rank.ts
├── filters.ts
└── types.ts
```

The score should be explainable rather than a black box.

A starting weighting model is:

```text
Company category         20%
Geography                15%
CIDB                     15%
Contract value           15%
Keywords / services      15%
Organisation preference   5%
Deadline                  5%
Tender completeness       5%
```

These weights are a starting point, not a permanent business rule. They should eventually be calibrated using actual user outcomes.

Suggested type:

```ts
interface FitAnalysis {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  positives: FitSignal[];
  concerns: FitSignal[];
  missingProfileData: string[];
}
```

Example explanation:

```text
91% Match

✓ CIDB requirement matches your company
✓ Tender is in your preferred province
✓ Contract value fits your target range
⚠ Compulsory briefing required
```

The user should always understand **why** the score exists.

---

# 9. Tender Analyst Engine

Recommended structure:

```text
src/lib/analyst/
├── analyse-tender.ts
├── extract-requirements.ts
├── detect-risks.ts
├── evaluate-eligibility.ts
├── extract-deadlines.ts
├── extract-documents.ts
├── fit-score.ts
└── types.ts
```

The analysis pipeline is:

```text
Tender
  ↓
Tender Documents
  ↓
Document Extraction
  ↓
Normalized Tender Facts
  ↓
Requirements
  ↓
Eligibility
  ↓
Risks
  ↓
Fit Analysis
  ↓
AI Explanation
```

The most important trust rule is to separate:

### Verified tender facts

```text
source = tender_document
```

### AI interpretation

```text
source = ai
```

### Company/user information

```text
source = company_profile
```

AI must never silently turn an inference into a claimed tender fact.

---

# 10. Deep Analysis

The premium Deep Analysis experience should cover:

- Executive summary
- Scope of work
- Mandatory documents
- Disqualifiers / red flags
- CIDB requirements
- BBBEE requirements
- Tax/compliance requirements
- Submission instructions
- Evaluation criteria
- Important dates
- Pricing / BOQ requirements
- Questions to issuer
- Recommended bid/no-bid
- Tender Fit Score

The goal is to make Deep Analysis the primary reason users pay for Pro.

---

# 11. Database Blueprint

Supabase is the persistent product brain.

Existing migration foundation includes:

```text
0001_profiles_and_preferences.sql
0002_saved_tenders.sql
0003_saved_searches.sql
0004_news_bookmarks.sql
0005_alert_settings.sql
0006_billing.sql
0007_billing_trials.sql
0008_onboarding.sql
```

Recommended next migrations:

```text
0009_bid_pipeline.sql
0010_tender_analysis.sql
0011_tender_requirements.sql
0012_bid_tasks.sql
0013_company_capabilities.sql
0014_smart_alerts.sql
0015_ai_conversations.sql
0016_tender_events.sql
```

Migration names can be adjusted to match actual project conventions.

---

# 12. Bid Opportunities

Recommended table:

```text
bid_opportunities
-----------------
id
user_id
tender_id
stage
priority
fit_score
fit_confidence
estimated_bid_value
win_probability
notes
created_at
updated_at
```

Recommended stages:

```ts
type BidStage =
  | 'qualifying'
  | 'pursuing'
  | 'preparing'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'withdrawn';
```

Every opportunity should have a clear **Next Action**.

Example:

```text
94% MATCH

KZN Road Rehabilitation
R8m – R15m

QUALIFYING

⚠ 3 requirements missing
⏰ Closes in 6 days

Next action:
Review mandatory documents

[Open Bid]
```

---

# 13. Tender Analysis Storage

Do not regenerate expensive analysis every time a user opens a tender.

Recommended table:

```text
tender_analyses
---------------
id
tender_id
version
status
executive_summary
fit_score
fit_confidence
eligibility_summary
scope_summary
risk_summary
analysed_at
created_at
updated_at
```

Recommended status:

```ts
type AnalysisStatus =
  | 'queued'
  | 'processing'
  | 'complete'
  | 'failed';
```

---

# 14. Tender Requirements

Recommended table:

```text
tender_requirements
--------------------
id
analysis_id
category
title
description
mandatory
source_document
source_page
status
```

Categories:

```text
eligibility
compliance
technical
financial
submission
documentation
cidb
bbbee
tax
briefing
pricing
```

Requirement state:

```ts
type RequirementStatus =
  | 'unknown'
  | 'complete'
  | 'missing'
  | 'not_applicable'
  | 'needs_review';
```

This allows the UI to truthfully show things such as:

```text
47 Requirements identified

31 Complete
8 Missing
5 Need Review
3 Not Applicable
```

---

# 15. Document Intelligence

Recommended structure:

```text
src/lib/documents/
├── fetch-document.ts
├── extract-text.ts
├── classify.ts
├── chunk.ts
├── requirements.ts
├── citations.ts
└── types.ts
```

Every AI-derived statement should retain document evidence.

```ts
interface DocumentEvidence {
  documentId: string;
  documentName: string;
  page?: number;
  section?: string;
  text: string;
}
```

Example:

```text
CIDB Grade 6GB is required.

Source: RFQ2214 RE-ISSUE.pdf · page 14
```

This citation/evidence layer is a core trust feature.

---

# 16. Ask This Tender

Pro should include document-grounded Q&A.

Suggested route:

```text
src/app/(app)/tenders/[id]/ask/
```

AI services:

```text
src/lib/ai/
├── provider.ts
├── models.ts
├── prompts.ts
├── retrieval.ts
├── structured-output.ts
├── citations.ts
├── tender-chat.ts
└── errors.ts
```

Flow:

```text
User question
      ↓
Identify tender
      ↓
Retrieve relevant document chunks
      ↓
Generate answer
      ↓
Attach evidence
      ↓
Return answer + sources
```

Example:

```text
Does this tender require a CIDB Grade 6 contractor?

Yes. The tender specifies a Grade 6GB requirement.

Source:
RFQ2214 RE-ISSUE.pdf · p.14
```

This must be grounded in the tender pack, not generic model knowledge.

---

# 17. AI Bid Assistant

Once Ask This Tender is reliable, the same retrieval engine can power:

```text
Generate:
├── Cover letter
├── Executive summary
├── Method statement
├── Capability statement
├── Compliance response
├── Clarification questions
└── Bid response outline
```

Do not build seven separate AI systems. Build one document-grounded AI layer and expose different task modes.

Example API/domain call:

```ts
const result = await analyseTender({
  tender,
  documents,
});
```

AI orchestration should live in domain services, not React components.

---

# 18. Bid Desk / Pipeline

The current Pipeline navigation should evolve into a real bid-management workspace.

Suggested structure:

```text
src/app/(app)/pipeline/
├── page.tsx
├── PipelineView.tsx
├── BidCard.tsx
├── BidStage.tsx
├── BidDetail.tsx
├── BidTasks.tsx
└── actions.ts
```

Pipeline stages:

```text
Qualifying
    ↓
Pursuing
    ↓
Preparing
    ↓
Submitted
    ↓
Won / Lost
```

The UI should show:

- Active bids
- Potential value
- Closing soon
- Missing requirements
- Outstanding tasks
- Next action

---

# 19. Bid Tasks

Recommended table:

```text
bid_tasks
---------
id
bid_opportunity_id
title
description
status
priority
due_at
assigned_to
created_at
completed_at
```

Typical tasks:

```text
☐ Obtain tax certificate
☐ Complete pricing schedule
☐ Prepare method statement
☐ Review compulsory briefing
☐ Management sign-off
☐ Submit tender
```

Eventually tasks can be automatically created from mandatory tender requirements.

---

# 20. Smart Alerts

The existing alert/settings foundation should be extended rather than replaced.

Recommended structure:

```text
src/lib/alerts/
├── match-alert.ts
├── generate-alerts.ts
├── channels.ts
├── digest.ts
└── types.ts
```

A premium alert should explain why it matters.

Instead of:

```text
New tender available.
```

Use:

```text
🔥 94% match — worth reviewing

Why?
✓ KZN
✓ CIDB matches
✓ Value range matches
✓ Construction
⚠ Closes in 6 days
```

Future alert channels can include in-app, email and scheduled digests depending on the available infrastructure.

---

# 21. Events Architecture

Introduce a lightweight product event layer so different features can react to the same underlying actions.

Suggested structure:

```text
src/lib/events/
├── tender-events.ts
└── types.ts
```

Events:

```text
TENDER_SAVED
ANALYSIS_COMPLETED
REQUIREMENT_MISSING
BID_CREATED
BID_STAGE_CHANGED
TASK_DUE
TENDER_CLOSING_SOON
TENDER_UPDATED
BID_SUBMITTED
```

Events can feed Today, alerts, analytics and pipeline updates.

---

# 22. Analytics / Learning Loop

The product should eventually learn from outcomes.

Track the journey:

```text
Tender exposure
      ↓
Tender opened
      ↓
Analysis viewed
      ↓
Saved
      ↓
Added to pipeline
      ↓
Submitted
      ↓
Won / Lost
```

This allows future company-level insights such as:

> Your strongest opportunities are tenders between R2m–R10m in KZN.

These insights should be based on real user/company data, not invented statistics.

---

# 23. Type System Blueprint

Keep the base Tender model focused. Add separate domain models rather than putting every premium concept into `Tender`.

Recommended types:

```ts
interface TenderFitAnalysis {
  score: number;
  confidence: FitConfidence;
  positives: FitSignal[];
  concerns: FitSignal[];
  missingProfileData: string[];
}

interface TenderRequirement {
  id: string;
  category: RequirementCategory;
  title: string;
  description: string;
  mandatory: boolean;
  status: RequirementStatus;
  evidence: DocumentEvidence[];
}

interface TenderAnalysis {
  id: string;
  tenderId: string;
  status: AnalysisStatus;
  summary: string;
  fit: TenderFitAnalysis;
  requirements: TenderRequirement[];
  risks: TenderRisk[];
  deadlines: TenderDeadline[];
}
```

The current Tender domain already contains `valueCents`, documents, lifecycle status and CIDB grade, so new intelligence should build on those existing fields rather than duplicating them.

---

# 24. API / Server Architecture

Complex work should happen server-side.

Recommended routes:

```text
src/app/api/
├── analyst/
│   └── [tenderId]/
│       └── route.ts
│
├── tenders/
│   └── [id]/
│       ├── analysis/
│       └── ask/
│
├── pipeline/
│   ├── opportunities/
│   └── tasks/
│
└── alerts/
```

Authorization must be enforced server-side.

The browser must never be able to claim Pro simply by sending a client-side value such as:

```json
{ "tier": "pro" }
```

The existing server-side entitlement system remains authoritative.

---

# 25. Pro Feature Gates

Centralize Pro capabilities.

Suggested feature type:

```ts
type ProFeature =
  | 'deep_analysis'
  | 'tender_ai'
  | 'smart_alerts'
  | 'document_intelligence'
  | 'bid_assistant'
  | 'advanced_pipeline'
  | 'exports';
```

Use a single entitlement layer such as:

```ts
requireFeature('deep_analysis');
```

or:

```ts
hasFeature(tier, 'tender_ai');
```

UI hiding is not sufficient. Server-side enforcement is required.

---

# 26. Premium Component Blueprint

Suggested component structure:

```text
src/components/
├── analyst/
│   ├── FitScore.tsx
│   ├── FitSignals.tsx
│   ├── RiskCard.tsx
│   ├── RequirementList.tsx
│   └── AnalysisProgress.tsx
│
├── pipeline/
│   ├── BidCard.tsx
│   ├── StageColumn.tsx
│   ├── BidMetrics.tsx
│   └── NextAction.tsx
│
├── ai/
│   ├── AskTender.tsx
│   ├── AIResponse.tsx
│   └── SourceCitation.tsx
│
└── pro/
    ├── ProBadge.tsx
    ├── ProGate.tsx
    └── ProFeature.tsx
```

The visual language should remain consistent with the current clean Poppins-based mobile-first UI.

---

# 27. Background Processing

Document analysis should eventually be asynchronous.

Target flow:

```text
Tender identified
      ↓
Queue analysis
      ↓
Extract documents
      ↓
Chunk documents
      ↓
Extract requirements
      ↓
Calculate fit
      ↓
Detect risks
      ↓
Save analysis
      ↓
Notify user
```

The UI should support:

```text
Analysing tender pack…
```

and then progressively show completed results.

---

# 28. Product Build Order

Do not build everything simultaneously. Build vertically so each phase creates a working premium product.

## Phase 1 — Intelligence Foundation

```text
Opportunity scoring
      ↓
Fit score
      ↓
Explainable signals
      ↓
Tender Analysis model
      ↓
Requirements model
```

## Phase 2 — Deep Analysis

```text
Document extraction
      ↓
Requirements
      ↓
Eligibility
      ↓
Risks
      ↓
Deadlines
      ↓
Citations
```

## Phase 3 — Bid Desk

```text
Pipeline DB
      ↓
Bid opportunity
      ↓
Stages
      ↓
Tasks
      ↓
Next action
```

## Phase 4 — AI

```text
Ask Tender
      ↓
Document-grounded answers
      ↓
Bid Assistant
      ↓
Response generation
```

## Phase 5 — Pro Retention

```text
Smart Alerts
      ↓
Daily briefing
      ↓
Closing reminders
      ↓
Personalized recommendations
```

## Phase 6 — Commercial Hardening

```text
Free
Basic
Pro
      ↓
Server-side gates
      ↓
Real billing
      ↓
Usage tracking
      ↓
Billing lifecycle
```

---

# 29. Free / Basic / Pro Strategy

Pro should not feel like Basic with higher limits.

### Free

- Limited discovery
- Limited tender views
- Limited analysis
- Basic saved functionality

### Basic

- More tender access
- Saved tenders
- Basic pipeline
- Limited AI/analysis
- Standard alerts

### Pro

- Unlimited opportunity discovery
- Deep Analysis
- Tender Fit Score
- Explainable matching
- Document intelligence
- Requirements checklist
- Red flags
- Ask This Tender
- AI Bid Assistant
- Smart alerts
- Advanced Bid Desk
- Tasks
- Calendar/reminders
- Exports
- Full premium workflow

The exact limits can be finalized after real product usage data is available.

---

# 30. Trust & Accuracy Rules

TenderBase deals with procurement decisions, so trust is more important than flashy AI.

Rules:

1. Never invent tender requirements.
2. Never claim a document contains something without evidence.
3. Keep document citations wherever practical.
4. Distinguish tender facts from company-profile facts.
5. Distinguish AI interpretation from verified facts.
6. Never fake fit scores when the required data is unavailable.
7. Never show fabricated pipeline or financial numbers.
8. Never rely on client-side tier checks for authorization.
9. Treat cancelled tenders as cancelled even if closing dates are misleading.
10. Keep upstream category values separate from the app's display taxonomy.

---

# 31. Core Architectural Principle

The AI should **not** be the entire product.

The intelligence hierarchy is:

```text
                 TENDER DATA
                     │
                     ▼
               VERIFIED FACTS
                     │
                     ▼
               RULES / SCORING
                     │
                     ▼
            EXPLAINABLE ANALYSIS
                     │
                     ▼
                    AI
                     │
                     ▼
               USER DECISION
                     │
                     ▼
                BID PIPELINE
```

AI sits on top of reliable tender data.

This is the foundation for a premium product users can trust.

---

# 32. Current Development Priority

The next implementation slice is intentionally narrow:

### Build the Opportunity Engine + Tender Analysis foundation + Requirements schema.

Specifically:

1. Introduce opportunity scoring types/services.
2. Implement explainable fit signals.
3. Add database migrations for analyses and requirements.
4. Add server-side analysis service.
5. Connect Deep Analysis UI to persisted analysis data.
6. Add requirement status/checklist UI.
7. Add fit score and red-flag presentation.
8. Keep all results evidence-based.
9. Test the workflow using the Pro development override.
10. Deploy and verify on Render.

Only after that foundation is stable should we move into Ask This Tender, Bid Assistant and advanced alert automation.

---

# 33. Definition of Done for the Premium Foundation

The first major milestone is complete when a Pro user can:

```text
Open Tender
    ↓
See Fit Score
    ↓
Understand Why It Fits
    ↓
See Red Flags
    ↓
See Eligibility
    ↓
See Requirements
    ↓
See Missing Items
    ↓
See Evidence / Sources
    ↓
Add Tender to Bid Desk
    ↓
See Next Action
```

No fake AI output, no placeholder business metrics, and no client-only Pro security.

---

# 34. Long-Term End State

TenderBase should eventually map almost one-to-one between user experience and technical architecture:

```text
TODAY
  ↓
OPPORTUNITIES
  ↓
BID ANALYST
  ↓
TENDER WORKSPACE
  ↓
AI / REQUIREMENTS / RISKS
  ↓
BID DESK
  ↓
TASKS
  ↓
SUBMISSION
  ↓
OUTCOME
```

And the underlying data model becomes:

```text
Supabase
   │
   ├── Company Profile
   ├── Preferences
   ├── Tenders
   ├── Documents
   ├── Analyses
   ├── Requirements
   ├── Saved Tenders
   ├── Bid Opportunities
   ├── Tasks
   ├── Alerts
   ├── AI Conversations
   ├── Tender Events
   └── Billing
```

---

# 35. Development History Summary

The project process so far has followed this sequence:

1. Established the TenderBase GitHub repository as the code source of truth.
2. Connected the live Render web app and API into the development workflow.
3. Audited the existing application rather than rebuilding working functionality.
4. Confirmed that the Poppins typography requirement was already correctly implemented globally.
5. Reviewed the existing Today, Discover, Saved, Pipeline, Pro and tender-detail experiences.
6. Confirmed the existing subscription/entitlement architecture.
7. Identified the need for a development-only Pro override so premium features could be tested while the real billing system remained intact.
8. Added `TENDERBASE_TEST_PRO=true` and server-side Pro resolution for development.
9. Fixed the `TodayExperience.tsx` TypeScript deployment issue involving `value` vs `valueCents`.
10. Added a South African Rand formatter for tender values.
11. Verified the Pro experience in the live app during testing.
12. Repositioned Pro around the Bid Analyst workflow.
13. Agreed that TenderBase should become a bid decision and execution platform rather than simply a tender directory.
14. Designed the Opportunity Engine, Tender Analyst, Document Intelligence, Bid Desk, AI and Smart Alert architecture.
15. Defined the database and type-system roadmap.
16. Defined the implementation order so the intelligence foundation is built before advanced AI automation.
17. Saved this project history and blueprint into the repository as `PROJECT_HISTORY.md`.

---

# 36. Working Rule for Future Development

Before adding a new feature, ask:

> **Does this help a company decide, prepare, submit, or win a tender?**

If yes, it belongs in the TenderBase product strategy.

If it is merely another generic dashboard feature, avoid it unless it materially improves the bid workflow.

The product should continuously move users from:

> **“I found a tender.”**

to:

> **“TenderBase found an opportunity worth pursuing, told me why, showed me what could stop me, and helped me get the bid submitted.”**

That is the premium product.
