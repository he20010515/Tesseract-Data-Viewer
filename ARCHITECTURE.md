# Project Architecture & Principles

## 1. Project Overview
**Table-Layout JSON Reader** is a high-performance React application designed to visualize complex, nested data structures (JSON, JSONL, CSV). 

Unlike standard pretty-printers, this project emphasizes:
*   **Spreadsheet-like Layouts:** Rendering arrays of objects as tables (Matrix View).
*   **Performance:** Handling massive datasets (10MB - 100MB+) via Virtualization.
*   **Rich Content:** Recursively parsing JSON-encoded strings and rendering Markdown/LaTeX.

## 2. Core Design Patterns

### 2.1. Recursive Component Composition (The "Dispatcher" Pattern)
The visualization relies on a strict recursive component structure triggered by the data type.

**Flow:**
`App` -> `JsonViewer` -> `DispatcherNode` -> (Decision) -> `ArrayNode` | `ObjectNode` | `PrimitiveNode`

*   **`DispatcherNode`**: The traffic controller. It inspects the `data` prop type.
    *   If `Array` -> Renders `<ArrayNode />`
    *   If `Object` -> Renders `<ObjectNode />`
    *   Else -> Renders `<PrimitiveNode />`
*   **Recursive Step**: `ArrayNode` and `ObjectNode` iterate through their children and call `<DispatcherNode />` for each child, propagating the recursion depth.

### 2.2. Global Signal Context
To avoid "Prop Drilling" for global actions (like "Expand All" or "Collapse All") through 10+ levels of recursion, we use the **Signal Pattern** via React Context.

*   **`ViewerContext`**: Holds simple integer tokens (`expandAllToken`, `collapseAllToken`).
*   **Mechanism**: When the user clicks "Expand All", the token increments. Child nodes (`ArrayNode`/`ObjectNode`) listen for changes in these tokens and force their local `expanded` state to match the signal.

---

## 3. Performance Architecture

This is the most critical aspect of the application, designed to handle files that would crash a standard DOM renderer.

### 3.1. Virtual Scrolling (Windowing)
Used in `ArrayNode.tsx` and `ObjectNode.tsx`.

**Problem**: Rendering 10,000 rows in an HTML `<table>` consumes massive memory and layout time.
**Solution**: Only render the ~20 rows currently visible in the viewport.

**The Algorithm:**
1.  **Constants**:
    *   `ROW_HEIGHT`: Fixed height per row (e.g., 34px).
    *   `MAX_CONTAINER_HEIGHT`: The scrollable area limit (e.g., 500px).
2.  **Calculations**:
    *   `startIndex` = `Math.floor(scrollTop / ROW_HEIGHT)`
    *   `visibleCount` = `Math.ceil(ContainerHeight / ROW_HEIGHT)`
    *   `endIndex` = `startIndex + visibleCount`
3.  **Padding Simulation**:
    *   We calculate the empty space *above* the first visible item (`startIndex * ROW_HEIGHT`).
    *   We calculate the empty space *below* the last visible item.
    *   We inject spacer rows (`<tr>` with height) to ensure the scrollbar size remains accurate.

**Key Optimization**:
*   **Sticky Headers**: `thead` is kept `sticky top-0` so context is never lost during virtual scrolling.
*   **Buffer**: We render a small buffer (+5 items) above and below to prevent flickering during fast scrolling.

### 3.2. Large File Handling Strategy
Processing a 100MB file requires bypassing standard React controlled inputs.

**Strategy:**
1.  **Bypass Textarea**: For files > 1MB, the content is **not** set to the `input` state (which binds to the textarea). This prevents the browser from freezing due to massive text layout reflows.
2.  **Direct Parsing**: The `FileReader` result is passed directly to the parsing logic (`processInput`), skipping the UI layer entirely.
3.  **Async Event Loop**: Heavy parsing operations are wrapped in `setTimeout(..., 50)`. This yields control back to the browser rendering engine specifically to allow the "Loading Spinner" to appear before the CPU locks up for parsing.

---

## 4. Data Processing & Parsing

### 4.1. Matrix Detection (Auto-Table)
In `ArrayNode.tsx`, we use a heuristic to decide between "List View" and "Matrix View".

*   **Logic**: If **every** item in an array is a non-null Object (and not an Array), it is treated as a Matrix.
*   **Schema Generation**: We iterate through *all* items to collect a superset of all keys (`Set<string>`).
*   **Memoization**: This calculation is wrapped in `useMemo`. It only runs when the `data` reference changes, not during scroll events.

### 4.2. Smart Primitive Detection
In `PrimitiveNode.tsx`, string values undergo a multi-stage analysis:

1.  **JSON-in-String**: Checks if a string starts with `{` or `[`. If `JSON.parse` succeeds, it renders a nested `DispatcherNode` (allowing "Drill-down" into stringified API responses).
2.  **Rich Text**:
    *   **Markdown**: Detected via regex/heuristics. Parsed using `marked`.
    *   **Math (LaTeX)**: Detects `$E=mc^2$` or `$$...$$` blocks. Rendered using `KaTeX`.
3.  **Fallback**: Renders as a raw string with whitespace preservation (`whitespace-pre-wrap`).

---

## 5. Development Guidelines

### Styling
*   **Tailwind CSS**: All styling is utility-first.
*   **Dark Mode**: strictly supported via `dark:` prefix.
*   **Color Palette**:
    *   Structure: Gray/Slate (50-900).
    *   Accents: Indigo (Primary UI), Emerald (Strings), Blue (Numbers), Purple (Booleans).

### Adding New Features
1.  **New Data Types**: Modify `DispatcherNode` to route to a new Component.
2.  **New File Formats**: Update `utils/parsers.ts` and add the detection logic in `App.tsx` -> `handleFileUpload`.
3.  **Performance Tuning**: Always check if a new feature triggers re-renders in `ArrayNode`. Use `React.memo` or `useMemo` heavily for large lists.

### Common Pitfalls
*   **Virtualization Keys**: When virtualizing, never use the *relative index* (0 to 20) as the React Key. Always use the *absolute index* (from the original data) or a unique ID.
*   **Recursion Depth**: While we don't hard-limit depth, extreme nesting (>500 levels) may hit the JS stack limit.
