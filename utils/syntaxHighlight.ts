import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-csv';

// Helper to escape HTML if Prism fails or for fallback
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const highlightSyntax = (code: string, format: 'JSON' | 'JSONL' | 'CSV'): string => {
    if (!code) return '';
    
    try {
        if (format === 'JSON' || format === 'JSONL') {
            // JSONL is just JSON line by line, but Prism's JSON grammar handles it reasonably well
            // or we can treat it as just text if it fails, but usually JSON grammar is fine.
            // Actually, for JSONL, strictly speaking, it's multiple JSON objects. 
            // Prism JSON might fail on multiple root objects if it expects a single root.
            // But usually it just highlights tokens. Let's try 'json'.
            return Prism.highlight(code, Prism.languages.json, 'json');
        }
        if (format === 'CSV') {
            return Prism.highlight(code, Prism.languages.csv, 'csv');
        }
    } catch (e) {
        console.warn('Syntax highlighting failed:', e);
        return escapeHtml(code);
    }
    return escapeHtml(code);
};
