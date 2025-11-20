
import { createContext } from 'react';
import { JsonSourceMap } from '../types';

export interface ViewerContextType {
  expandAllToken: number;
  collapseAllToken: number;
  activePath: string | null;
  onPathSelect: (path: string) => void;
  sourceMap: JsonSourceMap | null;
}

export const ViewerContext = createContext<ViewerContextType>({
  expandAllToken: 0,
  collapseAllToken: 0,
  activePath: null,
  onPathSelect: () => {},
  sourceMap: null,
});
