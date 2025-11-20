
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { highlightSyntax } from '../utils/syntaxHighlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'JSON' | 'JSONL' | 'CSV';
  wordWrap: boolean;
  readOnly?: boolean;
  highlightLine?: number | null; // 1-based line number to highlight/scroll to
  onCursorMove?: (cursorOffset: number) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language, 
  wordWrap,
  readOnly = false,
  highlightLine,
  onCursorMove
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // Constants matching the CSS classes
  const LINE_HEIGHT = 24; // leading-6 = 1.5rem = 24px

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

  const handleCursor = useCallback(() => {
      if (textareaRef.current && onCursorMove) {
          onCursorMove(textareaRef.current.selectionStart);
      }
  }, [onCursorMove]);

  // Update highlighting when value changes
  useEffect(() => {
    setHtmlContent(highlightSyntax(value, language));
  }, [value, language]);

  // Scroll to highlighted line
  useEffect(() => {
      if (highlightLine && textareaRef.current) {
          // Calculate pixel position
          const targetTop = (highlightLine - 1) * LINE_HEIGHT;
          
          // Smooth scroll or instant? Instant is better for sync
          textareaRef.current.scrollTo({
              top: Math.max(0, targetTop - 100), // Offset slightly so it's not at the very top
              behavior: 'smooth'
          });
      }
  }, [highlightLine]);

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
            <div 
                key={n} 
                className={`${fontStyle} transition-colors duration-300 ${highlightLine === n ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 -mr-3 pr-3' : ''}`}
            >
                {n}
            </div>
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
          onClick={handleCursor}
          onKeyUp={handleCursor}
          readOnly={readOnly}
          spellCheck={false}
          className={`absolute inset-0 w-full h-full pl-4 pr-4 m-0 bg-transparent text-transparent caret-indigo-600 dark:caret-indigo-400 resize-none focus:outline-none z-10 whitespace-pre ${paddingStyle} ${fontStyle} ${wordWrap ? 'whitespace-pre-wrap' : ''}`}
        />
      </div>
    </div>
  );
};
