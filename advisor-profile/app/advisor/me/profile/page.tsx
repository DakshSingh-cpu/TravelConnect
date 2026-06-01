import AdvisorSelfProfileEditor from '@/components/advisor/AdvisorSelfProfileEditor'
import UserProfileButton from '@/components/auth/UserProfileButton'

export const metadata = {
  title: 'Edit profile | TravelConnect Advisor',
}

export default function AdvisorMeProfilePage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse 90% 45% at 50% -8%, var(--grad-1) 0%, transparent 55%), var(--cream)',
      }}
    >
      <header
        className="sticky top-0 z-50 flex h-[3.25rem] items-center justify-between border-b px-4 sm:px-8"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
      >
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#0F6E56' }}>
          TravelConnect
        </span>
        <UserProfileButton />
      </header>
      <AdvisorSelfProfileEditor />
    </div>
  )
}
