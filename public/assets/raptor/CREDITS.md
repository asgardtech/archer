# Raptor Skies — Asset Credits

All visual assets in this directory are created for the Raptor Skies game.

## Sprite Assets

All PNG sprite assets were generated using the **nanobanana MCP server**
(powered by Google Gemini image generation) and programmatic SVG-to-PNG
rendering via [sharp](https://sharp.pixelplumbing.com/).

| Category         | Files                                    | Format |
|------------------|------------------------------------------|--------|
| Player ship      | `player.png`                             | PNG    |
| Enemy ships      | `enemy_scout.png`, `enemy_fighter.png`, `enemy_bomber.png`, `enemy_boss.png` | PNG |
| Bullets          | `bullet_player.png`, `bullet_enemy.png`  | PNG    |
| Missile          | `missile_player.png`                     | PNG    |
| Power-ups        | `powerup_spread.png`, `powerup_rapid.png`, `powerup_shield.png`, `powerup_life.png`, `powerup_missile.png`, `powerup_laser.png` | PNG |
| Backgrounds      | `bg_nebula.png`, `planet_01.png`, `planet_02.png` | PNG |
| Horizons         | `terrain/horizon_*.png` (5 variants)     | PNG    |
| Ground textures  | `terrain/ground_*.png` (4 variants)      | PNG    |
| Structures       | `terrain/struct_*.png` (14 variants)     | PNG    |
| Props            | `terrain/prop_*.png` (4 variants)        | PNG    |

## Procedurally Generated Assets

The following assets are generated at runtime using Canvas 2D:

- **Explosion sprite sheet** — 8-frame radial gradient animation
- **Engine thrust sprite sheet** — 4-frame flame animation

## Generation Tools

- **nanobanana MCP server** — Gemini-powered image generation
- **sharp** — High-performance SVG-to-PNG rasterization
- Generation script: `scripts/generate-raptor-assets.mjs`

## License

All assets in this directory are released under
[CC0 1.0 Universal (Public Domain Dedication)](https://creativecommons.org/publicdomain/zero/1.0/).
No attribution required.
