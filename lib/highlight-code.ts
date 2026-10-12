import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';

const highlighter = hljs.newInstance();
highlighter.registerLanguage('python', python);
highlighter.registerLanguage('javascript', javascript);

export function highlightCode(source: string, language: 'Python' | 'JavaScript') {
  return highlighter.highlight(source, { language: language.toLowerCase() }).value;
}
