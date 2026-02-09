cmake_minimum_required(VERSION 3.13)
project(doomwasm LANGUAGES C CXX)

# Emscripten Output Files (bereits vorhanden im Source-Verzeichnis)
set(EMSCRIPTEN_OUTPUT_FILES
    "${CMAKE_CURRENT_SOURCE_DIR}/wasm/websockets-doom.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/wasm/websockets-doom.wasm"
    "${CMAKE_CURRENT_SOURCE_DIR}/wasm/websockets-doom.wasm.map"
)

# Installiere die fertigen WASM/JS Dateien
install(FILES ${EMSCRIPTEN_OUTPUT_FILES} DESTINATION widget)

# Statische Dateien
install(DIRECTORY wasm/static DESTINATION widget)
install(DIRECTORY wasm/platform DESTINATION widget)

install(FILES wasm/doom1.wad DESTINATION widget)
install(FILES wasm/default.cfg DESTINATION widget)

# HTML
install(FILES wasm/index.html DESTINATION widget)

# Tizen Dateien
install(FILES res/config.xml DESTINATION widget)
install(FILES res/icon.png DESTINATION widget)
install(FILES res/platform.js DESTINATION widget)
