#!/usr/bin/env bash
# Analyzes the generated chocolate-doom.js/.wasm to pinpoint the startup
# hang in Emscripten initRuntime() -> __wasm_call_ctors().
# Posts the findings as a GitHub issue comment (API works even when
# artifact/release downloads are blocked by a proxy).
set -euo pipefail

WASM="$1"
JS="$2"
REPO="${GITHUB_REPOSITORY:-}"
TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$REPO" ] || [ -z "$TOKEN" ]; then
  echo "GITHUB_REPOSITORY and GITHUB_TOKEN are required"
  exit 1
fi

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

# Find an existing analysis issue or create one
ISSUE_NUM=$(gh issue list --repo "$REPO" --search "WASM analysis" --state open --json number --jq '.[0].number' 2>/dev/null || echo "")
if [ -z "$ISSUE_NUM" ]; then
  ISSUE_NUM=$(gh issue create --repo "$REPO" --title "WASM analysis (auto)" --body "Automated analysis of the generated WASM/JS." --json number --jq '.number')
fi

# Post the analysis as a comment
gh issue comment "$ISSUE_NUM" --repo "$REPO" --body "$OUT"
echo "Analysis posted to issue #$ISSUE_NUM"
