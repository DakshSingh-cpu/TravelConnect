export const metadata = {
  title: 'Email Verification & Background Scan | TravelConnect Privacy',
  description:
    'Learn how TravelConnect uses SEON email intelligence to verify travellers and protect advisors from fraud.',
}

export default function EmailScanPrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
      <h1
        className="font-display text-3xl sm:text-4xl font-bold"
        style={{ color: 'var(--ink)' }}
      >
        Email Verification &amp; Background Scan
      </h1>
      <p className="mt-3 text-lg" style={{ color: 'var(--muted)' }}>
        Transparency about how we use your email to keep our platform safe.
      </p>

      <hr className="my-8" style={{ borderColor: 'var(--border)' }} />

      <section className="space-y-6 text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>
        <h2 className="text-xl font-semibold">Why we verify emails</h2>
        <p>
          TravelConnect connects travellers with professional travel advisors. To
          protect advisors from spam, fraudulent requests, and abuse, we perform a
          lightweight email-intelligence check (powered by{' '}
          <a
            href="https://seon.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: 'var(--teal)' }}
          >
            SEON
          </a>
          ) when you sign in or create an account.
        </p>

        <h2 className="text-xl font-semibold">What information is collected</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Email address</strong> — checked against known disposable-email
            providers, breach databases, and social-media presence signals.
          </li>
          <li>
            <strong>IP metadata</strong> — approximate geolocation and ISP type
            (residential vs. data-center) to detect VPN/proxy abuse.
          </li>
          <li>
            <strong>Digital footprint score</strong> — an aggregate risk score
            indicating whether the email has a legitimate online presence.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> access the contents of your inbox, read your
          emails, or scrape personal correspondence. The check is limited to
          publicly available metadata associated with your email address.
        </p>

        <h2 className="text-xl font-semibold">How we use the results</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Determining whether to grant immediate access or require additional
            verification steps.
          </li>
          <li>
            Protecting advisors from high-risk or fraudulent lead requests.
          </li>
          <li>
            Generating an internal trust score — never shared publicly or with
            third parties beyond SEON.
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Your rights under privacy law</h2>
        <p>
          We respect your rights under applicable privacy legislation including,
          but not limited to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>United States</strong> — California Consumer Privacy Act
            (CCPA/CPRA), Virginia CDPA, Colorado Privacy Act, and other state-level
            consumer privacy statutes.
          </li>
          <li>
            <strong>European Union / EEA</strong> — General Data Protection
            Regulation (GDPR). Processing is based on legitimate interest
            (fraud prevention) under Art. 6(1)(f).
          </li>
          <li>
            <strong>United Kingdom</strong> — UK GDPR and the Data Protection Act
            2018.
          </li>
          <li>
            <strong>India</strong> — Digital Personal Data Protection Act, 2023
            (DPDPA).
          </li>
          <li>
            <strong>Other jurisdictions</strong> — We comply with local data
            protection requirements wherever our users are located.
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Data retention &amp; deletion</h2>
        <p>
          Email-intelligence results are retained for a maximum of 90 days from
          account creation for fraud-prevention auditing. After this window, the
          raw scan output is permanently deleted. Your aggregated trust score is
          retained as long as your account exists but contains no personally
          identifiable email metadata.
        </p>
        <p>
          You may request deletion of all stored data at any time by contacting us
          at{' '}
          <a
            href="mailto:privacy@travelconnect.com"
            className="underline underline-offset-2"
            style={{ color: 'var(--teal)' }}
          >
            privacy@travelconnect.com
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold">Opt-out</h2>
        <p>
          If you do not consent to the email verification scan, you may choose not
          to proceed with sign-in. We are unable to provide platform access without
          this check as it is essential to maintaining the safety of our advisor
          network.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For privacy inquiries or to exercise your data subject rights, reach our
          Data Protection team at{' '}
          <a
            href="mailto:privacy@travelconnect.com"
            className="underline underline-offset-2"
            style={{ color: 'var(--teal)' }}
          >
            privacy@travelconnect.com
          </a>
          .
        </p>
      </section>

      <p className="mt-12 text-xs" style={{ color: 'var(--muted)' }}>
        Last updated: June 2026
      </p>
    </main>
  )
}
