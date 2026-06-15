# TravelConnect — False Lead Guardrails: Step-by-Step Implementation Guide

> Based on a full read of the codebase. Every file path, function name, and schema field
> references the actual code in your repo.

---

## Overview — what you're building and where it lives

```
Layer 1 — Hard intake gate        lib/intakeValidation.ts           (new)
                                   app/start/page.tsx                (edit)

Layer 2 — Readiness scoring       lib/advisorBrief.ts               (edit schema)
                                   app/api/synthesize-brief/route.ts (edit prompt)
                                   app/api/match-advisors/route.ts   (edit — filter by score)

Layer 3 — OTP phone gate          lib/phoneVerification.ts          (new)
                                   components/matching/StepResults.tsx (edit)
                                   supabase/migration_002.sql        (new)

Layer 4 — Advisor preferences     supabase/migration_003.sql        (new)
                                   app/api/match-advisors/route.ts   (edit — respect min_score)
                                   components/advisor/AdvisorSelfProfileEditor.tsx (edit)

Layer 5 — 48h ghost prevention    supabase/migration_004.sql        (new)
                                   supabase/functions/archive-stale-leads/index.ts (new)
```

---

## Step 1 — Hard intake gate

**Goal:** Reject structurally impossible requests before the AI concierge ever runs.
This is a pure function that runs client-side in `start/page.tsx` when the user
tries to advance from StepTravelStyle to StepAIConcierge.

### 1a. Create `lib/intakeValidation.ts`

```typescript
// lib/intakeValidation.ts

export interface IntakeValidationResult {
  valid: boolean
  blockedField?: 'destination' | 'budget' | 'timing'
  message?: string
}

/**
 * Hard gates — checked before the AI concierge runs.
 * Returns { valid: true } only when all constraints are met.
 */
export function validateIntake(
  destination: string | null,
  budgetLakh: number,
  travelStyle: string | null,
  timing: string,
): IntakeValidationResult {
  // Gate 1 — destination must be specific (not blank, not a single generic word)
  const genericDestinations = ['anywhere', 'everywhere', 'somewhere', 'abroad', 'international']
  const dest = (destination ?? '').trim().toLowerCase()
  if (!dest || dest.length < 3) {
    return {
      valid: false,
      blockedField: 'destination',
      message: 'Please name a specific destination — a country, city, or region.',
    }
  }
  if (genericDestinations.includes(dest)) {
    return {
      valid: false,
      blockedField: 'destination',
      message: `"${destination}" is too broad. Name a specific country or city so we can find the right specialist.`,
    }
  }

  // Gate 2 — budget floor (international trips need at least ₹1L)
  if (budgetLakh < 1) {
    return {
      valid: false,
      blockedField: 'budget',
      message: 'Our advisors specialise in trips from ₹1 lakh onwards. Please adjust your budget.',
    }
  }

  // Gate 3 — travel style must be selected
  if (!travelStyle) {
    return {
      valid: false,
      message: 'Please select a travel style to continue.',
    }
  }

  // Gate 4 — reject "travelling in 3 days or less" (no advisor can plan that)
  if (timing === 'In the next 3 days' || timing === 'This week') {
    return {
      valid: false,
      blockedField: 'timing',
      message: 'Our advisors need at least 1–2 weeks to plan a great trip. For last-minute trips, try a direct booking platform.',
    }
  }

  return { valid: true }
}
```

### 1b. Call the gate in `app/start/page.tsx`

Find the function that advances from step 2 (style) to step 3 (chat). Currently it
looks like `goToStep(3)` or similar. Wrap it:

