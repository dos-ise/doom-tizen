// Persists savegames in the Tizen wgt-private directory so they survive app restarts.
// Chocolate Doom writes saves to MEMFS /save (via -savedir). Saves are restored at startup
// and changed files are copied back periodically and on page hide. No-op without the Tizen API.
(function () {
    'use strict';

    const SAVE_DIR_FS = '/save';
    const SAVE_DIR_NAME = 'savegames';
    const POLL_MS = 3000;

    let fs = null;
    let saveDir = null;
    const known = {};

    function logErr(e) {
        console.warn('DoomSaves:', e && e.message ? e.message : e);
    }

    function signature(path) {
        const st = fs.stat(path);
        return st.size + ':' + st.mtime.getTime();
    }

    function getSaveDir(root, cb) {
        root.listFiles(function (files) {
            const existing = files.filter(function (f) { return f.name === SAVE_DIR_NAME && !f.isFile; })[0];
            if (existing) return cb(existing);
            try {
                cb(root.createDirectory(SAVE_DIR_NAME));
            } catch (e) {
                logErr(e);
            }
        }, logErr);
    }

    function restore(dir) {
        dir.listFiles(function (files) {
            files.forEach(function (f) {
                if (!f.isFile) return;
                f.openStream('r', function (stream) {
                    const bytes = stream.readBytes(f.fileSize);
                    stream.close();
                    const path = SAVE_DIR_FS + '/' + f.name;
                    fs.writeFile(path, new Uint8Array(bytes));
                    known[f.name] = signature(path);
                    console.log('DoomSaves: restored', f.name);
                }, logErr, 'UTF-8');
            });
        }, logErr);
    }

    function writeToTizen(name, data) {
        saveDir.listFiles(function (files) {
            const existing = files.filter(function (f) { return f.name === name; })[0];
            let target = existing;
            if (!target) {
                try {
                    target = saveDir.createFile(name);
                } catch (e) {
                    return logErr(e);
                }
            }
            target.openStream('w', function (stream) {
                stream.writeBytes(Array.from(data));
                stream.close();
                console.log('DoomSaves: stored', name);
            }, logErr, 'UTF-8');
        }, logErr);
    }

    function syncOut() {
        if (!saveDir) return;
        let names;
        try {
            names = fs.readdir(SAVE_DIR_FS);
        } catch (e) {
            return;
        }
        names.forEach(function (name) {
            if (name === '.' || name === '..') return;
            const path = SAVE_DIR_FS + '/' + name;
            let sig;
            try {
                sig = signature(path);
            } catch (e) {
                return;
            }
            if (known[name] === sig) return;
            known[name] = sig;
            writeToTizen(name, fs.readFile(path, { encoding: 'binary' }));
        });
    }

    const DoomSaves = {
        start: function (FS) {
            fs = FS;
            fs.mkdirTree(SAVE_DIR_FS);

            if (typeof tizen === 'undefined' || !tizen.filesystem) {
                console.log('DoomSaves: Tizen filesystem not available, saves are not persisted');
                return;
            }

            tizen.filesystem.resolve('wgt-private', function (root) {
                getSaveDir(root, function (dir) {
                    saveDir = dir;
                    restore(dir);
                    setInterval(syncOut, POLL_MS);
                    window.addEventListener('pagehide', syncOut);
                    document.addEventListener('visibilitychange', function () {
                        if (document.visibilityState === 'hidden') syncOut();
                    });
                });
            }, logErr, 'rw');
        }
    };

    window.DoomSaves = DoomSaves;
})();
