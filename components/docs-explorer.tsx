'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Text, useI18n } from '@/components/i18n';

export function JsonExample({ label, value }: { label: string; value: unknown }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const code = JSON.stringify(value, null, 2);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }
  return (
    <div className="docs-json">
      <div className="docs-json-head">
        <span>
          <Text>{label}</Text>
        </span>
        <button type="button" onClick={copy} aria-label={t('Copy') + ': ' + t(label)}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <Text>{copied ? 'Copied' : 'Copy'}</Text>
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
      {failed && (
        <p role="status">
          <Text>Select the code to copy it manually.</Text>
        </p>
      )}
    </div>
  );
}
