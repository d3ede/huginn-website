import { AccountLink } from '@/components/session';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Plus,
} from 'lucide-react';
import { Text } from '@/components/i18n';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { CodeExample } from '@/components/code-example';
import { Pricing } from '@/components/pricing';
import { SolverPreview } from '@/components/solver-preview';

const features = [
  {
    icon: Terminal,
    title: '2Captcha-compatible API',
    copy: 'Create tasks and retrieve their results.',
  },
  {
    icon: KeyRound,
    title: 'API Keys',
    copy: 'Create and revoke access keys.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Task history',
    copy: 'Task statuses, duration and cost.',
  },
  {
    icon: ShieldCheck,
    title: 'Billing',
    copy: 'Pay for successful tasks from your balance.',
  },
];
const faqs = [
  ['What does Huginn support?', 'Huginn supports hCaptcha through a 2Captcha-compatible JSON API.'],
  [
    'How are tasks billed?',
    'The task price is reserved when a task is accepted. Successful tasks keep that charge; failed tasks receive an automatic refund. You can review each entry in Billing.',
  ],
  [
    'How do I get started?',
    'Create an account, add funds to your balance and generate an API key. Submit your first task using the examples in the documentation.',
  ],
  [
    'How do I keep my API key safe?',
    'Keep keys on your server and outside source control. Each key is shown only once when created. Revoke it from your workspace if it may have been exposed.',
  ],
];

export default function Home() {
  return (
    <>
      <PublicNav />
      <main id="main">
        <section className="landing-hero-section">
          <div className="landing-hero container">
            <div className="landing-hero-copy">
              <div className="landing-supported reveal">
                <span>
                  <img src="/images/hcaptcha.svg" width="26" height="26" alt="" />
                  hCaptcha
                </span>
                <span>
                  <Terminal size={17} strokeWidth={1.5} />
                  JSON API
                </span>
              </div>
              <h1 className="reveal">
                <span className="landing-title-first">
                  <Text>A service for solving</Text>
                </span>
                <span className="landing-title-accent">hCaptcha</span>
              </h1>
              <p className="landing-description reveal">
                <Text>
                  Supports standard hCaptcha and hCaptcha Enterprise. Access through the API.
                </Text>
              </p>
              <div className="landing-actions reveal">
                <AccountLink className="button button-primary" href="/app/keys" label="API Keys">
                  <Text>Get API key</Text>
                  <ArrowRight size={18} />
                </AccountLink>
                <Link className="button button-outline" href="/#pricing">
                  <Text>View pricing</Text>
                </Link>
              </div>
              <p className="landing-footnote">
                <Text>No subscriptions. Pay only for successful solutions.</Text>
              </p>
            </div>
            <div className="raven-stage">
              <div className="raven-stage-wing" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              <div className="raven-stage-grain" aria-hidden="true" />
              <SolverPreview />
            </div>
          </div>
        </section>

        <section
          className="platform-section container section-border"
          aria-labelledby="platform-heading"
        >
          <h2 id="platform-heading" className="platform-heading">
            <Text>hCaptcha workflows</Text>
          </h2>
          <div className="platform-row">
            {[
              ['discord', 'Discord'],
              ['steam', 'Steam'],
              ['riot', 'Riot Games'],
              ['epic', 'Epic Games'],
            ].map(([icon, name]) => (
              <div key={icon} className="platform-brand" role="img" aria-label={name} tabIndex={0}>
                <span className={`platform-logo platform-logo-${icon}`} aria-hidden="true" />
                <span className="platform-label" aria-hidden="true">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="product" className="container landing-features section-border">
          {features.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <div className="landing-feature-icon">
                <Icon size={26} strokeWidth={1.6} />
              </div>
              <h3>
                <Text>{title}</Text>
              </h3>
              <p>
                <Text>{copy}</Text>
              </p>
            </article>
          ))}
        </section>

        <section className="integration-section section-border">
          <div className="container integration-grid">
            <div className="integration-copy">
              <h2>
                <Text>API example</Text>
              </h2>
              <div className="integration-description">
                <p>
                  <Text>Create a task, then request its status and result.</Text>
                </p>
                <Link className="button button-outline" href="/docs">
                  <Text> Explore the documentation </Text>
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
            <CodeExample compact />
          </div>
        </section>

        <section className="container workflow section-border">
          <h2 className="workflow-heading">
            <Text>Getting started</Text>
          </h2>
          <div className="steps">
            {[
              ['Create an account', 'Register with your email address.'],
              ['Generate a key', 'A private key for your application.'],
              ['Send a task', 'Submit a site URL and hCaptcha site key.'],
              ['Retrieve the result', 'Poll the task and receive its token.'],
            ].map(([title, copy], i) => (
              <article key={title}>
                <span className="step-number">0{i + 1}</span>
                <h3>
                  <Text>{title}</Text>
                </h3>
                <p>
                  <Text>{copy}</Text>
                </p>
              </article>
            ))}
          </div>
        </section>
        <Pricing />
        <section className="container faq-section section-border">
          <div>
            <h2>
              <Text>FAQ</Text>
            </h2>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  <Text>{question}</Text>
                  <Plus size={18} />
                </summary>
                <p>
                  <Text>{answer}</Text>
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
