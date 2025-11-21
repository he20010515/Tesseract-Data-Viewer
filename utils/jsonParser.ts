
import { JsonValue, JsonSourceMap, SourceLocation, ParsedResult } from '../types';

/**
 * A simplified Recursive Descent JSON Parser that tracks line/column locations.
 * Returns both the parsed data and a SourceMap (Path -> Location).
 */
export const parseJsonWithSourceMap = (input: string): ParsedResult => {
  let i = 0;
  let line = 1;
  let column = 1;
  const sourceMap: JsonSourceMap = new Map();
  
  // Helper to track position
  const getLoc = (): { i: number; line: number; column: number } => ({ i, line, column });

  // Skip whitespace
  const skipWhitespace = () => {
    while (i < input.length) {
      const char = input[i];
      if (char === ' ' || char === '\t') {
        column++;
        i++;
      } else if (char === '\n') {
        line++;
        column = 1;
        i++;
      } else if (char === '\r') {
        i++; // Ignore CR
      } else {
        break;
      }
    }
  };

  const error = (msg: string) => {
    throw new Error(`${msg} at line ${line}, column ${column}`);
  };

  // Parse different types
  const parseValue = (path: string): JsonValue => {
    skipWhitespace();
    const start = getLoc();
    const char = input[i];

    let value: JsonValue;
    
    if (char === '{') {
      value = parseObject(path);
    } else if (char === '[') {
      value = parseArray(path);
    } else if (char === '"') {
      value = parseString();
    } else if (char === 't') {
      expect('true');
      value = true;
    } else if (char === 'f') {
      expect('false');
      value = false;
    } else if (char === 'n') {
      expect('null');
      value = null;
    } else if (char === 'N') {
      expect('NaN');
      value = null; // Convert NaN to null for valid JSON
    } else if (char === 'I') {
      expect('Infinity');
      value = null; // Convert Infinity to null
    } else if (char === '-' && input[i+1] === 'I') {
       // Handle -Infinity
       i++; column++; // eat '-'
       expect('Infinity');
       value = null; // Convert -Infinity to null
    } else if (char === '-' || (char >= '0' && char <= '9')) {
      value = parseNumber();
    } else {
      error(`Unexpected character '${char}'`);
      return null; // Unreachable
    }

    const end = getLoc();
    // Record location for this path
    sourceMap.set(path, {
      line: start.line,
      column: start.column,
      start: start.i,
      end: end.i
    });

    return value;
  };

  const parseObject = (path: string): JsonValue => {
    i++; column++; // eat '{'
    skipWhitespace();
    
    const result: any = {};
    let initial = true;

    while (i < input.length && input[i] !== '}') {
      if (!initial) {
        if (input[i] === ',') {
          i++; column++;
          skipWhitespace();
        } else {
          error("Expected ','");
        }
      }
      
      if (input[i] === '}') break;

      // Allow unquoted keys? No, let's stick to standard JSON for keys for now, 
      // unless we really need to support loose keys too. 
      // But the user issue is specifically about values (NaN).
      if (input[i] !== '"') error("Expected string key");
      
      // Parse Key
      // We don't strictly track key location separately in this simplified map,
      // but we need the key name to build the path.
      const key = parseString(); 
      skipWhitespace();
      
      if (input[i] !== ':') error("Expected ':'");
      i++; column++; // eat ':'
      
      // Parse Value
      const childPath = path ? `${path}.${key}` : key;
      result[key] = parseValue(childPath);
      
      initial = false;
      skipWhitespace();
    }

    if (input[i] !== '}') error("Expected '}'");
    i++; column++;
    return result;
  };

  const parseArray = (path: string): JsonValue => {
    i++; column++; // eat '['
    skipWhitespace();

    const result: any[] = [];
    let initial = true;
    let index = 0;

    while (i < input.length && input[i] !== ']') {
      if (!initial) {
        if (input[i] === ',') {
          i++; column++;
          skipWhitespace();
        } else {
          error("Expected ','");
        }
      }

      if (input[i] === ']') break;

      const childPath = path ? `${path}.${index}` : `${index}`;
      result.push(parseValue(childPath));
      index++;
      initial = false;
      skipWhitespace();
    }

    if (input[i] !== ']') error("Expected ']'");
    i++; column++;
    return result;
  };

  const parseString = (): string => {
    // Simple string parser (assumes valid JSON input mostly)
    i++; column++; // eat start quote
    let result = '';
    while (i < input.length) {
      const char = input[i];
      if (char === '"') {
        i++; column++;
        return result;
      }
      if (char === '\\') {
        i++; column++;
        const esc = input[i];
        if (esc === 'u') {
          // hex
          result += String.fromCharCode(parseInt(input.slice(i + 1, i + 5), 16));
          i += 5; column += 5;
        } else {
          const escMap: any = { 'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f', '"': '"', '\\': '\\', '/': '/' };
          result += escMap[esc] || esc;
          i++; column++;
        }
      } else {
        result += char;
        if (char === '\n') { line++; column = 1; }
        else column++;
        i++;
      }
    }
    error("Unterminated string");
    return "";
  };

  const expect = (target: string) => {
    if (input.slice(i, i + target.length) === target) {
      i += target.length;
      column += target.length;
    } else {
      error(`Expected '${target}'`);
    }
  };

  const parseNumber = (): number => {
    const start = i;
    if (input[i] === '-') { i++; column++; }
    while (i < input.length && input[i] >= '0' && input[i] <= '9') { i++; column++; }
    if (input[i] === '.') {
      i++; column++;
      while (i < input.length && input[i] >= '0' && input[i] <= '9') { i++; column++; }
    }
    if (input[i] === 'e' || input[i] === 'E') {
      i++; column++;
      if (input[i] === '+' || input[i] === '-') { i++; column++; }
      while (i < input.length && input[i] >= '0' && input[i] <= '9') { i++; column++; }
    }
    const numStr = input.slice(start, i);
    const num = Number(numStr);
    if (isNaN(num)) error("Invalid number");
    return num;
  };

  try {
    const data = parseValue("root");
    
    // Strict EOF check: Ensure we consumed the entire input (ignoring trailing whitespace)
    skipWhitespace();
    if (i < input.length) {
        error(`Unexpected character '${input[i]}' after JSON data (Expected EOF)`);
    }

    return { data, sourceMap };
  } catch (e: any) {
    return { data: null, sourceMap: new Map(), error: e.message };
  }
};

/**
 * Parses JSON but handles NaN, Infinity, -Infinity by converting them to null.
 * Returns just the data, no source map.
 */
export const parseLooseJson = (input: string): JsonValue => {
    const { data, error } = parseJsonWithSourceMap(input);
    if (error) throw new Error(error);
    return data;
};
