
import React, { useState, useRef, useEffect } from 'react';
import { highlightSyntax } from '../utils/syntaxHighlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'JSON' | 'JSONL' | 'CSV';
  wordWrap: boolean;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language, 
  wordWrap,
  readOnly = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // Sync scrolling
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  // Update highlighting when value changes
  useEffect(() => {
    // Debounce for very large typing updates if needed, 
    // but for reasonable file sizes (<1MB) this is instant.
    setHtmlContent(highlightSyntax(value, language));
  }, [value, language]);

  // Generate Line Numbers
  const lineCount = value.split('\n').length;
  // For massive files, we might cap line numbers, but typical usage is handled by <1MB limit
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="relative flex h-full w-full bg-white dark:bg-gray-900 font-mono text-xs sm:text-sm leading-relaxed overflow-hidden">
      
      {/* Gutter (Line Numbers) */}
      <div 
        ref={gutterRef}
        className="shrink-0 w-10 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-800 text-right select-none overflow-hidden text-gray-400 dark:text-gray-600 py-4 pr-2"
      >
        {lineNumbers.map((n) => (
            <div key={n} className="h-[1.625rem]">{n}</div> /* 1.625rem matches leading-relaxed (1.625) approx or needs strict sync */
        ))}
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 overflow-hidden h-full">
        
        {/* Backdrop: Syntax Highlighting */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className={`absolute inset-0 p-4 m-0 pointer-events-none overflow-hidden whitespace-pre ${wordWrap ? 'whitespace-pre-wrap' : ''}`}
          style={{ fontFamily: 'monospace' }} // Ensure exact match
          dangerouslySetInnerHTML={{ __html: htmlContent + '<br />' }} // Extra break to match textarea behavior
        />

        {/* Foreground: Transparent Textarea for Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          className={`absolute inset-0 w-full h-full p-4 m-0 bg-transparent text-transparent caret-indigo-600 dark:caret-indigo-400 resize-none focus:outline-none z-10 whitespace-pre ${wordWrap ? 'whitespace-pre-wrap' : ''}`}
          style={{ fontFamily: 'monospace' }} // Ensure exact match
        />
      </div>
    </div>
  );
};
