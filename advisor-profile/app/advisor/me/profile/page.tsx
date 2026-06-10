import AdvisorSelfProfileEditor from '@/components/advisor/AdvisorSelfProfileEditor'

export const metadata = {
  title: 'Edit profile | TravelConnect Advisor',
}

export default function AdvisorMeProfilePage() {
  return (
    <div
      className="flex-1"
      style={{
        background:
          'radial-gradient(ellipse 90% 45% at 50% -8%, var(--grad-1) 0%, transparent 55%), var(--cream)',
      }}
    >
      <AdvisorSelfProfileEditor />
    </div>
  )
}
