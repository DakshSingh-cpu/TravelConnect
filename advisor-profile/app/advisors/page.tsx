import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { advisorsDirectory } from '@/lib/advisorsDirectory'

export const metadata: Metadata = {
  title: 'Verified Travel Advisors | TravelConnect',
  description:
    'Browse TravelConnect-verified luxury travel advisors — Europe specialists, rail-first planners, and Mediterranean experts. Public directory for advisor discovery.',
}

export default function AdvisorsDirectoryPage() {
  return (
    <div
      className="flex-1"
      style={{
        background:
          'radial-gradient(ellipse 90% 45% at 50% -8%, var(--grad-1) 0%, transparent 55%), var(--cream)',
      }}
    >

      <main className="mx-auto w-full max-w-[90rem] px-4 py-10 sm:px-8 sm:py-14">
        <p
          className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--section-label)' }}
        >
          Public index
        </p>
        <h1
          className="font-display text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] italic tracking-[-0.02em]"
          style={{ color: 'var(--ink)' }}
        >
          Verified travel advisors
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
          TravelConnect advisors with verified booking history. Select a profile to view specialties,
          ratings, and trip expertise — no intake form required.
        </p>

        <ul className="mt-10 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {advisorsDirectory.map((a) => (
            <li key={a.id}>
              <article
                className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-[0_4px_24px_rgba(28,25,23,0.08)] backdrop-blur-md transition-shadow hover:shadow-[0_8px_32px_rgba(28,25,23,0.12)]"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
              >
                <div className="relative aspect-[4/3] w-full bg-stone-200">
                  <Image
                    src={a.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                      {a.location}
                    </p>
                    <h2 className="font-display text-xl italic text-white">{a.name}</h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm font-medium" style={{ color: 'var(--teal)' }}>
                    {a.title}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                    ★ {a.rating} · {a.reviewCount} reviews
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                    {a.bio}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {a.specialisations.slice(0, 4).map((s) => (
                      <li
                        key={s}
                        className="rounded-full px-2.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide"
                        style={{
                          background: 'var(--teal-light)',
                          color: 'var(--teal)',
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={a.profilePath}
                    className="mt-5 inline-flex items-center justify-center rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--teal-light)]"
                    style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
                  >
                    View profile →
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="underline-offset-2 hover:underline" style={{ color: 'var(--teal)' }}>
            Start personalized matching
          </Link>{' '}
          — intake form with AI concierge handoff.
        </p>
      </main>
    </div>
  )
}
