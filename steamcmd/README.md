# SteamCMD Build Configuration

This directory contains [Valve Data Format (VDF)](https://developer.valvesoftware.com/wiki/KeyValues) configuration files used by [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) to upload Raptor Skies builds to the Steam content delivery network.

## Files

| File | Purpose |
|---|---|
| `app_build.vdf` | Top-level app build manifest — defines the App ID, description, build output path, and references each depot config |
| `depot_build_windows.vdf` | Windows depot — maps `release/win-unpacked/` into the Windows depot |
| `depot_build_macos.vdf` | macOS depot — maps `release/mac-arm64/` into the macOS depot |
| `depot_build_linux.vdf` | Linux depot — maps `release/linux-unpacked/` into the Linux depot |

## Placeholder IDs

The VDF files use placeholder IDs that **must be replaced** with real values from the [Steamworks partner portal](https://partner.steamgames.com/) before uploading:

| Placeholder | Meaning |
|---|---|
| `1000` | App ID (Raptor Skies) |
| `1001` | Windows depot ID |
| `1002` | macOS depot ID |
| `1003` | Linux depot ID |

## Prerequisites

1. **Build the app** — Run `electron-builder` so that platform artifacts exist under `release/` (e.g., `release/win-unpacked/`, `release/mac-arm64/`, `release/linux-unpacked/`).
2. **Install SteamCMD** — See [Valve's SteamCMD documentation](https://developer.valvesoftware.com/wiki/SteamCMD).
3. **Replace placeholder IDs** — Update all `1000`–`1003` values in the VDF files with real IDs from the Steamworks partner portal.
4. **Update `steam_appid.txt`** — The file currently contains `480` (Valve's Spacewar test app) for local development. Replace it with the real App ID before shipping.

## Uploading a Build

From the project root, run:

```bash
steamcmd +login <username> +run_app_build steamcmd/app_build.vdf +quit
```

SteamCMD will read `app_build.vdf`, resolve each depot config, upload the contents, and write logs to `steam_build_output/` (which is gitignored).

## macOS Architecture

The macOS depot defaults to the ARM64 (Apple Silicon) build at `release/mac-arm64/`. To upload an Intel (x64) build instead, change the `ContentRoot` in `depot_build_macos.vdf` from `../release/mac-arm64` to `../release/mac`.
