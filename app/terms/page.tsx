import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
export const metadata = { title: 'Terms' };
export default function Terms() {
  return (
    <>
      <PublicNav />
      <main id="main" className="container policy-page">
        <span className="eyebrow">HUGINN / TERMS</span>
        <h1>
          Build with
          <br />
          <em>intention.</em>
        </h1>
        <h2>Authorized use</h2>
        <p>
          Use Huginn only for applications you own or are authorized to automate. Follow applicable
          laws and website terms. Do not use the service for abuse, unauthorized access, or
          credential attacks.
        </p>
        <h2>Accounts and keys</h2>
        <p>
          You are responsible for protecting your account and API keys. Revoke exposed keys
          promptly. Do not place keys in public repositories or client applications.
        </p>
        <h2>Billing and availability</h2>
        <p>
          The displayed task rate applies when a task is accepted. Its price is reserved and charged
          only if the task succeeds. Failed tasks are refunded to your balance. Payment completion
          requires confirmation from the payment provider. Processing speed and success are not
          guaranteed.
        </p>
        <h2>Preview release</h2>
        <p>
          Processing and payments are unavailable until connected by the service operator. Before
          accepting public customers, the operator must publish its identity, contact details,
          refund and withdrawal terms, and any jurisdiction-specific terms.
        </p>
      </main>
      <Footer />
    </>
  );
}
