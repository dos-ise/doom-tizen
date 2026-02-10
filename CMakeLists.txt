cmake_minimum_required(VERSION 3.13)
project(doomwasm LANGUAGES C CXX)

install(DIRECTORY wasm/ DESTINATION widget
    FILES_MATCHING
    PATTERN "*.js"
    PATTERN "*.wasm"
    PATTERN "*.map"
    PATTERN "*.html"
    PATTERN "*.cfg"
    PATTERN "*.wad"
    PATTERN "static/*"
    PATTERN "platform/*"
)

# Tizen Dateien
install(FILES res/config.xml DESTINATION widget)
install(FILES res/icon.png DESTINATION widget)
