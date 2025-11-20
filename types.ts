
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
  path: string; // The unique path to this node (e.g., "root.users.0.name")
  isRoot?: boolean;
  depth?: number;
  disableTruncation?: boolean;
}

export interface ViewConfig {
  expandAll: boolean;
}

// --- AST / Source Map Types ---

export interface SourceLocation {
  line: number;     // 1-based
  column: number;   // 1-based
  start: number;    // 0-based char index
  end: number;      // 0-based char index
}

// Maps a generic path string (e.g., "root.users.0") to its location in the source string
export type JsonSourceMap = Map<string, SourceLocation>;

export interface ParsedResult {
  data: JsonValue;
  sourceMap: JsonSourceMap;
  error?: string;
}
