import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';

const highlighter = hljs.newInstance();
function withFunctionCalls(definition: LanguageFn): LanguageFn {
  return (api) => {
    const language = definition(api);
    return {
      ...language,
      contains: [
        { scope: 'title.function', match: /\b(?!(?:if|for|while|switch|catch|with|def|class|function|return|typeof|delete|void|new)\b)[A-Za-z_$][\w$]*(?=\s*\()/, relevance: 0 },
        ...(language.contains ?? []),
      ],
    };
  };
}
highlighter.registerLanguage('python', withFunctionCalls(python));
highlighter.registerLanguage('javascript', withFunctionCalls(javascript));

export function highlightCode(source: string, language: 'Python' | 'JavaScript') {
  return highlighter.highlight(source, { language: language.toLowerCase() }).value;
}
