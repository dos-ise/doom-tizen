# Building the WGT File

This document explains how the Tizen widget (`Doom.wgt`) is built and packaged.

---

## Overview

The build has three stages:

1. **Compile** Chocolate Doom to WebAssembly with Emscripten
2. **Package** the WebAssembly output as a Tizen web application
3. **Sign** and package it into a `.wgt` file with the Tizen Studio CLI

All of this happens inside a Docker image so the build is reproducible and does
not require a local Tizen Studio installation.

---

## Build pipeline

```
chocolate-doom (C source, submodule)
        │  emcmake / emmake (Emscripten)
        ▼
chocolate-doom.js + chocolate-doom.wasm
        │  copied into wasm/
        ▼
wasm/ (index.html, input.js, default.cfg, doom1.wad, ...)
        │  emcmake cmake (Tizen web app project)
        ▼
build/widget/ (Tizen widget directory)
        │  tizen package -t wgt (signs + packages)
        ▼
Doom.wgt
```

---

## Local build (Docker)

### Requirements
- Docker
- Git

### Quick build

**Windows:**
```batch
build.bat
```

**Linux/Mac:**
```bash
./build.sh
```

This runs the full pipeline and extracts `Doom.wgt` to the current directory.

### Manual build

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

### Tizen 5.5 variant

For Tizen 5.5 (Chromium 69) TVs, build with the compatibility flag:

```bash
docker build --build-arg TIZEN55_COMPAT=1 -t doom-tizen .
```

This enables the esbuild JS lowering step. It is **off by default** because it
can break input handling on newer engines.

---

## CI builds

### GitHub Actions

`.github/workflows/release-development.yml` builds the Docker image, extracts
`Doom.wgt` and creates a GitHub release. It can be triggered manually with
inputs:

- **version** – release version (e.g. `1.0`). Empty = timestamped pre-release.
- **tizen55** – `true` builds the Tizen 5.5 variant (`TIZEN55_COMPAT=1`).

```bash
# Trigger a versioned release build
gh workflow run release-development.yml --ref main -f version=1.0

# Trigger a Tizen 5.5 pre-release build
gh workflow run release-development.yml --ref main -f tizen55=true
```

### GitLab CI

`.gitlab-ci.yml` provides the same Docker-based build for GitLab, using
Docker-in-Docker. The `Doom.wgt` is published as a job artifact.

---

## What's inside the WGT

The widget contains the WebAssembly build of Chocolate Doom plus the web
frontend:

```
widget/
├── config.xml          # Tizen widget manifest
├── icon.png            # App icon
└── wasm/
    ├── index.html      # Game launcher (resolution, launch args)
    ├── input.js        # Remote control / gamepad handler
    ├── default.cfg     # Doom key bindings
    ├── chocolate-doom.cfg  # Extended config (display/audio)
    ├── chocolate-doom.js   # Emscripten JS glue
    ├── chocolate-doom.wasm # Compiled game
    └── doom1.wad       # Doom Shareware
```

---

## Signing

The Dockerfile creates a self-signed author certificate and a security profile
(`doom`) with password `1234`, then signs the widget with:

```
tizen package -t wgt -- build/widget
```

The signing is only needed for packaging; the resulting `.wgt` can be installed
on a TV in developer mode (e.g. with the Samsung Jellyfin Installer).
