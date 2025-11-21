import { JsonValue } from '../types';
import { parseLooseJson } from './jsonParser';

export const tryParseJSONL = (text: string): JsonValue[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) throw new Error("Empty input");

  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      result.push(JSON.parse(trimmed));
    } catch (e) {
      // If standard JSON parse fails, try our loose parser (handles NaN, Infinity)
      try {
          result.push(parseLooseJson(trimmed));
      } catch (looseErr) {
          // If both fail, re-throw the original error (or maybe the loose one?)
          // Let's throw the original one as it's likely more standard, unless looseErr is more specific.
          // Actually, if loose parser fails, it means it's really not valid.
          if (trimmed.length > 0) throw e; 
      }
    }
  }
  return result;
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++; 
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result.map(v => {
    const trimmed = v.trim();
    // Remove wrapping quotes if they exist
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      return trimmed.slice(1, -1).replace(/""/g, '"');
    }
    return trimmed;
  });
};

export const tryParseCSV = (text: string): JsonValue[] => {
  // Handling very large strings with split can be memory intensive,
  // but strictly for 100MB it is usually fine in modern JS engines (V8).
  // A truly streaming parser would be better but adds significant complexity.
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) throw new Error("Empty CSV");

  // Extract headers
  const headers = parseCSVLine(lines[0]);
  
  if (headers.length < 2 && !lines[0].includes(',')) {
     // Heuristic: single column CSV is valid, but rare. 
     // We might want to reject it if it looks like just a plain string.
     // For now, let's allow it but be careful.
  }

  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = parseCSVLine(line);
    const obj: any = {};
    headers.forEach((h, i) => {
      let val: any = values[i];
      // Simple type inference
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === 'null') val = null;
      else if (val !== undefined && val !== '' && !isNaN(Number(val))) val = Number(val);
      
      obj[h] = val !== undefined ? val : null;
    });
    return obj;
  }).filter((x): x is any => x !== null);
};
