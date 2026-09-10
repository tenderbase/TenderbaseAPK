# TenderBase CRM — Product, UX & Native App Blueprint

**Status:** Blueprint first — no CRM feature implementation should start until this document is accepted.
**Product direction:** TenderBase becomes a calm, premium tender CRM for discovering, deciding, preparing, submitting and learning from tender opportunities.
**North star:** *Find. Decide. Prepare. Submit. Win.*

---

## 1. Audit snapshot — current codebase

### What is already strong

- Next.js 14 App Router provides a workable web/mobile UI foundation.
- Capacitor Android 6.x is already present with Local Notifications.
- The APK is intentionally a thin hosted WebView shell, keeping server secrets and Next.js route handlers on the server.
- Supabase-backed identity/profile/preferences/saved data and tier state already exist.
- Tender discovery, saved tenders, alerts, news, briefing, calendar, profile and Pro billing already have route/shell foundations.
- The calendar already has native alarm plumbing and tender-to-calendar linking.
- Poppins is now the global typeface and reduced-motion handling already exists.
- The current shell has safe-area padding on the mobile bottom navigation.

### Architectural issues to resolve before CRM expansion

1. **Mobile navigation is overfull.** The current mobile shell exposes six top-level destinations: Today, Discover, Saved, Calendar, News and Alerts. CRM expansion would make this worse. We need a five-slot primary navigation and move lower-frequency destinations behind a More/account surface.
2. **Home is too dense.** `DashboardView` currently combines briefing, profile quality, matches, saved closing-soon, catalogue closing-soon, latest opportunities, data-source states and guest discovery. The CRM home should become a decision dashboard with progressive disclosure, not a catalogue wall.
3. **Calendar has become a first-class tab, but CRM workflow should own the calendar context.** Calendar remains important, but a tender deadline should be reachable directly from a tender workspace and from Today. It should not require users to remember where Calendar lives.
4. **The current Capacitor config is a hosted-URL shell.** This is acceptable for server-rendered Next.js features, but native capabilities must be isolated behind small client-side adapters. Never put Supabase service-role keys, PayFast secrets, admin secrets or other server credentials in the APK.
5. **Native capabilities need a dedicated boundary.** Notifications exist, but future haptics, network status, share, files and deep links should not be scattered through page components. Create one `native/` capability layer.
6. **State is spread across multiple client providers/stores.** Before adding CRM entities, define clear ownership: server data via Supabase/API, local UI state in components, device state in native adapters, and cached/offline CRM data in a single repository/cache layer.
7. **Design tokens need consolidation.** The existing UI already has useful semantic tokens, but new CRM screens must not introduce one-off radius, shadow, spacing or color systems. Premium should come from hierarchy and restraint, not decoration.
8. **The existing UI blueprint is partly stale.** It still describes a trial and an Inter/Geist direction. The product no longer needs a free-trial UX, and Poppins is the current product font. The new CRM blueprint supersedes those conflicting parts.
9. **The current calendar implementation has a navigation-state risk.** Week navigation changes the selected date/month label but the date strip is currently derived from the initial current week. This must be fixed when the calendar is next touched.
10. **The hosted WebView model means network resilience matters.** CRM screens must have clear loading, offline, retry and stale-data states rather than appearing frozen when the hosted app/API is unavailable.

---

## 2. Product principle: calm CRM, not feature overload

TenderBase should not try to become a generic Salesforce clone.

The app should answer five questions in order:

1. **What matters today?**
2. **Which tenders should I pursue?**
3. **What do I need to do next?**
4. **Is the submission ready?**
5. **What did we learn from the result?**

Every feature must attach to one of these questions. If it does not, it belongs in a later roadmap or not at all.

### Progressive disclosure rules

- Home shows decisions, not every available metric.
- Lists show the minimum useful information; detail screens reveal the rest.
- Advanced filters live in sheets.
- Tender workspaces expose secondary information through sections/accordions rather than giant pages.
- CRM administration lives in More/Settings, not the primary navigation.
- AI explains recommendations with evidence; it never becomes a decorative chatbot panel.
- No screen should require the user to understand the whole CRM before completing its primary task.

---

## 3. New information architecture

### Mobile — five primary destinations

**Today · Discover · Pipeline · Saved · More**

- **Today:** personalised work queue, deadlines, recommended next actions.
- **Discover:** tender catalogue, search, filters and matching.
- **Pipeline:** active tender CRM pipeline and opportunities.
- **Saved:** saved tenders, searches and followed organisations.
- **More:** Calendar, Alerts, News, Briefing, Company, Team, Pro, Settings.

Calendar and Alerts remain one-tap destinations from relevant contexts and are not buried; they simply stop competing for top-level tab space.

### Desktop/tablet

Left rail: **Today · Discover · Pipeline · Saved**. Secondary destinations under **More**. Pro remains a visually distinct upgrade/account action rather than another content category.

### Navigation behaviour

