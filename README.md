# Doom for Samsung Tizen TVs

A WebAssembly-powered port of Doom packaged as a Samsung Tizen TV application.  
This project uses the Cloudflare Doom WASM build and wraps it into a Tizen widget (`.wgt`) that runs directly on Samsung Smart TVs.

---

## Features

- Runs entirely on the TV (no streaming required)
- Based on the Cloudflare Doom WASM port
- Supports remote control, keyboard, and gamepads
- Optimized for Samsung Tizen TV devices
- Simple installation using the Samsung Jellyfin Installer

---

## Installation

The easiest way to install the generated `.wgt` file on your Samsung TV is by using:

### **Samsung Jellyfin Installer**  
https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer

Although designed for Jellyfin, the installer supports **any** Tizen widget and provides a streamlined installation workflow.

**Steps:**

1. Download and launch the Samsung Jellyfin Installer  
2. Enable Developer Mode on your TV and connect it to the installer  
3. Select the generated `Doom.wgt` file  
4. Install it onto the TV  
5. Launch Doom from the TV’s app menu

---

## Building

### Requirements

- Docker
- Git

### Build

Run the following command in the project directory:

```bash
docker build -t doom-tizen .

Credits
Doom © id Software
WASM port by Cloudflare
Installer by https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer
