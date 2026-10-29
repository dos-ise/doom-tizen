# Getting logs from the Doom app on the TV

The app runs in the Tizen web runtime (Content shell). Its console output, including
the Chocolate Doom `stdout` and the JS `console.log` lines, is available through the
Chromium remote debugging port that `sdb` exposes on the TV.

Replace `<TV-IP>` with the TV address (for example `192.168.178.159`). The sdb
device port is `26101`.

## 1. Restart Doom in debug mode

Doom must be started with the debug flag. The `shell 0` command runs on the TV.

```powershell
sdb -s <TV-IP>:26101 shell 0 was_kill 8VCHRP1cV5.Doom
sdb -s <TV-IP>:26101 shell 0 debug 8VCHRP1cV5.Doom
```

The output ends with a line like `launched pid = ... with debug 1 port: <PORT>`.
The port changes on every start, so always use the port from this output.

If `was_kill` does not work, close Doom with the remote (Back/Home) and run only the
`debug` command.

## 2. Forward the port to the PC

```powershell
sdb -s <TV-IP>:26101 forward tcp:<PORT> tcp:<PORT>
```

Remove the old forward first if you see a conflict. You can list the active ones with
`sdb -s <TV-IP>:26101 forward --list`.

## 3. Read the logs

Option A, browser: open `chrome://inspect`, remove the old `localhost:<OLD-PORT>`
entry, and click **inspect** under `localhost:<PORT>`. The startup logs appear in the
Console tab if you reload the page after opening the DevTools.

Option B, command line: the target list is available at
`http://localhost:<PORT>/json/list`. The page WebSocket URL is the
`webSocketDebuggerUrl` field. The `Runtime.consoleAPICalled` events contain the
console output. A short Node script (Node 22 has a built-in WebSocket client) can
enable `Runtime` and `Log`, call `Page.reload`, and print the events.

## Notes

- The clean WGT built by CI has no debug prints, so only the JS messages
  (`Loading game files`, `Starting game`, `Running`) appear.
- For the audio logs (`DBG OPL_Mix_Callback`, `DBG I_OPL_PlaySong`), install a debug
  WGT built from a source copy with the prints added. Do not commit the debug code.
- Chromium's `chrome://inspect` does not show the logs of a closed app. Start Doom
  first, then inspect.
