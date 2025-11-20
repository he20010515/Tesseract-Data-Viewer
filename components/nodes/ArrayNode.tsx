import React, { useState, useMemo, useContext, useEffect } from 'react';
import { NodeProps, JsonValue, JsonObject } from '../../types';
import { DispatcherNode } from './DispatcherNode';
import { ChevronDown, ScanSearch, X, Minimize2, Maximize2 } from 'lucide-react';
import { ViewerContext } from '../ViewerContext';
import { createPortal } from 'react-dom';
import { PaginationControl } from '../PaginationControl';

const DEFAULT_PAGE_SIZE = 50;

// Width modes: compact (narrow), medium (default), wide (extra space)
type WidthMode = 'compact' | 'medium' | 'wide';
const WIDTH_CLASSES: Record<WidthMode, string> = {
  compact: 'w-24 min-w-[6rem]',
  medium: 'w-60 min-w-[15rem]',
  wide: 'w-96 min-w-[24rem]'
};

interface ColumnDef {
  key: string;
  type: 'simple' | 'group';
  subColumns?: string[]; // For groups
}

// Helper Component for the width toggle button
const LayoutTemplateIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
     <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

export const ArrayNode: React.FC<NodeProps> = ({ data, isRoot, depth = 0 }) => {
  const [expanded, setExpanded] = useState<boolean>(!!isRoot || depth < 1);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Column Width State
  const [colWidths, setColWidths] = useState<Record<string, WidthMode>>({});

  // Inspection Modal State
  const [inspectingCell, setInspectingCell] = useState<{ data: JsonValue; name: string } | null>(null);

  const { expandAllToken, collapseAllToken } = useContext(ViewerContext);

  useEffect(() => {
    if (expandAllToken > 0) setExpanded(true);
  }, [expandAllToken]);

  useEffect(() => {
    if (collapseAllToken > 0) setExpanded(false);
  }, [collapseAllToken]);

  // Reset page when data length changes significantly (new file loaded)
  useEffect(() => {
    setPage(1);
  }, [data]);

  const arrayData = data as JsonValue[];
  const length = arrayData.length;
  const isEmpty = length === 0;

  const totalPages = Math.ceil(length / pageSize);

  // Derive Visible Data
  const visibleData = useMemo(() => {
      const start = (page - 1) * pageSize;
      return arrayData.slice(start, start + pageSize);
  }, [arrayData, page, pageSize]);

  // Intelligent Column Detection (Scans only the VISIBLE PAGE for performance)
  const { isArrayOfObjects, columnDefs } = useMemo(() => {
    const currentData = visibleData;
    if (currentData.length === 0) return { isArrayOfObjects: false, columnDefs: [] };
    
    // 1. Basic Check: Is this mostly an array of objects?
    // We scan the current page. If the current page is all primitives, we render list view.
    let objectCount = 0;
    for(let i=0; i<currentData.length; i++) {
        const item = currentData[i];
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            objectCount++;
        }
    }
    
    // If less than 80% of the current page are objects, render as simple list
    if (objectCount / currentData.length < 0.8) return { isArrayOfObjects: false, columnDefs: [] };

    // 2. Deep Scan for Keys & Statistics
    const allKeys = new Set<string>();
    
    // Track stats to decide grouping
    interface KeyStats {
        appearanceCount: number;
        objectCount: number;
        subKeyFreqs: Map<string, number>;
    }
    const keyStats = new Map<string, KeyStats>();

    for (let i = 0; i < currentData.length; i++) {
      const item = currentData[i];
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      
      const objItem = item as JsonObject;

      Object.keys(objItem).forEach((k) => {
        allKeys.add(k);
        const val = objItem[k];
        
        if (!keyStats.has(k)) {
            keyStats.set(k, { appearanceCount: 0, objectCount: 0, subKeyFreqs: new Map() });
        }
        const stats = keyStats.get(k)!;
        stats.appearanceCount++;

        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            stats.objectCount++;
            Object.keys(val).forEach(subKey => {
                stats.subKeyFreqs.set(subKey, (stats.subKeyFreqs.get(subKey) || 0) + 1);
            });
        }
      });
    }

    const sortedKeys = Array.from(allKeys).sort();
    const defs: ColumnDef[] = [];

    sortedKeys.forEach(key => {
        const stats = keyStats.get(key);
        let type: 'simple' | 'group' = 'simple';
        let subColumns: string[] = [];

        if (stats && stats.objectCount > 0) {
            const isConsistentlyObject = (stats.objectCount / stats.appearanceCount) > 0.85;

            if (isConsistentlyObject) {
                const distinctSubKeys = Array.from(stats.subKeyFreqs.keys());
                const distinctCount = distinctSubKeys.length;
                
                if (distinctCount > 0 && distinctCount <= 7) {
                    const totalSlots = distinctCount * stats.objectCount;
                    const filledSlots = Array.from(stats.subKeyFreqs.values()).reduce((a, b) => a + b, 0);
                    const density = totalSlots > 0 ? filledSlots / totalSlots : 0;

                    if (distinctCount <= 2 || density > 0.40) {
                        type = 'group';
                        subColumns = distinctSubKeys.sort();
                    }
                }
            }
        }

        defs.push({ key, type, subColumns });
    });
    
    return { isArrayOfObjects: true, columnDefs: defs };
  }, [visibleData]); // Re-calculate when page changes

  // --- Helpers ---

  const toggleColWidth = (key: string) => {
    setColWidths(prev => {
        const current = prev[key] || 'medium';
        const next: WidthMode = current === 'compact' ? 'medium' : current === 'medium' ? 'wide' : 'compact';
        return { ...prev, [key]: next };
    });
  };

  const getWidthClass = (key: string) => WIDTH_CLASSES[colWidths[key] || 'medium'];
  
  const getWidthIcon = (key: string) => {
      const mode = colWidths[key] || 'medium';
      if (mode === 'compact') return <Minimize2 size={10} />;
      if (mode === 'wide') return <Maximize2 size={10} />;
      return <LayoutTemplateIcon size={10} />;
  };

  const openInspectModal = (e: React.MouseEvent, cellData: JsonValue, cellName: string) => {
      e.stopPropagation();
      setInspectingCell({ data: cellData, name: cellName });
  };
  
  const handlePageChange = (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handlePageSizeChange = (newSize: number) => {
      setPageSize(newSize);
      setPage(1); // Reset to page 1 on size change to avoid out of bounds
  };

  // --- Render ---

  if (!expanded && !isRoot) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
      >
        <span className="font-bold text-xs mr-1">{'['}</span>
        <span className="text-xs opacity-80">{length} items</span>
        <span className="font-bold text-xs ml-1">{']'}</span>
      </button>
    );
  }

  if (isEmpty) {
      return <span className="text-gray-400 dark:text-gray-500 text-xs">[]</span>;
  }

  const indexOffset = (page - 1) * pageSize;

  // Matrix View
  if (isArrayOfObjects) {
    return (
      <div className="my-1 inline-flex flex-col items-start text-left max-w-full">
         {/* Modal Portal */}
         {inspectingCell && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                <div 
                    className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" 
                    onClick={() => setInspectingCell(null)} 
                />
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-full flex flex-col border border-gray-200 dark:border-gray-800 z-10 relative overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center gap-2">
                            <ScanSearch size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                                Inspecting: <span className="font-mono text-gray-500 dark:text-gray-400">{inspectingCell.name}</span>
                            </span>
                        </div>
                        <button 
                            onClick={() => setInspectingCell(null)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 overflow-auto custom-scrollbar bg-white dark:bg-gray-950 flex-1">
                         <DispatcherNode 
                            data={inspectingCell.data} 
                            isRoot={true} 
                            disableTruncation={true} 
                        />
                    </div>
                </div>
            </div>,
            document.body
         )}

         {!isRoot && (
            <div 
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center rounded-t border-t border-l border-r border-gray-200 dark:border-gray-700 select-none font-medium relative z-10 -mb-px"
                onClick={() => setExpanded(false)}
            >
                <ChevronDown size={10} className="mr-1 opacity-70" />
                <span>Table ({length})</span>
            </div>
         )}
        
        <div className={`border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900 inline-block max-w-full ${!isRoot ? 'rounded-b-sm rounded-tr-sm rounded-tl-none' : 'rounded-sm'}`}>
            
            {/* Pagination TOP */}
            <PaginationControl 
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                noun="rows"
            />

            <div className="overflow-x-auto custom-scrollbar">
            <table className="border-collapse text-sm relative table-fixed">
            <thead>
                <tr>
                    <th rowSpan={2} className="sticky left-0 z-20 border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12 bg-gray-50 dark:bg-gray-800 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                        #
                    </th>
                    {columnDefs.map((def) => (
                        <th
                            key={def.key}
                            colSpan={def.type === 'group' ? def.subColumns?.length : 1}
                            rowSpan={def.type === 'group' ? 1 : 2}
                            className={`border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 text-left text-xs font-bold uppercase tracking-wider overflow-hidden
                                ${def.type === 'group' 
                                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' 
                                    : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                                }
                                ${def.type === 'simple' ? getWidthClass(def.key) : ''}
                            `}
                        >
                            <div className="flex items-center justify-between gap-2 group/header">
                                <span className="truncate">{def.key}</span>
                                {def.type === 'simple' && (
                                    <button 
                                        onClick={() => toggleColWidth(def.key)}
                                        className="opacity-0 group-hover/header:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all text-gray-400 hover:text-gray-600"
                                        title="Cycle Width"
                                    >
                                        {getWidthIcon(def.key)}
                                    </button>
                                )}
                            </div>
                        </th>
                    ))}
                </tr>
                <tr>
                     {columnDefs.map((def) => {
                         if (def.type !== 'group' || !def.subColumns) return null;
                         return def.subColumns.map(subKey => {
                             const fullKey = `${def.key}.${subKey}`;
                             return (
                                <th 
                                    key={fullKey}
                                    className={`border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider overflow-hidden ${getWidthClass(fullKey)}`}
                                >
                                    <div className="flex items-center justify-between gap-2 group/header">
                                        <span className="truncate">{subKey}</span>
                                        <button 
                                            onClick={() => toggleColWidth(fullKey)}
                                            className="opacity-0 group-hover/header:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all text-gray-400 hover:text-gray-600"
                                            title="Cycle Width"
                                        >
                                            {getWidthIcon(fullKey)}
                                        </button>
                                    </div>
                                </th>
                             );
                         });
                     })}
                </tr>
            </thead>
            <tbody>
                {visibleData.map((item, i) => {
                const realIndex = indexOffset + i;
                const isObj = item && typeof item === 'object' && !Array.isArray(item);
                const rowObj = isObj ? (item as JsonObject) : null;

                return (
                    <tr key={realIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="sticky left-0 z-10 border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 text-center font-mono text-[10px] text-gray-400 dark:text-gray-600 align-top shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                        {realIndex}
                    </td>
                    {columnDefs.map((def) => {
                        if (def.type === 'simple') {
                             const hasKey = rowObj && rowObj.hasOwnProperty(def.key);
                             return (
                                <td key={def.key} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 align-top last:border-r-0 text-xs overflow-hidden relative group/cell">
                                    {hasKey ? (
                                        <>
                                            <DispatcherNode data={rowObj![def.key]} name={def.key} depth={depth + 1} />
                                            <button 
                                                onClick={(e) => openInspectModal(e, rowObj![def.key], def.key)}
                                                className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-1 rounded text-indigo-500 hover:text-indigo-600 hover:scale-110 transition-all z-10"
                                                title="Inspect Full Content"
                                            >
                                                <ScanSearch size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-gray-200 dark:text-gray-800 text-xs select-none">-</span>
                                    )}
                                </td>
                             );
                        } else {
                            // Grouped Column Rendering
                            const parentVal = rowObj ? rowObj[def.key] : undefined;
                            const isParentObj = parentVal && typeof parentVal === 'object' && !Array.isArray(parentVal);
                            const parentObj = isParentObj ? (parentVal as JsonObject) : null;

                            return def.subColumns?.map(subKey => (
                                <td key={`${def.key}-${subKey}`} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 align-top text-xs overflow-hidden relative group/cell">
                                    {(parentObj && parentObj.hasOwnProperty(subKey)) ? (
                                        <>
                                            <DispatcherNode data={parentObj[subKey]} name={subKey} depth={depth + 1} />
                                            <button 
                                                onClick={(e) => openInspectModal(e, parentObj[subKey], `${def.key}.${subKey}`)}
                                                className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-1 rounded text-indigo-500 hover:text-indigo-600 hover:scale-110 transition-all z-10"
                                                title="Inspect Full Content"
                                            >
                                                <ScanSearch size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-gray-200 dark:text-gray-800 text-xs select-none">.</span>
                                    )}
                                </td>
                            ));
                        }
                    })}
                    </tr>
                );
                })}
            </tbody>
            </table>
            </div>
            
            {/* Pagination BOTTOM */}
            {totalPages > 1 && (
                 <PaginationControl 
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={length}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    noun="rows"
                />
            )}
        </div>
      </div>
    );
  }

  // List View (Fallback)
  return (
    <div className="my-1 inline-flex flex-col items-start text-left">
        {!isRoot && (
            <div 
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center rounded-t border-t border-l border-r border-gray-200 dark:border-gray-700 select-none font-medium relative z-10 -mb-px"
                onClick={() => setExpanded(false)}
            >
                <ChevronDown size={10} className="mr-1 opacity-70" />
                <span>Array (List)</span>
            </div>
         )}
        <div className={`overflow-hidden shadow-sm bg-white dark:bg-gray-900 inline-block border border-gray-200 dark:border-gray-700 ${!isRoot ? 'rounded-b-sm rounded-tr-sm rounded-tl-none' : 'rounded-sm'}`}>
            
             {/* Pagination TOP */}
             <PaginationControl 
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                noun="items"
            />

            <table className="border-collapse text-sm relative table-fixed w-auto">
                <thead>
                    <tr>
                        <th className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                            Index
                        </th>
                        <th className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-96">
                            Value
                        </th>
                    </tr>
                </thead>
                <tbody>
                {visibleData.map((item, i) => {
                    const realIndex = indexOffset + i;
                    return (
                        <tr key={realIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/50 px-2 py-1 align-top font-mono text-[10px] text-gray-500 dark:text-gray-500">
                            {realIndex}
                        </td>
                        <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1 align-top text-xs">
                            <DispatcherNode data={item} name={realIndex.toString()} depth={depth + 1} />
                        </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            
             {/* Pagination BOTTOM */}
             {totalPages > 1 && (
                 <PaginationControl 
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={length}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    noun="items"
                />
            )}
        </div>
    </div>
  );
};