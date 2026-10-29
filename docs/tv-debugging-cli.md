# Debugging directly on the TV with Apps2Samsung CLI

The Apps2Samsung desktop app ships a command line tool that talks to the Samsung TV
directly (scan, install, launch, uninstall). It is useful for quick debug cycles
without going through Tizen Studio.

**Location (local dev machine):** `D:\Apps2Samsung-v3.1.0-win-x64\Cli\apps2samsung-cli.exe`

## Prerequisites

- TV in Developer Mode, with the PC's IP configured as host.
- PC and TV on the same network (use `--local-ip <ip>` when on a VPN).
- A signing certificate on the PC (`cert --prepare` creates one).

## Commands

| Command | Purpose |
|---------|---------|
| `scan [--virtual]` | Find Samsung TVs on the network and whether each can be installed to |
| `tv <ip>` | Check one TV: Developer Mode, debug port, Tizen version, DUID |
| `catalog [words...]` | List installable apps |
| `installed --tv <ip>` | Apps on the TV (catalog version next to the installed one) |
| `install <app\|file> --tv <ip>` | Install a catalog app or a local `.wgt`/`.tpk` |
| `uninstall <appId> --tv <ip>` | Remove an app (id as printed by `installed`) |
| `launch <appId> --tv <ip>` | Start an app |
| `cert [--tv <ip>]` | List signing certificates; `--prepare` creates one |
| `tvstore --tv <ip>` | Arm the TV-Store app by handing it the signing certificate once |

Options: `--json`, `-q/--quiet`, `-y/--yes` (continue past pre-install warnings),
`--tv`, `--local-ip`, `--data-dir`, `--github-token` (or `GITHUB_TOKEN`),
`-h/--help`, `--version`.

Exit codes: `0` done, `1` failed, `2` usage, `3` stopped at a check (rerun with `--yes`).

## Typical debug loop

```powershell
$cli = 'D:\Apps2Samsung-v3.1.0-win-x64\Cli\apps2samsung-cli.exe'

& $cli scan                          # find the TV's IP
& $cli tv 192.168.1.50               # verify Developer Mode / Tizen version
& $cli installed --tv 192.168.1.50   # look up the app id
& $cli uninstall <appId> --tv 192.168.1.50
& $cli install .\doom-tizen.wgt --tv 192.168.1.50 --yes
& $cli launch <appId> --tv 192.168.1.50
```

See [building-wgt.md](building-wgt.md) for building the `.wgt` and
[remote-control-debugging.md](remote-control-debugging.md) for a past input debugging case.
