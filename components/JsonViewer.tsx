import React from 'react';
import { JsonValue } from '../types';
import { DispatcherNode } from './nodes/DispatcherNode';
import { ViewerContext } from './ViewerContext';

interface JsonViewerProps {
  data: JsonValue;
  expandAllToken: number;
  collapseAllToken: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, expandAllToken, collapseAllToken }) => {
  return (
    <ViewerContext.Provider value={{ expandAllToken, collapseAllToken }}>
      <div className="w-fit min-w-full text-sm font-mono text-gray-800 dark:text-gray-200">
        <DispatcherNode data={data} isRoot={true} depth={0} />
      </div>
    </ViewerContext.Provider>
  );
};