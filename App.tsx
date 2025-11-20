
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JsonViewer } from './components/JsonViewer';
import { CodeEditor } from './components/CodeEditor';
import { JsonValue, JsonSourceMap } from './types';
import { tryParseJSONL, tryParseCSV } from './utils/parsers';
import { parseJsonWithSourceMap } from './utils/jsonParser';
import { AlertCircle, Eraser, Play, LayoutTemplate, FileJson, FileType, FileSpreadsheet, Moon, Sun, Monitor, Check, ChevronsDown, ChevronsUp, Paperclip, Loader2, Upload, Box, PanelLeftOpen, PanelRightOpen, WrapText } from 'lucide-react';

const DEFAULT_DATA = `{
  "product": "Tesseract",
  "tagline": "See into the structure.",
  "version": "3.2.0",
  "welcome_message": "# 🧊 Welcome to Tesseract\\n\\nTesseract is a high-performance **multi-dimensional data viewer**.\\n\\nIt uses an **Infinite Canvas** layout to visualize massive datasets without nested scrollbars.",
  "capabilities": {
    "infinite_canvas": "Unified viewport that scrolls both horizontally and vertically.",
    "recursive_xray": "Automatically parses stringified JSON found within values.",
    "matrix_vision": "Arrays of objects are automatically transformed into sortable grids."
  },
  "math_demo": {
    "physics": "$$ E = mc^2 $$",
    "calculus": "$$ \\\\int_{a}^{b} f(x) \\\\,dx = F(b) - F(a) $$"
  },
  "nested_data_example": {
    "id": 101,
    "meta": "{\\"source\\": \\"legacy_db\\", \\"payload\\": \\"{\\\\\\"user\\\\\\": \\\\\\"admin\\\\\\", \\\\\\"flags\\\\\\": [1,0,1]}\\"}"
  },
  "large_dataset_preview": [
    { "id": 1, "name": "Alpha", "status": "active", "metrics": { "cpu": 45, "mem": 1024 } },
    { "id": 2, "name": "Beta", "status": "idle", "metrics": { "cpu": 12, "mem": 512 } },
    { "id": 3, "name": "Gamma", "status": "error", "metrics": { "cpu": 99, "mem": 2048 } }
  ]
}`;

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [input, setInput] = useState<string>(DEFAULT_DATA);
  const [parsedData, setParsedData] = useState<JsonValue | null>(null);
  const [sourceMap, setSourceMap] = useState<JsonSourceMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'JSON' | 'JSONL' | 'CSV'>('JSON');
  const [theme, setTheme] = useState<Theme>('system');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(false);
  
  // Bi-directional State
  const [activePath, setActivePath] = useState<string | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  // Expand/Collapse control tokens
  const [expandAllToken, setExpandAllToken] = useState(0);
  const [collapseAllToken, setCollapseAllToken] = useState(0);

  // Split Pane State
  const [splitRatio, setSplitRatio] = useState(0.33); 
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if(theme === 'system') applyTheme(); };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Initial load
  useEffect(() => {
    processInput(DEFAULT_DATA, 'JSON');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Parsing Logic ---

  const performParse = (text: string, forcedFormat?: 'JSON' | 'JSONL' | 'CSV') => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParsedData(null);
      setSourceMap(null);
      setError(null);
      return;
    }

    setExpandAllToken(0);
    setCollapseAllToken(0);

    // 1. Try JSON (with Source Map)
    if (!forcedFormat || forcedFormat === 'JSON') {
      try {
        // Use our custom parser
        const { data, sourceMap: map, error: parseErr } = parseJsonWithSourceMap(text);
        if (parseErr) {
            if (forcedFormat === 'JSON') throw new Error(parseErr);
            // Fallback to standard JSON.parse if our parser fails but maybe JSON.parse succeeds (edge cases)
             try {
                const fallback = JSON.parse(trimmed);
                setParsedData(fallback);
                setSourceMap(null); // No map available
                setFormat('JSON');
                setError(null);
                return;
             } catch(e) {
                 throw new Error(parseErr); // Throw the original error
             }
        }
        
        setParsedData(data);
        setSourceMap(map);
        setFormat('JSON');
        setError(null);
        return;
      } catch (e: any) { 
        if (forcedFormat === 'JSON') {
          setError(`Invalid JSON: ${e.message}`);
          setParsedData(null);
          setSourceMap(null);
          return;
        }
      }
    }

    // 2. Try JSONL
    if (!forcedFormat || forcedFormat === 'JSONL') {
      try {
        const jsonl = tryParseJSONL(trimmed);
        setParsedData(jsonl);
        setSourceMap(null); // TODO: Implement source map for JSONL
        setFormat('JSONL');
        setError(null);
        return;
      } catch (e) { 
        if (forcedFormat === 'JSONL') {
           setError("Invalid JSONL format.");
           setParsedData(null);
           return;
        }
      }
    }

    // 3. Try CSV
    if (!forcedFormat || forcedFormat === 'CSV') {
      try {
        const csv = tryParseCSV(trimmed);
        setParsedData(csv);
        setSourceMap(null); // TODO: Implement source map for CSV
        setFormat('CSV');
        setError(null);
        return;
      } catch (e) { 
         if (forcedFormat === 'CSV') {
           setError("Invalid CSV format.");
           setParsedData(null);
           return;
         }
      }
    }

    setError("Invalid format. Expected JSON, JSONL, or CSV.");
    setParsedData(null);
    setSourceMap(null);
  };

  const processInput = (text: string, forcedFormat?: 'JSON' | 'JSONL' | 'CSV') => {
    setIsLoading(true);
    setTimeout(() => {
        performParse(text, forcedFormat);
        setIsLoading(false);
    }, 50);
  };

  const handleManualParse = () => {
    if (fileName && input.startsWith('<<<')) return;
    processInput(input);
  };

  const handleFormat = () => {
    if (parsedData !== null) {
        const pretty = JSON.stringify(parsedData, null, 2);
        setInput(pretty);
        setFileName(null);
        setFormat('JSON');
        setError(null);
        // Re-parse to get new source map
        setTimeout(() => performParse(pretty, 'JSON'), 50);
    }
  };

  // --- Bi-directional Navigation Handlers ---

  // 1. Viewer -> Editor (User clicked a node in the tree)
  const handlePathSelect = useCallback((path: string) => {
      setActivePath(path);
      if (sourceMap) {
          const loc = sourceMap.get(path);
          if (loc) {
              setHighlightLine(loc.line);
          }
      }
  }, [sourceMap]);

  // 2. Editor -> Viewer (User moved cursor)
  const handleCursorMove = useCallback((cursorIndex: number) => {
      if (!sourceMap) return;
      
      // Find the deepest node that contains this cursor index
      // Since Map iteration order is insertion order (and we parsed top-down), 
      // deep nodes come *after* parent nodes in our parser logic usually? 
      // Actually our parser sets map after parsing children. So children come first?
      // Let's just iterate and find the best match.
      // Best match = Smallest range that contains cursorIndex.
      
      let bestPath: string | null = null;
      let minLen = Infinity;

      for (const [path, loc] of sourceMap.entries()) {
          if (cursorIndex >= loc.start && cursorIndex <= loc.end) {
              const len = loc.end - loc.start;
              if (len < minLen) {
                  minLen = len;
                  bestPath = path;
              }
          }
      }

      if (bestPath && bestPath !== activePath) {
          setActivePath(bestPath);
      }
  }, [sourceMap, activePath]);

  // --- Resizing Logic (unchanged) ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newRatio = (e.clientX - containerRect.left) / containerRect.width;
    if (newRatio < 0.05) setSplitRatio(0);
    else if (newRatio > 0.95) setSplitRatio(1);
    else setSplitRatio(Math.max(0.1, Math.min(0.9, newRatio)));
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, handleResize, stopResizing]);

  // --- File Upload (unchanged) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      /* ... Existing implementation ... */
      const file = e.target.files?.[0];
      if (!file) return;
      setIsLoading(true);
      setFileName(file.name);
      let detectedFormat: any = undefined;
      if (file.name.toLowerCase().endsWith('.csv')) detectedFormat = 'CSV';
      else if (file.name.toLowerCase().endsWith('.jsonl')) detectedFormat = 'JSONL';
      else if (file.name.toLowerCase().endsWith('.json')) detectedFormat = 'JSON';
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (file.size / (1024 * 1024) > 1) {
              setInput(`<<< File Loaded: ${file.name} ... >>>`);
          } else {
              setInput(content);
          }
          setTimeout(() => {
              performParse(content, detectedFormat);
              setIsLoading(false);
          }, 50);
      };
      reader.readAsText(file);
      e.target.value = '';
  };
  const triggerFileUpload = () => fileInputRef.current?.click();
  const handleExpandAll = () => setExpandAllToken(prev => prev + 1);
  const handleCollapseAll = () => setCollapseAllToken(prev => prev + 1);

  // --- Render ---

  const isLeftVisible = splitRatio > 0;
  const isRightVisible = splitRatio < 1;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv,.jsonl,.txt" onChange={handleFileUpload} />

      {/* Global Loading Overlay */}
      {isLoading && (
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex items-center justify-center backdrop-blur-[1px]">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 border border-gray-200 dark:border-gray-800">
                  <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                  <span className="text-sm font-medium">Processing data...</span>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shadow-sm z-20 h-16 shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-500/20">
                <Box size={20} />
            </div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">Tesseract</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            Multi-Dimensional Data Viewer
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
               {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
            </button>
            {isThemeMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsThemeMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                  {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); setIsThemeMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                        theme === t ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="w-4 flex justify-center">{theme === t && <Check size={14} />}</span>
                      <span className="capitalize">{t}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left: Input Area */}
        <div 
            className={`flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-inner transition-all duration-75 ease-linear ${!isLeftVisible ? 'hidden' : ''}`}
            style={{ width: window.innerWidth >= 768 ? `${splitRatio * 100}%` : '100%', height: window.innerWidth < 768 ? '50%' : 'auto' }}
        >
          <div className="flex items-center justify-between px-4 h-12 shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Input</span>
            </div>
            <div className="flex items-center gap-2">
                 {!isRightVisible && (
                    <button onClick={() => setSplitRatio(0.5)} className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 px-2 py-1 rounded">
                        <PanelRightOpen size={12} /> Show Output
                    </button>
                 )}
                 <button onClick={() => setWordWrap(!wordWrap)} className={`p-1.5 rounded transition-colors ${wordWrap ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`} title="Toggle Word Wrap"><WrapText size={16} /></button>
                 <button onClick={triggerFileUpload} className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded transition-colors" title="Upload"><Paperclip size={16} /></button>
                 <button onClick={() => { setInput(''); setFileName(null); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="Clear"><Eraser size={16} /></button>
                 <button onClick={handleFormat} disabled={!!fileName} className="text-xs px-3 py-1 border rounded font-medium shadow-sm hover:bg-gray-50">Prettify</button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            {fileName && input.startsWith('<<<') ? (
                 <div className="absolute inset-0 z-10 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <div className="text-center p-4">
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">File mode active</p>
                    </div>
                 </div>
            ) : (
                <CodeEditor 
                  value={input} 
                  onChange={(val) => { setInput(val); if (fileName) setFileName(null); }}
                  language={format}
                  wordWrap={wordWrap}
                  highlightLine={highlightLine}
                  onCursorMove={handleCursorMove}
                />
            )}
          </div>
           <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0 z-10">
            <button onClick={handleManualParse} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm shadow-md">
                <Play size={16} fill="currentColor" /> Visualize Data
            </button>
          </div>
        </div>

        {/* Resizer */}
        {isLeftVisible && isRightVisible && (
            <div className="hidden md:flex w-1 hover:w-2 group items-center justify-center cursor-col-resize bg-gray-200 dark:bg-gray-800 hover:bg-indigo-500 z-50 -ml-0.5 relative" onMouseDown={startResizing}>
                <div className="h-8 w-1 rounded-full bg-gray-300 group-hover:bg-white"></div>
            </div>
        )}

        {/* Right: Viewer Area */}
        <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 relative overflow-hidden h-1/2 md:h-full border-t md:border-t-0 border-gray-200 dark:border-gray-800 ${!isRightVisible ? 'hidden' : ''}`}>
           <div className="flex justify-between items-center px-4 h-12 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                   {!isLeftVisible && <button onClick={() => setSplitRatio(0.33)} className="p-1 rounded hover:bg-gray-100 text-indigo-600"><PanelLeftOpen size={16} /></button>}
                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visual Output</span>
                   <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                        <button onClick={handleExpandAll} className="p-0.5 rounded hover:bg-white text-gray-500"><ChevronsDown size={14} /></button>
                        <div className="w-px h-3 bg-gray-300 mx-1"></div>
                        <button onClick={handleCollapseAll} className="p-0.5 rounded hover:bg-white text-gray-500"><ChevronsUp size={14} /></button>
                   </div>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Bi-directional Sync Active</span>
           </div>
          
          <div className="flex-1 overflow-auto p-4 bg-gray-50/50 dark:bg-gray-950 custom-scrollbar">
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-rose-500">
                <AlertCircle size={32} className="opacity-80 mb-4" />
                <h3 className="text-lg font-semibold mb-1">Parsing Failed</h3>
                <p className="text-sm opacity-80 max-w-md text-center">{error}</p>
              </div>
            ) : parsedData !== null ? (
              <JsonViewer 
                  data={parsedData} 
                  expandAllToken={expandAllToken} 
                  collapseAllToken={collapseAllToken}
                  sourceMap={sourceMap}
                  activePath={activePath}
                  onPathSelect={handlePathSelect}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <LayoutTemplate size={48} className="opacity-30 mb-4" />
                <p className="font-medium">Waiting for data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
