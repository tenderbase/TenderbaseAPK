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

## 12. Organisation accounts — the collaboration foundation

TenderBase must support a company as a first-class tenant. A user account is not the organisation.

Example:

```text
ACME Construction
│
├── Organisation Admin / Construction Manager
│
├── Sales Manager
│   ├── Sales User
│   └── Sales User
│
├── Tender Manager
│
├── Estimator / Finance
│
└── Viewer
```

### Core rules

- One person has one TenderBase user identity.
- A user may belong to one or more organisations later, but MVP can enforce one active organisation at a time.
- CRM records belong to an organisation, not directly to a user.
- Users have a membership in the organisation with a role.
- Ownership/assignment of a tender is separate from organisation membership.
- Leaving an organisation must never delete its CRM data.
- The first organisation creator becomes the organisation owner/admin.
- Invites are email-based and expire.
- A user must accept an invitation before gaining organisation access.
- Organisation membership and role changes are audited.

### Why this matters

The current `company_profiles` table is one row per user. That is fine for the existing personal workspace, but it is not sufficient for shared CRM ownership. The CRM model needs a shared organisation layer while preserving the user's personal profile/preferences.

---

## 13. Roles and permissions

Use **roles + explicit permissions**, not hard-coded UI checks such as `if role === 'admin'` everywhere.

Supabase supports RBAC using role/permission data and RLS, which is the right model for enforcing access at the database boundary. citeturn0search10turn0search3

### Initial roles

#### Owner

Full organisation control.

Can:
- manage organisation
- invite/remove users
- assign roles
- configure permissions
- manage billing
- see all CRM data
- delete/archive organisation data

#### Admin

Operational control without ownership transfer.

Can:
- invite users
- manage most roles/permissions
- manage CRM settings
- see/edit all organisation CRM data
- manage team communication

Cannot:
- transfer ownership
- permanently delete the organisation

#### Tender Manager

Runs the tender operation.

Can:
- create/edit opportunities
- move pipeline stages
- assign tenders/tasks
- manage requirements
- upload/manage tender workspace documents
- communicate in organisation/tender channels
- record bid/no-bid decisions
- submit/close opportunities

#### Sales Manager

Owns commercial pipeline.

Can:
- create/edit opportunities
- view organisation pipeline
- assign sales tasks
- communicate with team
- view tender value/probability
- manage customer/issuer contacts

By default, sensitive compliance documents and organisation settings remain outside this role.

#### Sales User

Focused execution role.

Can:
- view permitted tenders
- create/save opportunities if allowed
- update assigned opportunities
- complete assigned tasks
- communicate with permitted users/channels
- view relevant documents

Cannot:
- change roles
- manage billing
- remove users
- alter organisation permissions

#### Estimator / Finance

Commercial preparation role.

Can:
- access assigned pricing/financial tasks
- update pricing-related requirements
- view tender values
- communicate on assigned workspaces

Sensitive financial information can be separately permissioned later.

#### Viewer

Read-only collaboration.

Can:
- view permitted tenders/pipeline/workspaces
- read team communication
- view non-sensitive documents

Cannot:
- modify CRM records
- send organisation messages if the organisation disables viewer messaging
- invite users

### Permission model

Permissions should be named by action, for example:

```text
organisation.view
organisation.manage
members.view
members.invite
members.manage_roles
billing.manage
crm.view
crm.create
crm.edit
crm.delete
pipeline.move
pipeline.assign
requirements.edit
tasks.create
tasks.assign
tasks.complete
documents.view
documents.upload
documents.delete
contacts.view
contacts.edit
messages.view
messages.send
messages.moderate
reports.view
```

Roles map to permissions. The UI uses permissions to show/hide actions, but **Supabase RLS and server-side authorization are the final enforcement layer**.

### Custom roles later

Pro/Team roadmap can allow an admin to create a custom role by selecting permissions. Do not expose this complexity in the first release; provide the six sensible presets above.

---

## 14. Team onboarding and invitation flow

The construction manager's first-run flow should feel simple:

```text
Create company
      ↓
Company basics
      ↓
You're the Admin
      ↓
Invite your team
      ↓
Choose role
      ↓
Send invites
      ↓
Open TenderBase
```

Do not force the manager to configure permissions manually before they can use the CRM.

### Invite screen

```text
Invite your team

Email
[ james@company.co.za             ]

Role
[ Sales User                    v ]

              [ Send invite ]

+ Invite another
```

After sending:

> **3 invitations sent**
> James · Sales User · Pending
> Sarah · Tender Manager · Accepted

### Invite acceptance

Email/deep link opens TenderBase → sign in/create account → confirm organisation → role is applied automatically.

A user should never be able to select a privileged role for themselves.

---

## 15. Team directory

The Team screen is deliberately small.

```text
TEAM

[ Search people ]

Sarah
Tender Manager
● Online

James
Sales User
○ Offline

Michael
Estimator
● Online
```

