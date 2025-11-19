import React, { useState, useMemo, useRef, useContext, useEffect } from 'react';
import { NodeProps, JsonValue, JsonObject } from '../../types';
import { DispatcherNode } from './DispatcherNode';
import { ChevronDown } from 'lucide-react';
import { ViewerContext } from '../ViewerContext';

const ROW_HEIGHT = 30; // Reduced from 34
const HEADER_HEIGHT = 50; // Taller header for grouped columns
const MAX_CONTAINER_HEIGHT = 500;
const VIRTUALIZATION_THRESHOLD = 100;
const SAMPLE_SIZE = 50; // How many rows to scan to determine column structure

interface SubColumn {
  key: string;
}

interface ColumnDef {
  key: string;
  type: 'simple' | 'group';
  subColumns?: string[]; // For groups
}

export const ArrayNode: React.FC<NodeProps> = ({ data, isRoot, depth = 0 }) => {
  const [expanded, setExpanded] = useState<boolean>(!!isRoot || depth < 1);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { expandAllToken, collapseAllToken } = useContext(ViewerContext);

  useEffect(() => {
    if (expandAllToken > 0) {
      setExpanded(true);
    }
  }, [expandAllToken]);

  useEffect(() => {
    if (collapseAllToken > 0) {
      setExpanded(false);
    }
  }, [collapseAllToken]);

  const arrayData = data as JsonValue[];
  const length = arrayData.length;
  const isEmpty = length === 0;

  // Intelligent Column Detection
  const { isArrayOfObjects, columnDefs } = useMemo(() => {
    if (length === 0) return { isArrayOfObjects: false, columnDefs: [] };
    
    // 1. Basic Check: Is this an array of objects?
    // We scan a subset to be performant on large arrays
    const scanLimit = Math.min(length, SAMPLE_SIZE);
    let objectCount = 0;
    for(let i=0; i<scanLimit; i++) {
        if (typeof arrayData[i] === 'object' && arrayData[i] !== null && !Array.isArray(arrayData[i])) {
            objectCount++;
        }
    }
    
    // If less than 80% of sampled items are objects, treat as mixed/list
    if (objectCount / scanLimit < 0.8) return { isArrayOfObjects: false, columnDefs: [] };

    // 2. Key Collection & Deep Inspection
    const allKeys = new Set<string>();
    const keyTypeMap = new Map<string, { isObject: boolean; subKeys: Set<string> }>();

    // Scan rows to gather schema
    for (let i = 0; i < scanLimit; i++) {
      const item = arrayData[i] as JsonObject;
      if (!item) continue;

      Object.keys(item).forEach((k) => {
        allKeys.add(k);
        
        const val = item[k];
        // Initialize tracking for this key
        if (!keyTypeMap.has(k)) {
            keyTypeMap.set(k, { isObject: true, subKeys: new Set() });
        }
        
        const meta = keyTypeMap.get(k)!;
        
        // If we find a non-object (or null/array), mark this column as NOT collapsible
        // We only flatten "simple" objects. Arrays or nulls break the flattening.
        if (typeof val !== 'object' || val === null || Array.isArray(val)) {
            meta.isObject = false;
        } else if (meta.isObject) {
             // It's an object, collect its keys
             Object.keys(val).forEach(subKey => meta.subKeys.add(subKey));
        }
      });
    }

    const sortedKeys = Array.from(allKeys).sort();
    const defs: ColumnDef[] = [];

    sortedKeys.forEach(key => {
        const meta = keyTypeMap.get(key);
        // Only group if it is an object AND has sub-keys AND doesn't have too many sub-keys (e.g. > 10 makes table too wide)
        if (meta && meta.isObject && meta.subKeys.size > 0 && meta.subKeys.size < 10) {
            defs.push({
                key,
                type: 'group',
                subColumns: Array.from(meta.subKeys).sort()
            });
        } else {
            defs.push({
                key,
                type: 'simple'
            });
        }
    });
    
    return { 
      isArrayOfObjects: true, 
      columnDefs: defs 
    };
  }, [arrayData, length]);

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

  const isVirtual = length > VIRTUALIZATION_THRESHOLD;
  
  // Virtualization Calculations
  const visibleCount = isVirtual ? Math.ceil(MAX_CONTAINER_HEIGHT / ROW_HEIGHT) + 10 : length;
  const startIndex = isVirtual ? Math.floor(scrollTop / ROW_HEIGHT) : 0;
  const effectiveStartIndex = Math.max(0, startIndex - 5); // Buffer
  const effectiveEndIndex = Math.min(length, effectiveStartIndex + visibleCount);
  
  const visibleData = isVirtual 
    ? arrayData.slice(effectiveStartIndex, effectiveEndIndex) 
    : arrayData;

  const paddingTop = isVirtual ? effectiveStartIndex * ROW_HEIGHT : 0;
  const paddingBottom = isVirtual ? (length - effectiveEndIndex) * ROW_HEIGHT : 0;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isVirtual) {
        setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const containerStyles = isVirtual ? { maxHeight: MAX_CONTAINER_HEIGHT, overflowY: 'auto' as const } : {};

  // Matrix View
  if (isArrayOfObjects) {
    // Calculate total columns for colspan
    let totalCols = 1; // Index column
    columnDefs.forEach(def => {
        if (def.type === 'group' && def.subColumns) {
            totalCols += def.subColumns.length;
        } else {
            totalCols += 1;
        }
    });

    return (
      <div className="overflow-x-auto my-1 custom-scrollbar">
         {!isRoot && (
            <div 
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-1.5 py-0.5 mb-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center rounded-t border-t border-l border-r border-gray-200 dark:border-gray-700 select-none font-medium"
                onClick={() => setExpanded(false)}
            >
                <ChevronDown size={10} className="mr-1 opacity-70" />
                <span>Table ({length})</span>
            </div>
         )}
        <div 
            className="border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm bg-white dark:bg-gray-900 custom-scrollbar"
            ref={containerRef}
            onScroll={handleScroll}
            style={containerStyles}
        >
            <table className="border-collapse w-full min-w-max text-sm relative table-fixed">
            <thead className="sticky top-0 z-20 shadow-sm bg-gray-50 dark:bg-gray-800">
                {/* Primary Header Row */}
                <tr>
                    <th rowSpan={2} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10 bg-gray-50 dark:bg-gray-800 z-30">
                        #
                    </th>
                    {columnDefs.map((def) => (
                        <th
                            key={def.key}
                            colSpan={def.type === 'group' ? def.subColumns?.length : 1}
                            rowSpan={def.type === 'group' ? 1 : 2}
                            className={`border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis
                                ${def.type === 'group' 
                                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' 
                                    : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                                }
                            `}
                        >
                            {def.key}
                        </th>
                    ))}
                </tr>
                {/* Secondary Header Row (for groups) */}
                <tr>
                     {columnDefs.map((def) => {
                         if (def.type !== 'group' || !def.subColumns) return null;
                         return def.subColumns.map(subKey => (
                             <th 
                                key={`${def.key}-${subKey}`}
                                className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis"
                             >
                                 {subKey}
                             </th>
                         ));
                     })}
                </tr>
            </thead>
            <tbody>
                {paddingTop > 0 && (
                    <tr>
                        <td colSpan={totalCols} style={{ height: paddingTop, padding: 0, border: 0 }}></td>
                    </tr>
                )}
                {visibleData.map((item, i) => {
                const rowIndex = effectiveStartIndex + i;
                const rowObj = item as JsonObject;
                return (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group" style={{ height: ROW_HEIGHT }}>
                    <td className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/50 px-2 py-1 text-center font-mono text-[10px] text-gray-400 dark:text-gray-600 align-top">
                        {rowIndex}
                    </td>
                    {columnDefs.map((def) => {
                        if (def.type === 'simple') {
                             return (
                                <td key={def.key} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 align-top last:border-r-0 text-xs max-w-xs overflow-hidden">
                                    {rowObj.hasOwnProperty(def.key) ? (
                                        <DispatcherNode data={rowObj[def.key]} name={def.key} depth={depth + 1} />
                                    ) : (
                                        <span className="text-gray-200 dark:text-gray-800 text-xs select-none">-</span>
                                    )}
                                </td>
                             );
                        } else {
                            // Grouped Column Rendering
                            const parentVal = rowObj[def.key] as JsonObject;
                            return def.subColumns?.map(subKey => (
                                <td key={`${def.key}-${subKey}`} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 align-top text-xs max-w-xs overflow-hidden">
                                    {(parentVal && parentVal.hasOwnProperty(subKey)) ? (
                                        <DispatcherNode data={parentVal[subKey]} name={subKey} depth={depth + 1} />
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
                {paddingBottom > 0 && (
                    <tr>
                        <td colSpan={totalCols} style={{ height: paddingBottom, padding: 0, border: 0 }}></td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    );
  }

  // List View (Fallback)
  return (
    <div className="my-1 custom-scrollbar">
        {!isRoot && (
            <div 
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-1.5 py-0.5 mb-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center rounded-t border-t border-l border-r border-gray-200 dark:border-gray-700 select-none font-medium"
                onClick={() => setExpanded(false)}
            >
                <ChevronDown size={10} className="mr-1 opacity-70" />
                <span>Array (List)</span>
            </div>
         )}
        <div 
            className="overflow-hidden rounded-sm border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900 custom-scrollbar"
            ref={containerRef}
            onScroll={handleScroll}
            style={containerStyles}
        >
            <table className="border-collapse w-full text-sm relative">
                <thead className="sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                            Index
                        </th>
                        <th className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Value
                        </th>
                    </tr>
                </thead>
                <tbody>
                {paddingTop > 0 && (
                    <tr>
                        <td colSpan={2} style={{ height: paddingTop, padding: 0, border: 0 }}></td>
                    </tr>
                )}
                {visibleData.map((item, i) => {
                    const rowIndex = effectiveStartIndex + i;
                    return (
                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ height: ROW_HEIGHT }}>
                        <td className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/50 px-2 py-1 align-top font-mono text-[10px] text-gray-500 dark:text-gray-500">
                            {rowIndex}
                        </td>
                        <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1 align-top text-xs">
                            <DispatcherNode data={item} name={rowIndex.toString()} depth={depth + 1} />
                        </td>
                        </tr>
                    );
                })}
                {paddingBottom > 0 && (
                    <tr>
                        <td colSpan={2} style={{ height: paddingBottom, padding: 0, border: 0 }}></td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    </div>
  );
};
