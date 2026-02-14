'use strict';

console.log('input.js loaded');

// ============================================================================
// TIZEN POWER MANAGEMENT
// ============================================================================

function initTizen() {
    console.log('%c[input.js, initTizen]', 'color: green;', 'Initializing Tizen...');

    try {
        if (window.tizen && tizen.power) {
            tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            console.log('%c[input.js, initTizen]', 'color: green;', '✓ Power management activated');

            setInterval(function () {
                tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            }, 30000);
        }
    } catch (e) {
        console.error('%c[input.js, initTizen]', 'color: green;', 'Tizen error:', e);
    }
}

// ============================================================================
// SAMSUNG TV REMOTE CONTROL
// ============================================================================

function initSamsungKeys() {
    console.log('%c[input.js, initSamsungKeys]', 'color: green;', 'Registering Samsung TV keys...');

    try {
        if (window.tizen && tizen.tvinputdevice) {
            var keysToRegister = [
                'ColorF0Red',
                'ColorF1Green',
                'ColorF2Yellow',
                'ColorF3Blue',
                'ChannelUp',
                'ChannelDown',
                'MediaPlay',
                'MediaRewind',
                'MediaFastForward'
            ];

            keysToRegister.forEach(function (key) {
                try {
                    tizen.tvinputdevice.registerKey(key);
                    console.log('%c[input.js, initSamsungKeys]', 'color: green;', '✓ Registered:', key);
                } catch (e) {
                    console.log('%c[input.js, initSamsungKeys]', 'color: orange;', '✗ Failed:', key);
                }
            });
        }
    } catch (e) {
        console.error('%c[input.js, initSamsungKeys]', 'color: green;', 'Registration error:', e);
    }
}

// Key mapping: Samsung Remote -> Keyboard
var keyMapping = {
    13: 13,    // OK -> Enter (Menu bestätigen)
    427: 17,   // CHANNEL UP -> Ctrl (Schießen)
    428: 32,   // CHANNEL DOWN -> Space (Use/Türen)
    403: 49,   // RED -> 1
    404: 50,   // GREEN -> 2
    405: 51,   // YELLOW -> 3
    406: 52,   // BLUE -> 4
    415: 9,    // PLAY -> Tab (Map)
    412: 188,  // REWIND -> , (Strafe left)
    417: 190,  // FAST FORWARD -> . (Strafe right)
    10009: 27  // RETURN -> ESC
};

function handleRemoteKeys() {
    console.log('%c[input.js, handleRemoteKeys]', 'color: green;', 'Setting up remote key handler...');

    document.addEventListener('keydown', function (e) {
        console.log('%c[input.js]', 'color: gray;', 'Key down:', e.keyCode);

        // Lass Arrow keys, Enter, ESC, Space, Ctrl, Buchstaben und Zahlen IMMER durch
        if (
            (e.keyCode >= 37 && e.keyCode <= 40) ||  // Arrows
            e.keyCode === 13 ||                       // Enter
            e.keyCode === 27 ||                       // ESC
            e.keyCode === 32 ||                       // Space
            e.keyCode === 17 ||                       // Ctrl
            (e.keyCode >= 65 && e.keyCode <= 90) ||   // A-Z
            (e.keyCode >= 48 && e.keyCode <= 57)      // 0-9
        ) {
            console.log('%c[input.js]', 'color: blue;', 'Pass through:', e.keyCode);
            return; // Nicht abfangen!
        }

        // Mappe Samsung Remote Keys
        var mappedKey = keyMapping[e.keyCode];
        if (mappedKey !== undefined) {
            console.log('%c[input.js]', 'color: green;', 'Mapped:', e.keyCode, '->', mappedKey);

            e.preventDefault();
            e.stopPropagation();

            // Erstelle neues Event
            var newEvent = new KeyboardEvent('keydown', {
                keyCode: mappedKey,
                which: mappedKey,
                bubbles: true,
                cancelable: true
            });

            document.dispatchEvent(newEvent);
        }
    });

    document.addEventListener('keyup', function (e) {
        // Lass standard keys durch
        if (
            (e.keyCode >= 37 && e.keyCode <= 40) ||
            e.keyCode === 13 ||
            e.keyCode === 27 ||
            e.keyCode === 32 ||
            e.keyCode === 17 ||
            (e.keyCode >= 65 && e.keyCode <= 90) ||
            (e.keyCode >= 48 && e.keyCode <= 57)
        ) {
            return;
        }

        var mappedKey = keyMapping[e.keyCode];
        if (mappedKey !== undefined) {
            e.preventDefault();
            e.stopPropagation();

            var newEvent = new KeyboardEvent('keyup', {
                keyCode: mappedKey,
                which: mappedKey,
                bubbles: true,
                cancelable: true
            });

            document.dispatchEvent(newEvent);
        }
    });
}

// ============================================================================
// SETUP
// ============================================================================

function setupRemoteControl() {
    console.log('%c[input.js, setupRemoteControl]', 'color: green;', '=== INITIALIZING ===');

    initTizen();
    initSamsungKeys();
    handleRemoteKeys();

    console.log('%c[input.js]', 'color: green;', '✓ Setup complete');
    console.log('%c[input.js]', 'color: green;', '=== CONTROLS ===');
    console.log('OK → Enter (Menu)');
    console.log('CHANNEL UP → Ctrl (Fire)');
    console.log('CHANNEL DOWN → Space (Use/Doors)');
    console.log('Arrow Keys → Movement');
    console.log('RED/GREEN/YELLOW/BLUE → Weapons 1-4');
    console.log('RETURN → ESC');
}

console.log('input.js loaded successfully');