- Tabs switch top-level destinations and preserve their state.
- Detail/workspace screens push onto the stack.
- Creation/editing uses focused sheets or dedicated screens depending on complexity.
- System back must return through the expected stack; do not invent a second browser-like back system.
- Deep links should open directly into a tender, task, notification or calendar event.

---

## 4. Core CRM object model

The minimum viable CRM should use these objects:

```text
TenderOpportunity
  -> Tender
  -> PipelineStage
  -> Owner
  -> Value
  -> Probability
  -> Status
  -> Decision
  -> Deadline
  -> NextAction

TenderWorkspace
  -> Opportunity
  -> Requirements
  -> Documents
  -> Tasks
  -> TeamMembers
  -> Contacts
  -> Notes
  -> ActivityTimeline
  -> CalendarEvents
  -> Submission
  -> Outcome

Organisation
  -> Contacts
  -> Tenders
  -> Follow/Watch state

Task
  -> TenderWorkspace
  -> Owner
  -> DueAt
  -> Priority
  -> Status

Outcome
  -> Won/Lost/Cancelled
  -> AwardValue
  -> Reason
  -> Notes
```

Do not create all of these tables on day one. Start with the smallest relational model that supports the first complete workflow: **save tender → qualify → pursue → task → submit → outcome**.

---

## 5. The CRM lifecycle

```text
DISCOVER
   ↓
SAVE
   ↓
QUALIFY
   ↓
BID / NO-BID
   ↓
PURSUING
   ↓
PREPARING
   ↓
SUBMITTED
   ↓
WON / LOST / CANCELLED
   ↓
LEARN
```

### Stage rules

Each active opportunity has exactly one stage and exactly one next action.

The UI should always make the next action obvious:

> **Next: Upload pricing schedule · Due tomorrow**

That is more useful than displaying ten CRM fields.

---

## 6. Screen blueprint

### 6.1 Today — the calm command centre

Top:
- greeting + date
- alert/avatar
- compact plan chip

Hero:
- **Needs your attention** count
- one primary recommendation
- one deadline countdown when urgent

Then only three sections:
1. **Next up** — 3 highest-priority actions.
2. **Your pipeline** — compact value + stage summary.
3. **Closing soon** — maximum 3 tenders.

Everything else is progressively disclosed through **View all**.

### 6.2 Discover

Keep the current search strength. Add CRM-aware actions:

- Match me
- Save
- Add to Pipeline
- quick deadline filter

Do not turn every tender card into a CRM card. Discovery should still feel fast.

### 6.3 Pipeline

Default mobile view: **list first**, with an optional compact stage filter. Kanban is a secondary desktop/tablet view, not the default mobile interaction.

Pipeline row:
- tender title
- issuer
- stage
- value
- deadline
- next action

Stage filters:
**New · Qualifying · Pursuing · Preparing · Submitted**

Won/Lost live under History.

### 6.4 Tender workspace

This is the CRM flagship screen.

Top:
- back
- tender title
- save/follow
- overflow

Hero:
- issuer
- value
- deadline countdown
- current stage
- match score

Primary action:
> **Next action**

Sections in order:
1. Overview
2. AI decision
3. Requirements
4. Tasks
5. Documents
6. Team & contacts
7. Timeline
8. Submission / outcome

Only one section is expanded at a time where content is long.

### 6.5 Requirements

Simple checklist with completion percentage.

```text
Submission readiness 73%

✓ Tax clearance
✓ B-BBEE certificate
✓ Company profile
○ Pricing schedule      Michael · due tomorrow
○ Methodology           John · due Friday
```

### 6.6 Tasks

Tasks are deliberately lightweight.

- task name
- owner
- due time
- priority
- done

Do not build a generic project-management suite.

### 6.7 Calendar

Calendar becomes the **time layer of the CRM**.

Tender deadlines, tasks and reminders appear together.

Quick action from a tender:
> **Add deadline reminder**

Native Android notification is scheduled through Capacitor when permission is available. Web fallback remains in-app.

### 6.8 Contacts / Organisations

Start with the contact information needed to act on a tender. Avoid building a giant contact-management module initially.

### 6.9 Outcome

At submission/award time, capture only what creates future intelligence:

- outcome
- awarded value
- competitor/awardee when known
- loss reason
- short note

Later analytics can learn from this.

---

## 7. AI strategy

AI should appear at moments of decision, not everywhere.

### Three core AI jobs

**1. Qualify**
> "Should we pursue this?"

**2. Prepare**
> "What must we do before submission?"

**3. Explain**
> "Why is this a good/bad fit?"

### AI decision card

```text
92% match
Strong fit for your business

✓ Category matches
✓ Province matches
✓ Contract value is in range
⚠ CIDB requirement needs checking

Recommendation: PURSUE
```

Every AI recommendation must distinguish:
- sourced facts
- inferred judgement
- missing information

No black-box confidence theatre.

---

## 8. Native Capacitor architecture

The app remains a Next.js application inside a Capacitor shell.

```text
React / Next UI
      ↓
Application services
      ↓
Repositories / API / Supabase
      ↓
Native capability adapters
      ↓
Capacitor plugins
      ↓
Android / iOS
```

