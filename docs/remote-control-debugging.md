# TV Remote Control Regression – Debugging Report

**Status:** Resolved ✅
**Date:** 2026-10-08
**Affected versions:** All builds after merging PR #4 (commit `0fb13e0`)

---

## Summary

After merging PR #4 ("Fix key bindings and add new TV controls", commit `0fb13e0`),
the Samsung TV remote control stopped working in every build. The regression was
traced back to the key binding / control changes introduced by PR #4 and fixed by
reverting that commit. The remote control works again in the test build
`vtest-revert-pr4`.

---

## Timeline

| Step | Action | Result |
|------|--------|--------|
| 1 | Merged PR #4 (`0fb13e0`): fixed key bindings, added `-extraconfig`, new TV actions | Remote control **broken** in all subsequent builds |
| 2 | Suspected esbuild JS lowering (Tizen 5.5 compat, PR #2) | Made esbuild optional (PR #8), rebuilt without it → **still broken** |
| 3 | Suspected the `chocolate-doom` submodule update (`d_main.c` Doom 1.2 dehacked change) | Ruled out – change only triggers for `gameversion == exe_doom_1_2`, not for shareware `doom1.wad` |
| 4 | Suspected Tizen 5.5 flags (`WASM_BIGINT=0`, `WASM_COMPAT`, wasm-opt MVP lowering) | Ruled out – standard build (no Tizen 5.5 flags) was also broken |
| 5 | **Reverted PR #4 (`0fb13e0`)** | Remote control **works again** (test build `vtest-revert-pr4`) |

---

## Root Cause

PR #4 (commit `0fb13e0`) changed three things that together broke remote input:

1. **Key bindings in `wasm/default.cfg`**
   - Changed `key_up`/`key_down`/`key_left`/`key_right` from `72/80/75/77` to `173/175/172/174`
   - The new values were based on an analysis of Emscripten's SDL2 key translation
     (`TranslateKey` → `scancode_translate_table`), which predicted the game would
     receive Doom key numbers `173/175/172/174` for the arrow keys.
   - **Empirically, the original values (`72/80/75/77`) are what the game actually
     receives on the TV.** The analysis did not match the real runtime behavior.

2. **`-extraconfig chocolate-doom.cfg` launch argument in `wasm/index.html`**
   - This made the extended config (`chocolate-doom.cfg`) load for the first time.
   - The extended config contains menu/weapon key bindings and display/audio
     settings that were previously never applied.

3. **New TV actions in `wasm/input.js`**
   - Added `PAUSE`, `NEXT_WEAPON`, `PREV_WEAPON`, `QUICK_SAVE`, `QUICK_LOAD`
     mapped to remote keys (`MediaPlayPause`, `MediaStop`, `MediaTrackNext/Prev`,
     `ColorF4/F5`) and gamepad buttons.

The exact mechanism that broke input is not fully isolated (see Open Questions),
but reverting the whole commit restored correct behavior.

---

## What Was Ruled Out

- **esbuild JS lowering** (Tizen 5.5 / Chromium 69 compat, PR #2) – build without
  esbuild was still broken.
- **`chocolate-doom` submodule update** (to `895f581c`) – the only input-adjacent
  change (`d_main.c`) only affects Doom 1.2 game versions.
- **Tizen 5.5 build flags** (`WASM_BIGINT=0`, `WASM_COMPAT`, wasm-opt MVP) – the
  standard (non-Tizen-5.5) build was also broken.
- **Memory flags** (PR #3) – unchanged between working and broken builds.

---

## Fix

Reverted commit `0fb13e0` (PR #4) via PR #9 (merge `c54cc3c`):

- Restored original key bindings (`77/75/72/80`)
- Removed the `-extraconfig chocolate-doom.cfg` launch argument
- Removed the new TV actions (`PAUSE`, weapon cycling, quick save/load)
- The `chocolate-doom` submodule stays at the latest commit (`895f581c`)

**Test build:** https://github.com/dos-ise/doom-tizen/releases/tag/vtest-revert-pr4

---

## Open Questions

1. **Why do the original key bindings (`72/80/75/77`) work?** The Emscripten SDL2
   key-mapping analysis predicted the game receives `173/175/172/174` for the
   arrow keys. Either the analysis is wrong for this Emscripten/SDL version, or
   `default.cfg` is not loaded the way we assumed. This needs empirical
   verification (e.g. logging the received key values on the TV).
2. **Which part of PR #4 actually broke input?** The key bindings, the
   `-extraconfig` loading, or the new actions. A future fix should re-introduce
   the PR #4 changes one at a time and test on the TV.

---

## Recommendations

- Before re-introducing any key binding changes, verify the actual Doom key
  numbers the game receives on the TV (add temporary logging to `input.js`).
- Test remote control on the TV after **every** change to `default.cfg`,
  `chocolate-doom.cfg`, `input.js`, or `index.html` launch arguments.
- Keep the `-extraconfig` mechanism in mind: `chocolate-doom.cfg` was never
  loaded before PR #4, so its settings (including key bindings) were inert.
