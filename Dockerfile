FROM ubuntu:22.04 AS base

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

# Install required packages and dependencies
RUN apt-get update && apt-get install -y \
	cmake \
	expect \
	git \
	ninja-build \
	python3 \
	unzip \
	wget \
	xz-utils \
	default-jre \
	&& rm -rf /var/lib/apt/lists/*

# Create a non-root user and set up the working directory
RUN useradd -m -s /bin/bash doom
USER doom
WORKDIR /home/doom

# Install Tizen Studio CLI and configure the toolchain path
RUN wget -nv -O web-cli_Tizen_Studio_6.1_ubuntu-64.bin 'https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_ubuntu-64.bin'
RUN chmod a+x web-cli_Tizen_Studio_6.1_ubuntu-64.bin
RUN ./web-cli_Tizen_Studio_6.1_ubuntu-64.bin --accept-license --no-java-check /home/doom/tizen-studio
ENV PATH=/home/doom/tizen-studio/tools/ide/bin:/home/doom/tizen-studio/tools:${PATH}

# Prepare the Tizen certificate and security profiles for signing the application package
RUN tizen certificate \
	-a doom \
	-f doom \
	-p 1234
RUN tizen security-profiles add \
	-n doom \
	-a /home/doom/tizen-studio-data/keystore/author/doom.p12 \
	-p 1234

# Workaround to package applications without gnome-keyring
RUN sed -i 's|/home/doom/tizen-studio-data/keystore/author/doom.pwd||' /home/doom/tizen-studio-data/profile/profiles.xml
RUN sed -i 's|/home/doom/tizen-studio-data/tools/certificate-generator/certificates/distributor/tizen-distributor-signer.pwd|tizenpkcs12passfordsigner|' /home/doom/tizen-studio-data/profile/profiles.xml

# Install official Emscripten SDK
RUN git clone https://github.com/emscripten-core/emsdk.git /home/doom/emsdk
WORKDIR /home/doom/emsdk

RUN ./emsdk install latest
RUN ./emsdk activate latest
RUN echo 'source /home/doom/emsdk/emsdk_env.sh' >> /home/doom/.bashrc

# Compile the source code and prepare the widget directory
WORKDIR /home/doom
COPY --chown=doom . ./doom-tizen

WORKDIR /home/doom/doom-tizen
RUN git submodule update --init --recursive

# Build chocolate-doom using Emscripten with Tizen-optimized flags
WORKDIR /home/doom/doom-tizen/chocolate-doom

# FIX: Ersetze Windows-spezifische String-Funktionen
RUN sed -i 's/stricmp/strcasecmp/g' src/doomtype.h
RUN sed -i 's/strnicmp/strncasecmp/g' src/doomtype.h

# Optimierte Flags für Tizen (OHNE preload-file)
ENV EMSCRIPTEN_FLAGS="\
-s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
-s INITIAL_MEMORY=67108864 \
-s MAXIMUM_MEMORY=268435456 \
-s STACK_SIZE=5242880 \
-s EXPORTED_FUNCTIONS=['_main'] \
-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','FS','FS_createPreloadedFile'] \
-s MODULARIZE=0 \
-s EXPORT_NAME='Module' \
-s ENVIRONMENT='web' \
-s FILESYSTEM=1 \
-s FORCE_FILESYSTEM=1 \
-s EXIT_RUNTIME=0 \
-s ASSERTIONS=0 \
-s DISABLE_EXCEPTION_CATCHING=1"

ENV CFLAGS="-O3 -flto"
ENV CXXFLAGS="-O3 -flto"
ENV LDFLAGS="$EMSCRIPTEN_FLAGS -O3 -flto"

RUN bash -lc "source /home/doom/emsdk/emsdk_env.sh && \
    emcmake cmake \
        -DCMAKE_BUILD_TYPE=Release \
        -DWITH_SDL_MIXER=OFF \
        -DWITH_SDL_NET=OFF \
        -DCMAKE_C_FLAGS=\"$CFLAGS\" \
        -DCMAKE_CXX_FLAGS=\"$CXXFLAGS\" \
        -DCMAKE_EXE_LINKER_FLAGS=\"$LDFLAGS\" \
        -G Ninja \
        -S . \
        -B build"

RUN bash -lc "source /home/doom/emsdk/emsdk_env.sh && \
    emmake ninja -C build"

# Copy compiled files
RUN cp /home/doom/doom-tizen/chocolate-doom/build/src/chocolate-doom.js /home/doom/doom-tizen/wasm/
RUN cp /home/doom/doom-tizen/chocolate-doom/build/src/chocolate-doom.wasm /home/doom/doom-tizen/wasm/

WORKDIR /home/doom

RUN bash -lc "source /home/doom/emsdk/emsdk_env.sh && \
    emcmake cmake \
        -G Ninja \
        -S doom-tizen \
        -B build"
RUN bash -lc "source /home/doom/emsdk/emsdk_env.sh && \
    cmake --build build"
RUN bash -lc "source /home/doom/emsdk/emsdk_env.sh && \
    cmake --install build --prefix build"
RUN cp doom-tizen/res/icon.png build/widget/

# Sign and package the application into a WGT file
RUN echo \
	'set timeout -1\n' \
	'spawn tizen package -t wgt -- build/widget\n' \
	'expect "Author password:"\n' \
	'send -- "1234\\r"\n' \
	'expect "Yes: (Y), No: (N) ?"\n' \
	'send -- "N\\r"\n' \
	'expect eof\n' \
| expect

RUN mv build/widget/Doom.wgt .

# Clean up unnecessary files to reduce image size
RUN rm -rf \
	build \
	doom-tizen \
	web-cli_Tizen_Studio_6.1_ubuntu-64.bin \
	tizen-package-expect.sh \
	.package-manager \
	emsdk \
	.wget-hsts

# Use a multi-stage build to reclaim space from deleted files
FROM ubuntu:22.04
COPY --from=base /home/doom/Doom.wgt /home/doom/Doom.wgt
COPY --from=base /home/doom/tizen-studio /home/doom/tizen-studio
COPY --from=base /home/doom/tizen-studio-data /home/doom/tizen-studio-data

RUN useradd -m -s /bin/bash doom
RUN chown -R doom:doom /home/doom

USER doom
WORKDIR /home/doom

# Add Tizen Studio tools to PATH environment variable
ENV PATH=/home/doom/tizen-studio/tools/ide/bin:/home/doom/tizen-studio/tools:${PATH}