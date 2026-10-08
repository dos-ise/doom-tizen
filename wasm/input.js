'use strict';

console.log('input.js loaded');

// ============================================================================
// ACTION -> KEY DEFINITIONS
// One source of truth for every virtual key we might inject into the page.
// `code` is what modern browsers AND Emscripten/SDL2 actually read, `keyCode`
// is kept for older paths. Both are set via defineProperty below because
// neither can be set through the KeyboardEvent constructor (browsers compute
// them natively and ignore the init dict for these two fields).
// ============================================================================

var ACTION_KEYS = {
    ENTER:        { code: 'Enter',      key: 'Enter',  keyCode: 13 },
    ESC:          { code: 'Escape',     key: 'Escape', keyCode: 27 },
    FIRE:         { code: 'ControlLeft', key: 'Control', keyCode: 17 },
    USE:          { code: 'Space',      key: ' ',      keyCode: 32 },
    MAP:          { code: 'Tab',        key: 'Tab',    keyCode: 9 },
    WEAPON1:      { code: 'Digit1',     key: '1',      keyCode: 49 },
    WEAPON2:      { code: 'Digit2',     key: '2',      keyCode: 50 },
    WEAPON3:      { code: 'Digit3',     key: '3',      keyCode: 51 },
    WEAPON4:      { code: 'Digit4',     key: '4',      keyCode: 52 },
    STRAFE_LEFT:  { code: 'Comma',      key: ',',      keyCode: 188 },
    STRAFE_RIGHT: { code: 'Period',     key: '.',      keyCode: 190 },
    UP:           { code: 'ArrowUp',    key: 'ArrowUp',    keyCode: 38 },
    DOWN:         { code: 'ArrowDown',  key: 'ArrowDown',  keyCode: 40 },
    LEFT:         { code: 'ArrowLeft',  key: 'ArrowLeft',  keyCode: 37 },
    RIGHT:        { code: 'ArrowRight', key: 'ArrowRight', keyCode: 39 }
};

// Native (real hardware keyboard) keys we never intercept — let them fall
// straight through to the game as-is.
function isNativePassthroughKey(e) {
    return (
        (e.keyCode >= 37 && e.keyCode <= 40) || // Arrows
        e.keyCode === 13 || // Enter
        e.keyCode === 27 || // ESC
        e.keyCode === 32 || // Space
        e.keyCode === 17 || // Ctrl
        (e.keyCode >= 65 && e.keyCode <= 90) || // A-Z
        (e.keyCode >= 48 && e.keyCode <= 57)    // 0-9
    );
}

// Core dispatcher: builds a KeyboardEvent whose `code`/`key`/`keyCode`/`which`
// are overridden with defineProperty so SDL2's Emscripten backend picks them
// up correctly, regardless of which field it prefers.
function dispatchAction(type, actionName) {
    var def = ACTION_KEYS[actionName];
    if (!def) {
        console.warn('%c[input.js]', 'color: orange;', 'Unknown action:', actionName);
        return;
    }

    var evt = new KeyboardEvent(type, { bubbles: true, cancelable: true });

    Object.defineProperty(evt, 'code', { get: function () { return def.code; } });
    Object.defineProperty(evt, 'key', { get: function () { return def.key; } });
    Object.defineProperty(evt, 'keyCode', { get: function () { return def.keyCode; } });
    Object.defineProperty(evt, 'which', { get: function () { return def.keyCode; } });

    document.dispatchEvent(evt);
}

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

// Which remote key (by Tizen's standard key name) maps to which in-game
// action. This is the only place you need to touch to remap buttons.
var REMOTE_KEY_ACTIONS = {
    'ColorF0Red':       'WEAPON1',
    'ColorF1Green':     'WEAPON2',
    'ColorF2Yellow':    'WEAPON3',
    'ColorF3Blue':      'WEAPON4',
    'ChannelUp':        'FIRE',
    'ChannelDown':      'USE',
    'MediaPlay':        'MAP',
    'MediaRewind':      'STRAFE_LEFT',
    'MediaFastForward': 'STRAFE_RIGHT'
};

