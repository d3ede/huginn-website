'use client';
import { Text, useI18n } from '@/components/i18n';

import { useId, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  pythonExample,
  javascriptExample,
  compactPythonExample,
  compactJavascriptExample,
} from '@/lib/examples';
import { highlightCode } from '@/lib/highlight-code';
export function CodeExample({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const id = useId();

  const [language, setLanguage] = useState<'Python' | 'JavaScript'>('Python');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const code = language === 'Python' ? pythonExample : javascriptExample;
  const displayedCode = compact
    ? language === 'Python'
      ? compactPythonExample
      : compactJavascriptExample
    : code;
  const highlightedCode = useMemo(
    () => highlightCode(displayedCode, language),
    [displayedCode, language],
  );
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
        <div className="code-tabs" role="tablist" aria-label={t('Example language')}>
          {(['Python', 'JavaScript'] as const).map((l) => (
            <button
              role="tab"
              id={`${id}-${l}`}
              aria-controls={`${id}-code`}
              aria-selected={l === language}
              tabIndex={l === language ? 0 : -1}
              key={l}
              onClick={() => setLanguage(l)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'Python'
                    : event.key === 'End'
                      ? 'JavaScript'
                      : l === 'Python'
                        ? 'JavaScript'
                        : 'Python';
                setLanguage(next);
                document.getElementById(`${id}-${next}`)?.focus();
              }}
              className={l === language ? 'active' : ''}
            >
              {l}
            </button>
          ))}
        </div>
        <button className="icon-button" onClick={copy} aria-label={t('Copy complete example')}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <pre role="tabpanel" id={`${id}-code`} aria-labelledby={`${id}-${language}`} tabIndex={0}>
        <code
          className={`hljs language-${language.toLowerCase()}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
      {copyError && (
        <p className="form-error" role="status">
          <Text> Select the code to copy it manually. </Text>
        </p>
      )}
    </div>
  );
}
