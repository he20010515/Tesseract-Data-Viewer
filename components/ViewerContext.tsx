import { createContext } from 'react';

export interface ViewerContextType {
  expandAllToken: number;
  collapseAllToken: number;
}

export const ViewerContext = createContext<ViewerContextType>({
  expandAllToken: 0,
  collapseAllToken: 0,
});
