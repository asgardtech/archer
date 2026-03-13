# Raptor Skies

A browser-based aerial combat game built with TypeScript and HTML5 Canvas. Pilot your ship through 10 levels of intense action featuring diverse enemies, upgradeable weapons, power-ups, and boss encounters.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm (included with Node.js)

## Getting Started

```bash
git clone <repo-url>
cd raptor-skies
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

## Project Structure

```
src/
├── index.ts                    # Entry point — launches Raptor Skies
├── shared/
│   ├── types.ts                # IGame, GameDescriptor interfaces
│   ├── storage.ts              # localStorage utilities
│   ├── AudioManager.ts         # Shared audio manager
│   └── AssetLoader.ts          # Shared asset loader
└── games/
    └── raptor/
        ├── index.ts            # Exports GameDescriptor for Raptor Skies
        ├── RaptorGame.ts       # Main game loop and state management
        ├── types.ts            # Raptor-specific type definitions
        ├── levels.ts           # Level configurations (10 levels)
        ├── story.ts            # Story / dialogue scripts
        ├── entities/           # Game entities (Player, Enemy, Bullet, etc.)
        ├── systems/            # Game systems (Input, Collision, Weapons, Save, etc.)
        └── rendering/          # Renderers (HUD, Terrain, VFX, Sprites, etc.)
```

## Tech Stack

- **TypeScript** — Type-safe source code
- **HTML5 Canvas** — 2D rendering
- **Webpack 5** — Bundling and dev server
- **Jest** — Testing
