import { Text } from '@/components/i18n';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { localizedTitle } from '@/lib/metadata';
export const generateMetadata = () => localizedTitle('Terms');
export default function Terms() {
  return (
    <>
      <PublicNav />
      <main id="main" className="container policy-page">
        <span className="eyebrow">
          <Text>HUGINN / TERMS</Text>
        </span>
        <h1>
          <Text>Terms of use</Text>
        </h1>
        <h2>
          <Text>Authorized use</Text>
        </h2>
        <p>
          <Text>
            {' '}
            Use Huginn only for applications you own or are authorized to automate. Follow
            applicable laws and website terms. Do not use the service for abuse, unauthorized
            access, or credential attacks.{' '}
          </Text>
        </p>
        <h2>
          <Text>Accounts and keys</Text>
        </h2>
        <p>
          <Text>
            {' '}
            You are responsible for protecting your account and API keys. Revoke exposed keys
            promptly. Do not place keys in public repositories or client applications.{' '}
          </Text>
        </p>
        <h2>
          <Text>Billing and availability</Text>
        </h2>
        <p>
          <Text>
            {' '}
            The displayed task rate applies when a task is accepted. Its price is reserved and
            charged only if the task succeeds. Failed tasks are refunded to your balance. Payment
            completion requires confirmation from the payment provider. Processing speed and success
            are not guaranteed.{' '}
          </Text>
        </p>
        <h2>
          <Text>Payments and refunds</Text>
        </h2>
        <p>
          <Text>
            {' '}
            Your balance is prepaid. Failed tasks are refunded automatically to your balance. A
            checkout redirect alone does not confirm payment. Review the amount and currency before
            paying.{' '}
          </Text>
        </p>
      </main>
      <Footer />
    </>
  );
}
