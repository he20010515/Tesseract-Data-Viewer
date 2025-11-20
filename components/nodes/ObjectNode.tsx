import React, { useState, useMemo, useContext, useEffect } from 'react';
import { NodeProps, JsonObject } from '../../types';
import { DispatcherNode } from './DispatcherNode';
import { ChevronDown } from 'lucide-react';
import { ViewerContext } from '../ViewerContext';
import { PaginationControl } from '../PaginationControl';

const DEFAULT_PAGE_SIZE = 50;

export const ObjectNode: React.FC<NodeProps> = ({ data, name, isRoot, depth = 0 }) => {
  const [expanded, setExpanded] = useState<boolean>(!!isRoot || depth < 1);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  // Reset page if keys change significantly
  useEffect(() => {
      setPage(1);
  }, [length]);

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

  // Pagination Logic
  const totalPages = Math.ceil(length / pageSize);
  const start = (page - 1) * pageSize;
  const visibleKeys = keys.slice(start, start + pageSize);

  const handlePageChange = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };

  return (
    <div className="min-w-[100px] my-1 inline-flex flex-col items-start text-left">
       {!isRoot && (
        <div 
            className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center rounded-t border-t border-l border-r border-gray-200 dark:border-gray-700 select-none font-medium relative z-10 -mb-px"
            onClick={() => setExpanded(false)}
        >
             <ChevronDown size={10} className="mr-1 opacity-70" />
             <span>Object</span>
        </div>
       )}
      
      {isEmpty ? (
        <div className="text-gray-400 dark:text-gray-500 italic pl-2 text-xs">{'{}'}</div>
      ) : (
        <div className={`overflow-hidden shadow-sm bg-white dark:bg-gray-900 inline-block border border-gray-200 dark:border-gray-700 ${!isRoot ? 'rounded-b-sm rounded-tr-sm rounded-tl-none' : 'rounded-sm'}`}>
            
            <PaginationControl 
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                noun="keys"
            />

            <table className="border-collapse w-auto text-sm relative">
                <thead>
                    <tr>
                        <th className="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 w-min whitespace-nowrap text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                            Key
                        </th>
                        <th className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 w-full text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                            Value
                        </th>
                    </tr>
                </thead>
                <tbody>
                {visibleKeys.map((key) => (
                    <tr key={key} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 align-top bg-gray-50/30 dark:bg-gray-900/50 w-min whitespace-nowrap text-xs font-medium text-gray-700 dark:text-gray-300 select-text">
                            {key}
                        </td>
                        <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1 align-top text-xs">
                            <DispatcherNode data={objData[key]} name={key} depth={depth + 1} />
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            
            {totalPages > 1 && (
                <PaginationControl 
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={length}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    noun="keys"
                />
            )}
        </div>
      )}
    </div>
  );
};