import { Text } from '@/components/i18n';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { localizedTitle } from '@/lib/metadata';
export const generateMetadata = () => localizedTitle('Privacy');
export default function Privacy() {
  return (
    <>
      <PublicNav />
      <main id="main" className="container policy-page">
        <span className="eyebrow">
          <Text>HUGINN / PRIVACY</Text>
        </span>
        <h1>
          <Text>Privacy policy</Text>
        </h1>
        <p>
          <Text>
            {' '}
            This service stores your account name, email, password hash, preferences, task records,
            and billing ledger to operate your workspace. Session tokens and API keys are stored as
            hashes. Full API keys are shown only when created.{' '}
          </Text>
        </p>
        <p>
          <Text>
            Your language choice is saved in a preference cookie for one year. You can change it
            with the language switch at any time.
          </Text>
        </p>
        <h2>
          <Text>Tasks and payments</Text>
        </h2>
        <p>
          <Text>
            {' '}
            Task URLs and site keys are stored with task records and used to process your requests.
            Result tokens in your task history are cleared after 24 hours. Diagnostic records may be
            retained separately for up to 90 days. Payment processors handle checkout; Huginn does
            not store card details.{' '}
          </Text>
        </p>
        <h2>
          <Text>Sessions</Text>
        </h2>
        <p>
          <Text>
            {' '}
            An essential HttpOnly cookie keeps you signed in. There are no advertising or analytics
            cookies in this release. Signing out revokes the current session; changing your password
            revokes all existing sessions.{' '}
          </Text>
        </p>
        <h2>
          <Text>Your data</Text>
        </h2>
        <p>
          <Text>
            {' '}
            Keep task inputs free of unnecessary personal information. Account and transaction
            records are retained to provide your history and maintain accurate balances.{' '}
          </Text>
        </p>
      </main>
      <Footer />
    </>
  );
}
