# Archer

A browser-based balloon-shooting game built with TypeScript and HTML5 Canvas.

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

## How to Play

1. **Start** — Click anywhere on the canvas to begin.
2. **Aim** — Move your mouse to aim the bow.
3. **Shoot** — Click to fire an arrow.
4. **Objective** — Pop as many balloons as you can before you run out of arrows. You have 20 arrows per round.
5. **Game Over** — When all arrows have been fired and none remain in flight, the game ends. Click to return to the menu.

## Project Structure

```
src/
├── index.ts              # Entry point
├── Game.ts               # Main game loop and state management
├── types.ts              # Shared type definitions
├── entities/
│   ├── Arrow.ts          # Arrow entity
│   ├── Balloon.ts        # Balloon entity
│   └── Bow.ts            # Bow entity
├── systems/
│   ├── CollisionSystem.ts  # Arrow–balloon collision detection
│   ├── InputManager.ts     # Mouse input handling
│   └── Spawner.ts          # Balloon spawning logic
└── rendering/
    └── HUD.ts            # Score, arrow count, and screen overlays
```

## Tech Stack

- **TypeScript** — Type-safe source code
- **HTML5 Canvas** — 2D rendering
- **Webpack 5** — Bundling and dev server