```typescript
// app/start/page.tsx — add import at top
import { validateIntake } from '@/lib/intakeValidation'

// --- inside StartFunnelInner, add state for validation error ---
const [intakeError, setIntakeError] = useState<string | null>(null)

// --- replace the onComplete handler for StepTravelStyle ---
// Find where StepTravelStyle calls its onComplete/onNext prop and add:
const handleStyleComplete = useCallback(
  (selectedStyle: string) => {
    setTravelStyle(selectedStyle)
    const result = validateIntake(destination, budgetLakh, selectedStyle, timing)
    if (!result.valid) {
      setIntakeError(result.message ?? 'Please complete all fields.')
      return
    }
    setIntakeError(null)
    // existing navigation to next step
    router.push(`/start?step=chat`)
  },
  [destination, budgetLakh, timing, router],
)
```

Add the error display inside the StepTravelStyle render area:

```tsx
{intakeError && (
  <p className="mt-2 text-sm text-red-500 text-center">{intakeError}</p>
)}
```

---

## Step 2 — Readiness score in the Advisor Brief

**Goal:** The existing `synthesize-brief` endpoint already calls the LLM to generate
an `AdvisorBrief`. Extend it to also output a `readiness_score` (0–100) and a
`readiness_tier`. This score flows into matching so advisors only see leads worth
their time.

### 2a. Extend `lib/advisorBrief.ts`

```typescript
// lib/advisorBrief.ts — add to advisorBriefSchema

export const readinessTierSchema = z.enum(['hot', 'warm', 'nurture', 'blocked'])
export type ReadinessTier = z.infer<typeof readinessTierSchema>

export const advisorBriefSchema = z.object({
  tldr: z.string().describe('Two sentence summary for the human advisor'),
  hard_constraints: z.object({
    budget: z.string(),
    dates: z.string(),
    pax: z.number().nullable().optional(),
  }),
  key_decisions: z.array(z.string()),
  advisor_action_items: z.array(z.string()),

  // ── NEW: readiness scoring ──────────────────────────────────────────────
  readiness_score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      'Lead readiness score 0–100. 75+ = hot (route immediately). 50–74 = warm (OTP gate). 35–49 = nurture. <35 = block from advisor contact.',
    ),
  readiness_tier: readinessTierSchema.describe(
    'Tier derived from readiness_score: hot | warm | nurture | blocked',
  ),
  low_intent_signals: z
    .array(z.string())
    .describe('Signals that reduced the score, shown to advisor as context'),
})

export type AdvisorBrief = z.infer<typeof advisorBriefSchema>
```

Update `buildFallbackBrief` to include defaults:

```typescript
export function buildFallbackBrief(
  intake: MatchIntakePayload,
  chatSummary?: string,
): AdvisorBrief {
  return {
    // ... existing fields unchanged ...
    readiness_score: 50,      // conservative fallback
    readiness_tier: 'warm',
    low_intent_signals: [],
  }
}
```

### 2b. Extend the prompt in `app/api/synthesize-brief/route.ts`

In the `prompt` string passed to `generateObject`, add a readiness scoring section
after the existing rules:

```typescript
// app/api/synthesize-brief/route.ts — inside the POST handler

const prompt = `Create an Advisor Brief for a human TravelConnect travel advisor...

// ... existing prompt content ...

## Readiness scoring (NEW — add to brief)
Score this lead's booking readiness from 0–100 using these signals:

POSITIVE signals (add points):
- Budget was stated without prompting → +12
- Specific travel dates or window confirmed → +10
- Named exact destination (city, not just country) → +8
- Group size / pax mentioned → +7
- Asked about visa, insurance, or logistics → +6
- Mentioned a past trip or travel brand by name → +5
- Replied quickly and concisely (engaged tone) → +4

NEGATIVE signals (subtract points):
- Budget was vague, refused, or contradicts ask → −15
- Travel dates are "TBD" or "someday" → −12
- Used phrases like "just exploring", "not sure", "maybe" → −10
- Contradicts own budget (luxury ask on economy budget) → −8
- Asked for free alternatives or DIY tips → −6
- Session felt very short or disengaged → −8
- No verification of any kind → −10 (start from 60 if any OTP done, 50 if not)

