# Doom for Samsung Tizen TVs

A WebAssembly-powered port of Chocolate Doom packaged as a Samsung Tizen TV application.  
This project uses Chocolate Doom compiled to WebAssembly via Emscripten and wraps it into a Tizen widget (`.wgt`) that runs directly on Samsung Smart TVs.

---

## Features

- Runs entirely on the TV (no streaming required)
- Based on Chocolate Doom (faithful to the original)
- Includes Doom Shareware (doom1.wad) by default
- Supports Samsung TV remote control mapping
- Optimized for Samsung Tizen TV devices
- Simple installation using the Samsung Jellyfin Installer

---

## Installation

### 1. Enable Developer Mode on your TV

1. From the Apps screen, press `1 2 3 4 5` on the remote
2. Toggle **Developer Mode = ON**
3. Enter your PC's LAN IP in **Host PC IP**
4. Reboot the TV

### 2. Install the `.wgt`


#### Install with Apps2Samsung
The easiest way to install the generated `.wgt` file on your Samsung TV is by using Apps2Samsung:
Download the latest version from [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases/latest) choose Tizen Community as release and choose doom.
Launch Doom from the TV's app menu

---

## Building

### Requirements
- Docker
- Git

### Quick Build

Run the build script to compile and extract the `.wgt` file:

**Windows:**
```batch
build.bat
```

**Linux/Mac:**
```bash
./build.sh
```

This will:
1. Build the Docker image with Chocolate Doom compiled to WebAssembly
2. Package it as a Tizen widget
3. Extract `Doom.wgt` to the current directory

### Manual Build

If you prefer to build manually:

```bash
# Build the Docker image
docker build -t doom-tizen .

# Create and start a temporary container
docker create --name doom-tmp doom-tizen
docker start doom-tmp

# Extract the .wgt file
docker cp doom-tmp:/home/doom/Doom.wgt .

# Clean up
docker stop doom-tmp
docker rm doom-tmp
```

---

## Using the Full Version

By default, this build includes the **Doom Shareware** (`doom1.wad`).

To play the full version:

1. Replace `wasm/doom1.wad` with your registered copy of Doom
2. Run the build script again:
   ```bash
   build.bat  # or ./build.sh
   ```
3. Install the new `Doom.wgt` file on your TV

**Note:** You must own a legitimate copy of Doom to use the full game data.

---

## Performance

Doom renders internally at a low resolution (960×540 by default) and is upscaled
to full screen by the TV browser. This keeps the software renderer fast on
Tizen TV hardware.

If the game still feels slow on your TV, lower the internal resolution in
`wasm/index.html` (constants `GAME_WIDTH` / `GAME_HEIGHT`, e.g. `640` × `400`).
Higher values (e.g. `1280` × `720`) look sharper but cost more performance.

---

## Controls
### Samsung TV Remote
| Button | Action |
|--------|--------|
| **Arrow Keys** | Move forward/back, turn left/right |
| **OK** | Confirm in menus |
| **RETURN** | Open ESC menu |
| **CHANNEL UP** | Fire weapon |
| **CHANNEL DOWN** | Confirm quit (Y) |
| **Red** | Weapon 1 |
| **Green** | Weapon 2 |
| **Yellow** | Weapon 3 |
| **Blue** | Weapon 4 |
| **Play** | Show map |
| **Rewind** | Strafe left |
| **Fast Forward** | Strafe right |

### Controller
| Button | Action |
|--------|--------|
| **D-Pad / Left Stick** | Move forward/back, turn left/right |
| **A** | Use / confirm in menus |
| **B** | Fire weapon |
| **X** | Show map |
| **Y** | Open ESC menu |
| **Back** | Open ESC menu |
| **Start** | Confirm in menus |
| **LB** | Strafe left |
| **RB** | Strafe right |
---

## Project Structure

```
doom-tizen/
├── chocolate-doom/     # Chocolate Doom as Git submodule
├── wasm/              # WebAssembly build output
│   ├── doom1.wad      # Doom Shareware WAD
│   ├── default.cfg    # Doom configuration
│   ├── index.html     # Game launcher
│   └── input.js       # Remote control handler
├── Dockerfile         # Build configuration
└── build.bat/sh       # Build scripts
```

---

## Credits

- **Doom** © id Software
- **Chocolate Doom** - https://github.com/chocolate-doom/chocolate-doom
- **Emscripten Support** - This project is made possible by the excellent work of **jbaicoianu (James Baicoianu)** who added Emscripten build target support to Chocolate Doom:  
  [PR #1717 - Emscripten build target support](https://github.com/chocolate-doom/chocolate-doom/pull/1717)
- **Tizen Installer** - https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer
- **Emscripten** - https://emscripten.org/

---

## License

This project respects the licenses of all included software:
- Chocolate Doom is licensed under GPL v2
- Doom Shareware is freely redistributable
- Original Doom game data requires a legitimate copy