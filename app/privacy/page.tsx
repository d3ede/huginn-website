import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
export const metadata = { title: 'Privacy' };
export default function Privacy() {
  return (
    <>
      <PublicNav />
      <main id="main" className="container policy-page">
        <span className="eyebrow">HUGINN / PRIVACY</span>
        <h1>
          Your data.
          <br />
          <em>A clear view.</em>
        </h1>
        <p>
          This service stores your account name, email, password hash, preferences, task records,
          and billing ledger to operate your workspace. Session tokens and API keys are stored as
          hashes. Full API keys are shown only when created.
        </p>
        <h2>Tasks and payments</h2>
        <p>
          Task URLs and site keys are stored with task records. A connected processing provider
          receives task input. Successful tokens are cleared after 24 hours. A connected payment
          provider handles checkout; this application does not store card details.
        </p>
        <h2>Sessions</h2>
        <p>
          An essential HttpOnly cookie keeps you signed in. There are no advertising or analytics
          cookies in this release. Signing out revokes the current session; changing your password
          revokes all existing sessions.
        </p>
        <h2>Service operator</h2>
        <p>
          Contact the operator of your deployed instance for account data requests, retention
          details, and the applicable privacy contact. The operator must publish its identity,
          contact information, retention policy, and provider disclosures before accepting public
          customers.
        </p>
      </main>
      <Footer />
    </>
  );
}
