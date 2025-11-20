
import React from 'react';
import { JsonValue, JsonSourceMap } from '../types';
import { DispatcherNode } from './nodes/DispatcherNode';
import { ViewerContext } from './ViewerContext';

interface JsonViewerProps {
  data: JsonValue;
  sourceMap: JsonSourceMap | null;
  activePath: string | null;
  onPathSelect: (path: string) => void;
  expandAllToken: number;
  collapseAllToken: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  sourceMap,
  activePath, 
  onPathSelect, 
  expandAllToken, 
  collapseAllToken 
}) => {
  return (
    <ViewerContext.Provider value={{ expandAllToken, collapseAllToken, activePath, onPathSelect, sourceMap }}>
      <div className="w-fit min-w-full text-sm font-mono text-gray-800 dark:text-gray-200">
        <DispatcherNode data={data} isRoot={true} depth={0} path="root" />
      </div>
    </ViewerContext.Provider>
  );
};
