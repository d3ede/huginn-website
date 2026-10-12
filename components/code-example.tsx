'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { pythonExample, javascriptExample } from '@/lib/examples';
export function CodeExample({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<'Python' | 'JavaScript'>('Python');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const code = language === 'Python' ? pythonExample : javascriptExample;
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className={`code-window ${compact ? 'code-compact' : ''}`}>
      <div className="code-toolbar">
        <div className="code-tabs" role="tablist" aria-label="Example language">
          {(['Python', 'JavaScript'] as const).map((l) => (
            <button
              role="tab"
              aria-selected={l === language}
              key={l}
              onClick={() => setLanguage(l)}
              className={l === language ? 'active' : ''}
            >
              {l}
            </button>
          ))}
        </div>
        <button className="icon-button" onClick={copy} aria-label="Copy complete example">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <pre role="tabpanel">
        <code>
          {compact
            ? language === 'Python'
              ? `import os, requests\n\nresponse = requests.post(\n    os.environ["HUGINN_BASE_URL"] + "/v1/tasks",\n    headers={"Authorization":\n        "Bearer " + os.environ["HUGINN_API_KEY"]},\n    json={\n        "type": "hcaptcha",\n        "websiteURL": "https://example.com",\n        "websiteKey": "YOUR_SITE_KEY"\n    }\n)\nresponse.raise_for_status()\ntask = response.json()`
              : `const response = await fetch(\n  process.env.HUGINN_BASE_URL + "/v1/tasks", {\n    method: "POST",\n    headers: {\n      Authorization: "Bearer " + process.env.HUGINN_API_KEY,\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify({\n      type: "hcaptcha",\n      websiteURL: "https://example.com",\n      websiteKey: "YOUR_SITE_KEY"\n    })\n  }\n);\nif (!response.ok) throw new Error("Request failed");\nconst task = await response.json();`
            : code}
        </code>
      </pre>
      {compact && (
        <div className="code-caption">
          <span>01 / CREATE A TASK</span>
          <span>REST API</span>
        </div>
      )}
      {copyError && (
        <p className="form-error" role="status">
          Select the code to copy it manually.
        </p>
      )}
    </div>
  );
}
