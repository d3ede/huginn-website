import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { CodeExample } from '@/components/code-example';
export const metadata = { title: 'Documentation' };
export default function Docs() {
  return (
    <>
      <PublicNav />
      <main id="main" className="container docs-layout">
        <aside className="docs-nav">
          <span className="eyebrow">DOCUMENTATION</span>
          {[
            ['#start', 'Quick start'],
            ['#authentication', 'Authentication'],
            ['#tasks', 'Tasks'],
            ['#example', 'Examples'],
            ['#errors', 'Errors & limits'],
          ].map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
          <Link href="/app">
            Open workspace <ArrowRight size={14} />
          </Link>
        </aside>
        <article className="docs-article">
          <span className="eyebrow">HUGINN / API REFERENCE</span>
          <h1>
            A small API.
            <br />
            <em>Everything you need.</em>
          </h1>
          <p className="docs-lead">
            Submit an hCaptcha task, check its status, and retrieve the result. Standard HTTP.
            Standard JSON.
          </p>
          <section id="start">
            <h2>Quick start</h2>
            <ol>
              <li>
                <Link href="/register">Create an account</Link> and sign in.
              </li>
              <li>
                Generate a key in <Link href="/app/keys">API Keys</Link>. Save it securely; it is
                shown once.
              </li>
              <li>Add balance from Billing when payments are enabled.</li>
              <li>
                Set <code>HUGINN_BASE_URL</code> to your deployment URL plus <code>/api</code>{' '}
                (locally: <code>http://localhost:3000/api</code>).
              </li>
              <li>Send a task and poll for a terminal status.</li>
            </ol>
            <div className="notice">
              This preview has no solving or payment provider enabled by default. Unavailable
              operations return an explicit 503 without changing your balance.
            </div>
          </section>
          <section id="authentication">
            <h2>Authentication</h2>
            <p>
              Use <code>Authorization: Bearer hg_live_…</code> for every external request. Keep API
              keys in server environment variables. Never embed them in browser code. All production
              requests must use HTTPS.
            </p>
            <p>
              <code>GET /v1/balance</code> returns{' '}
              <code>{'{ "balance": "0.000000", "currency": "USD" }'}</code>. Amounts are decimal USD
              strings.
            </p>
          </section>
          <section id="tasks">
            <h2>Create a task</h2>
            <div className="endpoint">
              <span>POST</span>
              <code>/v1/tasks</code>
            </div>
            <p>Send JSON with these required fields:</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>type</td>
                    <td>
                      <code>hcaptcha</code>
                    </td>
                  </tr>
                  <tr>
                    <td>websiteURL</td>
                    <td>The HTTP(S) URL of your authorized application</td>
                  </tr>
                  <tr>
                    <td>websiteKey</td>
                    <td>The hCaptcha site key</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The API returns HTTP 202 with the task’s <code>id</code> and <code>status</code>.
              Supply a unique <code>Idempotency-Key</code> header to make retries safe. Reusing a
              key for different task input returns 409.
            </p>
            <h3>Retrieve a task</h3>
            <div className="endpoint">
              <span>GET</span>
              <code>/v1/tasks/:id</code>
            </div>
            <p>
              Poll every two seconds with a bounded timeout. Status is <code>queued</code>,{' '}
              <code>processing</code>, <code>succeeded</code>, or <code>failed</code>. A successful
              result includes <code>result.token</code>. A failure includes an{' '}
              <code>errorCode</code> and is refunded automatically.
            </p>
            <p>
              Task result tokens are cleared after 24 hours. Retrieve and use results promptly. A
              pending request reserves the configured task price; this becomes the final charge only
              on success.
            </p>
          </section>
          <section id="example">
            <h2>Working examples</h2>
            <p>
              Python requires <code>pip install requests</code>. JavaScript requires Node.js 22 or
              later. Set <code>HUGINN_BASE_URL</code> and <code>HUGINN_API_KEY</code> before
              running.
            </p>
            <CodeExample />
          </section>
          <section id="errors">
            <h2>Errors & limits</h2>
            <p>
              Errors use <code>{'{ "error": { "code": "…", "message": "…" } }'}</code>.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>HTTP</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['400', 'Invalid request fields'],
                    ['401', 'Missing, invalid, or revoked API key'],
                    ['402', 'Insufficient balance'],
                    ['404', 'Task not found or not owned by your account'],
                    ['409', 'Idempotency key conflict'],
                    ['429', 'Rate limit reached; respect the Retry-After header'],
                    ['503', 'Task processing or payments unavailable'],
                  ].map(([code, meaning]) => (
                    <tr key={code}>
                      <td>{code}</td>
                      <td>{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Default API limit: 120 requests per minute per client IP. Authentication is limited to
              10 attempts per 15 minutes. Keep retries bounded and use exponential backoff on
              temporary failures.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
