import { NextResponse } from 'next/server'
import path from 'path'
import { getMatchDb } from '@/lib/matchAgenciesStage1'

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

export type DestinationSuggestion = {
  id: string
  label: string
  category: 'City' | 'Country'
  emoji: string
}

interface DbRow {
  label: string
  category: 'City' | 'Country'
}

function formatPlaceLabel(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function suggestionId(category: string, label: string): string {
  const slug = label.toLowerCase().replace(/\s+/g, '-')
  return `${category.toLowerCase()}-${slug}`
}

/**
 * GET /api/destinations?q=par
 * Returns cities/countries from match.db where agents have verified bookings.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return NextResponse.json([])
  }

  try {
    const db = getMatchDb(DB_PATH)
    const pattern = `%${q.toLowerCase()}%`

    const stmt = db.prepare(`
      SELECT DISTINCT city AS label, 'City' AS category
      FROM agency_cities
      WHERE city LIKE ?
      UNION
      SELECT DISTINCT country AS label, 'Country' AS category
      FROM agency_countries
      WHERE country LIKE ?
      LIMIT 8
    `)

    const rows = stmt.all(pattern, pattern) as DbRow[]

    const suggestions: DestinationSuggestion[] = rows.map((row) => {
      const label = formatPlaceLabel(row.label)
      return {
        id: suggestionId(row.category, label),
        label,
        category: row.category,
        emoji: '📍',
      }
    })

    return NextResponse.json(suggestions)
  } catch (err) {
    console.error('[destinations] query error:', err)
    return NextResponse.json({ error: 'Search unavailable' }, { status: 500 })
  }
}
