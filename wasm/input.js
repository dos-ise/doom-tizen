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
    RUN:          { code: 'ShiftLeft',   key: 'Shift',  keyCode: 16 },
    WEAPON_PREV:  { code: 'BracketLeft', key: '[',      keyCode: 219 },
    WEAPON_NEXT:  { code: 'BracketRight', key: ']',     keyCode: 221 },
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
        e.keyCode === 16 || // Shift
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

// Default layout. Keys are W3C "standard" gamepad button indices.
var DEFAULT_GAMEPAD_BUTTON_MAP = {
    0: 'USE',          // A: doors, switches
    2: 'RUN',          // X
    3: 'MAP',          // Y: automap
    4: 'WEAPON_PREV',  // Left bumper
    5: 'WEAPON_NEXT',  // Right bumper
    7: 'FIRE',         // Right trigger
    8: 'MAP',          // Back/Select: automap
    9: 'ESC',          // Start: pause / menu
    12: 'UP',          // D-Pad up
    13: 'DOWN',        // D-Pad down
    14: 'LEFT',        // D-Pad left
    15: 'RIGHT'        // D-Pad right
};

// Version suffix so testers get the current defaults instead of an older saved map.
var GAMEPAD_STORAGE_KEY = 'doomGamepadMap_v2';

var GAMEPAD_BUTTON_NAMES = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'Select', 9: 'Start', 10: 'L-Stick', 11: 'R-Stick',
    12: 'D-Pad Up', 13: 'D-Pad Down', 14: 'D-Pad Left', 15: 'D-Pad Right'
};

// Select/Back cancels an in-progress rebind, so it cannot be bound to an action.
var GAMEPAD_CANCEL_BUTTON = 8;

var ACTION_LABELS = {
    FIRE: 'Fire',
    USE: 'Use / open doors',
    MAP: 'Automap',
    ENTER: 'Menu select (Enter)',
    ESC: 'Escape / Back',
    STRAFE_LEFT: 'Strafe left',
    STRAFE_RIGHT: 'Strafe right',
    WEAPON_PREV: 'Previous weapon',
    WEAPON_NEXT: 'Next weapon',
    RUN: 'Run',
    WEAPON1: 'Weapon 1',
    WEAPON2: 'Weapon 2',
    WEAPON3: 'Weapon 3',
    WEAPON4: 'Weapon 4',
    UP: 'Move forward',
    DOWN: 'Move backward',
    LEFT: 'Turn left',
    RIGHT: 'Turn right'
};

var CONTROLLER_ACTION_ORDER = [
    'FIRE', 'USE', 'RUN', 'MAP', 'ENTER', 'ESC', 'STRAFE_LEFT', 'STRAFE_RIGHT',
    'WEAPON_PREV', 'WEAPON_NEXT', 'WEAPON1', 'WEAPON2', 'WEAPON3', 'WEAPON4',
    'UP', 'DOWN', 'LEFT', 'RIGHT'
];

function copyDefaultGamepadMap() {
    var map = {};
    Object.keys(DEFAULT_GAMEPAD_BUTTON_MAP).forEach(function (btn) {
        map[btn] = DEFAULT_GAMEPAD_BUTTON_MAP[btn];
    });
    return map;
}

function loadGamepadMap() {
    try {
        var saved = JSON.parse(localStorage.getItem(GAMEPAD_STORAGE_KEY));
        if (saved && typeof saved === 'object') {
            var map = {};
            Object.keys(saved).forEach(function (btn) {
                if (/^\d+$/.test(btn) && Object.prototype.hasOwnProperty.call(ACTION_KEYS, saved[btn])) {
                    map[btn] = saved[btn];
                }
            });
            return map;
        }
    } catch (e) {
        console.warn('%c[input.js, loadGamepadMap]', 'color: orange;', 'Ignoring saved controller layout:', e);
    }
    return copyDefaultGamepadMap();
}

// Button index -> action name. Loaded from localStorage; edited from the Controller panel.
var GAMEPAD_BUTTON_MAP = loadGamepadMap();

function saveGamepadMap() {
    localStorage.setItem(GAMEPAD_STORAGE_KEY, JSON.stringify(GAMEPAD_BUTTON_MAP));
}

function getGamepadButtonFor(actionName) {
    var found = null;
    Object.keys(GAMEPAD_BUTTON_MAP).forEach(function (btn) {
        if (GAMEPAD_BUTTON_MAP[btn] === actionName) found = Number(btn);
    });
    return found;
}

function gamepadButtonName(buttonIndex) {
    return GAMEPAD_BUTTON_NAMES[buttonIndex] || ('Button ' + buttonIndex);
}

// If the button already belongs to another action, that action takes over the old button (swap).
function setGamepadButton(actionName, buttonIndex) {
    var oldButton = getGamepadButtonFor(actionName);
    var displaced = GAMEPAD_BUTTON_MAP[buttonIndex];

    if (oldButton !== null) delete GAMEPAD_BUTTON_MAP[oldButton];
    if (displaced && displaced !== actionName && oldButton !== null) {
        GAMEPAD_BUTTON_MAP[oldButton] = displaced;
    }
    GAMEPAD_BUTTON_MAP[buttonIndex] = actionName;
    saveGamepadMap();
}

