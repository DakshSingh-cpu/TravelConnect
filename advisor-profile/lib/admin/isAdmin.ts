type AdminProfile = {
  account_role: string
  email?: string | null
}

function adminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAdminUser(profile: AdminProfile): boolean {
  if (profile.account_role === 'admin') return true
  const email = profile.email?.trim().toLowerCase()
  if (!email) return false
  return adminEmailAllowlist().has(email)
}
