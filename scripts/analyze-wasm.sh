#!/usr/bin/env bash
# Analyzes the generated chocolate-doom.js/.wasm to pinpoint the startup
# hang in Emscripten initRuntime() -> __wasm_call_ctors().
# Writes the findings to analysis.md (posted to the release by the workflow).
set -euo pipefail

WASM="$1"
JS="$2"

OUT="## WASM/JS analysis

### 1. WASM init section (.init_array -> what __wasm_call_ctors calls)

\`\`\`
$(wasm-dis "$WASM" 2>/dev/null | grep -A 200 '(section .init' | head -60 || echo 'no init section found')
\`\`\`

### 2. ASYNCIFY markers in JS

\`\`\`
$(grep -o 'asyncify[A-Za-z_]*' "$JS" | sort -u | head -30 || echo 'no asyncify markers')
\`\`\`

### 3. run()/initRuntime flow in JS

\`\`\`
$(grep -n 'function run\|function initRuntime\|__wasm_call_ctors\|onRuntimeInitialized\|setStatus' "$JS" | head -40)
\`\`\`

### 4. JS size and key settings

\`\`\`
JS size: $(wc -c < "$JS") bytes
WASM size: $(wc -c < "$WASM") bytes
$(grep -o 'ALLOW_MEMORY_GROWTH=[0-9]*\|ASYNCIFY=[0-9]*\|WASM_BIGINT=[0-9]*' "$JS" | sort -u | head -10)
\`\`\`
"

echo "$OUT" > analysis.md
echo "Analysis written to analysis.md"