### Native adapter boundary

Create a small `src/lib/native/` layer for:

- notifications
- haptics
- share
- network status
- app URL/deep links
- files where needed

Components should call application-level functions such as:

```ts
notifyTenderDeadline(...)
hapticSuccess()
shareTender(...)
getNetworkState()
```

They should not import Capacitor plugins directly unless they are inside the native adapter.

### Hosted WebView rule

The APK contains no secrets and no business-critical server-only logic. The existing hosted URL approach stays unless a later offline requirement justifies bundling a static web build.

### Offline strategy

Phase 1:
- cached shell/loading state
- locally retain last-known saved/pipeline records where safe
- clear offline banner
- retry controls

Phase 2:
- queued writes for low-risk actions such as task completion and note creation
- sync conflict handling

Do not promise full offline CRM until sync semantics are designed.

---

## 9. Native interaction rules

- Minimum practical touch target: ~44px.
- Respect Android system back and gesture navigation.
- Use bottom sheets for short focused actions.
- Use full screens for multi-step workflows.
- Use haptics sparingly: save, stage change, task complete, alarm scheduled.
- Ask notification permission only after explaining the benefit.
- Handle denied notification permission gracefully; never block CRM usage.
- Respect safe areas and system bars.
- Avoid fixed elements that collide with the gesture/navigation area.
- Keep animations short and interruptible; respect reduced-motion settings.

---

## 10. Premium visual system

### Brand

- Poppins remains the product font.
- Deep navy is the foundation.
- Electric blue is the action/AI accent.
- Emerald is reserved for positive opportunity/success.
- Amber is deadline warning.
- Red is real urgency only.
- Gold is Pro only.

### Shape

- 12px controls
- 16px cards
- 20px sheets/dialogs
- restrained borders
- very soft shadows
- generous whitespace

### Premium rule

**One hero, one action, one decision per screen.**

Avoid:
- gradients everywhere
- excessive badges
- dashboard tiles for every metric
- giant icon grids
- multiple competing CTAs
- decorative AI elements
- dense tables on phones

---

## 11. Data and backend rollout

### Phase 1 — CRM foundation

Add the minimum tables and policies for:
- opportunities
- stages
- tasks
- requirements
- activity events
- outcomes

All user-owned CRM records must be protected with RLS.

### Phase 2 — workflow

Wire:
- Save → Add to Pipeline
- stage changes
- task creation/completion
- requirement tracking
- calendar events
- native reminders

### Phase 3 — intelligence

Add:
- bid/no-bid scoring
- readiness score
- next-action suggestions
- win/loss analysis

### Phase 4 — collaboration

Only after the solo CRM workflow is stable:
- team members
- assignments
- shared workspaces
- organisation contacts

---

## 12. Build order

### Sprint 0 — Audit / foundation
- freeze current visual language
- remove stale trial references from product UX/docs
- consolidate navigation
- create native adapter boundary
- fix calendar week state
- establish CRM domain types/repository interfaces

### Sprint 1 — Pipeline MVP
- Pipeline screen
- Add to Pipeline action on tender detail
- opportunity stage
- next action
- basic task
- Today integration

### Sprint 2 — Tender workspace
- overview
- AI decision card
- requirements
- tasks
- timeline
- documents

### Sprint 3 — Calendar + native
- tender deadlines
- task reminders
- local notifications
- haptics
- deep links
- offline/retry states

### Sprint 4 — Outcomes + analytics
- won/lost
- loss reasons
- pipeline value
- win rate
- lightweight insights

### Sprint 5 — Team CRM
- contacts
- assignments
- shared workspace
- permissions

---

## 13. Definition of done for the first CRM release

A user must be able to:

1. Discover a tender.
2. Save it.
3. Add it to the pipeline.
4. Decide Bid / No-bid.
5. See the next action.
6. Create/complete the action.
7. Track submission requirements.
8. Receive a native deadline reminder.
9. Mark the tender submitted.
10. Record won/lost.

If those ten actions feel effortless, TenderBase has become a useful CRM. Anything else is secondary.

---

## 14. Research basis

The navigation and hierarchy follow current platform guidance: Android treats navigation as a graph/back-stack problem and explicitly supports bottom navigation and predictable back behaviour; Apple recommends tabs for true top-level categories, persistent tab access, concise labels, and progressive disclosure rather than cramming content into a home screen. Android's current adaptive guidance also favours layouts that adapt across phone, tablet and larger surfaces. Capacitor is designed to expose native capabilities such as notifications through plugins while keeping a web application as the UI layer.

The product therefore uses a small five-destination mobile hierarchy, push-style detail/workspace navigation, focused sheets for short tasks, and a native adapter layer instead of scattering device APIs through React screens.

---

## 15. Non-goals for now

Do **not** build yet:

- generic sales CRM pipelines unrelated to tenders
- a full project-management system
- chat/messaging between team members
- complex invoicing/accounting
- custom workflow builders
- a huge analytics suite
- calendar sync with every external provider
- offline-first sync across every entity

These can be evaluated after the core tender workflow proves itself.
