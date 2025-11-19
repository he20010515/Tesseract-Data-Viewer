import React from 'react';
import { NodeProps } from '../../types';
import { PrimitiveNode } from './PrimitiveNode';
import { ArrayNode } from './ArrayNode';
import { ObjectNode } from './ObjectNode';

export const DispatcherNode: React.FC<NodeProps> = (props) => {
  const { data } = props;

  if (data === null) {
    return <PrimitiveNode {...props} />;
  }

  if (Array.isArray(data)) {
    return <ArrayNode {...props} />;
  }

  if (typeof data === 'object') {
    return <ObjectNode {...props} />;
  }

  return <PrimitiveNode {...props} />;
};