import React, { useState, useMemo } from 'react';
import { NodeProps } from '../../types';
import { DispatcherNode } from './DispatcherNode';
import { Braces, Quote, FileJson, FileText, Sigma } from 'lucide-react';
import { Marked } from 'marked';
import katex from 'katex';

// --- Markdown + Math Configuration ---

// Create a dedicated Marked instance to avoid global pollution
const marked = new Marked();

// Custom extension for Inline Math: $ E=mc^2 $
const inlineMathExtension = {
  name: 'inlineMath',
  level: 'inline' as const, // TypeScript hint
  start(src: string) { return src.indexOf('$'); },
  tokenizer(src: string) {
    // Regex: Starts with $, captures content until next $, no newlines allowed inside
    const match = /^\$([^$\n]+?)\$/.exec(src);
    if (match) {
      return {
        type: 'inlineMath',
        raw: match[0],
        text: match[1].trim(),
      };
    }
    return undefined;
  },
  renderer(token: any) {
    try {
      return katex.renderToString(token.text, {
        displayMode: false,
        throwOnError: false
      });
    } catch (e) {
      return token.text;
    }
  }
};

// Custom extension for Block Math: $$ E=mc^2 $$
const blockMathExtension = {
  name: 'blockMath',
  level: 'block' as const,
  start(src: string) { return src.indexOf('$$'); },
  tokenizer(src: string) {
    // Regex: Starts with $$, captures content until next $$, allows newlines
    const match = /^\$\$([\s\S]+?)\$\$/.exec(src);
    if (match) {
      return {
        type: 'blockMath',
        raw: match[0],
        text: match[1].trim(),
      };
    }
    return undefined;
  },
  renderer(token: any) {
    try {
      return katex.renderToString(token.text, {
        displayMode: true,
        throwOnError: false
      });
    } catch (e) {
      return token.text;
    }
  }
};

// Register extensions
marked.use({ extensions: [blockMathExtension, inlineMathExtension] });

interface DetectedContent {
  type: 'json' | 'markdown';
  content: any;
  hasMath?: boolean;
}

export const PrimitiveNode: React.FC<NodeProps> = ({ data, depth = 0 }) => {
  const [isParsedView, setIsParsedView] = useState(true);

  const detected: DetectedContent | null = useMemo(() => {
    if (typeof data !== 'string') return null;
    
    const trimmed = data.trim();
    if (!trimmed) return null;

    // 1. Try JSON Parse
    if (
      trimmed.startsWith('{') || 
      trimmed.startsWith('[') || 
      trimmed.startsWith('"')
    ) {
      try {
        const result = JSON.parse(data);
        
        if (typeof result === 'object' && result !== null) {
          return { type: 'json', content: result };
        }

        if (typeof result === 'string') {
            const innerTrim = result.trim();
            if (innerTrim.startsWith('{') || innerTrim.startsWith('[')) {
                return { type: 'json', content: result };
            }
        }
      } catch (e) {
        // Fall through
      }
    }

    // 2. Try Markdown / Math Heuristic
    const sampleSize = 2000;
    const sample = data.length > sampleSize ? data.slice(0, sampleSize) : data;
    
    // Check for Markdown syntax OR Math delimiters ($ or $$)
    const markdownRegex = /(^#+\s|^[-*+]\s|^>\s|^\s*```|\[.+\]\(.+\)|\*\*.+\*\*|\$[^$]+\$)/m;
    
    if (markdownRegex.test(sample)) {
       try {
         const html = marked.parse(data) as string;
         // Simple check if we actually rendered any katex (class="katex")
         const hasMath = html.includes('class="katex"');
         return { type: 'markdown', content: html, hasMath };
       } catch (e) {
         return null;
       }
    }

    return null;
  }, [data]);

  if (data === null) {
    return <span className="text-gray-400 dark:text-gray-500 italic text-xs">null</span>;
  }

  if (typeof data === 'string') {
    if (detected) {
       const isJson = detected.type === 'json';
       const isMarkdown = detected.type === 'markdown';
       const hasMath = detected.hasMath;

       return (
         <div className="inline-block align-top max-w-full my-0.5 w-full">
            <div className="flex items-center gap-2 mb-1">
               <button
                  onClick={(e) => {
                      e.stopPropagation();
                      setIsParsedView(!isParsedView);
                  }}
                  className={`
                    flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors select-none
                    ${isParsedView 
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                    }
                  `}
                  title={isParsedView ? "View Raw" : `View ${isJson ? 'JSON' : 'Markdown'}`}
               >
                  {isParsedView ? (
                      isJson ? <FileJson size={10} /> : (hasMath ? <Sigma size={10} /> : <FileText size={10} />)
                  ) : (
                      <Quote size={10} />
                  )}
                  <span>
                    {isParsedView 
                        ? (isJson ? (typeof detected.content === 'string' ? 'Unescaped' : 'JSON') : (hasMath ? 'Markdown + Math' : 'Markdown')) 
                        : 'Raw'}
                  </span>
               </button>
            </div>

            {isParsedView ? (
                isJson ? (
                    <div className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-2 py-1 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-r">
                        <DispatcherNode data={detected.content} depth={depth + 1} />
                    </div>
                ) : (
                    <div 
                        className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: detected.content }}
                    />
                )
            ) : (
                <span className="text-emerald-600 dark:text-emerald-400 break-words whitespace-pre-wrap font-mono text-xs block max-w-xl overflow-x-auto border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-1.5 rounded">
                    "{data}"
                </span>
            )}
         </div>
       );
    }

    return <span className="text-emerald-600 dark:text-emerald-400 break-words whitespace-pre-wrap">"{data}"</span>;
  }

  switch (typeof data) {
    case 'number':
      return <span className="text-blue-600 dark:text-blue-400 font-semibold">{data}</span>;
    case 'boolean':
      return <span className="text-purple-600 dark:text-purple-400 font-bold">{data ? 'true' : 'false'}</span>;
    default:
      return <span className="text-gray-700 dark:text-gray-300">{String(data)}</span>;
  }
};