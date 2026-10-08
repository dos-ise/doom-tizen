# Performance Optimization

**Status:** Applied (PR #3)
**Date:** 2026-10-08

---

## Problem

The game was rendered at the full TV resolution (`-width window.innerWidth
-height window.innerHeight`). On a 4K Tizen TV this means the software renderer
had to fill ~8.3 million pixels per frame, which is far too slow for a
single-threaded software renderer like Chocolate Doom's.

---

## Solution

### 1. Fixed internal resolution (960×540)

The game now renders internally at a fixed low resolution and the TV browser
upscales it to full screen.

`wasm/index.html`:

```js
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
// ...
"-width", GAME_WIDTH.toString(),
"-height", GAME_HEIGHT.toString()
```

960×540 is a good default: it is exactly 1/4 of 1080p, so the upscale is a
clean 2× integer scale on Full-HD TVs and still looks sharp on 4K.

### 2. Disable smooth pixel scaling

`wasm/chocolate-doom.cfg`:

```
smooth_pixel_scaling 0
```

This disables Chocolate Doom's bilinear smoothing of the internal framebuffer,
which saves a full-screen texture pass per frame.

### 3. CSS rendering hints

`wasm/index.html` uses `image-rendering: pixelated` plus GPU compositing hints
(`will-change: contents`, `transform: translateZ(0)`, `backface-visibility:
hidden`) so the upscale is done by the TV's GPU, not the CPU.

### 4. Emscripten memory flags

`Dockerfile`:

```
-s ALLOW_MEMORY_GROWTH=0     # fixed memory, no realloc stalls
-s INITIAL_MEMORY=268435456  # 256 MB, enough for Doom + WAD
-s STACK_SIZE=5242880        # 5 MB stack
```

`ALLOW_MEMORY_GROWTH=0` avoids the expensive memory-growth reallocations that
can cause frame hitches. 256 MB is plenty for Chocolate Doom (the shareware WAD
is ~4 MB).

---

## Tuning

If the game still feels slow on your TV, lower the internal resolution in
`wasm/index.html`:

| Resolution | Use case |
|------------|----------|
| `640` × `400` | Very slow TVs, maximum performance |
| `960` × `540` | Default – good balance |
| `1280` × `720` | Faster TVs, sharper image |

Higher values look sharper but cost more performance. The software renderer
scales roughly linearly with the pixel count.

---

## Tizen 5.5 compatibility (Chromium 69)

Tizen 5.5 (2020 sets) runs Chromium 69, which lacks BigInt, bulk memory and
modern JS syntax. The build therefore uses:

- `-s WASM_BIGINT=0` – no BigInt at the JS/WASM boundary
- `WASM_COMPAT="-mno-bulk-memory -mno-bulk-memory-opt -mno-sign-ext -mno-nontrapping-fptoint"`
- `wasm-opt` MVP lowering of the linked module
- Optional esbuild JS lowering (`--build-arg TIZEN55_COMPAT=1`) – **disabled by
  default** because it can break input handling on newer engines

These flags are about compatibility, not speed, but they are part of the build
configuration that determines what runs on which TV generation.

---

## Notes

- The audio settings (`snd_samplerate`, `snd_cachesize`) and `startup_delay`
  were part of PR #4 and are currently reverted to their defaults (see
  [remote-control-debugging.md](remote-control-debugging.md)).
- `smooth_pixel_scaling 0` is part of PR #3 and remains active.
