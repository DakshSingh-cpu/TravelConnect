export interface RerankResult {
  ranked_ids: number[]
  pitches: Array<{ agency_id: number; pitch: string }>
}

/**
 * Validates an LLM rerank result against the deterministic allowlist.
 * Checks: correct count, no duplicates, all IDs in allowlist, pitches map to ranked IDs.
 */
export function validateRerankResult(
  result: RerankResult,
  allowlistIds: number[],
  expectedCount: number,
): { valid: boolean; reason?: string } {
  const allowSet = new Set(allowlistIds)

  if (result.ranked_ids.length !== expectedCount) {
    return {
      valid: false,
      reason: `Expected ${expectedCount} ranked IDs, got ${result.ranked_ids.length}`,
    }
  }

  if (result.pitches.length !== expectedCount) {
    return {
      valid: false,
      reason: `Expected ${expectedCount} pitches, got ${result.pitches.length}`,
    }
  }

  const idSet = new Set(result.ranked_ids)
  if (idSet.size !== result.ranked_ids.length) {
    return { valid: false, reason: 'Duplicate IDs in ranked_ids' }
  }

  for (const id of result.ranked_ids) {
    if (!allowSet.has(id)) {
      return { valid: false, reason: `ID ${id} not in allowlist` }
    }
  }

  const pitchIdSet = new Set(result.pitches.map((p) => p.agency_id))
  for (const id of result.ranked_ids) {
    if (!pitchIdSet.has(id)) {
      return { valid: false, reason: `No pitch found for ranked ID ${id}` }
    }
  }

  return { valid: true }
}
