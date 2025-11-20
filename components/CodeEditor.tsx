
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
    setHtmlContent(highlightSyntax(value, language));
  }, [value, language]);

  // Generate Line Numbers
  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Shared styles for perfect alignment
  const fontStyle = "font-mono text-sm leading-6"; // 24px line height
  const paddingStyle = "pt-4 pb-4"; // 16px vertical padding

  return (
    <div className="relative flex h-full w-full bg-white dark:bg-gray-900 overflow-hidden">
      
      {/* Gutter (Line Numbers) */}
      <div 
        ref={gutterRef}
        className={`shrink-0 w-12 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-800 text-right select-none overflow-hidden text-gray-400 dark:text-gray-600 ${paddingStyle} pr-3`}
      >
        {lineNumbers.map((n) => (
            <div key={n} className={fontStyle}>{n}</div>
        ))}
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 overflow-hidden h-full">
        
        {/* Backdrop: Syntax Highlighting */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className={`absolute inset-0 pl-4 pr-4 m-0 pointer-events-none overflow-hidden whitespace-pre ${paddingStyle} ${fontStyle} ${wordWrap ? 'whitespace-pre-wrap' : ''}`}
          dangerouslySetInnerHTML={{ __html: htmlContent + '<br />' }}
        />

        {/* Foreground: Transparent Textarea for Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          className={`absolute inset-0 w-full h-full pl-4 pr-4 m-0 bg-transparent text-transparent caret-indigo-600 dark:caret-indigo-400 resize-none focus:outline-none z-10 whitespace-pre ${paddingStyle} ${fontStyle} ${wordWrap ? 'whitespace-pre-wrap' : ''}`}
        />
      </div>
    </div>
  );
};