// keyCode -> action name. Populated at runtime in initSamsungKeys() because
// the numeric keyCode behind e.g. "ChannelUp" is NOT guaranteed to be the
// same across TV models/firmware — Samsung explicitly documents this.
// Resolving it via tizen.tvinputdevice.getKey() instead of hardcoding the
// numbers makes the mapping correct on every device instead of just the one
// it was hardcoded against.
var remoteKeyMapping = {};

function initSamsungKeys() {
    console.log('%c[input.js, initSamsungKeys]', 'color: green;', 'Registering Samsung TV keys...');

    remoteKeyMapping = {};

    if (!(window.tizen && tizen.tvinputdevice)) {
        console.warn('%c[input.js, initSamsungKeys]', 'color: orange;', 'tizen.tvinputdevice not available (not running on a Tizen TV?) - remote mapping skipped');
        return;
    }

    Object.keys(REMOTE_KEY_ACTIONS).forEach(function (keyName) {
        try {
            tizen.tvinputdevice.registerKey(keyName);
            var keyInfo = tizen.tvinputdevice.getKey(keyName);

            if (keyInfo && typeof keyInfo.code === 'number') {
                remoteKeyMapping[keyInfo.code] = REMOTE_KEY_ACTIONS[keyName];
                console.log('%c[input.js, initSamsungKeys]', 'color: green;', '✓', keyName, '-> code', keyInfo.code, '->', REMOTE_KEY_ACTIONS[keyName]);
            } else {
                console.log('%c[input.js, initSamsungKeys]', 'color: orange;', '✗ No code resolved for:', keyName);
            }
        } catch (e) {
            console.log('%c[input.js, initSamsungKeys]', 'color: orange;', '✗ Failed:', keyName, e);
        }
    });

    // OK and Back/Return are base keys delivered without registerKey(), but
    // their keyCode can still differ per model, so resolve them the same way.
    // Fall back to the common values (13 / 10009) if getKey() isn't available,
    // e.g. when testing in a regular desktop browser.
    try {
        var enterKey = tizen.tvinputdevice.getKey('Enter');
        remoteKeyMapping[enterKey && typeof enterKey.code === 'number' ? enterKey.code : 13] = 'ENTER';
    } catch (e) {
        remoteKeyMapping[13] = 'ENTER';
    }

    try {
        var returnKey = tizen.tvinputdevice.getKey('Return');
        remoteKeyMapping[returnKey && typeof returnKey.code === 'number' ? returnKey.code : 10009] = 'ESC';
    } catch (e) {
        remoteKeyMapping[10009] = 'ESC';
    }
}

function handleRemoteKeys() {
    console.log('%c[input.js, handleRemoteKeys]', 'color: green;', 'Setting up remote key handler...');

    document.addEventListener('keydown', function (e) {
        if (isNativePassthroughKey(e)) {
            return; // Nicht abfangen!
        }

        var action = remoteKeyMapping[e.keyCode];
        if (action) {
            console.log('%c[input.js]', 'color: green;', 'Remote key', e.keyCode, '->', action);
            e.preventDefault();
            e.stopPropagation();
            dispatchAction('keydown', action);
        }
    });

    document.addEventListener('keyup', function (e) {
        if (isNativePassthroughKey(e)) {
            return;
        }

        var action = remoteKeyMapping[e.keyCode];
        if (action) {
            e.preventDefault();
            e.stopPropagation();
            dispatchAction('keyup', action);
        }
    });
}

// ============================================================================
// GAMEPAD / CONTROLLER SUPPORT
// Standard W3C gamepad mapping. Polled via rAF since the Gamepad API has no
// events for button state — only a live snapshot you have to diff yourself.
// ============================================================================

var GAMEPAD_BUTTON_MAP = {
    0: 'USE',          // A
    1: 'FIRE',         // B
    2: 'MAP',          // X
    3: 'ESC',          // Y
    4: 'STRAFE_LEFT',  // Left bumper
    5: 'STRAFE_RIGHT', // Right bumper
    9: 'ENTER',        // Start
    12: 'UP',          // D-Pad up
    13: 'DOWN',        // D-Pad down
    14: 'LEFT',        // D-Pad left
    15: 'RIGHT'        // D-Pad right
};