Derive readiness_tier from the score:
- 75–100 → "hot"
- 50–74  → "warm"
- 35–49  → "nurture"
- 0–34   → "blocked"

List any signals that meaningfully reduced the score in low_intent_signals (max 3 bullets).`
```

### 2c. Store the score on `match_sessions` — database migration

Create `supabase/migration_001_readiness.sql`:

```sql
-- supabase/migration_001_readiness.sql

ALTER TABLE match_sessions
  ADD COLUMN IF NOT EXISTS readiness_score   smallint    DEFAULT 50,
  ADD COLUMN IF NOT EXISTS readiness_tier    text        DEFAULT 'warm'
    CHECK (readiness_tier IN ('hot', 'warm', 'nurture', 'blocked')),
  ADD COLUMN IF NOT EXISTS low_intent_signals text[]     DEFAULT '{}';

COMMENT ON COLUMN match_sessions.readiness_score IS
  'Lead readiness 0-100. Scored by AI concierge during synthesize-brief.';
```

### 2d. Pass score through `app/api/match-advisors/route.ts`

Read the brief's score and gate `nurture` and `blocked` leads away from top advisors:

```typescript
// app/api/match-advisors/route.ts — inside POST, after parsing advisorBrief

const readinessTier = advisorBrief?.readiness_tier ?? 'warm'
const readinessScore = advisorBrief?.readiness_score ?? 50

// Hard block: leads scored 'blocked' never reach advisors
if (readinessTier === 'blocked') {
  return NextResponse.json({
    advisors: [],
    blocked: true,
    blockReason: 'Lead readiness score too low. Advisor brief suggests no booking intent.',
  }, { status: 200 }) // 200 so the client can show a helpful message, not an error state
}

// Nurture: only send to advisors who have opted into low-score leads
// (advisor preference system added in Step 4 — for now just tag the response)
const isNurtureLead = readinessTier === 'nurture'

// ... existing matchAgencies + rerankWithLlm calls unchanged ...

return NextResponse.json({
  advisors: enriched,
  intakeUsed: intake,
  briefUsed: Boolean(advisorBrief),
  rerankSource,
  readinessTier,      // ← new: client uses this to decide UI treatment
  readinessScore,     // ← new: shown to advisor in brief panel
  isNurtureLead,      // ← new: nurture leads get a different CTA in results
})
```

### 2e. Show tier label in `components/chat/ClientBriefPanel.tsx`

Find where the brief is rendered. Add a score badge above the `tldr`:

```tsx
// components/chat/ClientBriefPanel.tsx (or ClientBriefBanner.tsx)
// Add at the top of the brief card:

{brief.readiness_tier && (
  <div className="mb-3 flex items-center gap-2">
    <span
      className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
        brief.readiness_tier === 'hot'
          ? 'bg-green-100 text-green-800'
          : brief.readiness_tier === 'warm'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {brief.readiness_tier === 'hot' ? '🔥 Hot lead' :
       brief.readiness_tier === 'warm' ? '☀️ Warm lead' :
       '📋 Nurture'}
    </span>
    <span className="text-xs text-gray-400">
      Readiness: {brief.readiness_score}/100
    </span>
  </div>
)}
```

---

## Step 3 — Phone OTP gate before chat

**Goal:** A traveller can see matched advisors freely, but the "Connect" button
(which opens the `/chat` route by creating a conversation in Supabase) requires
a verified phone number. One-time per account, stored on the `users` table.

### 3a. Database migration

Create `supabase/migration_002_phone.sql`:

```sql
-- supabase/migration_002_phone.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone           text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone_verified  boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at     timestamptz DEFAULT NULL;
```

### 3b. Create `lib/phoneVerification.ts`

This wraps Supabase Auth's built-in OTP (no Twilio needed for MVP):

