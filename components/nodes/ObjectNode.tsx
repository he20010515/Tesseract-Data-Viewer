import React, { useState, useMemo, useRef, useContext, useEffect } from 'react';
import { NodeProps, JsonObject } from '../../types';
import { DispatcherNode } from './DispatcherNode';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ViewerContext } from '../ViewerContext';

const ROW_HEIGHT = 30; // Reduced from 34
const MAX_CONTAINER_HEIGHT = 500;
const VIRTUALIZATION_THRESHOLD = 100;

export const ObjectNode: React.FC<NodeProps> = ({ data, name, isRoot, depth = 0 }) => {
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

  const objData = data as JsonObject;
  
  // Memoize keys to avoid recalculating on every render
  const keys = useMemo(() => Object.keys(objData), [objData]);
  const length = keys.length;
  const isEmpty = length === 0;

  if (!expanded && !isRoot) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
      >
        <span className="font-bold text-xs mr-1">{'{'}</span>
        <span className="text-xs opacity-80">{length} keys</span>
        <span className="font-bold text-xs ml-1">{'} '}</span>
      </button>
    );
  }

  const isVirtual = length > VIRTUALIZATION_THRESHOLD;

  // Virtualization Calculations
  const visibleCount = isVirtual ? Math.ceil(MAX_CONTAINER_HEIGHT / ROW_HEIGHT) + 10 : length;
  const startIndex = isVirtual ? Math.floor(scrollTop / ROW_HEIGHT) : 0;
  const effectiveStartIndex = Math.max(0, startIndex - 5); // Buffer
  const effectiveEndIndex = Math.min(length, effectiveStartIndex + visibleCount);
  
  const visibleKeys = isVirtual 
    ? keys.slice(effectiveStartIndex, effectiveEndIndex) 
    : keys;

  const paddingTop = isVirtual ? effectiveStartIndex * ROW_HEIGHT : 0;
  const paddingBottom = isVirtual ? (length - effectiveEndIndex) * ROW_HEIGHT : 0;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isVirtual) {
        setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const containerStyles = isVirtual ? { maxHeight: MAX_CONTAINER_HEIGHT, overflowY: 'auto' as const } : {};

  return (
    <div className="min-w-[100px] my-1">
       {!isRoot && (
        <div 
            className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-1.5 py-0.5 mb-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center rounded-t border-t border-l border-r border-gray-200 dark:border-gray-700 select-none font-medium"
            onClick={() => setExpanded(false)}
        >
             <ChevronDown size={10} className="mr-1 opacity-70" />
             <span>Object</span>
        </div>
       )}
      
      {isEmpty ? (
        <div className="text-gray-400 dark:text-gray-500 italic pl-2 text-xs">{'{}'}</div>
      ) : (
        <div 
            className="overflow-hidden rounded-sm border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900 custom-scrollbar"
            ref={containerRef}
            onScroll={handleScroll}
            style={containerStyles}
        >
            <table className="border-collapse w-full text-sm relative">
                <thead className="sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 w-min whitespace-nowrap text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Key
                        </th>
                        <th className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 w-full text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                {visibleKeys.map((key) => (
                    <tr key={key} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ height: ROW_HEIGHT }}>
                        <td className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 align-top bg-gray-50/30 dark:bg-gray-900/50 w-min whitespace-nowrap text-xs font-medium text-gray-700 dark:text-gray-300 select-text">
                            {key}
                        </td>
                        <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1 align-top text-xs">
                            <DispatcherNode data={objData[key]} name={key} depth={depth + 1} />
                        </td>
                    </tr>
                ))}
                {paddingBottom > 0 && (
                    <tr>
                        <td colSpan={2} style={{ height: paddingBottom, padding: 0, border: 0 }}></td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};
