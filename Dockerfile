FROM ubuntu:22.04 AS base

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

# Install required packages and dependencies
RUN apt-get update && apt-get install -y \
	cmake \
	expect \
	git \
	ninja-build \
	python2 \
	unzip \
	wget \
	# nodejs \
	# npm \
	# zip \
	default-jre \
	&& rm -rf /var/lib/apt/lists/*

# Some of the Samsung Tizen scripts refer to `python`, but Ubuntu only provides `/usr/bin/python2`
RUN ln -sf /usr/bin/python2 /usr/bin/python

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
# These steps must be repeated each time before packaging an application
# See: <https://developer.tizen.org/forums/sdk-ide/pwd-fle-format-profile.xml-certificates> for more details
RUN sed -i 's|/home/doom/tizen-studio-data/keystore/author/doom.pwd||' /home/doom/tizen-studio-data/profile/profiles.xml
RUN sed -i 's|/home/doom/tizen-studio-data/tools/certificate-generator/certificates/distributor/tizen-distributor-signer.pwd|tizenpkcs12passfordsigner|' /home/doom/tizen-studio-data/profile/profiles.xml

# Install Samsung Emscripten SDK and configure Java path for closure compiler
RUN wget -nv -O emscripten-1.39.4.7-linux64.zip 'https://developer.samsung.com/smarttv/file/a5013a65-af11-4b59-844f-2d34f14d19a9'
RUN unzip emscripten-1.39.4.7-linux64.zip
WORKDIR emscripten-release-bundle/emsdk
RUN ./emsdk activate latest-fastcomp
RUN echo 'JAVA = "/usr/bin/java"' >> /home/doom/.emscripten

# Compile the source code and prepare the widget directory
WORKDIR /home/doom
COPY --chown=doom . ./doom-tizen
RUN cmake \
	-DCMAKE_TOOLCHAIN_FILE=/home/doom/emscripten-release-bundle/emsdk/fastcomp/emscripten/cmake/Modules/Platform/Emscripten.cmake \
	-G Ninja \
	-S doom-tizen \
	-B build
RUN cmake --build build
RUN cmake --install build --prefix build
RUN cp doom-tizen/res/icon.png build/widget/

# Sign and package the application into a WGT file using Expect to automate the interactive password prompts
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
	emscripten-1.39.4.7-linux64.zip \
	emscripten-release-bundle \
	.emscripten \
	.emscripten_cache \
	.emscripten_cache.lock \
	.emscripten_ports \
	.emscripten_sanity \
	# .npm \
	# wgt-to-usb \
	.wget-hsts

# Use a multi-stage build to reclaim space from deleted files
FROM ubuntu:22.04
COPY --from=base / /
USER doom
WORKDIR /home/doom

# Add Tizen Studio tools to PATH environment variable
ENV PATH=/home/doom/tizen-studio/tools/ide/bin:/home/doom/tizen-studio/tools:${PATH}
