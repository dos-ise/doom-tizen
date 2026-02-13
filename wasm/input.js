'use strict';

console.log('input.js loaded');

// Samsung TV Key Codes
var tvKey = {
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_ENTER: 13,
    KEY_RETURN: 10009,
    KEY_RED: 403,
    KEY_GREEN: 404,
    KEY_YELLOW: 405,
    KEY_BLUE: 406,
    KEY_PLAY: 415,
    KEY_PAUSE: 19,
    KEY_REWIND: 412,
    KEY_FAST_FORWARD: 417,
    KEY_CHANNEL_UP: 427,
    KEY_CHANNEL_DOWN: 428
};

// Tizen-spezifische Initialisierung
function initTizen() {
    console.log('initTizen() called');
    try {
        if (window.tizen && tizen.tvinputdevice) {
            var supportedKeys = [
                'ColorF0Red',
                'ColorF1Green',
                'ColorF2Yellow',
                'ColorF3Blue',
                'MediaPlay',
                'MediaPause',
                'MediaRewind',
                'MediaFastForward'
            ];
            supportedKeys.forEach(function (key) {
                try {
                    tizen.tvinputdevice.registerKey(key);
                    console.log('Registered key:', key);
                } catch (e) {
                    console.log('Failed to register key:', key, e);
                }
            });
        }

        if (window.tizen && tizen.power) {
            tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            console.log('Tizen power management activated');

            setInterval(function () {
                tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            }, 30000);
        }
    } catch (e) {
        console.log('Tizen API error:', e);
    }
}

// Samsung Remote Control Handler
function setupRemoteControl() {
    console.log('setupRemoteControl() called');

    var canvasElement = document.getElementById('canvas');

    if (!canvasElement) {
        console.error('Canvas element not found!');
        return;
    }

    console.log('Canvas element found');

    // Erstelle KeyboardEvent
    function createKeyEvent(type, keyCode, key) {
        var event;
        try {
            event = new KeyboardEvent(type, {
                key: key,
                code: key,
                keyCode: keyCode,
                which: keyCode,
                charCode: keyCode,
                bubbles: true,
                cancelable: true,
                view: window
            });
        } catch (e) {
            event = document.createEvent('KeyboardEvent');
            if (event.initKeyboardEvent) {
                event.initKeyboardEvent(type, true, true, window, key, 0, '', false, '');
            }
            Object.defineProperty(event, 'keyCode', { get: function () { return keyCode; } });
            Object.defineProperty(event, 'which', { get: function () { return keyCode; } });
        }
        return event;
    }

    // Key-Mapping Tabelle - EINE Taste pro Funktion!
    var keyMappings = {
        // Navigation - Pfeiltasten werden durchgelassen (siehe unten)

        // OK -> Enter (Menü bestätigen)
        13: { keyCode: 13, key: 'Enter' },
        32: { keyCode: 13, key: 'Enter' },

        // RETURN -> Escape (Zurück/Menü)
        10009: { keyCode: 27, key: 'Escape' },

        // CHANNEL UP -> Space (Schießen)
        427: { keyCode: 32, key: ' ' },

        // CHANNEL DOWN -> Y (Quit bestätigen)
        428: { keyCode: 89, key: 'y' },

        // Farbtasten -> Waffen
        403: { keyCode: 49, key: '1' },  // RED -> Waffe 1
        404: { keyCode: 50, key: '2' },  // GREEN -> Waffe 2
        405: { keyCode: 51, key: '3' },  // YELLOW -> Waffe 3
        406: { keyCode: 52, key: '4' },  // BLUE -> Waffe 4

        // Media-Tasten
        415: { keyCode: 9, key: 'Tab' },     // PLAY -> Map
        412: { keyCode: 188, key: ',' },     // REWIND -> Strafe links
        417: { keyCode: 190, key: '.' }      // FAST FORWARD -> Strafe rechts
    };

    document.addEventListener('keydown', function (e) {
        console.log('=== KEYDOWN ===');
        console.log('keyCode:', e.keyCode, 'key:', e.key);

        // Pfeiltasten (37-40) durchlassen - für Bewegung
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            console.log('Arrow key - passing through');
            return;
        }

        // Buchstaben (A-Z) und Zahlen (0-9) durchlassen
        if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 48 && e.keyCode <= 57)) {
            console.log('Letter/number - passing through');
            return;
        }

        var mapping = keyMappings[e.keyCode];

        if (mapping) {
            console.log('Mapping', e.keyCode, 'to', mapping.keyCode, mapping.key);
            e.preventDefault();
            e.stopPropagation();

            var newEvent = createKeyEvent('keydown', mapping.keyCode, mapping.key);
            canvasElement.dispatchEvent(newEvent);
            console.log('Event dispatched');
        } else {
            console.log('No mapping for', e.keyCode, '- passing through');
        }
    }, true);

    document.addEventListener('keyup', function (e) {
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            return;
        }

        if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 48 && e.keyCode <= 57)) {
            return;
        }

        var mapping = keyMappings[e.keyCode];

        if (mapping) {
            e.preventDefault();
            e.stopPropagation();

            var newEvent = createKeyEvent('keyup', mapping.keyCode, mapping.key);
            canvasElement.dispatchEvent(newEvent);
        }
    }, true);
}

// Auto-init
if (typeof window !== 'undefined') {
    initTizen();
}

console.log('input.js finished loading');