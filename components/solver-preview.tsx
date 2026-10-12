'use client';
import { useState } from 'react';
import { Check, ArrowRight, RotateCcw } from 'lucide-react';

export function SolverPreview() {
  const [solved, setSolved] = useState(false);
  return (
    <div className={`solver-preview ${solved ? 'is-solved' : ''}`} lang="en">
      <div className="preview-label">
        <span className="preview-dot" />
        <span>API PREVIEW</span>
        <span>01 / hCaptcha</span>
      </div>
      <button
        type="button"
        className="preview-challenge button"
        onClick={() => setSolved(!solved)}
        aria-label={solved ? 'Replay the API preview' : 'Try the API preview'}
        aria-pressed={solved}
      >
        <span className="preview-checkbox">{solved && <Check size={20} strokeWidth={2} />}</span>
        <span className="preview-challenge-text">
          {solved ? 'Challenge, solved.' : 'A challenge. A clear path.'}
        </span>
        <img src="/images/hcaptcha.svg" width="34" height="34" alt="hCaptcha" />
      </button>
      <div className="preview-result" aria-live="polite">
        <code>
          <span>{solved ? 'status' : 'type'}</span>: "{solved ? 'ready' : 'HCaptchaTaskProxyless'}"
        </code>
        <span>
          {solved ? (
            <>
              <span>Replay</span>
              <RotateCcw size={13} />
            </>
          ) : (
            <>
              <span>Try it</span>
              <ArrowRight size={14} />
            </>
          )}
        </span>
      </div>
      <span className="sr-only">Illustrative preview. No real task is submitted.</span>
    </div>
  );
}
