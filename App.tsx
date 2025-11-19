import React, { useState, useEffect, useRef } from 'react';
import { JsonViewer } from './components/JsonViewer';
import { JsonValue } from './types';
import { tryParseJSONL, tryParseCSV } from './utils/parsers';
import { AlertCircle, Eraser, Play, LayoutTemplate, FileJson, FileType, FileSpreadsheet, Moon, Sun, Monitor, Check, ChevronsDown, ChevronsUp, Paperclip, Loader2, Upload, Box } from 'lucide-react';

const DEFAULT_DATA = `{
  "product": "Tesseract",
  "tagline": "See into the structure.",
  "version": "3.1.0",
  "welcome_message": "# 🧊 Welcome to Tesseract\\n\\nTesseract is a high-performance **multi-dimensional data viewer**.\\n\\nIt is designed to visualize massive datasets and reveal hidden structures within standard formats like JSON, JSONL, and CSV.",
  "capabilities": {
    "infinite_scrolling": "Capable of rendering 100MB+ files via efficient DOM virtualization.",
    "recursive_xray": "Automatically parses stringified JSON found within values (nested strings).",
    "matrix_vision": "Arrays of objects are automatically transformed into sortable, readable grids."
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
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'JSON' | 'JSONL' | 'CSV'>('JSON');
  const [theme, setTheme] = useState<Theme>('system');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Expand/Collapse control tokens
  const [expandAllToken, setExpandAllToken] = useState(0);
  const [collapseAllToken, setCollapseAllToken] = useState(0);

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

  const performParse = (text: string, forcedFormat?: 'JSON' | 'JSONL' | 'CSV') => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParsedData(null);
      setError(null);
      return;
    }

    // Reset view tokens
    setExpandAllToken(0);
    setCollapseAllToken(0);

    // 1. Try JSON
    if (!forcedFormat || forcedFormat === 'JSON') {
      try {
        const json = JSON.parse(trimmed);
        setParsedData(json);
        setFormat('JSON');
        setError(null);
        return;
      } catch (e) { 
        if (forcedFormat === 'JSON') {
          setError("Invalid JSON format.");
          setParsedData(null);
          return;
        }
      }
    }

    // 2. Try JSONL
    if (!forcedFormat || forcedFormat === 'JSONL') {
      try {
        const jsonl = tryParseJSONL(trimmed);
        setParsedData(jsonl);
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
  };

  const processInput = (text: string, forcedFormat?: 'JSON' | 'JSONL' | 'CSV') => {
    setIsLoading(true);
    // Use setTimeout to allow UI to render the loading spinner before the heavy sync parse operation
    setTimeout(() => {
        performParse(text, forcedFormat);
        setIsLoading(false);
    }, 50);
  };

  const handleManualParse = () => {
    // If we have a filename but input is just the placeholder, we don't re-parse the placeholder
    if (fileName && input.startsWith('<<<')) {
       // User clicked "Generate" but essentially data is already there.
       // We could offer to clear, but for now let's just do nothing or re-trigger parse if they changed data.
       return;
    }
    processInput(input);
  };

  const handleFormat = () => {
    if (parsedData !== null) {
        const pretty = JSON.stringify(parsedData, null, 2);
        setInput(pretty);
        setFileName(null); // Clear filename as we are now in "raw text" mode
        setFormat('JSON');
        setError(null);
    }
  };
  
  const handleExpandAll = () => setExpandAllToken(prev => prev + 1);
  const handleCollapseAll = () => setCollapseAllToken(prev => prev + 1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    
    // Determine format from extension
    let detectedFormat: 'JSON' | 'JSONL' | 'CSV' | undefined = undefined;
    if (file.name.toLowerCase().endsWith('.csv')) detectedFormat = 'CSV';
    else if (file.name.toLowerCase().endsWith('.jsonl')) detectedFormat = 'JSONL';
    else if (file.name.toLowerCase().endsWith('.json')) detectedFormat = 'JSON';

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        
        // Optimization: For large files, DO NOT put content into the textarea
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 1) {
            setInput(`<<< File Loaded: ${file.name} (${fileSizeMB.toFixed(2)} MB) >>>\n\nRaw content is hidden to improve performance.\nYou can view the parsed data on the right.`);
        } else {
            setInput(content);
        }

        // Process in next tick
        setTimeout(() => {
            performParse(content, detectedFormat);
            setIsLoading(false);
        }, 50);
    };
    
    reader.onerror = () => {
        setError("Failed to read file");
        setIsLoading(false);
    };

    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const getFormatBadge = () => {
    switch(format) {
        case 'CSV':
            return (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-200 dark:border-emerald-800">
                    <FileSpreadsheet size={12} /> CSV
                </span>
            );
        case 'JSONL':
            return (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wide border border-purple-200 dark:border-purple-800">
                    <FileType size={12} /> JSONL
                </span>
            );
        default:
            return (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wide border border-blue-200 dark:border-blue-800">
                    <FileJson size={12} /> JSON
                </span>
            );
    }
  };

  const ThemeIcon = () => {
    switch(theme) {
      case 'dark': return <Moon size={18} />;
      case 'light': return <Sun size={18} />;
      default: return <Monitor size={18} />;
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json,.csv,.jsonl,.txt" 
        onChange={handleFileUpload}
      />

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
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shadow-sm z-20">
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
              title="Switch Theme"
            >
               <ThemeIcon />
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
                        theme === t 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="w-4 flex justify-center">
                         {theme === t && <Check size={14} />}
                      </span>
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
      <main className="flex-1 flex overflow-hidden flex-col md:flex-row">
        
        {/* Left: Input Area */}
        <div className="w-full md:w-1/3 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 h-1/2 md:h-full shadow-inner">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Input</span>
                {fileName ? (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[150px]" title={fileName}>
                        {fileName}
                    </span>
                ) : (
                    parsedData && !error && getFormatBadge()
                )}
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={triggerFileUpload}
                    className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                    title="Upload File"
                >
                    <Paperclip size={16} />
                </button>
                 <button 
                    onClick={() => { setInput(''); setFileName(null); }}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors"
                    title="Clear"
                >
                    <Eraser size={16} />
                </button>
                <button 
                    onClick={handleFormat}
                    disabled={!!fileName} // Disable prettify for large files mode
                    className={`text-xs px-3 py-1 border rounded font-medium shadow-sm transition-colors ${
                        fileName 
                        ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:border-gray-800 dark:text-gray-600 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title={fileName ? "Prettify disabled for large files" : "Convert to Pretty JSON"}
                >
                    Prettify
                </button>
            </div>
          </div>
          <div className="relative flex-1">
            {fileName && input.startsWith('<<<') && (
                 <div className="absolute inset-0 z-10 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-4">
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <p className="text-sm text-gray-500">File mode active</p>
                    </div>
                 </div>
            )}
            <textarea
                className="absolute inset-0 w-full h-full p-4 font-mono text-xs sm:text-sm resize-none focus:outline-none bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 leading-relaxed"
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    if (fileName) setFileName(null); // Clear filename if user types manually
                }}
                placeholder='Paste JSON, JSONL, or CSV here...'
                spellCheck={false}
            />
          </div>
           <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <button
                onClick={handleManualParse}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
            >
                <Play size={16} fill="currentColor" />
                Visualize Data
            </button>
          </div>
        </div>

        {/* Right: Viewer Area */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 relative overflow-hidden h-1/2 md:h-full border-t md:border-t-0 border-gray-200 dark:border-gray-800">
           <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">Visual Output</span>
                   <button 
                    onClick={handleExpandAll}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                    title="Expand All"
                   >
                    <ChevronsDown size={16} />
                   </button>
                   <button 
                    onClick={handleCollapseAll}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                    title="Collapse All"
                   >
                    <ChevronsUp size={16} />
                   </button>
                </div>
           </div>
          
          <div className="flex-1 overflow-auto p-6 bg-gray-50/50 dark:bg-gray-950">
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-rose-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-full mb-4">
                    <AlertCircle size={32} className="opacity-80" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Parsing Failed</h3>
                <p className="text-sm opacity-80 text-center max-w-md break-words px-4 py-2 rounded border border-rose-100 dark:border-rose-800/50 bg-white dark:bg-gray-900 shadow-sm text-rose-600 dark:text-rose-400">
                    {error}
                </p>
              </div>
            ) : parsedData !== null ? (
              <div className="animate-in fade-in zoom-in-95 duration-300 origin-top-left">
                <JsonViewer 
                  data={parsedData} 
                  expandAllToken={expandAllToken} 
                  collapseAllToken={collapseAllToken}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-4">
                    <LayoutTemplate size={48} className="opacity-30" />
                </div>
                <p className="font-medium text-gray-500 dark:text-gray-500">Waiting for data...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;