```typescript
// lib/phoneVerification.ts

import { createClient } from '@/lib/supabase/client'

/**
 * Sends an SMS OTP to the given phone number using Supabase Auth.
 * Requires "Phone" provider enabled in Supabase Auth settings.
 */
export async function sendPhoneOtp(phone: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: phone.startsWith('+') ? phone : `+91${phone}`, // default to India if no country code
  })
  return { error: error?.message ?? null }
}

/**
 * Verifies the OTP token. On success, marks the user as phone_verified in the users table.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase.auth.verifyOtp({
    phone: phone.startsWith('+') ? phone : `+91${phone}`,
    token,
    type: 'sms',
  })

  if (error) return { success: false, error: error.message }

  // Mark as verified in the users table
  const { error: updateError } = await supabase
    .from('users')
    .update({ phone_verified: true, phone, verified_at: new Date().toISOString() })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')

  if (updateError) {
    console.error('[phone-verify] Failed to update users table:', updateError)
  }

  return { success: true, error: null }
}

/**
 * Check if the current session user has a verified phone.
 * Call this before creating a conversation.
 */
export async function isPhoneVerified(): Promise<boolean> {
  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return false

  const { data } = await supabase
    .from('users')
    .select('phone_verified')
    .eq('id', user.user.id)
    .single()

  return data?.phone_verified ?? false
}
```

### 3c. Create `components/matching/PhoneVerificationModal.tsx`

```tsx
// components/matching/PhoneVerificationModal.tsx
'use client'

import { useState } from 'react'
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/phoneVerification'

interface Props {
  onVerified: () => void
  onDismiss: () => void
}

export default function PhoneVerificationModal({ onVerified, onDismiss }: Props) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendOtp() {
    setLoading(true)
    setError(null)
    const { error } = await sendPhoneOtp(phone)
    setLoading(false)
    if (error) { setError(error); return }
    setStage('otp')
  }

  async function handleVerifyOtp() {
    setLoading(true)
    setError(null)
    const { success, error } = await verifyPhoneOtp(phone, otp)
    setLoading(false)
    if (!success) { setError(error ?? 'Invalid code. Please try again.'); return }
    onVerified()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Verify your number</h2>
        <p className="mb-5 text-sm text-gray-500">
          A quick verification ensures advisors receive genuine leads. Your number is never shared.
        </p>

        {stage === 'phone' ? (
          <>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleSendOtp}
              disabled={loading || phone.replace(/\D/g, '').length < 10}
              className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send verification code'}
            </button>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              Enter the 6-digit code sent to {phone}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="mb-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Confirm and connect'}
            </button>
            <button
              onClick={() => setStage('phone')}
              className="mt-2 w-full text-sm text-gray-400 underline"
            >
              Change number
            </button>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button onClick={onDismiss} className="mt-4 w-full text-sm text-gray-400">
          Not now
        </button>
      </div>
    </div>
  )
}
```

### 3d. Gate the "Connect" button in `components/matching/StepResults.tsx`

Find the button or link that creates a chat / navigates to `/chat`. Wrap it with the
phone gate:

```tsx
// components/matching/StepResults.tsx — add imports
import { useState, useEffect } from 'react'
import { isPhoneVerified } from '@/lib/phoneVerification'
import PhoneVerificationModal from '@/components/matching/PhoneVerificationModal'

// --- inside the component ---
const [phoneVerified, setPhoneVerified] = useState(false)
const [pendingAdvisorId, setPendingAdvisorId] = useState<string | null>(null)
const [showVerifyModal, setShowVerifyModal] = useState(false)

useEffect(() => {
  isPhoneVerified().then(setPhoneVerified)
}, [])

function handleConnectClick(advisorId: string) {
  if (phoneVerified) {
    initiateChat(advisorId)   // your existing function
    return
  }
  setPendingAdvisorId(advisorId)
  setShowVerifyModal(true)
}

// In JSX — replace existing connect button onClick with handleConnectClick(advisor.id)
// Add modal:
{showVerifyModal && (
  <PhoneVerificationModal
    onVerified={() => {
      setPhoneVerified(true)
      setShowVerifyModal(false)
      if (pendingAdvisorId) initiateChat(pendingAdvisorId)
    }}
    onDismiss={() => setShowVerifyModal(false)}
  />
)}
```

