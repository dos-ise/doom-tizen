'use strict';

// Tizen TV Key Mapping
const TizenKeys = {
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    13: 'Enter',
    10009: 'Back',
    427: 'ColorF0Red',
    428: 'ColorF1Green',
    429: 'ColorF2Yellow',
    430: 'ColorF3Blue',
    415: 'MediaPlay',
    19: 'MediaPause',
    412: 'MediaRewind',
    417: 'MediaFastForward'
};

// Tizen-spezifische Initialisierung
function initTizen() {
    try {
        if (window.tizen && tizen.tvinputdevice) {
            // Registriere benötigte Keys
            var supportedKeys = [
                'MediaPlay',
                'MediaPause',
                'MediaRewind',
                'MediaFastForward',
                'ColorF0Red',
                'ColorF1Green',
                'ColorF2Yellow',
                'ColorF3Blue'
            ];
            supportedKeys.forEach(function (key) {
                tizen.tvinputdevice.registerKey(key);
            });
            console.log('Tizen keys registered');
        }

        if (window.tizen && tizen.power) {
            tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            console.log('Tizen power management activated');
        }
    } catch (e) {
        console.log('Tizen API not available:', e);
    }
}

// Samsung Remote Control Handler
function setupRemoteControl() {
    console.log('Setting up remote control');

    var canvasElement = document.getElementById('canvas');

    // Simuliere Tastendruck im Canvas
    function simulateKey(key, type) {
        var event = new KeyboardEvent(type, {
            key: key,
            code: key,
            keyCode: getKeyCode(key),
            which: getKeyCode(key),
            bubbles: true,
            cancelable: true
        });
        canvasElement.dispatchEvent(event);
    }

    // Simuliere mehrere Tasten gleichzeitig
    function simulateMultipleKeys(keys, type) {
        keys.forEach(function (key) {
            simulateKey(key, type);
        });
    }

    function getKeyCode(key) {
        var keyCodes = {
            'ArrowLeft': 37,
            'ArrowUp': 38,
            'ArrowRight': 39,
            'ArrowDown': 40,
            'Enter': 13,
            ' ': 32,
            'Escape': 27,
            'y': 89,
            'Y': 89,
            'n': 78,
            'N': 78,
            'Control': 17,
            'Shift': 16,
            'Tab': 9,
            '1': 49,
            '2': 50,
            '3': 51,
            '4': 52,
            ',': 188,
            '.': 190
        };
        return keyCodes[key] || 0;
    }

    // Haupt-Tastatur-Handler
    document.addEventListener('keydown', function (e) {
        console.log('Key down:', e.keyCode, e.key);

        var mappedKey = null;
        var mappedKeys = null; // Für mehrere Tasten

        // Standard-Tasten durchreichen (A-Z, 0-9)
        if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 48 && e.keyCode <= 57)) {
            canvasElement.focus();
            return; // Lass normale Buchstaben und Zahlen durch
        }

        // Samsung TV Remote Mapping
        switch (e.keyCode) {
            case 37: // LEFT
                mappedKey = 'ArrowLeft';
                break;
            case 38: // UP
                mappedKey = 'ArrowUp';
                break;
            case 39: // RIGHT
                mappedKey = 'ArrowRight';
                break;
            case 40: // DOWN
                mappedKey = 'ArrowDown';
                break;
            case 13: // OK/ENTER - Schießen (Space), Bestätigen (Enter) UND 'y' für Quit
                mappedKeys = [' ', 'Enter', 'y'];
                break;
            case 10009: // RETURN/BACK - ESC Menu
                mappedKey = 'Escape';
                break;
            case 427: // RED - Weapon 1
                mappedKey = '1';
                break;
            case 428: // GREEN - Weapon 2
                mappedKey = '2';
                break;
            case 429: // YELLOW - Weapon 3
                mappedKey = '3';
                break;
            case 430: // BLUE - Weapon 4
                mappedKey = '4';
                break;
            case 415: // PLAY - Map
                mappedKey = 'Tab';
                break;
            case 412: // REWIND - Strafe left
                mappedKey = ',';
                break;
            case 417: // FORWARD - Strafe right
                mappedKey = '.';
                break;
        }

        if (mappedKeys) {
            e.preventDefault();
            e.stopPropagation();
            simulateMultipleKeys(mappedKeys, 'keydown');
            console.log('Mapped', e.keyCode, 'to multiple keys:', mappedKeys);
        } else if (mappedKey) {
            e.preventDefault();
            e.stopPropagation();
            simulateKey(mappedKey, 'keydown');
            console.log('Mapped', e.keyCode, 'to', mappedKey);
        }

        canvasElement.focus();
    });

    document.addEventListener('keyup', function (e) {
        var mappedKey = null;
        var mappedKeys = null;

        switch (e.keyCode) {
            case 37: mappedKey = 'ArrowLeft'; break;
            case 38: mappedKey = 'ArrowUp'; break;
            case 39: mappedKey = 'ArrowRight'; break;
            case 40: mappedKey = 'ArrowDown'; break;
            case 13: mappedKeys = [' ', 'Enter', 'y']; break;
            case 10009: mappedKey = 'Escape'; break;
            case 427: mappedKey = '1'; break;
            case 428: mappedKey = '2'; break;
            case 429: mappedKey = '3'; break;
            case 430: mappedKey = '4'; break;
            case 415: mappedKey = 'Tab'; break;
            case 412: mappedKey = ','; break;
            case 417: mappedKey = '.'; break;
        }

        if (mappedKeys) {
            e.preventDefault();
            e.stopPropagation();
            simulateMultipleKeys(mappedKeys, 'keyup');
        } else if (mappedKey) {
            e.preventDefault();
            e.stopPropagation();
            simulateKey(mappedKey, 'keyup');
        }
    });
}

// Auto-init wenn verfügbar
if (typeof window !== 'undefined') {
    initTizen();
}