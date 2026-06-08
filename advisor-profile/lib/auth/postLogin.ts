import {
  applyAccountRoleIntentIfNeeded,
  fetchMyAccountRole,
  roleLabel,
  setMyAccountRole,
  type AccountRole,
} from '@/lib/accountRole'
import { ensureMyProfileOptional } from '@/lib/chat/ensureProfile'

/**
 * Runs after a successful sign-in: ensures profile row, applies role intent,
 * and validates the account matches the expected role for this login path.
 */
export async function completeSignIn(accountRole: AccountRole): Promise<void> {
  await ensureMyProfileOptional()

  const existing = await fetchMyAccountRole()
  if (existing && existing !== accountRole) {
    throw new Error(
      `This account is registered as a ${roleLabel(existing)}. Use the correct sign-in path for your account type.`,
    )
  }

  if (!existing) {
    await setMyAccountRole(accountRole)
  } else {
    await applyAccountRoleIntentIfNeeded()
  }
}