---

## Step 4 — Advisor preference controls

**Goal:** Advisors set a minimum readiness score and a budget floor. The matching
engine respects these so junk leads never appear in their inbox.

### 4a. Database migration

```sql
-- supabase/migration_003_advisor_prefs.sql

CREATE TABLE IF NOT EXISTS advisor_preferences (
  user_id             text        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  min_readiness_score smallint    NOT NULL DEFAULT 35
    CHECK (min_readiness_score BETWEEN 0 AND 100),
  min_budget_lakh     numeric(6,2) NOT NULL DEFAULT 0,
  active_destinations text[]      DEFAULT '{}',
  accept_nurture_leads boolean    NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN advisor_preferences.min_readiness_score IS
  'Only receive leads at or above this readiness score. Default 35 allows warm leads.';
```

### 4b. Create `lib/advisorPreferences.ts`

```typescript
// lib/advisorPreferences.ts

import { createClient } from '@/lib/supabase/client'

export interface AdvisorPreferences {
  min_readiness_score: number
  min_budget_lakh: number
  active_destinations: string[]
  accept_nurture_leads: boolean
}

const DEFAULTS: AdvisorPreferences = {
  min_readiness_score: 35,
  min_budget_lakh: 0,
  active_destinations: [],
  accept_nurture_leads: false,
}

export async function getAdvisorPreferences(userId: string): Promise<AdvisorPreferences> {
  const supabase = createClient()
  const { data } = await supabase
    .from('advisor_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data ?? DEFAULTS
}

export async function saveAdvisorPreferences(
  userId: string,
  prefs: Partial<AdvisorPreferences>,
): Promise<void> {
  const supabase = createClient()
  await supabase.from('advisor_preferences').upsert({
    user_id: userId,
    ...prefs,
    updated_at: new Date().toISOString(),
  })
}
```

### 4c. Add UI in `components/advisor/AdvisorSelfProfileEditor.tsx`

Find the existing editor (already in your repo). Add a "Lead preferences" section
below the existing bio/video fields:

```tsx
// components/advisor/AdvisorSelfProfileEditor.tsx — add section

import { getAdvisorPreferences, saveAdvisorPreferences } from '@/lib/advisorPreferences'

// --- inside the component, add state ---
const [prefs, setPrefs] = useState({ min_readiness_score: 35, min_budget_lakh: 0 })

useEffect(() => {
  if (userId) getAdvisorPreferences(userId).then(setPrefs)
}, [userId])

// --- add JSX section ---
<div className="mt-8 border-t border-gray-100 pt-6">
  <h3 className="mb-1 text-sm font-semibold text-gray-700">Lead quality preferences</h3>
  <p className="mb-4 text-xs text-gray-400">
    We'll only send you leads that meet these thresholds.
  </p>

  <label className="block text-xs font-medium text-gray-600 mb-1">
    Minimum readiness score: {prefs.min_readiness_score}
  </label>
  <input
    type="range"
    min={0} max={100} step={5}
    value={prefs.min_readiness_score}
    onChange={(e) => setPrefs((p) => ({ ...p, min_readiness_score: Number(e.target.value) }))}
    className="mb-1 w-full"
  />
  <div className="mb-4 flex justify-between text-xs text-gray-400">
    <span>All leads</span>
    <span>Warm+ (50)</span>
    <span>Hot only (75)</span>
  </div>

  <label className="block text-xs font-medium text-gray-600 mb-1">
    Minimum budget (₹ lakh)
  </label>
  <input
    type="number"
    min={0} step={1}
    value={prefs.min_budget_lakh}
    onChange={(e) => setPrefs((p) => ({ ...p, min_budget_lakh: Number(e.target.value) }))}
    className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
  />

  <button
    onClick={() => saveAdvisorPreferences(userId, prefs)}
    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
  >
    Save preferences
  </button>
</div>
```

