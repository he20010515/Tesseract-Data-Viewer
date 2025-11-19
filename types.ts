export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export interface NodeProps {
  data: JsonValue;
  name?: string | number; // The key or index leading to this node
  isRoot?: boolean;
  depth?: number;
}

export interface ViewConfig {
  expandAll: boolean;
}