import { Text } from '@/components/i18n';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { CodeExample } from '@/components/code-example';
import { localizedTitle } from '@/lib/metadata';
export const generateMetadata = () => localizedTitle('Documentation');
export default function Docs() {
  return (
    <>
      <PublicNav />
      <main id="main" className="container docs-layout">
        <aside className="docs-nav">
          <span className="eyebrow">
            <Text>DOCUMENTATION</Text>
          </span>
          {[
            ['#start', 'Quick start'],
            ['#authentication', 'Authentication'],
            ['#tasks', 'Tasks'],
            ['#example', 'Examples'],
            ['#errors', 'Errors & limits'],
          ].map(([href, label]) => (
            <a href={href} key={href}>
              <Text>{label}</Text>
            </a>
          ))}
          <Link href="/app">
            <Text> Open workspace </Text>
            <ArrowRight size={14} />
          </Link>
        </aside>
        <article className="docs-article">
          <span className="eyebrow">
            <Text>HUGINN / API REFERENCE</Text>
          </span>
          <h1>
            <Text>API documentation</Text>
          </h1>
          <p className="docs-lead">
            <Text>
              {' '}
              Submit hCaptcha tasks, check their status and retrieve results. Requests and responses
              use JSON.{' '}
            </Text>
          </p>
          <section id="start">
            <h2>
              <Text>Quick start</Text>
            </h2>
            <ol>
              <li>
                <Link href="/register">
                  <Text>Create an account</Text>
                </Link>
                <Text> and sign in. </Text>
              </li>
              <li>
                <Text> Generate a key in </Text>
                <Link href="/app/keys">
                  <Text>API Keys</Text>
                </Link>
                <Text>. Save it securely; it is shown once. </Text>
              </li>
              <li>
                <Text>Add funds to your prepaid balance in Billing.</Text>
              </li>
              <li>
                <Text> Set </Text>
                <code>HUGINN_BASE_URL</code>
                <Text> to your deployment URL plus </Text>
                <code>/api</code> <Text> (locally: </Text>
                <code>http://localhost:3000/api</code>).
              </li>
              <li>
                <Text>Send a task and poll for a terminal status.</Text>
              </li>
            </ol>
          </section>
          <section id="authentication">
            <h2>
              <Text>Authentication</Text>
            </h2>
            <p>
              <Text> Use </Text>
              <code>Authorization: Bearer hg_live_…</code>
              <Text>
                {' '}
                for every external request. Keep API keys in server environment variables. Never
                embed them in browser code. Use HTTPS for public requests.{' '}
              </Text>
            </p>
            <p>
              <code>GET /v1/balance</code>
              <Text> returns</Text> <code>{'{ "balance": "0.000000", "currency": "USD" }'}</code>
              <Text>. Amounts are decimal USD strings. </Text>
            </p>
          </section>
          <section id="tasks">
            <h2>
              <Text>Create a task</Text>
            </h2>
            <div className="endpoint">
              <span>
                <Text>POST</Text>
              </span>
              <code>/v1/tasks</code>
            </div>
            <p>
              <Text>Send JSON with these required fields:</Text>
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <Text>Field</Text>
                    </th>
                    <th>
                      <Text>Value</Text>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <Text>type</Text>
                    </td>
                    <td>
                      <code>hcaptcha</code>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Text>websiteURL</Text>
                    </td>
                    <td>
                      <Text>The HTTP(S) URL of your authorized application</Text>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Text>websiteKey</Text>
                    </td>
                    <td>
                      <Text>The hCaptcha site key</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <Text> The API returns HTTP 202 with the task’s </Text>
              <code>id</code>
              <Text> and </Text>
              <code>status</code>
              <Text>. Supply a unique </Text>
              <code>Idempotency-Key</code>
              <Text>
                {' '}
                header to make retries safe. Reusing a key for different task input returns
                409.{' '}
              </Text>
            </p>
            <h3>
              <Text>Retrieve a task</Text>
            </h3>
            <div className="endpoint">
              <span>
                <Text>GET</Text>
              </span>
              <code>/v1/tasks/:id</code>
            </div>
            <p>
              <Text> Poll every two seconds with a bounded timeout. Status is </Text>
              <code>queued</code>, <code>processing</code>, <code>succeeded</code>
              <Text>, or </Text>
              <code>failed</code>
              <Text>. A successful result includes </Text>
              <code>result.token</code>
              <Text>. A failure includes an</Text> <code>errorCode</code>
              <Text> and is refunded automatically. </Text>
            </p>
            <p>
              <Text>
                {' '}
                Task result tokens are cleared after 24 hours. Retrieve and use results promptly. A
                pending request reserves the configured task price; this becomes the final charge
                only on success.{' '}
              </Text>
            </p>
          </section>
          <section id="example">
            <h2>
              <Text>Working examples</Text>
            </h2>
            <p>
              <Text> Python requires </Text>
              <code>pip install requests</code>
              <Text>. JavaScript requires Node.js 22 or later. Set </Text>
              <code>HUGINN_BASE_URL</code>
              <Text> and </Text>
              <code>HUGINN_API_KEY</code>
              <Text> before running. </Text>
            </p>
            <CodeExample />
          </section>
          <section id="errors">
            <h2>
              <Text>Errors &amp; limits</Text>
            </h2>
            <p>
              <Text> Errors use </Text>
              <code>{'{ "error": { "code": "…", "message": "…" } }'}</code>.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <Text>HTTP</Text>
                    </th>
                    <th>
                      <Text>Meaning</Text>
                    </th>
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
              <Text>
                {' '}
                Default API limit: 120 requests per minute per client IP. Authentication is limited
                to 10 attempts per 15 minutes. Keep retries bounded and use exponential backoff on
                temporary failures.{' '}
              </Text>
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
