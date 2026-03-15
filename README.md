# Archer

A browser-based aerial combat game built with TypeScript and HTML5 Canvas. Pilot your ship through 10 levels of intense action featuring diverse enemies, upgradeable weapons, power-ups, and boss encounters.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm (included with Node.js)

## Getting Started

```bash
git clone <repo-url>
cd archer
npm install
npm run dev
```

Open **http://localhost:3000** in your browser to play. The dev server does not open a browser automatically (configured in `webpack.config.js`).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the webpack dev server with hot reload at `http://localhost:3000` |
| `npm run build` | Create a production build in the `dist/` directory |
| `npm run typecheck` | Run the TypeScript compiler to check for type errors (no output emitted) |
| `npm test` | Run the test suite with Jest |
| `npm run electron:dev` | Compile Electron main process and launch the app with hot reload (runs webpack-dev-server and Electron concurrently) |
| `npm run electron:build` | Full production build: compile Electron TS + webpack production build for Electron renderer |
| `npm run electron:start` | Launch Electron using an existing production build (does not rebuild) |
| `npm run electron:compile` | Compile Electron main process TypeScript to `electron/dist/` |
| `npm run electron:package` | Build and package the app into platform-specific distributables |
| `npm run electron:package:win` | Package for Windows (NSIS installer + portable) |
| `npm run electron:package:mac` | Package for macOS (DMG + ZIP) |
| `npm run electron:package:linux` | Package for Linux (AppImage + deb) |

## Electron Development

### Quick Start

To run the game in an Electron window with hot reload:

```bash
npm run electron:dev
```

This command:
1. Compiles the Electron main process TypeScript (`electron/*.ts` → `electron/dist/`)
2. Starts webpack-dev-server on port 3000
3. Launches Electron, which loads the game from `http://localhost:3000`

Both processes run concurrently. Closing the Electron window terminates the dev server automatically. If the dev server hasn't finished starting when Electron launches, the main process retries up to 10 times (1-second intervals).

Editing files in `src/` triggers hot reload in the Electron window. Changes to `electron/main.ts` or other main process files require restarting `electron:dev`.

### Building for Production

```bash
npm run electron:build    # compile Electron TS + webpack production build
npm run electron:start    # launch Electron from the production build
```

### Packaging for Distribution

```bash
npm run electron:package          # build + package for current platform
npm run electron:package:win      # Windows (NSIS + portable)
npm run electron:package:mac      # macOS (DMG + ZIP)
npm run electron:package:linux    # Linux (AppImage + deb)
```

Distributables are output to the `release/` directory. Icons are auto-generated from `assets/icon.png` during packaging.

## Steam Release

For instructions on setting up and using the Steam release pipeline — including Steamworks portal configuration, GitHub Secrets, and performing releases — see [docs/steam-release.md](docs/steam-release.md).

## Project Structure

```
src/
├── index.ts                    # Entry point — launches Archer
├── shared/
│   ├── types.ts                # IGame, GameDescriptor interfaces
│   ├── storage.ts              # localStorage utilities
│   ├── AudioManager.ts         # Shared audio manager
│   └── AssetLoader.ts          # Shared asset loader
└── games/
    └── raptor/
        ├── index.ts            # Exports GameDescriptor for Archer
        ├── RaptorGame.ts       # Main game loop and state management
        ├── types.ts            # Raptor-specific type definitions
        ├── levels.ts           # Level configurations (10 levels)
        ├── story.ts            # Story / dialogue scripts
        ├── entities/           # Game entities (Player, Enemy, Bullet, etc.)
        ├── systems/            # Game systems (Input, Collision, Weapons, Save, etc.)
        └── rendering/          # Renderers (HUD, Terrain, VFX, Sprites, etc.)
electron/
├── main.ts                     # Electron main process (dev/prod window management)
├── preload.ts                  # Preload script (contextBridge stub)
├── windowState.ts              # Window bounds/position persistence
├── tsconfig.json               # TypeScript config for main process (CommonJS, ES2020)
└── dist/                       # Compiled JS output (gitignored)
```

## Tech Stack

- **TypeScript** — Type-safe source code
- **HTML5 Canvas** — 2D rendering
- **Webpack 5** — Bundling and dev server
- **Jest** — Testing