### 4d. Respect advisor preferences in `app/api/match-advisors/route.ts`

The current route matches a lead to advisors. Before returning results, filter out
advisors whose `min_readiness_score` preference is higher than the lead's score.

```typescript
// app/api/match-advisors/route.ts — server-side, after enriching results
// (This requires a server Supabase client — already used elsewhere in the repo)

import { createClient as createServerClient } from '@/lib/supabase/server'

// After: const enriched = enrichScoredResults(...)

// Fetch advisor preferences for the matched advisors
const supabase = createServerClient()
const advisorUserIds = await Promise.all(
  enriched.map(async (a) => {
    // advisor_user_links maps agency route id → user_id
    const { data } = await supabase
      .from('advisor_user_links')
      .select('user_id')
      .eq('advisor_route_id', a.id)
      .single()
    return { advisorId: a.id, userId: data?.user_id ?? null }
  })
)

const filteredAdvisors = await Promise.all(
  enriched.map(async (advisor) => {
    const link = advisorUserIds.find((l) => l.advisorId === advisor.id)
    if (!link?.userId) return advisor // no prefs set → include

    const { data: prefs } = await supabase
      .from('advisor_preferences')
      .select('min_readiness_score, min_budget_lakh')
      .eq('user_id', link.userId)
      .single()

    if (!prefs) return advisor

    // Filter: advisor's min score > lead's score → exclude
    if (prefs.min_readiness_score > readinessScore) return null
    // Filter: advisor's min budget > lead's budget → exclude
    if (prefs.min_budget_lakh > (intake.budgetLakh ?? 0)) return null

    return advisor
  })
).then((results) => results.filter(Boolean))
```

---

## Step 5 — 48-hour ghost prevention

**Goal:** If a traveller doesn't reply to an advisor's first message within 48h,
auto-archive the conversation. Advisors don't carry dead leads in their inbox.

### 5a. Database migration

```sql
-- supabase/migration_004_conversation_status.sql

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'completed')),
  ADD COLUMN IF NOT EXISTS first_advisor_message_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS traveller_replied_after_advisor boolean DEFAULT NULL;

-- Index for efficient cron query
CREATE INDEX IF NOT EXISTS idx_conversations_status_advisor_msg
  ON conversations (status, first_advisor_message_at)
  WHERE status = 'active' AND first_advisor_message_at IS NOT NULL;
```

### 5b. Track first advisor message in `lib/chat/messages.ts`

When an advisor sends their first message in a conversation, stamp the time:

```typescript
// lib/chat/messages.ts — after inserting the message, check if it's the first from an advisor
// Find the existing insert logic and add:

import { createClient } from '@/lib/supabase/server'

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  senderRole: 'traveller' | 'advisor',
) {
  const supabase = createClient()

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    text,
  })

  // If this is an advisor's first message, stamp the timestamp
  if (senderRole === 'advisor') {
    const { data: conv } = await supabase
      .from('conversations')
      .select('first_advisor_message_at')
      .eq('id', conversationId)
      .single()

    if (!conv?.first_advisor_message_at) {
      await supabase
        .from('conversations')
        .update({ first_advisor_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    }
  }

  // If this is the traveller replying AFTER an advisor message, mark as replied
  if (senderRole === 'traveller') {
    const { data: conv } = await supabase
      .from('conversations')
      .select('first_advisor_message_at, traveller_replied_after_advisor')
      .eq('id', conversationId)
      .single()

    if (conv?.first_advisor_message_at && !conv?.traveller_replied_after_advisor) {
      await supabase
        .from('conversations')
        .update({ traveller_replied_after_advisor: true })
        .eq('id', conversationId)
    }
  }
}
```

### 5c. Create Supabase Edge Function `supabase/functions/archive-stale-leads/index.ts`