var STICK_DEADZONE = 0.35;
var gamepadPrevState = {}; // gamepad index -> { [actionName]: boolean }
var gamepadPollHandle = null;

function pollGamepads() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];

    for (var i = 0; i < pads.length; i++) {
        var pad = pads[i];
        if (!pad) continue;

        var prev = gamepadPrevState[i] || {};
        var current = {};

        // Buttons (including D-pad, which is buttons 12-15 on standard mapping)
        for (var btnIndex in GAMEPAD_BUTTON_MAP) {
            var action = GAMEPAD_BUTTON_MAP[btnIndex];
            var btn = pad.buttons[btnIndex];
            var pressed = !!btn && (btn.pressed || btn.value > 0.5);
            current[action] = current[action] || pressed;
        }

        // Left stick as an analog fallback for movement, in case the D-pad
        // reports as axes instead of buttons on a given controller/browser.
        var axisX = pad.axes[0] || 0;
        var axisY = pad.axes[1] || 0;

        if (axisY < -STICK_DEADZONE) current.UP = true;
        if (axisY > STICK_DEADZONE) current.DOWN = true;
        if (axisX < -STICK_DEADZONE) current.LEFT = true;
        if (axisX > STICK_DEADZONE) current.RIGHT = true;

        // Diff against previous frame, only fire keydown/keyup on transitions
        for (var actionName in ACTION_KEYS) {
            var wasDown = !!prev[actionName];
            var isDown = !!current[actionName];

            if (isDown && !wasDown) {
                dispatchAction('keydown', actionName);
            } else if (!isDown && wasDown) {
                dispatchAction('keyup', actionName);
            }
        }

        gamepadPrevState[i] = current;
    }

    gamepadPollHandle = requestAnimationFrame(pollGamepads);
}

function initGamepad() {
    console.log('%c[input.js, initGamepad]', 'color: green;', 'Setting up Gamepad API...');

    if (!navigator.getGamepads) {
        console.warn('%c[input.js, initGamepad]', 'color: orange;', 'Gamepad API not available');
        return;
    }

    window.addEventListener('gamepadconnected', function (e) {
        console.log('%c[input.js, initGamepad]', 'color: green;', '✓ Gamepad connected:', e.gamepad.id, 'index', e.gamepad.index);
        if (!gamepadPollHandle) {
            gamepadPollHandle = requestAnimationFrame(pollGamepads);
        }
    });

    window.addEventListener('gamepaddisconnected', function (e) {
        console.log('%c[input.js, initGamepad]', 'color: orange;', 'Gamepad disconnected:', e.gamepad.id);
        delete gamepadPrevState[e.gamepad.index];
    });

    // Some browsers/TVs don't fire gamepadconnected reliably — start polling
    // immediately as a fallback so an already-connected pad still works.
    gamepadPollHandle = requestAnimationFrame(pollGamepads);
}

// ============================================================================
// SETUP
// ============================================================================

function setupRemoteControl() {
    console.log('%c[input.js, setupRemoteControl]', 'color: green;', '=== INITIALIZING ===');

    initTizen();
    initSamsungKeys();
    handleRemoteKeys();
    initGamepad();

    console.log('%c[input.js]', 'color: green;', '✓ Setup complete');
    console.log('%c[input.js]', 'color: green;', '=== CONTROLS ===');
    console.log('OK / Gamepad Start → Enter (Menu)');
    console.log('CHANNEL UP / Gamepad B → Fire');
    console.log('CHANNEL DOWN / Gamepad A → Use/Doors');
    console.log('Arrow Keys / D-Pad / Left Stick → Movement');
    console.log('RED/GREEN/YELLOW/BLUE → Weapons 1-4');
    console.log('RETURN / Gamepad Y → ESC');
}

console.log('input.js loaded successfully');
