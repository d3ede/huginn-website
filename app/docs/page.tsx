import { Text } from '@/components/i18n';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
import { Footer } from '@/components/footer';
import { CodeExample } from '@/components/code-example';
import { createTaskPayload, pollTaskPayload, readyTaskPayload } from '@/lib/examples';
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
            ['#requests', 'Request format'],
            ['#tasks', 'Create a task'],
            ['#result', 'Retrieve a task'],
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
        <article className="docs-article">
          <span className="eyebrow">
            <Text>HUGINN / API REFERENCE</Text>
          </span>
          <h1>
            <Text>API documentation</Text>
          </h1>
          <p className="docs-lead">
            <Text>
              Use the 2Captcha-compatible JSON API to submit hCaptcha tasks and retrieve solution
              tokens.
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
                <Text> and sign in.</Text>
              </li>
              <li>
                <Text>Generate a key in</Text>{' '}
                <Link href="/app/keys">
                  <Text>API Keys</Text>
                </Link>
                <Text>. Save it securely; it is shown once.</Text>
              </li>
              <li>
                <Text>Add funds to your prepaid balance in Billing.</Text>
              </li>
              <li>
                <Text>
                  Set HUGINN_BASE_URL to your API base URL and HUGINN_API_KEY to your key.
                </Text>
              </li>
              <li>
                <Text>
                  Call createTask, save taskId, then poll getTaskResult until status is ready.
                </Text>
              </li>
            </ol>
          </section>
          <section id="requests">
            <h2>
              <Text>Request format</Text>
            </h2>
            <p>
              <Text>
                Send POST requests with Content-Type: application/json. Method paths are relative to
                HUGINN_BASE_URL.
              </Text>
            </p>
            <p>
              <Text>
                The JSON request includes clientKey. Keep your API key in server environment
                variables and outside browser code. Use HTTPS for public requests.
              </Text>
            </p>
            <p>
              <Text>
                Check errorId in every response, including HTTP 200 responses. An errorId of 0
                indicates success; an errorId of 1 includes errorCode and errorDescription.
              </Text>
            </p>
          </section>
          <section id="tasks">
            <h2>
              <Text>Create a task</Text>
            </h2>
            <div className="endpoint">
              <span>POST</span>
              <code>/createTask</code>
            </div>
            <pre>
              <code>{JSON.stringify(createTaskPayload, null, 2)}</code>
            </pre>
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
                  {[
                    ['clientKey', 'Your API key'],
                    ['task.type', 'HCaptchaTaskProxyless or HCaptchaTask'],
                    ['task.websiteURL', 'The HTTP(S) URL of your authorized application'],
                    ['task.websiteKey', 'The hCaptcha site key'],
                  ].map(([field, value]) => (
                    <tr key={field}>
                      <td>
                        <code>{field}</code>
                      </td>
                      <td>
                        <Text>{value}</Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <Text>
                A successful response returns errorId: 0 and taskId. Save that taskId and use it for
                polling.
              </Text>
            </p>
            <pre>
              <code>{'{ "errorId": 0, "taskId": "TASK_ID" }'}</code>
            </pre>
            <p>
              <Text>
                Each createTask call creates a new task. If the response is lost, do not blindly
                resubmit: a second request can create another task.
              </Text>
            </p>
            <h3>
              <Text>Optional task fields</Text>
            </h3>
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
                  {[
                    ['isInvisible', 'Boolean; defaults to false'],
                    ['userAgent', 'Browser user-agent string'],
                    ['cookies', 'Cookie string using name=value pairs separated by semicolons'],
                    ['languagePool', 'Language code such as en or en-US'],
                    ['enterprisePayload', 'Object containing rqdata'],
                    ['websiteContext', 'Optional website integration context'],
                  ].map(([field, value]) => (
                    <tr key={field}>
                      <td>
                        <code>{field}</code>
                      </td>
                      <td>
                        <Text>{value}</Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>
              <Text>Tasks with a proxy</Text>
            </h3>
            <p>
              <Text>
                Use HCaptchaTask with proxyType, proxyAddress, and proxyPort. Supported proxy types
                are http, https, and socks5. Supply proxyLogin and proxyPassword together when
                required. Proxy fields are not accepted for HCaptchaTaskProxyless.
              </Text>
            </p>
          </section>
          <section id="result">
            <h2>
              <Text>Retrieve a task</Text>
            </h2>
            <div className="endpoint">
              <span>POST</span>
              <code>/getTaskResult</code>
            </div>
            <pre>
              <code>{JSON.stringify(pollTaskPayload, null, 2)}</code>
            </pre>
            <p>
              <Text>While the task is pending, the response is:</Text>
            </p>
            <pre>
              <code>{'{ "errorId": 0, "status": "processing" }'}</code>
            </pre>
            <p>
              <Text>
                Poll every five seconds with a bounded timeout. When status is ready, read
                solution.gRecaptchaResponse:
              </Text>
            </p>
            <pre>
              <code>{JSON.stringify(readyTaskPayload, null, 2)}</code>
            </pre>
            <p>
              <Text>
                solution.token is an alias of gRecaptchaResponse. The response also includes
                userAgent and may include respKey. Use the returned token promptly; stored results
                expire after 24 hours by default.
              </Text>
            </p>
          </section>
          <section id="example">
            <h2>
              <Text>Working examples</Text>
            </h2>
            <p>
              <Text>Python requires</Text> <code>pip install requests</code>
              <Text>. JavaScript requires Node.js 22 or later. Set</Text>{' '}
              <code>HUGINN_BASE_URL</code>
              <Text> and</Text> <code>HUGINN_API_KEY</code>
              <Text> before running.</Text>
            </p>
            <CodeExample />
          </section>
          <section id="errors">
            <h2>
              <Text>Errors</Text>
            </h2>
            <pre>
              <code>
                {JSON.stringify(
                  {
                    errorId: 1,
                    errorCode: 'ERROR_BAD_PARAMETERS',
                    errorDescription: 'task must be a JSON object',
                  },
                  null,
                  2,
                )}
              </code>
            </pre>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <Text>Code</Text>
                    </th>
                    <th>
                      <Text>Meaning</Text>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
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
                  ].map(([code, meaning]) => (
                    <tr key={code}>
                      <td>
                        <code>{code}</code>
                      </td>
                      <td>
                        <Text>{meaning}</Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <Text>
                Stop polling after an error or a ready response. Network failures and HTTP errors
                must also be handled separately from JSON protocol errors.
              </Text>
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
