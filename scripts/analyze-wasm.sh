#!/usr/bin/env bash
# Analyzes the generated chocolate-doom.js/.wasm to pinpoint the startup
# hang in Emscripten initRuntime() -> __wasm_call_ctors().
# Writes the findings to analysis.md (posted to the release by the workflow).
# Runs inside the Docker container which has the emsdk's wasm-dis.

WASM="$1"
JS="$2"

INIT_SECTION=""
if command -v wasm-dis >/dev/null 2>&1; then
  INIT_SECTION=$(wasm-dis "$WASM" 2>/dev/null | grep -A 200 '(section .init' | head -60 || true)
fi
if [ -z "$INIT_SECTION" ]; then
  INIT_SECTION="(wasm-dis produced no init section output)"
fi

ASYNCIFY_MARKERS=$(grep -o 'asyncify[A-Za-z_]*' "$JS" 2>/dev/null | sort -u | head -30 || true)
if [ -z "$ASYNCIFY_MARKERS" ]; then
  ASYNCIFY_MARKERS="(no asyncify markers found)"
fi

FLOW=$(grep -n 'function run\|function initRuntime\|__wasm_call_ctors\|onRuntimeInitialized\|setStatus' "$JS" 2>/dev/null | head -40 || true)
if [ -z "$FLOW" ]; then
  FLOW="(no flow markers found)"
fi

SETTINGS=$(grep -o 'ALLOW_MEMORY_GROWTH=[0-9]*\|ASYNCIFY=[0-9]*\|WASM_BIGINT=[0-9]*' "$JS" 2>/dev/null | sort -u | head -10 || true)

OUT="## WASM/JS analysis

### 1. WASM init section (.init_array -> what __wasm_call_ctors calls)

\`\`\`
$INIT_SECTION
\`\`\`

### 2. ASYNCIFY markers in JS

\`\`\`
$ASYNCIFY_MARKERS
\`\`\`

### 3. run()/initRuntime flow in JS

\`\`\`
$FLOW
\`\`\`

### 4. JS size and key settings

\`\`\`
JS size: $(wc -c < "$JS" 2>/dev/null || echo '?') bytes
WASM size: $(wc -c < "$WASM" 2>/dev/null || echo '?') bytes
$SETTINGS
\`\`\`
"

echo "$OUT" > analysis.md
echo "Analysis written to analysis.md"
