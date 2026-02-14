'use strict';

console.log('input.js loaded');

// Samsung TV Key Codes (from official SDK)
var tvKey = {
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_ENTER: 13,
    KEY_RETURN: 10009,
    KEY_CHANNEL_UP: 427,
    KEY_CHANNEL_DOWN: 428,
    KEY_RED: 403,
    KEY_GREEN: 404,
    KEY_YELLOW: 405,
    KEY_BLUE: 406,
    KEY_PLAY: 415,
    KEY_PAUSE: 19,
    KEY_REWIND: 412,
    KEY_FAST_FORWARD: 417
};

// Initialize Samsung TV remote control keys
function initSamsungKeys() {
    console.log('%c[input.js, initSamsungKeys]', 'color: green;', 'Initializing TV keys...');

    var handler = {
        initRemoteController: true,
        buttonsToRegister: [
            'ColorF0Red',
            'ColorF1Green',
            'ColorF2Yellow',
            'ColorF3Blue',
            'ChannelUp',
            'ChannelDown',
            'MediaPlay',
            'MediaRewind',
            'MediaFastForward'
        ],
        onKeydownListener: remoteControllerHandler
    };

    console.log('%c[input.js, initSamsungKeys]', 'color: green;', 'Initializing TV platform...');
    platformOnLoad(handler);
}

// Remote controller event handler
function remoteControllerHandler(e) {
    var keyCode = e.keyCode;
    console.log('%c[input.js, remoteControllerHandler]', 'color: green;', 'Key pressed:', keyCode);

    // Pfeiltasten durchlassen (37-40)
    if (keyCode >= 37 && keyCode <= 40) {
        console.log('%c[input.js, remoteControllerHandler]', 'color: green;', 'Arrow key, passing through');
        return;
    }

    // Buchstaben/Zahlen durchlassen
    if ((keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57)) {
        console.log('%c[input.js, remoteControllerHandler]', 'color: green;', 'Letter/number, passing through');
        return;
    }

    var mappedKeyCode = null;
    var mappedKey = null;

    // Key Mapping
    switch (keyCode) {
        case tvKey.KEY_ENTER:
            mappedKeyCode = 13;
            mappedKey = 'Enter';
            break;
        case tvKey.KEY_RETURN:
            mappedKeyCode = 27;
            mappedKey = 'Escape';
            break;
        case tvKey.KEY_CHANNEL_UP:
            mappedKeyCode = 32;
            mappedKey = ' ';
            break;
        case tvKey.KEY_CHANNEL_DOWN:
            mappedKeyCode = 89;
            mappedKey = 'y';
            break;
        case tvKey.KEY_RED:
            mappedKeyCode = 49;
            mappedKey = '1';
            break;
        case tvKey.KEY_GREEN:
            mappedKeyCode = 50;
            mappedKey = '2';
            break;
        case tvKey.KEY_YELLOW:
            mappedKeyCode = 51;
            mappedKey = '3';
            break;
        case tvKey.KEY_BLUE:
            mappedKeyCode = 52;
            mappedKey = '4';
            break;
        case tvKey.KEY_PLAY:
            mappedKeyCode = 9;
            mappedKey = 'Tab';
            break;
        case tvKey.KEY_REWIND:
            mappedKeyCode = 188;
            mappedKey = ',';
            break;
        case tvKey.KEY_FAST_FORWARD:
            mappedKeyCode = 190;
            mappedKey = '.';
            break;
    }

    if (mappedKeyCode !== null) {
        console.log('%c[input.js, remoteControllerHandler]', 'color: green;', 'Mapping', keyCode, 'to', mappedKeyCode, mappedKey);
        e.preventDefault();
        e.stopPropagation();

        // Erstelle und dispatche neues Event
        var newEvent = new KeyboardEvent(e.type, {
            key: mappedKey,
            code: mappedKey,
            keyCode: mappedKeyCode,
            which: mappedKeyCode,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(newEvent);
    }
}

// Initialize Tizen power management
function initTizen() {
    console.log('%c[input.js, initTizen]', 'color: green;', 'Initializing Tizen power management...');

    try {
        if (window.tizen && tizen.power) {
            tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            console.log('%c[input.js, initTizen]', 'color: green;', '✓ Power management activated');

            setInterval(function () {
                tizen.power.request('SCREEN', 'SCREEN_NORMAL');
            }, 30000);
        }
    } catch (e) {
        console.error('%c[input.js, initTizen]', 'color: green;', 'Tizen initialization error:', e);
    }
}

// platformOnLoad helper (falls nicht in anderem Script definiert)
function platformOnLoad(handler) {
    if (!handler) {
        console.error('%c[input.js, platformOnLoad]', 'color: green;', 'Error: Failed to load input handler!');
        return;
    }

    if (handler.initRemoteController) {
        var eventAnchor = document.getElementById('canvas');
        if (eventAnchor) {
            eventAnchor.focus();
        }
    }

    if (handler.onKeydownListener) {
        document.addEventListener('keydown', handler.onKeydownListener);
        document.addEventListener('keyup', handler.onKeydownListener);
    }

    if (handler.buttonsToRegister && window.tizen && tizen.tvinputdevice) {
        handler.buttonsToRegister.forEach(function (button) {
            try {
                tizen.tvinputdevice.registerKey(button);
                console.log('%c[input.js, platformOnLoad]', 'color: green;', '✓ Registered key:', button);
            } catch (e) {
                console.error('%c[input.js, platformOnLoad]', 'color: green;', '✗ Failed to register:', button, e);
            }
        });
    }
}

// Setup remote control (wird von index.html aufgerufen)
function setupRemoteControl() {
    console.log('%c[input.js, setupRemoteControl]', 'color: green;', 'Setting up remote control...');
    initSamsungKeys();
    initTizen();

    console.log('%c[input.js, setupRemoteControl]', 'color: green;', '=== STEUERUNG ===');
    console.log('Pfeiltasten = Bewegung');
    console.log('OK = Menü bestätigen');
    console.log('RETURN = ESC Menu');
    console.log('CHANNEL UP = Schießen');
    console.log('CHANNEL DOWN = Y (Quit)');
    console.log('ROT/GRÜN/GELB/BLAU = Waffen 1-4');
    console.log('PLAY = Karte');
    console.log('REWIND/FF = Strafe');
}

console.log('input.js loaded successfully');