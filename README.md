# Game Collection

A collection of browser-based games built with TypeScript and HTML5 Canvas. The application presents a launcher screen where players can browse and select from a list of games.

## Included Games

| Game | Description |
|---|---|
| **Balloon Archer** | Shoot balloons with your bow before you run out of arrows! Features 5 levels, upgrades, boss balloons, and obstacles. |
| **Jardinains** | Break bricks, dodge flower pots, and catch falling gnomes in this garden-themed brick breaker! Features 10 levels, power-ups, and gnome AI. |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm (included with Node.js)

## Getting Started

```bash
git clone <repo-url>
cd game-collection
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

## Adding a New Game

1. Create a new directory under `src/games/<your-game>/`.
2. Implement the `IGame` interface from `src/shared/types.ts`:
   - `start()` — begin the game loop
   - `stop()` — pause the game
   - `destroy()` — full teardown (cancel animation frames, remove event listeners)
   - `onExit` — callback set by the launcher; call it to return to the menu
3. Export a `GameDescriptor` from your game's `index.ts`:
   ```typescript
   import { GameDescriptor } from "../../shared/types";
   import { MyGame } from "./MyGame";

   export const myGameDescriptor: GameDescriptor = {
     id: "my-game",
     name: "My Game",
     description: "A short description of your game.",
     thumbnailColor: "#ff6600",
     createGame: (canvas) => new MyGame(canvas),
   };
   ```
4. Register it in `src/launcher/registry.ts`:
   ```typescript
   import { myGameDescriptor } from "../games/my-game";

   export const GAME_REGISTRY: GameDescriptor[] = [
     archerDescriptor,
     myGameDescriptor,
   ];
   ```

## Project Structure

```
src/
├── index.ts                    # Entry point — creates Launcher
├── launcher/
│   ├── Launcher.ts             # Launcher UI & game lifecycle manager
│   └── registry.ts             # Ordered array of registered games
├── shared/
│   └── types.ts                # IGame, GameDescriptor interfaces
└── games/
    └── archer/
        ├── index.ts            # Exports GameDescriptor for Archer
        ├── ArcherGame.ts       # Main game loop and state management
        ├── types.ts            # Archer-specific type definitions
        ├── levels.ts           # Level configurations
        ├── entities/
        │   ├── Arrow.ts        # Arrow entity
        │   ├── Balloon.ts      # Balloon entity
        │   ├── Bow.ts          # Bow entity
        │   └── Obstacle.ts     # Obstacle entity
        ├── systems/
        │   ├── CollisionSystem.ts  # Arrow–balloon collision detection
        │   ├── InputManager.ts     # Mouse/touch input handling
        │   ├── Spawner.ts          # Balloon/obstacle spawning logic
        │   └── UpgradeManager.ts   # Upgrade state management
        └── rendering/
            └── HUD.ts          # Score, arrow count, and screen overlays
```

## Tech Stack

- **TypeScript** — Type-safe source code
- **HTML5 Canvas** — 2D rendering
- **Webpack 5** — Bundling and dev server
