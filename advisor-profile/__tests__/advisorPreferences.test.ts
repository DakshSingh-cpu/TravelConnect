import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ADVISOR_PREF_DEFAULTS,
  validateAdvisorPreferences,
} from '@/lib/advisorPreferences'
import type { EnrichedMatchedAdvisorV2 } from '@/lib/enrichResults'
import type { ReadinessTier } from '@/lib/advisorBrief'

// ---------------------------------------------------------------------------
// Mock the @supabase/supabase-js createClient used by advisorPreferenceFilter
// ---------------------------------------------------------------------------
let mockLinksData: { advisor_route_id: string; user_id: string }[] | null = null
let mockPrefsData: {
  user_id: string
  min_readiness_score: number
  min_budget_lakh: number
  accept_nurture_leads: boolean
}[] | null = null

const mockSingle = vi.fn()
const mockIn = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockFrom(table)
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args)
          return {
            in: (_col: string, _vals: string[]) => {
              mockIn(_col, _vals)
              if (table === 'advisor_user_links') {
                return { data: mockLinksData }
              }
              return { data: mockPrefsData }
            },
            eq: () => ({
              single: () => {
                mockSingle()
                return { data: null }
              },
            }),
          }
        },
      }
    },
  }),
}))

// Import AFTER mock is set up
const { filterByAdvisorPreferences } = await import(
  '@/lib/guardrails/advisorPreferenceFilter'
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAdvisor(id: string): EnrichedMatchedAdvisorV2 {
  return {
    id,
    name: `Agency ${id}`,
    title: 'Luxury · Premium',
    photoUrl: '',
    matchScore: 90,
    llmContext: '',
    csvAgencyId: parseInt(id.replace('agency-', ''), 10) || 1,
    agentProfile: null,
    matchReasons: [],
  }
}

beforeEach(() => {
  mockLinksData = null
  mockPrefsData = null
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// filterByAdvisorPreferences
// ---------------------------------------------------------------------------
describe('filterByAdvisorPreferences', () => {
  it('returns empty array for empty input', async () => {
    const result = await filterByAdvisorPreferences([], 60, 'warm', 10)
    expect(result).toEqual([])
  })

  it('includes advisors with no user link', async () => {
    mockLinksData = []
    const advisors = [makeAdvisor('agency-1'), makeAdvisor('agency-2')]
    const result = await filterByAdvisorPreferences(advisors, 60, 'warm', 10)
    expect(result).toHaveLength(2)
  })

  it('includes advisors with no preferences row', async () => {
    mockLinksData = [{ advisor_route_id: 'agency-1', user_id: 'user-a' }]
    mockPrefsData = []
    const result = await filterByAdvisorPreferences(
      [makeAdvisor('agency-1')], 60, 'warm', 10,
    )
    expect(result).toHaveLength(1)
  })

  it('excludes nurture lead when advisor does not accept nurture', async () => {
    mockLinksData = [{ advisor_route_id: 'agency-1', user_id: 'user-a' }]
    mockPrefsData = [{
      user_id: 'user-a',
      min_readiness_score: 35,
      min_budget_lakh: 0,
      accept_nurture_leads: false,
    }]
    const result = await filterByAdvisorPreferences(
      [makeAdvisor('agency-1')], 45, 'nurture', 10,
    )
    expect(result).toHaveLength(0)
  })

  it('includes nurture lead when advisor accepts nurture', async () => {
    mockLinksData = [{ advisor_route_id: 'agency-1', user_id: 'user-a' }]
    mockPrefsData = [{
      user_id: 'user-a',
      min_readiness_score: 35,
      min_budget_lakh: 0,
      accept_nurture_leads: true,
    }]
    const result = await filterByAdvisorPreferences(
      [makeAdvisor('agency-1')], 45, 'nurture', 10,
    )
    expect(result).toHaveLength(1)
  })

  it('excludes non-nurture lead below advisor min_readiness_score', async () => {
    mockLinksData = [{ advisor_route_id: 'agency-1', user_id: 'user-a' }]
    mockPrefsData = [{
      user_id: 'user-a',
      min_readiness_score: 80,
      min_budget_lakh: 0,
      accept_nurture_leads: false,
    }]
    const result = await filterByAdvisorPreferences(
      [makeAdvisor('agency-1')], 60, 'warm', 10,
    )
    expect(result).toHaveLength(0)
  })

  it('excludes lead below advisor min_budget_lakh', async () => {
    mockLinksData = [{ advisor_route_id: 'agency-1', user_id: 'user-a' }]
    mockPrefsData = [{
      user_id: 'user-a',
      min_readiness_score: 35,
      min_budget_lakh: 20,
      accept_nurture_leads: false,
    }]
    const result = await filterByAdvisorPreferences(
      [makeAdvisor('agency-1')], 60, 'warm', 10,
    )
    expect(result).toHaveLength(0)
  })

  it('includes lead meeting all thresholds', async () => {
    mockLinksData = [{ advisor_route_id: 'agency-1', user_id: 'user-a' }]
    mockPrefsData = [{
      user_id: 'user-a',
      min_readiness_score: 50,
      min_budget_lakh: 5,
      accept_nurture_leads: false,
    }]
    const result = await filterByAdvisorPreferences(
      [makeAdvisor('agency-1')], 75, 'hot', 10,
    )
    expect(result).toHaveLength(1)
  })

  it('filters mixed advisors correctly', async () => {
    mockLinksData = [
      { advisor_route_id: 'agency-1', user_id: 'user-a' },
      { advisor_route_id: 'agency-2', user_id: 'user-b' },
      { advisor_route_id: 'agency-3', user_id: 'user-c' },
    ]
    mockPrefsData = [
      { user_id: 'user-a', min_readiness_score: 80, min_budget_lakh: 0, accept_nurture_leads: false },
      { user_id: 'user-b', min_readiness_score: 50, min_budget_lakh: 0, accept_nurture_leads: false },
      // user-c has no prefs row — should be included by default
    ]
    const advisors = [
      makeAdvisor('agency-1'),
      makeAdvisor('agency-2'),
      makeAdvisor('agency-3'),
    ]
    const result = await filterByAdvisorPreferences(advisors, 60, 'warm', 10)
    expect(result.map((a) => a.id)).toEqual(['agency-2', 'agency-3'])
  })
})

// ---------------------------------------------------------------------------
// ADVISOR_PREF_DEFAULTS
// ---------------------------------------------------------------------------
describe('ADVISOR_PREF_DEFAULTS', () => {
  it('has expected default values', () => {
    expect(ADVISOR_PREF_DEFAULTS).toEqual({
      min_readiness_score: 35,
      min_budget_lakh: 0,
      active_destinations: [],
      accept_nurture_leads: false,
    })
  })
})

// ---------------------------------------------------------------------------
// validateAdvisorPreferences
// ---------------------------------------------------------------------------
describe('validateAdvisorPreferences', () => {
  it('accepts valid preferences', () => {
    const result = validateAdvisorPreferences({
      min_readiness_score: 50,
      min_budget_lakh: 0,
      accept_nurture_leads: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects min_readiness_score out of range (999)', () => {
    const result = validateAdvisorPreferences({ min_readiness_score: 999 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('rejects negative min_budget_lakh (-500)', () => {
    const result = validateAdvisorPreferences({ min_budget_lakh: -500 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('fills in defaults for missing fields', () => {
    const result = validateAdvisorPreferences({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(ADVISOR_PREF_DEFAULTS)
    }
  })

  it('rejects min_readiness_score below zero', () => {
    const result = validateAdvisorPreferences({ min_readiness_score: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts boundary values', () => {
    const result = validateAdvisorPreferences({
      min_readiness_score: 100,
      min_budget_lakh: 9999.99,
      accept_nurture_leads: false,
    })
    expect(result.success).toBe(true)
  })
})

/*
 * MANUAL INTEGRATION TEST STEPS
 *
 * 1. Advisor preferences UI:
 *    - Sign in as an advisor. Navigate to /advisor/me/profile.
 *    - Verify the "Lead quality preferences" card appears below bio/video.
 *    - Drag the readiness slider; confirm it steps by 5 and clamps to 0-100.
 *    - Enter a negative budget (e.g. -500); confirm the input rejects it.
 *    - Click "Save preferences" and verify the success message appears.
 *    - Reload the page and confirm values persist.
 *
 * 2. Match filtering:
 *    - Set an advisor's min_readiness_score to 80 in Supabase.
 *    - Run a match with a warm-tier lead (score ~60).
 *    - Confirm the advisor does NOT appear in results.
 *    - Lower min_readiness_score to 50 and re-run. Confirm the advisor appears.
 *
 * 3. Route parity:
 *    - Create a nurture-tier lead (score ~45) and call POST /api/match-advisors.
 *    - Call POST /api/match-advisors/local with the same lead.
 *    - Confirm both routes return consistent behavior (advisors filtered by
 *      accept_nurture_leads, not hard-blocked).
 */
