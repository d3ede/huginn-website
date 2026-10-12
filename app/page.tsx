import { Text } from '@/components/i18n';
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
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { CodeExample } from '@/components/code-example';
import { Pricing } from '@/components/pricing';
const features = [
  {
    icon: Terminal,
    title: 'REST API',
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
  [
    'What does Huginn support?',
    'Huginn supports hCaptcha, including hCaptcha Enterprise, through the API.',
  ],
  [
    'How are tasks billed?',
    'The task price is reserved when a task is accepted. Successful tasks keep that charge; failed tasks receive an automatic refund. You can review each entry in Billing.',
  ],
  [
    'Is task processing available now?',
    'This release includes the workspace and API. Processing becomes available when the service operator connects a solving provider. If it is unavailable, requests fail explicitly without charging your balance.',
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
        <section className="hero">
          <div className="hero-material" aria-hidden="true" />
          <div className="container hero-content">
            <div className="hero-supported reveal">
              <span>
                <img src="/images/hcaptcha.svg" width="26" height="26" alt="" />
                hCaptcha
              </span>
              <span>
                <Terminal size={17} strokeWidth={1.5} />
                REST API
              </span>
            </div>
            <h1 className="reveal">
              <span className="hero-title-first">
                <Text>A service for solving</Text>{' '}
              </span>
              <em>hCaptcha</em>
            </h1>
            <p className="hero-description reveal">
              <Text>Supports hCaptcha Enterprise. Access through the API.</Text>
            </p>
            <div className="hero-actions reveal">
              <Link className="button button-primary" href="/register">
                <Text> Get started </Text>
                <ArrowUpRight size={17} />
              </Link>
              <Link className="text-link" href="/docs">
                <Text> Documentation </Text>
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
        <section id="product" className="container product-section section-border">
          <div className="section-heading">
            <div>
              <h2>
                <Text>Features</Text>
              </h2>
            </div>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, copy }) => (
              <article className="feature" key={title}>
                <div className="feature-top">
                  <Icon size={21} strokeWidth={1.2} />
                </div>
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
