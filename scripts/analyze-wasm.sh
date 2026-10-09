#!/usr/bin/env bash
# Analyzes the generated chocolate-doom.js/.wasm to pinpoint the startup
# hang in Emscripten initRuntime() -> __wasm_call_ctors().
# Writes the findings to analysis.md (committed to the repo by the workflow).

WASM="$1"
JS="$2"

DIS=""
if command -v wasm-dis >/dev/null 2>&1; then
  DIS=$(wasm-dis "$WASM" 2>/dev/null || true)
fi

INIT_SECTION=""
if [ -n "$DIS" ]; then
  INIT_SECTION=$(echo "$DIS" | grep -i -A 200 'init' | head -80 || true)
fi
if [ -z "$INIT_SECTION" ]; then
  INIT_SECTION="(no init section found in wasm-dis output)"
fi

ELEM=$(echo "$DIS" | grep -A 200 '(elem ' | head -40 || true)
if [ -z "$ELEM" ]; then
  ELEM="(no elem section found)"
fi

EXPORTS=$(echo "$DIS" | grep -A 200 '(export ' | head -60 || true)
if [ -z "$EXPORTS" ]; then
  EXPORTS="(no exports found)"
fi

# Look for the data relocation function and any ctor-like functions
RELOC=$(echo "$DIS" | grep -B 2 -A 40 'apply_data_relocs\|__wasm_call_ctors\|call_ctors' | head -60 || true)
if [ -z "$RELOC" ]; then
  RELOC="(no reloc/ctor functions found by name)"
fi

ASYNCIFY_MARKERS=$(grep -o 'asyncify[A-Za-z_]*' "$JS" 2>/dev/null | sort -u | head -30 || true)
if [ -z "$ASYNCIFY_MARKERS" ]; then
  ASYNCIFY_MARKERS="(no asyncify markers found)"
fi

FLOW=$(grep -o 'function initRuntime(){.\{0,400\}' "$JS" 2>/dev/null | head -3 || true)
if [ -z "$FLOW" ]; then
  FLOW="(no initRuntime found)"
fi

RUNFLOW=$(grep -o 'async function run(.\{0,600\}' "$JS" 2>/dev/null | head -3 || true)
if [ -z "$RUNFLOW" ]; then
  RUNFLOW="(no run() found)"
fi

OUT="## WASM/JS analysis

### 1. WASM init section (.init_array -> what __wasm_call_ctors calls)

\`\`\`
$INIT_SECTION
\`\`\`

### 2. ELEMENT section (.init_array function list)

\`\`\`
$ELEM
\`\`\`

### 3. WASM exports

\`\`\`
$EXPORTS
\`\`\`

### 4. Reloc/ctor functions

\`\`\`
$RELOC
\`\`\`

### 5. ASYNCIFY markers in JS

\`\`\`
$ASYNCIFY_MARKERS
\`\`\`

### 6. initRuntime() in JS

\`\`\`
$FLOW
\`\`\`

### 7. run() in JS

\`\`\`
$RUNFLOW
\`\`\`

### 8. Sizes

\`\`\`
JS size: $(wc -c < "$JS" 2>/dev/null || echo '?') bytes
WASM size: $(wc -c < "$WASM" 2>/dev/null || echo '?') bytes
\`\`\`
"

echo "$OUT" > analysis.md
echo "Analysis written to analysis.md"