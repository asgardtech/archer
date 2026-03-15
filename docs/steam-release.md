# Steam Release Pipeline

This document covers the end-to-end setup and operation of the Archer Steam release pipeline, from initial Steamworks portal configuration through CI-driven uploads.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Steamworks Portal Setup](#steamworks-portal-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Updating App/Depot IDs](#updating-appdepot-ids)
- [Performing a Release](#performing-a-release)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the pipeline, ensure you have:

- **Steamworks partner account** — register at <https://partner.steamgames.com/> and have the game (Archer) created in the portal with an assigned **App ID**.
- **Three Depot IDs** — one per platform (Windows, macOS, Linux), provisioned in the Steamworks portal.
- **A dedicated Steam "builder" account** for CI use:
  - Do **not** use a personal Steam account. Create a separate account specifically for automated builds.
  - Add it as a user on your Steamworks partner account with **Edit App Metadata** and **Publish App Changes to Steam** permissions.
  - Enable **Steam Guard** on the builder account (email-based is simplest for CI).
- **GitHub repository admin access** — required to create and manage repository secrets.
- **SteamCMD installed locally** — needed once to generate the initial `config.vdf` authentication file. See [Valve's SteamCMD docs](https://developer.valvesoftware.com/wiki/SteamCMD).

---

## Steamworks Portal Setup

### Creating Depots

1. Go to your app in the Steamworks partner portal.
2. Navigate to **App Admin → SteamPipe → Depots**.
3. Create three depots:
   - **Windows x64** — for the `win-unpacked` build
   - **macOS arm64** — for the `mac-arm64` build (see [macOS architecture notes](#macos-architecture) below)
   - **Linux x64** — for the `linux-unpacked` build
4. Record each **Depot ID** — you will need them when [updating the VDF files](#updating-appdepot-ids).

### Launch Options

1. Navigate to **App Admin → Installation → Launch Options**.
2. Configure per-platform executables:

| Platform | Executable | OS Setting |
|---|---|---|
| Windows | `Archer.exe` | Windows |
| macOS | `Archer.app` | macOS |
| Linux | `archer` (AppImage) | Linux |

### Branches

Navigate to **App Admin → SteamPipe → Builds** and set up three branches:

| Branch | Purpose | Notes |
|---|---|---|
| `staging` | Internal testing | Recommended: password-protect this branch |
| `beta` | External beta testers | Optional password protection |
| `default` | Production (public) | This is what all players see |

> **Remember:** click **Publish** in the Steamworks portal after making any configuration changes.

### macOS Architecture

The macOS depot defaults to ARM64 (Apple Silicon) builds at `release/mac-arm64/`. The CI build workflow runs on `macos-latest` runners which produce Apple Silicon artifacts.

To ship Intel (x64) builds instead, change the `ContentRoot` in `steamcmd/depot_build_macos.vdf` from `../release/mac-arm64` to `../release/mac`.

If you need to ship **both** architectures, you will need to create a fourth depot and a corresponding `depot_build_macos_x64.vdf` file, then reference it in `app_build.vdf`.

---

## GitHub Secrets Configuration

The release workflow requires two repository secrets. **Never commit credentials to the repository.**

### `STEAM_USERNAME`

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `STEAM_USERNAME`
4. Value: the builder account's Steam username.
5. Click **Add secret**.

### `STEAM_CONFIG_VDF`

This secret contains a base64-encoded Steam authentication token. The builder account must complete one interactive login before the token can be extracted.

#### Generating `config.vdf`

1. **Install SteamCMD** on your local machine ([installation guide](https://developer.valvesoftware.com/wiki/SteamCMD#Downloading_SteamCMD)).

2. **Log in interactively** — this is the only step that requires manual Steam Guard entry:

   ```bash
   steamcmd +login <builder_username> <password> +quit
   ```

   SteamCMD will prompt for a Steam Guard code (sent to the builder account's email or mobile app). Enter the code to complete authentication.

3. **Locate the generated `config.vdf`** — the path depends on your OS and installation method:

   | OS | Typical Path |
   |---|---|
   | Linux | `~/.steam/steam/config/config.vdf` or `~/Steam/config/config.vdf` |
   | macOS | `~/Library/Application Support/Steam/config/config.vdf` |
   | Windows | `C:\Program Files (x86)\Steam\config\config.vdf` |

4. **Base64-encode the file** with no line wrapping:

   - **Linux:**
     ```bash
     base64 -w 0 < /path/to/config.vdf
     ```
   - **macOS** (uses `-b` instead of `-w`):
     ```bash
     base64 -b 0 < /path/to/config.vdf
     ```
   - **Windows (PowerShell):**
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\config.vdf"))
     ```

   > **Important:** The no-wrap flag (`-w 0` or `-b 0`) is critical. Some systems default to wrapping at 76 characters, which produces a corrupt secret.

5. **Create the repository secret:**
   - Go to GitHub repo → **Settings → Secrets and variables → Actions**.
   - Click **New repository secret**.
   - Name: `STEAM_CONFIG_VDF`
   - Value: paste the entire base64 output (single line).
   - Click **Add secret**.

#### Rotating the Secret

Steam session tokens in `config.vdf` expire over time. When this happens:

- **Symptom:** the workflow fails at the "Upload to Steam via SteamCMD" step with `Login Failure: Expired Login`.
- **Fix:** repeat steps 2–5 above (log in interactively, re-encode, update the `STEAM_CONFIG_VDF` secret in GitHub).

---

## Updating App/Depot IDs

The repository ships with placeholder IDs that must be replaced with real values from the Steamworks portal before the first release.

### Files to Update

| File | Placeholder | Replace With |
|---|---|---|
| `steamcmd/app_build.vdf` | `"AppID" "1000"` | `"AppID" "<your_app_id>"` |
| `steamcmd/app_build.vdf` | `"1001"` in the Depots block | `"<your_windows_depot_id>"` |
| `steamcmd/app_build.vdf` | `"1002"` in the Depots block | `"<your_macos_depot_id>"` |
| `steamcmd/app_build.vdf` | `"1003"` in the Depots block | `"<your_linux_depot_id>"` |
| `steamcmd/depot_build_windows.vdf` | `"DepotID" "1001"` | `"DepotID" "<your_windows_depot_id>"` |
| `steamcmd/depot_build_macos.vdf` | `"DepotID" "1002"` | `"DepotID" "<your_macos_depot_id>"` |
| `steamcmd/depot_build_linux.vdf` | `"DepotID" "1003"` | `"DepotID" "<your_linux_depot_id>"` |
| `steam_appid.txt` | `480` | `<your_app_id>` |

See [`steamcmd/README.md`](../steamcmd/README.md) for additional details on the VDF file structure.

### `steam_appid.txt` Bundling

The file `steam_appid.txt` is copied into every packaged Electron build via the `extraFiles` directive in `electron-builder.yml`. The Steamworks API and Steam overlay read this file at runtime to identify the game.

The placeholder value `480` is Valve's Spacewar test app, which is useful for local development with the Steam overlay. Changing it to your real App ID means local development builds will attempt to initialize against the real app. Consider keeping `480` on development branches and only setting the real App ID on release branches or as part of the CI pipeline.

---

## Performing a Release

### 1. Trigger the Workflow

1. Go to your GitHub repository → **Actions** tab.
2. Select the **"Release to Steam"** workflow in the left sidebar.
3. Click **"Run workflow"**.

### 2. Fill In Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `version` | No | *(empty)* | Semver string (e.g., `1.2.3`). If provided, the workflow bumps `package.json`, commits the change, and creates a git tag `v1.2.3`. If omitted, the current `package.json` version is used as-is. |
| `steam_branch` | Yes | `staging` | The Steam branch to set the build live on. Use `staging` for internal testing, `beta` for external testers, or `default` for production. |
| `description` | No | `v<version>` | Build description shown in the Steamworks dashboard. Defaults to the version string if left empty. |

### 3. Workflow Execution

The pipeline runs three jobs sequentially:

1. **`version-bump`** *(skipped if `version` is empty)*
   - Validates the version is valid semver (`MAJOR.MINOR.PATCH`).
   - Checks that the git tag `v<version>` does not already exist.
   - Updates `package.json` and `package-lock.json`.
   - Commits, tags, and pushes.

2. **`build`**
   - Triggers the reusable `build.yml` workflow.
   - Runs matrix builds in parallel across three runners:
     - `ubuntu-latest` → `build-linux` artifact
     - `windows-latest` → `build-windows` artifact
     - `macos-latest` → `build-macos` artifact
   - Each artifact contains the platform-specific output under `release/`.

3. **`upload-to-steam`**
   - Downloads all three build artifacts into `release/`.
   - Validates that `release/win-unpacked/`, `release/mac-arm64/`, and `release/linux-unpacked/` exist.
   - Configures `app_build.vdf` with the build description and target branch (`SetLive`).
   - Installs SteamCMD via [`CyberAndrii/setup-steamcmd@v1`](https://github.com/CyberAndrii/setup-steamcmd).
   - Writes `config.vdf` from the `STEAM_CONFIG_VDF` secret (base64-decoded) to `~/Steam/config/config.vdf`.
   - Runs `steamcmd +login ... +run_app_build ... +quit` to upload all depots.
   - On failure, uploads `steam_build_output/` as the `steam-build-logs` artifact (retained 14 days).

### 4. Verify on Steamworks

1. Go to the [Steamworks partner portal](https://partner.steamgames.com/).
2. Navigate to **App Admin → SteamPipe → Builds**.
3. The new build should appear with your description, set live on the branch you specified.

### 5. Promote to Production

If you released to `staging` or `beta` first:

1. In the **Builds** page, find the build you want to promote.
2. Click **"Set Build Live"** and select the `default` branch.
3. Click **Publish** to make it available to all players.

Alternatively, trigger a new release with `steam_branch` set to `default`.

### Concurrency

The workflow uses a concurrency group (`steam-release`) with `cancel-in-progress: false`. This means:

- Only one release workflow runs at a time.
- If you dispatch a second release while one is running, it **queues** and waits — it does not cancel the in-progress run.

---

## Troubleshooting

### Common Errors

| Problem | Cause | Fix |
|---|---|---|
| `Login Failure: Expired Login` | The `config.vdf` session token has expired. | Rotate the `STEAM_CONFIG_VDF` secret — see [Rotating the Secret](#rotating-the-secret). |
| `Login Failure: Invalid Login` | Wrong `STEAM_USERNAME` or a corrupted `config.vdf`. | Verify the `STEAM_USERNAME` secret is correct. Regenerate `config.vdf` from scratch. |
| `ERROR! Failed to get Application info` | Wrong App ID in `app_build.vdf`, or the builder account lacks permissions for the app. | Verify the App ID in `steamcmd/app_build.vdf`. Check that the builder account has "Edit App Metadata" and "Publish App Changes" permissions in the Steamworks portal. |
| `Error loading depot build config` | Syntax error or incorrect path in a depot VDF file. | Validate VDF syntax (watch for mismatched braces). Verify that `ContentRoot` paths are correct relative to the VDF file location. |
| `Required directory ... is missing` | Build artifacts were not produced or have unexpected directory names. | Check the `build` job logs. Ensure `electron-builder` ran successfully and produced the expected output under `release/`. |
| Version tag already exists | Tried to release a version that is already tagged in git. | Use a new version number, or omit the `version` input to build with the current `package.json` version. |

### Inspecting Build Logs

When the `upload-to-steam` job fails, it uploads SteamCMD's log output as the `steam-build-logs` artifact. To access it:

1. Go to the failed workflow run in GitHub Actions.
2. Scroll to the **Artifacts** section at the bottom.
3. Download `steam-build-logs` (retained for 14 days).

The logs contain detailed SteamCMD output including depot upload progress and any error messages.

### Partial Failure Recovery

If `version-bump` succeeds but `build` or `upload-to-steam` fails:

- A git tag `v<version>` and a version bump commit already exist on the remote.
- **To retry:** re-run the workflow **without** a `version` input. This skips the version-bump step and builds using the already-bumped `package.json` version.
- **To start over:** delete the tag (`git push --delete origin v<version>`) and revert the bump commit, then re-run with the same version.

### Re-authenticating After `config.vdf` Expiry

Steam session tokens expire periodically (the exact interval depends on Steam's server-side policies). If CI builds start failing with login errors:

1. On your local machine, run `steamcmd +login <builder_username> <password> +quit` and complete the Steam Guard prompt.
2. Re-encode `config.vdf` with `base64 -w 0` (Linux) or `base64 -b 0` (macOS).
3. Update the `STEAM_CONFIG_VDF` secret in GitHub with the new value.

This is the same process as the [initial setup](#generating-configvdf) — there is no way to refresh the token without an interactive login.
