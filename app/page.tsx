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
    title: 'Built for developers.',
    copy: 'Create a task. Retrieve a result. A small, predictable API that fits your existing workflow.',
  },
  {
    icon: KeyRound,
    title: 'Your keys. Your control.',
    copy: 'Create named API keys for each integration. Revoke access whenever you need to.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Nothing out of sight.',
    copy: 'Track task states, solution times, and spending from one considered workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'A measured approach.',
    copy: 'Only successful tasks are charged. Failed tasks release their reserved balance automatically.',
  },
];
const faqs = [
  [
    'What does Huginn support?',
    'Huginn provides a task-based API for hCaptcha. Other CAPTCHA types are not currently supported.',
  ],
  [
    'How are tasks billed?',
    'The task price is reserved when a task is accepted. Successful tasks keep that charge; failed tasks receive an automatic refund. You can review each entry in Billing.',
  ],
  [
    'Do you offer a subscription?',
    'No. Huginn uses a prepaid balance and charges per successful task. The configured rate is shown above and in your workspace.',
  ],
  [
    'Is task processing available now?',
    'This release includes the workspace and API. Processing becomes available when the service operator connects a solving provider. If it is unavailable, requests fail explicitly without charging your balance.',
  ],
  [
    'How do I keep my API key safe?',
    'Keep keys on your server and outside source control. Each key is shown only once when created. Revoke it from your workspace if it may have been exposed.',
  ],
  [
    'Can I use it in my own application?',
    'Use Huginn only for applications you own or are authorized to automate, and comply with the applicable website terms. Start with the documented REST API.',
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
            <h1 className="reveal">
              <Text> Solve </Text>
              <br />
              <Text> what others </Text>
              <br />
              <em>
                <Text>can’t.</Text>
              </em>
            </h1>
            <p className="hero-description reveal">
              <Text> Developer-first hCaptcha </Text>
              <br className="mobile-break" />
              <Text> solving infrastructure. </Text>
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
                <Text> Less friction. </Text>
                <br />
                <em>
                  <Text>More focus.</Text>
                </em>
              </h2>
            </div>
            <p>
              <Text> The details are taken care of. </Text>
              <br />
              <Text> Keep your attention on what you’re building. </Text>
            </p>
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
                <Text> A few lines. </Text>
                <br />
                <em>
                  <Text>A clear path.</Text>
                </em>
              </h2>
              <p>
                <Text> A REST API that speaks your language. </Text>
                <br />
                <Text> No new stack. No unnecessary ceremony. </Text>
              </p>
              <Link className="text-link" href="/docs">
                <Text> Explore the documentation </Text>
                <ArrowRight size={17} />
              </Link>
            </div>
            <CodeExample compact />
          </div>
        </section>
        <section className="container workflow section-border">
          <div className="steps">
            {[
              ['Create an account', 'Your workspace, ready to use.'],
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
              <Text> Good </Text>
              <br />
              <em>
                <Text>questions.</Text>
              </em>
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
        <section className="closing-section">
          <div className="container closing-inner">
            <h2>
              <Text> A quieter way </Text>
              <br />
              <em>
                <Text>to build.</Text>
              </em>
            </h2>
            <Link className="button button-primary" href="/register">
              <Text> Get started </Text>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
