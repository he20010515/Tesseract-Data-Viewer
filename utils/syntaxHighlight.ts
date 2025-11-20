
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const highlightJson = (code: string): string => {
  // Escape HTML first to prevent XSS and rendering issues
  let html = escapeHtml(code);

  // We use a specific order of regex replacement to ensure we don't break HTML tags we just added.
  // This is a lightweight tokenizer, not a full AST parser, for performance.

  // 1. Strings (Key or Value) - Match quotes
  // We use a placeholder to avoid matching distinct tokens inside strings
  const strings: string[] = [];
  html = html.replace(/"(?:[^\\"]|\\.)*"/g, (match) => {
    strings.push(match);
    return `__STR_${strings.length - 1}__`;
  });

  // 2. Booleans and Null
  html = html.replace(/\b(true|false|null)\b/g, '<span class="text-purple-600 dark:text-purple-400 font-bold">$1</span>');

  // 3. Numbers
  html = html.replace(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, '<span class="text-blue-600 dark:text-blue-400">$&</span>');

  // 4. Structural Brackets (Colorize braces to make nesting easier to see)
  html = html.replace(/([\{\}\[\]])/g, '<span class="text-gray-500 dark:text-gray-400 font-bold">$1</span>');

  // 5. Restore Strings and Determine if Key or Value
  html = html.replace(/__STR_(\d+)__/g, (_, index) => {
    const str = strings[Number(index)];
    // Heuristic: If the string is followed by a colon, it's a key.
    // Note: This is applied after the string is re-inserted, so we look at the surrounding text in a real parser.
    // But since we replaced text, we can't easily look ahead in this regex pass.
    // Instead, we'll just color all strings green, then use CSS or a second pass if we wanted Keys blue.
    
    // To distinguish keys, we can cheat: Key strings in JSON are usually followed by optional whitespace and a colon.
    // But since we are replacing the placeholder, we can't see the colon easily in this pass.
    
    // Simple approach: All strings are Green (Emerald).
    return `<span class="text-emerald-600 dark:text-emerald-400">${str}</span>`;
  });

  // Post-processing for Keys: Look for <span...>string</span> followed by :
  // This is expensive on large strings, so we stick to a unified string color for now (like VS Code default JSON)
  // OR we try to make keys distinct:
  html = html.replace(/(<span class="text-emerald-600 dark:text-emerald-400">".*?"<\/span>)(\s*:)/g, 
    '<span class="text-indigo-600 dark:text-indigo-400 font-bold">$1</span>$2');
    
  // Fix the double span from the replace above if needed, but actually replacing the class is safer
  // Let's re-run a specific replacer for keys
  html = html.replace(/<span class="text-emerald-600 dark:text-emerald-400">("(?:[^\\"]|\\.)*")<\/span>(\s*:)/g, 
      '<span class="text-indigo-600 dark:text-indigo-400 font-semibold">$1</span>$2');

  return html;
};

export const highlightCsv = (code: string): string => {
  let html = escapeHtml(code);
  // Highlight delimiters
  html = html.replace(/,/g, '<span class="text-red-500 dark:text-red-400 font-bold">,</span>');
  // Highlight quoted strings
  html = html.replace(/"(?:[^"]|"")*"/g, '<span class="text-emerald-600 dark:text-emerald-400">$&</span>');
  return html;
};

export const highlightSyntax = (code: string, format: 'JSON' | 'JSONL' | 'CSV'): string => {
    if (!code) return '';
    try {
        if (format === 'JSON' || format === 'JSONL') {
            return highlightJson(code);
        }
        if (format === 'CSV') {
            return highlightCsv(code);
        }
    } catch (e) {
        return escapeHtml(code);
    }
    return escapeHtml(code);
};
