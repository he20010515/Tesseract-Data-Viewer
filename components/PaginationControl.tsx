import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
  noun?: string; // "items", "keys", etc.
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  noun = 'items'
}) => {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-gray-50 dark:bg-gray-800/50 border-y border-gray-200 dark:border-gray-700 text-xs select-none">
        {/* Navigation Group */}
        <div className="flex items-center gap-2">
            <div className="flex items-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                <button
                    onClick={(e) => { e.stopPropagation(); onPageChange(1); }}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-gray-100 dark:border-gray-800"
                    title="First Page"
                >
                    <ChevronsLeft size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onPageChange(currentPage - 1); }}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-gray-100 dark:border-gray-800"
                    title="Previous Page"
                >
                    <ChevronLeft size={14} />
                </button>
                
                <div className="flex items-center px-2 font-mono font-medium text-gray-600 dark:text-gray-300 min-w-[100px] justify-center bg-gray-50/50 dark:bg-gray-900">
                    <span className="mr-1.5">Pg</span>
                    <input 
                        type="number" 
                        min={1} 
                        max={totalPages}
                        value={currentPage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0 && val <= totalPages) {
                                onPageChange(val);
                            }
                        }}
                        className="w-10 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 outline-none py-0.5 text-indigo-600 dark:text-indigo-400 transition-colors"
                    />
                    <span className="text-gray-400 ml-1.5">/ {totalPages}</span>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onPageChange(currentPage + 1); }}
                    disabled={currentPage === totalPages}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-l border-gray-100 dark:border-gray-800"
                    title="Next Page"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onPageChange(totalPages); }}
                    disabled={currentPage === totalPages}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-l border-gray-100 dark:border-gray-800"
                    title="Last Page"
                >
                    <ChevronsRight size={14} />
                </button>
            </div>
        </div>

        {/* Size Selector Group */}
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="opacity-80">Show</span>
                <select 
                    value={pageSize}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="bg-transparent font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer text-right appearance-none hover:text-indigo-600 transition-colors"
                >
                    {[50, 100, 200, 500, 1000].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                <span className="opacity-80">{noun}</span>
            </div>
            
            <div className="text-gray-400 text-[10px] tabular-nums">
                Total: {totalItems.toLocaleString()}
            </div>
        </div>
    </div>
  );
};