function resetGamepadMap() {
    Object.keys(GAMEPAD_BUTTON_MAP).forEach(function (btn) {
        delete GAMEPAD_BUTTON_MAP[btn];
    });
    var defaults = copyDefaultGamepadMap();
    Object.keys(defaults).forEach(function (btn) {
        GAMEPAD_BUTTON_MAP[btn] = defaults[btn];
    });
    saveGamepadMap();
}

var STICK_DEADZONE = 0.35;
var gamepadPrevState = {}; // gamepad index -> { [actionName]: boolean }
var gamepadPollHandle = null;

var gamepadMenuPrev = {}; // gamepad index -> { [navName]: boolean } while the settings panel is open
var settingsWereOpen = false;
var gamepadCapture = null; // { actionName, onDone, held } while waiting for a button press

function isSettingsOpen() {
    var panel = document.getElementById('settings');
    return !!panel && panel.style.display === 'flex';
}

function isButtonDown(btn) {
    return !!btn && (btn.pressed || btn.value > 0.5);
}

// Menu navigation is fixed to the standard layout, so it keeps working after a remap.
function menuNavState(pad) {
    var axisX = pad.axes[0] || 0;
    var axisY = pad.axes[1] || 0;
    return {
        up: isButtonDown(pad.buttons[12]) || axisY < -STICK_DEADZONE,
        down: isButtonDown(pad.buttons[13]) || axisY > STICK_DEADZONE,
        left: isButtonDown(pad.buttons[14]) || axisX < -STICK_DEADZONE,
        right: isButtonDown(pad.buttons[15]) || axisX > STICK_DEADZONE,
        confirm: isButtonDown(pad.buttons[0]),
        back: isButtonDown(pad.buttons[1])
    };
}

function isGamepadCapturing() {
    return gamepadCapture !== null;
}

function startGamepadCapture(actionName, onDone) {
    var held = {};
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) {
        if (!pads[i]) continue;
        for (var b = 0; b < pads[i].buttons.length; b++) {
            held[i + ':' + b] = isButtonDown(pads[i].buttons[b]);
        }
    }
    gamepadCapture = { actionName: actionName, onDone: onDone, held: held };
}

// onDone receives the bound button index, or null when cancelled.
function finishGamepadCapture(buttonIndex) {
    var capture = gamepadCapture;
    gamepadCapture = null;
    if (capture) capture.onDone(buttonIndex);
}

function cancelGamepadCapture() {
    finishGamepadCapture(null);
}

// Only a press that starts after capture began counts, so the button used to open the rebind is ignored.
function pollGamepadCapture(pads) {
    var freshButton = null;
    for (var i = 0; i < pads.length; i++) {
        var pad = pads[i];
        if (!pad) continue;
        for (var b = 0; b < pad.buttons.length; b++) {
            var down = isButtonDown(pad.buttons[b]);
            var key = i + ':' + b;
            if (down && !gamepadCapture.held[key] && freshButton === null) freshButton = b;
            gamepadCapture.held[key] = down;
        }
    }

    if (freshButton === null) return;
    if (freshButton === GAMEPAD_CANCEL_BUTTON) {
        cancelGamepadCapture();
        return;
    }
    setGamepadButton(gamepadCapture.actionName, freshButton);
    finishGamepadCapture(freshButton);
}

function pollGamepadMenu(pads) {
    var capturing = isGamepadCapturing();

    for (var i = 0; i < pads.length; i++) {
        var pad = pads[i];
        if (!pad) continue;

        var state = menuNavState(pad);
        var prev = gamepadMenuPrev[i] || {};
        Object.keys(state).forEach(function (name) {
            if (!capturing && state[name] && !prev[name] && window.doomPanelNav) {
                window.doomPanelNav(name);
            }
        });
        gamepadMenuPrev[i] = state;
    }

    if (capturing) pollGamepadCapture(pads);
}

// Game actions held when the panel opened are released so the engine does not keep them pressed.
function releaseGamepadGameKeys() {
    Object.keys(gamepadPrevState).forEach(function (padIndex) {
        var prev = gamepadPrevState[padIndex];
        Object.keys(prev).forEach(function (actionName) {
            if (prev[actionName]) dispatchAction('keyup', actionName);
        });
    });
    gamepadPrevState = {};
}

function pollGamepads() {
    var settingsOpen = isSettingsOpen();

    if (settingsOpen !== settingsWereOpen) {
        if (settingsOpen) releaseGamepadGameKeys();
        gamepadMenuPrev = {};
        settingsWereOpen = settingsOpen;
    }

    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (settingsOpen) {
        pollGamepadMenu(pads);
    } else {
        pollGamepadGame(pads);
    }

    gamepadPollHandle = requestAnimationFrame(pollGamepads);
}

function pollGamepadGame(pads) {
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

        // Fixed menu keys: Doom's menus confirm with Enter and go back with Escape,
        // so A and B always send them, in addition to any remapped action.
        var confirmBtn = pad.buttons[0];
        var backBtn = pad.buttons[1];
        current.ENTER = current.ENTER || isButtonDown(confirmBtn);
        current.ESC = current.ESC || isButtonDown(backBtn);

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
