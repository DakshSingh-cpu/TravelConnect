import SidebarProfile from '@/components/SidebarProfile'
import AboutMe from '@/components/AboutMe'
import TripMap from '@/components/TripMap'
import TripList from '@/components/TripList'
import ReviewList from '@/components/ReviewList'

// Import leaflet CSS globally for the map
import 'leaflet/dist/leaflet.css'

export default function ProfilePage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(100% 80% at 80% 0%, rgba(225,245,238,.9) 0%, transparent 45%),
          radial-gradient(90% 60% at 10% 20%, rgba(186,117,23,.06) 0%, transparent 40%),
          #F9F6F1
        `,
      }}
    >
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-50 h-13 flex items-center border-b backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.65)',
          borderColor: 'rgba(28,25,23,0.1)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset',
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-6 flex items-baseline justify-between gap-4">
          <span className="font-semibold text-sm tracking-tight" style={{ color: '#0F6E56' }}>TBO Tek</span>
          <span className="text-xs uppercase tracking-widest text-stone-400">Advisor Profile</span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24" id="profile-main">
        {/* Back nav */}
        <button
          type="button"
          onClick={() => history.back()}
          className="inline-flex items-center gap-2 text-sm text-stone-400 mb-6 hover:text-teal-brand transition-colors duration-200"
        >
          ← Back to results
        </button>

        {/* ── 2-Column Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8">
          {/* Left: Sticky Sidebar */}
          <SidebarProfile />

          {/* Right: Scrollable Content */}
          <div className="flex flex-col gap-6">
            <AboutMe />
            <TripMap />
            <TripList />
            <ReviewList />
          </div>
        </div>
      </main>

      {/* Fixed CTA Dock (mobile) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 md:hidden backdrop-blur-xl border-t"
        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(28,25,23,0.12)' }}
      >
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            type="button"
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white shadow-md active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
          >
            Message Priya →
          </button>
          <button
            type="button"
            className="flex-shrink-0 py-3 px-4 rounded-xl font-semibold text-sm border text-teal-brand bg-white/60 active:scale-[0.97] transition-transform"
            style={{ borderColor: '#0F6E56' }}
          >
            What to ask her ↗
          </button>
        </div>
      </div>
    </div>
  )
}