Tap a person:

- profile
- role
- assigned tenders
- assigned tasks
- message

The directory is not a social network. It exists to help the team get work done.

Presence should use Supabase Realtime Presence for low-frequency online state rather than polling. citeturn0search1turn0search2

---

## 16. Team communication — chat is a workflow, not a separate social app

Communication is important, but we should avoid building WhatsApp inside TenderBase.

### Three communication levels

#### 1. Organisation chat

A simple company-wide channel:

> **Team**

For:
- announcements
- quick questions
- coordination
- tender alerts

#### 2. Tender workspace chat

Every active tender can have a contextual conversation:

> **Municipal Offices**

This is the most important chat.

Messages stay attached to the tender so the discussion has business context.

Example:

> Sarah: Pricing schedule is ready.
>
> Michael: I still need the BOQ clarification.
>
> John: I uploaded the revised methodology.
>
> Sarah: Great — moving us to final review.

#### 3. Direct messages

One-to-one chat between members of the same organisation.

Keep this secondary to tender-context communication.

### Chat navigation

Do not make Chat a permanent bottom tab.

Entry points:

- More → Team
- Team member → Message
- Tender workspace → Chat
- Notification → open conversation

This keeps the main app calm.

---

## 17. Chat data model

Persist messages in Postgres so conversations survive reconnects and can be audited. Use Supabase Realtime for delivery/update UX rather than treating Broadcast itself as the permanent message store.

Suggested minimum model:

```text
conversations
  id
  organisation_id
  type: organisation | tender | direct
  tender_id nullable
  created_by
  created_at
  archived_at nullable

conversation_members
  conversation_id
  user_id
  joined_at
  last_read_at
  muted_at nullable

messages
  id
  conversation_id
  sender_id
  body
  created_at
  edited_at nullable
  deleted_at nullable
  reply_to_id nullable
  metadata jsonb

message_attachments (later)
  id
  message_id
  storage_path
  file_name
  mime_type
  size_bytes
  created_at
```

### Message delivery

1. User sends message.
2. Server/database validates organisation membership and `messages.send` permission.
3. Message is persisted.
4. Supabase Realtime broadcasts the database change to authorised participants.
5. Recipients update instantly.
6. Push notification is sent when the recipient is not actively viewing that conversation, subject to notification preferences.

Supabase Realtime supports database changes, Broadcast and Presence, with private channels and RLS-based authorization suitable for organisation-scoped collaboration. citeturn0search0turn0search4

### Important security rule

A user's ability to subscribe to a conversation channel must be derived from actual organisation/conversation membership. Never use a predictable public channel and trust the client to behave.

All exposed tables require RLS and least-privilege grants. Supabase explicitly recommends enabling RLS and testing allow/deny behaviour for every exposed table. citeturn0search3

---

## 18. Premium chat UX

The chat screen should feel like TenderBase, not a generic messenger clone.

Header:

```text
← Municipal Offices
3 members · ● 2 online
```

Messages are compact, spacious and readable.

Composer:

```text
[ Message the tender team...          ]  ➤
```

Quick contextual actions above the keyboard:

**Mention · Attach · Task · Requirement**

A powerful interaction:

> **Convert to task**

A message such as:

> "Michael please complete pricing by 4pm tomorrow"

can become a task with the message retained as context.

AI can suggest this conversion later, but the initial release should keep it explicit and predictable.

### Chat states

- sending
- sent
- failed → retry
- offline → queued only if offline messaging is explicitly supported later
- unread
- muted
- archived

Never show a message as sent when the server rejected it.

---

## 19. Notifications + communication

Communication must connect to the existing notification system.

Examples:

**Team message**
> Sarah sent a message in Municipal Offices

**Mention**
> James mentioned you in Municipal Offices

**Task assignment**
> Sarah assigned you: Complete pricing

**Tender update**
> Municipal Offices moved to Final Review

**Deadline**
> Municipal Offices closes tomorrow at 14:00

The user controls notification categories and quiet hours. Native phone notifications are optional and permission-aware.

Do not notify the whole organisation for every event. Default routing should be targeted:

- direct message → recipient
- mention → mentioned user
- task assignment → assignee
- tender activity → workspace members/watchers where appropriate
- organisation announcement → organisation members

---

## 20. Organisation activity timeline

The CRM needs an audit-friendly activity feed separate from chat.

Example:

```text
Today

10:42  Sarah assigned Pricing Schedule to Michael
10:31  John uploaded Methodology.pdf
09:58  Tender moved to Final Review
09:12  Sarah added a note
```

Chat is conversation.

Activity timeline is record history.

Never mix them into one indistinguishable stream.

This separation will make analytics, audit history and AI context much cleaner.

---

## 21. Organisation security model

### Tenant isolation

Every shared CRM record must carry `organisation_id`.

Every access policy should verify:

