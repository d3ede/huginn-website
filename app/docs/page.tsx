import { Text } from '@/components/i18n';
import Link from 'next/link';
import { ArrowRight, KeyRound, Wallet, Send, Clock3, CheckCircle2 } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { CodeExample } from '@/components/code-example';
import { JsonExample } from '@/components/docs-explorer';
import { createTaskPayload, pollTaskPayload, readyTaskPayload } from '@/lib/examples';
import { localizedTitle } from '@/lib/metadata';

export const generateMetadata = () => localizedTitle('Documentation');
function Fields({
  rows,
  first = 'Field',
  second = 'What to send',
}: {
  rows: [string, string][];
  first?: string;
  second?: string;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>
              <Text>{first}</Text>
            </th>
            <th>
              <Text>{second}</Text>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, meaning]) => (
            <tr key={field}>
              <td>
                <code>{field}</code>
              </td>
              <td>
                <Text>{meaning}</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Endpoint({ path }: { path: string }) {
  return (
    <div className="endpoint">
      <span>POST</span>
      <code>/{path}</code>
    </div>
  );
}
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
            ['#requests', 'Request format'],
            ['#tasks', 'Create a task'],
            ['#site-settings', 'Website integrations'],
            ['#result', 'Retrieve a task'],
            ['#balance', 'Check balance'],
            ['#example', 'Examples'],
            ['#errors', 'Errors'],
          ].map(([href, label]) => (
            <a href={href} key={href}>
              <Text>{label}</Text>
            </a>
          ))}
          <Link href="/app">
            <Text>Open workspace</Text>
            <ArrowRight size={14} />
          </Link>
        </aside>
        <article className="docs-article docs-visual">
          <span className="eyebrow">
            <Text>HUGINN / API REFERENCE</Text>
          </span>
          <h1>
            <Text>API documentation</Text>
          </h1>
          <p className="docs-lead">
            <Text>
              2Captcha-compatible JSON API. Create a task, wait for the result, use the token.
            </Text>
          </p>
          <section id="start">
            <h2>
              <Text>Quick start</Text>
            </h2>
            <div className="docs-start-grid">
              <Link href="/app/keys">
                <KeyRound size={20} />
                <strong>
                  <Text>Create an API key</Text>
                </strong>
                <span>
                  <Text>Sign in. Save your key when it is shown.</Text>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/app/billing">
                <Wallet size={20} />
                <strong>
                  <Text>Add funds</Text>
                </strong>
                <span>
                  <Text>Top up your prepaid USD balance.</Text>
                </span>
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="docs-flow">
              <div>
                <Send size={19} />
                <span className="docs-step-number">1</span>
                <strong>createTask</strong>
                <span>
                  <Text>Save taskId</Text>
                </span>
              </div>
              <div>
                <Clock3 size={19} />
                <span className="docs-step-number">2</span>
                <strong>getTaskResult</strong>
                <span>
                  <Text>Poll every 5 seconds</Text>
                </span>
              </div>
              <div>
                <CheckCircle2 size={19} />
                <span className="docs-step-number">3</span>
                <strong>ready</strong>
                <span>
                  <Text>Use the solution token</Text>
                </span>
              </div>
            </div>
          </section>
          <section id="requests">
            <h2>
              <Text>Request format</Text>
            </h2>
            <Fields
              rows={[
                ['HUGINN_BASE_URL', 'Your site origin + /api'],
                ['HUGINN_API_KEY', 'Your API key; keep it in server environment variables.'],
                ['Content-Type', 'application/json · POST requests over HTTPS'],
                ['clientKey', 'Include your API key in every JSON request.'],
              ]}
            />
            <div className="docs-note">
              <KeyRound size={17} />
              <p>
                <Text>
                  Keys never expire. Revoke them in API Keys. Any active key can retrieve your
                  account’s tasks.
                </Text>
              </p>
            </div>
          </section>
          <section id="tasks">
            <h2>
              <Text>Create a task</Text>
            </h2>
            <Endpoint path="createTask" />
            <JsonExample label="Request" value={createTaskPayload} />
            <Fields
              rows={[
                ['clientKey', 'Your API key'],
                ['task.type', 'HCaptchaTaskProxyless or HCaptchaTask'],
                ['task.websiteURL', 'The full HTTP(S) URL where the captcha runs.'],
                ['task.websiteKey', 'The hCaptcha site key'],
              ]}
            />
            <div className="docs-inline-result">
              <span>
                <Text>Response</Text>
              </span>
              <code>{'{ "errorId": 0, "taskId": "TASK_ID" }'}</code>
            </div>
            <p className="docs-caption">
              <Text>
                Save taskId. Each createTask call creates a new task; do not blindly retry a lost
                response.
              </Text>
            </p>
            <details className="docs-disclosure">
              <summary>
                <Text>Session and optional fields</Text>
              </summary>
              <Fields
                rows={[
                  ['isInvisible', 'Boolean; defaults to false.'],
                  ['userAgent', 'Use the user agent of your browser session when needed.'],
                  ['cookies', 'Session cookies: name=value pairs separated by semicolons.'],
                  ['languagePool', 'Language code, such as en or en-US.'],
                  [
                    'enterprisePayload',
                    'For Enterprise integrations: an object containing rqdata.',
                  ],
                  ['websiteContext', 'Site-specific session values. See the integration below.'],
                ]}
              />
            </details>
            <details className="docs-disclosure">
              <summary>
                <Text>Using your own proxy</Text>
              </summary>
              <Fields
                rows={[
                  [
                    'type',
                    'HCaptchaTask (proxy fields are not accepted for HCaptchaTaskProxyless).',
                  ],
                  ['proxyType', 'http, https or socks5'],
                  ['proxyAddress · proxyPort', 'Proxy host and port.'],
                  [
                    'proxyLogin · proxyPassword',
                    'Send both together if the proxy requires authentication.',
                  ],
                ]}
              />
            </details>
          </section>
          <section id="site-settings">
            <h2>
              <Text>Website integrations</Text>
            </h2>
            <div className="docs-site-card">
              <div className="docs-site-body">
                <h3>
                  <Text>Steam account creation</Text>
                </h3>
                <p className="docs-caption">
                  <Text>
                    Use the captcha details from Steam’s /refreshcaptcha response in the same
                    browser session.
                  </Text>
                </p>
                <Fields
                  rows={[
                    ['websiteURL', 'https://store.steampowered.com/join/'],
                    ['websiteKey', 'The hCaptcha site key returned by Steam.'],
                    [
                      'websiteContext.gid',
                      'Copy gid from /refreshcaptcha as a string (1–32 digits).',
                    ],
                    ['websiteContext.s', 'Copy s from /refreshcaptcha when present.'],
                  ]}
                />
                <p className="docs-caption">
                  <Text>
                    Keep the same proxy, cookies and user agent when continuing the Steam
                    registration flow.
                  </Text>
                </p>
                <div className="docs-note">
                  <p>
                    <Text>
                      Steam uses checkbox mode. Site settings are applied automatically and take
                      priority over isInvisible; you can omit this field.
                    </Text>
                  </p>
                </div>
                <details className="docs-disclosure">
                  <summary>
                    <Text>View request example</Text>
                  </summary>
                  <JsonExample
                    label="Request"
                    value={{
                      clientKey: 'YOUR_API_KEY',
                      task: {
                        type: 'HCaptchaTaskProxyless',
                        websiteURL: 'https://store.steampowered.com/join/',
                        websiteKey: 'SITE_KEY_FROM_STEAM',
                        websiteContext: {
                          gid: 'GID_FROM_REFRESHCAPTCHA',
                          s: 'S_FROM_REFRESHCAPTCHA',
                        },
                      },
                    }}
                  />
                  <p className="docs-caption">
                    <Text>
                      Replace the placeholders with your current session values. Omit s if Steam did
                      not return it. Use HCaptchaTask with proxy fields when using your own proxy.
                    </Text>
                  </p>
                </details>
              </div>
            </div>
          </section>
          <section id="result">
            <h2>
              <Text>Retrieve a task</Text>
            </h2>
            <Endpoint path="getTaskResult" />
            <JsonExample label="Request" value={pollTaskPayload} />
            <div className="docs-status-grid">
              <div>
                <Clock3 size={19} />
                <strong>processing</strong>
                <p>
                  <Text>Wait 5 seconds, then poll again.</Text>
                </p>
                <code>errorId: 0</code>
              </div>
              <div>
                <CheckCircle2 size={19} />
                <strong>ready</strong>
                <p>
                  <Text>Stop polling. Read solution.gRecaptchaResponse.</Text>
                </p>
                <code>errorId: 0</code>
              </div>
            </div>
            <details className="docs-disclosure">
              <summary>
                <Text>View response examples</Text>
              </summary>
              <JsonExample label="Processing" value={{ errorId: 0, status: 'processing' }} />
              <JsonExample label="Ready" value={readyTaskPayload} />
            </details>
            <Fields
              second="Meaning"
              rows={[
                ['solution.gRecaptchaResponse', 'The solution token. Use it promptly.'],
                ['solution.token', 'Alias of gRecaptchaResponse.'],
                [
                  'solution.userAgent · respKey',
                  'The user agent is returned; respKey may also be present.',
                ],
              ]}
            />
            <p className="docs-caption">
              <Text>
                Use a bounded timeout. Stop on ready or an error. Stored results expire after 24
                hours by default.
              </Text>
            </p>
          </section>
          <section id="balance">
            <h2>
              <Text>Check balance</Text>
            </h2>
            <Endpoint path="getBalance" />
            <JsonExample label="Request" value={{ clientKey: 'YOUR_API_KEY' }} />
            <div className="docs-inline-result">
              <span>
                <Text>Response · USD</Text>
              </span>
              <code>{'{ "errorId": 0, "balance": 10.5 }'}</code>
            </div>
            <div className="docs-billing-flow">
              <span>
                <Text>Task accepted</Text>
                <strong>
                  <Text>Price reserved</Text>
                </strong>
              </span>
              <ArrowRight size={17} />
              <span>
                <Text>Success / failure</Text>
                <strong>
                  <Text>Charged / refunded</Text>
                </strong>
              </span>
            </div>
          </section>
          <section id="example">
            <h2>
              <Text>Working examples</Text>
            </h2>
            <p className="docs-caption">
              <Text>
                Set HUGINN_BASE_URL and HUGINN_API_KEY first. Python: pip install requests.
                JavaScript: Node.js 22+.
              </Text>
            </p>
            <CodeExample />
          </section>
          <section id="errors">
            <h2>
              <Text>Errors</Text>
            </h2>
            <div className="docs-note">
              <p>
                <Text>
                  Always check errorId, including HTTP 200 responses. 0 means success; 1 means an
                  error. Handle network and HTTP failures separately.
                </Text>
              </p>
            </div>
            <JsonExample
              label="Error response"
              value={{
                errorId: 1,
                errorCode: 'ERROR_BAD_PARAMETERS',
                errorDescription: 'task must be a JSON object',
              }}
            />
            <details className="docs-disclosure">
              <summary>
                <Text>All error codes</Text>
              </summary>
              <Fields
                first="Code"
                second="Meaning"
                rows={[
                  ['ERROR_KEY_DOES_NOT_EXIST', 'Missing, invalid, or revoked API key'],
                  ['ERROR_ZERO_BALANCE', 'Insufficient available balance'],
                  ['ERROR_BAD_PARAMETERS', 'Invalid request fields'],
                  ['ERROR_TASK_NOT_SUPPORTED', 'Unsupported task type'],
                  ['ERROR_PROXY_FORMAT', 'Invalid proxy configuration'],
                  ['ERROR_TASK_NOT_FOUND', 'Task does not exist or its result has expired'],
                  ['ERROR_NO_SLOT_AVAILABLE', 'The task could not be queued'],
                  ['ERROR_SERVICE_UNAVAILABLE', 'Service temporarily unavailable'],
                  ['ERROR_CAPTCHA_TIMEOUT', 'Task processing timed out'],
                  ['ERROR_CAPTCHA_UNSOLVABLE', 'The task could not be solved'],
                  ['ERROR_UNSUPPORTED_CAPABILITY', 'The requested task option is unavailable'],
                  ['ERROR_CONTRACT_REVIEW_REQUIRED', 'The task requires additional review'],
                ]}
              />
            </details>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
