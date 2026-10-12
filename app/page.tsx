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
            <span className="eyebrow reveal">INTELLIGENCE BEHIND AUTOMATION</span>
            <h1 className="reveal">
              Solve
              <br />
              what others
              <br />
              <em>can’t.</em>
            </h1>
            <p className="hero-description reveal">
              Developer-first hCaptcha
              <br className="mobile-break" /> solving infrastructure.
            </p>
            <div className="hero-actions reveal">
              <Link className="button button-primary" href="/register">
                Get started <ArrowUpRight size={17} />
              </Link>
              <Link className="text-link" href="/docs">
                Documentation <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span>
                <Terminal size={14} /> A precise API
              </span>
              <span>
                <KeyRound size={14} /> Complete control
              </span>
              <span>
                <ShieldCheck size={14} /> Transparent billing
              </span>
            </div>
            <div className="hero-aside" aria-hidden="true">
              <span className="crosshair">⊕</span>
              <p>
                OBSERVE.
                <br />
                ADAPT.
                <br />
                AUTOMATE.
              </p>
              <span className="small-rule" />
            </div>
            <span className="hero-index" aria-hidden="true">
              01 <span>/</span> 04
            </span>
          </div>
        </section>
        <section id="product" className="container product-section section-border">
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / CONSIDERED INFRASTRUCTURE</span>
              <h2>
                Less friction.
                <br />
                <em>More focus.</em>
              </h2>
            </div>
            <p>
              The details are taken care of.
              <br />
              Keep your attention on what you’re building.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, copy }, i) => (
              <article className="feature" key={title}>
                <div className="feature-top">
                  <Icon size={21} strokeWidth={1.2} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="integration-section section-border">
          <div className="container integration-grid">
            <div className="integration-copy">
              <span className="eyebrow">02 / QUICK START</span>
              <h2>
                A few lines.
                <br />
                <em>A clear path.</em>
              </h2>
              <p>
                A REST API that speaks your language.
                <br />
                No new stack. No unnecessary ceremony.
              </p>
              <Link className="text-link" href="/docs">
                Explore the documentation <ArrowRight size={17} />
              </Link>
              <div className="integration-detail">
                <span className="small-rule" />
                <span>
                  SIMPLE BY DESIGN.
                  <br />
                  PRECISE BY NATURE.
                </span>
              </div>
            </div>
            <CodeExample compact />
          </div>
        </section>
        <section className="container workflow section-border">
          <span className="eyebrow">FROM FIRST KEY TO FIRST RESULT</span>
          <div className="steps">
            {[
              ['Create an account', 'Your workspace, ready to use.'],
              ['Generate a key', 'A private key for your application.'],
              ['Send a task', 'Submit a site URL and hCaptcha site key.'],
              ['Retrieve the result', 'Poll the task and receive its token.'],
            ].map(([title, copy], i) => (
              <article key={title}>
                <span className="step-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <Pricing />
        <section className="container faq-section section-border">
          <div>
            <span className="eyebrow">04 / A LITTLE CLARITY</span>
            <h2>
              Good
              <br />
              <em>questions.</em>
            </h2>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing-section">
          <div className="container closing-inner">
            <span className="eyebrow">BUILT FOR THOSE WHO SEE FURTHER</span>
            <h2>
              A quieter way
              <br />
              <em>to build.</em>
            </h2>
            <Link className="button button-primary" href="/register">
              Get started <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
