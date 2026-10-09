# Performance Optimization

**Status:** Applied (PR #3 + PR #12)
**Date:** 2026-10-08

---

## Problem

The game was rendered at the full TV resolution (`-width window.innerWidth
-height window.innerHeight`). On a 4K Tizen TV this means the software renderer
had to fill ~8.3 million pixels per frame, which is far too slow for a
single-threaded software renderer like Chocolate Doom's.

---

## Solution

### 1. Game Mode (biggest win, from moonlight-tizen)

Samsung TVs have a **Game Mode** that disables all post-processing (motion
smoothing, noise reduction, sharpening) and reduces input latency. It is
activated per-app via metadata in `config.xml`:

```xml
<tizen:metadata key="http://samsung.com/tv/metadata/use.game.mode" value="true"/>
```

This is the single biggest performance lever for Samsung TVs. The idea comes
from [moonlight-tizen](https://github.com/brightcraft/moonlight-tizen), which
injects the same metadata (via a `FORCE_GAME_MODE` build arg).

### 2. Fixed internal resolution (960×540)

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

### 3. Disable smooth pixel scaling

`wasm/chocolate-doom.cfg`:

```
smooth_pixel_scaling 0
```

This disables Chocolate Doom's bilinear smoothing of the internal framebuffer,
which saves a full-screen texture pass per frame.

### 4. Audio settings

`wasm/chocolate-doom.cfg`:

```
snd_samplerate 44100
snd_cachesize 33554432
snd_pitchshift 1
```

- 44.1 kHz sample rate for good sound effect quality
- 32 MB sound cache to avoid cut-off sounds
- Pitch shifting enabled for more dynamic sound effects

### 5. Music (OPL FM synthesis)

Music is enabled via the OPL3 emulator (`snd_musicdevice 3` = Sound Blaster),
the authentic DOS Doom sound. The `chocolate-doom` submodule update
significantly improved the OPL3 emulator (`opl3.c`). No `-nomusic` flag.

### 6. CSS rendering hints

`wasm/index.html` uses `image-rendering: pixelated` plus GPU compositing hints
(`will-change: contents`, `transform: translateZ(0)`, `backface-visibility:
hidden`) so the upscale is done by the TV's GPU, not the CPU.

### 7. Emscripten memory flags

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

## Important: which config file holds which settings

Chocolate Doom splits its config into two files (see `m_config.c`):

| File | Collection | Loaded via | Contains |
|------|-----------|------------|----------|
| `default.cfg` | `doom_defaults_list` (line 121) | `-config` | Movement/weapon key bindings, mouse, joystick, volume |
| `chocolate-doom.cfg` | `extra_defaults_list` (line 701) | `-extraconfig` | Video (smooth_pixel_scaling, aspect_ratio), audio (snd_samplerate, snd_cachesize), menu/map keys, gamepad |

**The performance settings (`smooth_pixel_scaling`, `snd_samplerate`,
`snd_cachesize`) belong to the EXTRA config and are only active when
`-extraconfig chocolate-doom.cfg` is passed.** After the PR #4 revert removed
`-extraconfig`, these settings were silently inactive. They were re-enabled in
PR #12 (the config contains only the original key bindings that are known to
work).

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

## Evaluation: Samsung Emscripten SDK (not adopted)

[moonlight-tizen](https://github.com/brightcraft/moonlight-tizen) uses
Samsung's customized Emscripten SDK (fastcomp 1.39.4.7) with the
`ENVIRONMENT_MAY_BE_TIZEN` flag instead of modern upstream Emscripten.

**Why we did NOT switch:** the fastcomp backend is from 2020 and generates
slower code than the modern upstream LLVM backend for CPU-bound code. Doom's
software renderer is exactly such a workload, so switching would likely make
performance *worse*. The Samsung SDK's advantage is Tizen compatibility, not
speed. We keep modern upstream Emscripten with `-O3 -flto`.

Other moonlight-tizen techniques that do not apply to Doom:
- `-Os` (size optimization) – we use `-O3` (speed), correct for a game
- pthreads / Web Workers – used for the streaming pipeline; Doom's renderer is
  single-threaded
- ccache – build-time only

---

## Notes

- **SDL2_mixer must be enabled** (`ENABLE_SDL2_MIXER=ON` + `-s USE_SDL=2` +
  `-s USE_SDL_MIXER=2`): the SDL sound module (`i_sdlsound.c`) genuinely uses
  SDL2_mixer (`Mix_Chunk`, `Mix_PlayChannel`). Disabling SDL2_mixer defines
  `DISABLE_SDL2MIXER`, which excludes the whole SDL sound module and leaves only
  PC speaker emulation (no sound). This broke sound in PR #5 when the Dockerfile
  flag was renamed from the ignored `WITH_SDL_MIXER=OFF` to the effective
  `ENABLE_SDL2_MIXER=OFF`. Note: the Emscripten settings are `USE_SDL` and
  `USE_SDL_MIXER` (not `USE_SDL2`/`USE_SDL2_MIXER` – those don't exist and fail
  the build).
- The audio settings (`snd_samplerate`, `snd_cachesize`) and `startup_delay`
  were part of PR #4 and are currently reverted to their defaults (see
  [remote-control-debugging.md](remote-control-debugging.md)).
- `smooth_pixel_scaling 0` is part of PR #3 and remains active.