```text
current user
    ↓
is member of organisation?
    ↓
has required permission?
    ↓
can access this specific record?
```

For tender workspaces, add record-level rules where needed:

- all organisation members can see a tender if `crm.view` allows it
- restricted tenders can be limited to assigned/team members
- sensitive documents can have separate permissions later

### No client-only authorization

Hiding a button is not security.

Every mutation must be enforced at the database/server layer with RLS and server-side authorization.

### Role changes

When an admin changes a user's role:

- record an audit event
- refresh authorization/session state
- update the UI immediately
- do not leave stale privileged controls active

### Offboarding

Removing a user:

- revokes organisation membership
- removes their access immediately
- preserves their historical messages/activity/tasks
- allows reassignment of open tasks/tenders

Never delete business history just because an employee leaves.

---

## 22. Proposed organisation data model

Do not overload `company_profiles` into becoming the organisation table. Preserve personal/company profile compatibility while introducing a shared tenant model.

```text
organisations
  id
  name
  legal_name
  owner_user_id
  created_at
  updated_at

organisation_members
  id
  organisation_id
  user_id
  role
  status: invited | active | suspended
  invited_by
  joined_at
  created_at
  updated_at

organisation_invites
  id
  organisation_id
  email
  role
  token_hash
  invited_by
  expires_at
  accepted_at
  created_at

roles
  id
  organisation_id nullable
  key
  name
  system_role boolean
  created_at

permissions
  key
  description

role_permissions
  role_id
  permission_key

activity_events
  id
  organisation_id
  actor_user_id
  event_type
  entity_type
  entity_id
  metadata jsonb
  created_at
```

For MVP, system roles can be stored as an enum/key rather than creating a fully configurable role-builder. The schema should leave room for custom roles later.

### Membership constraint

Enforce one active membership per `(organisation_id, user_id)`.

If multi-organisation accounts are added later, the active organisation becomes a session/UI context rather than a second user account.

---

## 23. Role-aware UI without clutter

The user should not see disabled controls everywhere.

Instead:

- If a user cannot perform an action, hide it unless discovering the capability is useful.
- Admin-only controls live inside Team/Settings.
- Tender actions show only actions the user can perform.
- Read-only users get a clean reading experience.

Example:

Sales User sees:

> **Move to Pursuing**

Viewer does not see a disabled button saying:

> 🔒 Move to Pursuing

Premium UX means fewer irrelevant choices.

---

## 24. Organisation-aware Today screen

Once a user belongs to an organisation, Today becomes personal **and** collaborative.

Example:

```text
Good morning, Sarah

ACME Construction

NEEDS YOUR ATTENTION

2 tasks due today
1 tender needs a decision
1 team mention

NEXT UP

Pricing schedule
Michael · Municipal Offices
Due 4:00 PM

Tender decision
R18.5M · Municipal Offices

TEAM

2 people online
3 unread messages
```

The user still sees only a few things.

The organisation complexity stays underneath.

---

## 25. Collaboration rollout

### Phase C1 — Organisation foundation

- organisation table
- membership table
- invitation flow
- system roles
- permissions
- RLS policies
- audit events
- Team directory

### Phase C2 — Shared CRM

- organisation-owned opportunities
- task assignment
- requirements assignment
- tender workspace membership
- role-aware actions

### Phase C3 — Communication

- organisation channel
- tender channels
- direct messages
- unread counts
- mentions
- online presence
- push notifications

### Phase C4 — Advanced collaboration

- attachments
- message replies/reactions
- message search
- custom roles
- team analytics
- external client/partner collaboration

Do not start C3 until C1/C2 security is proven with RLS tests.

---

## 26. Testing requirements before collaboration launch

### Authorization tests

For every shared table test:

- member can read allowed organisation data
- non-member cannot read it
- permitted role can mutate
- unpermitted role cannot mutate
- removed member loses access
- restricted tender is inaccessible to unauthorised members
- invite token cannot be reused after acceptance
- expired invite cannot be accepted

### Chat tests

- member can join authorised conversation
- non-member cannot subscribe/read
- message persists exactly once
- duplicate send is safely handled
- failed send is visible
- unread count updates correctly
- marking read is scoped to the member
- removed member cannot send

### Native tests

- push/local notification permission denied
- app backgrounded
- app killed and reopened
- deep link into tender/chat
- Android back from chat/tender
- offline/online transitions

---

## 27. Final product rule

TenderBase is not trying to be:

> Salesforce + Slack + Asana + Dropbox.

It is:

> **A calm operating system for winning tenders.**

Communication exists because tender work requires people.

Roles exist because companies need controlled responsibility.

Tasks exist because tenders have deadlines.

Documents exist because submissions have requirements.

AI exists because teams need help deciding and preparing.

Every feature must strengthen the tender workflow.

If a feature does not make it easier to **find, decide, prepare, submit or win**, it should not enter the core product.