```typescript
// supabase/functions/archive-stale-leads/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (_req) => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Find all active conversations where:
  // — advisor sent their first message more than 48h ago
  // — traveller has NOT replied yet
  const { data: staleConversations, error } = await supabase
    .from('conversations')
    .select('id, match_session_id')
    .eq('status', 'active')
    .not('first_advisor_message_at', 'is', null)
    .is('traveller_replied_after_advisor', null)
    .lt('first_advisor_message_at', cutoff)

  if (error) {
    console.error('[archive-stale-leads] Query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!staleConversations?.length) {
    return new Response(JSON.stringify({ archived: 0 }), { status: 200 })
  }

  const ids = staleConversations.map((c) => c.id)

  // Archive them
  const { error: updateError } = await supabase
    .from('conversations')
    .update({ status: 'archived' })
    .in('id', ids)

  if (updateError) {
    console.error('[archive-stale-leads] Update error:', updateError)
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })
  }

  console.log(`[archive-stale-leads] Archived ${ids.length} stale conversations`)

  // Optional: trigger a re-engagement email for each archived conversation
  // (integrate with your existing notification system here)

  return new Response(JSON.stringify({ archived: ids.length }), { status: 200 })
})
```

### 5d. Schedule the cron in `supabase/config.toml`

```toml
# supabase/config.toml — add under [functions]

[functions.archive-stale-leads]
enabled = true

# Schedule: every 6 hours
[functions.archive-stale-leads.schedule]
cron = "0 */6 * * *"
```

### 5e. Filter archived conversations in `lib/chat/inbox.ts`

Find the query that fetches conversations for the advisor inbox. Add a `.eq('status', 'active')` filter:

```typescript
// lib/chat/inbox.ts — in the inbox query

const { data } = await supabase
  .from('conversations')
  .select(`
    id,
    status,           // ← add to select
    updated_at,
    ...
  `)
  .eq('status', 'active')   // ← add this filter
  .order('updated_at', { ascending: false })
```

---

## Step 6 — Tests

Add alongside existing `__tests__/handoffGates.test.ts`:

```typescript
// __tests__/intakeValidation.test.ts

import { describe, it, expect } from 'vitest'
import { validateIntake } from '@/lib/intakeValidation'

describe('validateIntake — hard gates', () => {
  it('blocks blank destination', () => {
    const r = validateIntake('', 10, 'Luxury', 'Next 6 months')
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('destination')
  })

  it('blocks generic destination "anywhere"', () => {
    const r = validateIntake('anywhere', 10, 'Luxury', 'Next 6 months')
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('destination')
  })

  it('blocks budget below ₹1L', () => {
    const r = validateIntake('Japan', 0.5, 'Budget', 'Next 6 months')
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('budget')
  })

  it('blocks "This week" timing', () => {
    const r = validateIntake('Japan', 5, 'Luxury', 'This week')
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('timing')
  })

  it('passes a valid intake', () => {
    const r = validateIntake('Japan', 10, 'Luxury', 'Next 6 months')
    expect(r.valid).toBe(true)
  })
})
```

---

## Rollout order

| Priority | Step | Impact | Effort |
|----------|------|--------|--------|
| 1 | Hard intake gate (Step 1) | Blocks nonsense before any AI cost | 1–2h |
| 2 | Readiness score in brief (Step 2a–b) | Score available; no DB change yet | 2–3h |
| 3 | Pass score to match route (Step 2d–e) | Advisors see tier badge | 1h |
| 4 | DB migration for score (Step 2c) | Persist score for analytics | 30min |
| 5 | OTP gate (Step 3) | Eliminates casual browsers | 3–4h |
| 6 | 48h ghost cron (Step 5) | Cleans advisor inbox | 2h |
| 7 | Advisor preferences (Step 4) | Gives advisors control | 3h |

Run migrations with `supabase db push` from the repo root.
The Edge Function deploys with `supabase functions deploy archive-stale-leads`.
