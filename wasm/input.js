document.addEventListener('keydown', (e) => {
    // Doom nutzt SDL-Scancodes, nicht Browser-Keycodes
    // Wir simulieren SDL-Keyboard-Events über Emscripten

    if (!Module || !Module._SDL_SendKeyboardKey) {
        return;
    }

    // SDL key event types
    const SDL_PRESSED = 1;

    switch (e.keyCode) {
        case 37: // LEFT
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x50);
            break;

        case 38: // UP
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x52);
            break;

        case 39: // RIGHT
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x4F);
            break;

        case 40: // DOWN
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x51);
            break;

        case 13: // OK / ENTER
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x28);
            break;

        case 32: // SPACE / FIRE
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x2C);
            break;

        case 10009: // RETURN (Samsung)
            Module._SDL_SendKeyboardKey(SDL_PRESSED, 0x29);
            break;
    }
});
