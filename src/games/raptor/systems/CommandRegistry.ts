import { RaptorGameState, RaptorPowerUpType, WeaponType, WEAPON_CONFIGS, EnemyVariant, ENEMY_CONFIGS } from "../types";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { PowerUpManager } from "./PowerUpManager";
import { WeaponSystem } from "./WeaponSystem";

export interface CommandContext {
  currentLevel: number;
  levelCount: number;
  levels: readonly { level: number; name: string }[];
  startLevel(levelIndex: number): void;
  setState(state: "playing"): void;
  startMusic(levelIndex: number): void;
  stopMusic(): void;
  gameState: RaptorGameState;
  player: Player;
  canvasWidth: number;
  canvasHeight: number;
  powerUpManager: PowerUpManager;
  weaponSystem: WeaponSystem;

  score: number;
  totalScore: number;
  setScore(value: number): void;
  addScore(value: number): number;
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  spawnEnemy(variant: EnemyVariant): Enemy;
  destroyAllEnemies(): number;
  showFps: boolean;
  toggleFps(): boolean;
}

export type CommandHandler = (args: string[], ctx: CommandContext) => string | string[];

export class CommandRegistry {
  private commands = new Map<string, CommandHandler>();

  register(name: string, handler: CommandHandler): void {
    this.commands.set(name.toLowerCase(), handler);
  }

  dispatch(rawInput: string, ctx: CommandContext): string[] {
    const tokens = rawInput.trim().split(/\s+/);
    if (tokens.length === 0 || tokens[0] === "") return ["Unknown command"];

    const name = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    const handler = this.commands.get(name);
    if (!handler) return [`Unknown command: ${name}`];

    const result = handler(args, ctx);
    return Array.isArray(result) ? result : [result];
  }
}

export function registerLevelCommands(registry: CommandRegistry): void {
  registry.register("level", (args, ctx) => {
    if (args.length === 0) {
      return `Current: Level ${ctx.currentLevel + 1} - ${ctx.levels[ctx.currentLevel].name}`;
    }

    const sub = args[0].toLowerCase();

    if (sub === "list") {
      const lines = ["Available levels:"];
      for (const lvl of ctx.levels) {
        lines.push(`  ${lvl.level}. ${lvl.name}`);
      }
      return lines;
    }

    if (sub === "current") {
      return `Current: Level ${ctx.currentLevel + 1} - ${ctx.levels[ctx.currentLevel].name}`;
    }

    if (sub === "restart") {
      ctx.stopMusic();
      ctx.startLevel(ctx.currentLevel);
      ctx.setState("playing");
      ctx.startMusic(ctx.currentLevel);
      const lvl = ctx.levels[ctx.currentLevel];
      return `Restarted Level ${lvl.level} - ${lvl.name}`;
    }

    const num = parseInt(sub, 10);
    if (isNaN(num) || num < 1 || num > ctx.levelCount) {
      return `Invalid level. Available levels: 1-${ctx.levelCount}`;
    }

    const levelIndex = num - 1;
    ctx.stopMusic();
    ctx.startLevel(levelIndex);
    ctx.setState("playing");
    ctx.startMusic(levelIndex);
    return `Jumped to Level ${num} - ${ctx.levels[levelIndex].name}`;
  });
}

const WEAPON_ALIASES: Record<string, WeaponType> = {
  "machine-gun": "machine-gun",
  mg: "machine-gun",
  gun: "machine-gun",
  missile: "missile",
  msl: "missile",
  laser: "laser",
  lsr: "laser",
  plasma: "plasma",
  pls: "plasma",
  "ion-cannon": "ion-cannon",
  ion: "ion-cannon",
  "auto-gun": "auto-gun",
  autogun: "auto-gun",
  atg: "auto-gun",
  rocket: "rocket",
  rkt: "rocket",
};

const POWERUP_ALIASES: Record<string, RaptorPowerUpType> = {
  spread: "spread-shot",
  rapid: "rapid-fire",
  shield: "shield-restore",
  life: "bonus-life",
};

export function registerWeaponCommands(registry: CommandRegistry): void {
  registry.register("weapon", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }

    if (args.length === 0) {
      return "Usage: weapon <type|list>";
    }

    const sub = args[0].toLowerCase();

    if (sub === "list") {
      const lines = ["Available weapons:"];
      const names = Object.keys(WEAPON_CONFIGS) as WeaponType[];
      const maxLen = Math.max(...names.map((n) => n.length));
      const current = ctx.powerUpManager.currentWeapon;
      const tier = ctx.powerUpManager.weaponTier;

      for (const name of names) {
        const cfg = WEAPON_CONFIGS[name];
        const paddedName = name.padEnd(maxLen);
        const parts: string[] = [`DMG:${cfg.damage}`];

        if (cfg.fireRateMultiplier > 0) {
          parts.push(`RATE:${cfg.fireRateMultiplier.toFixed(1)}x`);
        } else {
          parts.push("BEAM");
        }

        if (cfg.homing) parts.push("HOMING");
        if (cfg.piercing) parts.push("PIERCING");

        const marker = name === current ? ` [ACTIVE T${tier}]` : "";
        lines.push(`  ${paddedName} \u2014 ${parts.join(" ")}${marker}`);
      }
      return lines;
    }

    const resolved = WEAPON_ALIASES[sub];
    if (!resolved) {
      return `Unknown weapon '${sub}'. Available: machine-gun (mg), missile (msl), laser (lsr), plasma (pls), ion-cannon (ion), auto-gun (atg), rocket (rkt)`;
    }

    ctx.powerUpManager.setWeapon(resolved);
    ctx.weaponSystem.setWeapon(resolved);
    return `Weapon switched to ${resolved}`;
  });

  registry.register("tier", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }
    if (args.length === 0) {
      return `Current weapon tier: ${ctx.powerUpManager.weaponTier}`;
    }
    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 1 || n > 3) {
      return "Tier must be between 1 and 3";
    }
    ctx.powerUpManager.setTier(n);
    return `Weapon tier set to ${n}`;
  });
}

export function registerPowerUpCommands(registry: CommandRegistry): void {
  registry.register("powerup", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }

    if (args.length === 0) {
      return "Usage: powerup <type|clear>";
    }

    const sub = args[0].toLowerCase();

    if (sub === "clear") {
      ctx.powerUpManager.clearEffects();
      return "All power-up effects cleared";
    }

    const resolved = POWERUP_ALIASES[sub];
    if (!resolved) {
      return `Unknown power-up '${sub}'. Available: spread, rapid, shield, life`;
    }

    switch (resolved) {
      case "spread-shot":
      case "rapid-fire":
        ctx.powerUpManager.activate(resolved);
        break;
      case "shield-restore":
        ctx.player.shield = 100;
        break;
      case "bonus-life":
        ctx.player.lives++;
        break;
    }

    return `Activated power-up: ${resolved}`;
  });
}

export function registerPlayerCommands(registry: CommandRegistry): void {
  registry.register("god", (_args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }
    ctx.player.godMode = !ctx.player.godMode;
    return `God mode: ${ctx.player.godMode ? "ON" : "OFF"}`;
  });

  registry.register("lives", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }
    if (args.length === 0) {
      return `Lives: ${ctx.player.lives}`;
    }
    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 1 || n > 99) {
      return "Lives must be between 1 and 99";
    }
    if (!ctx.player.alive) {
      ctx.player.alive = true;
      ctx.player.pos = { x: ctx.canvasWidth / 2, y: ctx.canvasHeight * 0.8 };
      ctx.player.invincibilityTimer = 2.0;
    }
    ctx.player.lives = n;
    return `Lives set to ${n}`;
  });

  registry.register("shield", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }
    if (args.length === 0) {
      return `Shield: ${ctx.player.shield}`;
    }
    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 0 || n > 100) {
      return "Shield must be between 0 and 100";
    }
    ctx.player.shield = n;
    return `Shield set to ${n}`;
  });

  registry.register("heal", (_args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }
    ctx.player.shield = 100;
    ctx.player.lives++;
    return "Player fully healed (shield: 100, +1 life)";
  });

  registry.register("kill", (_args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }
    ctx.player.alive = false;
    ctx.player.lives = 0;
    return "Player killed";
  });
}

const VARIANT_NAMES = Object.keys(ENEMY_CONFIGS) as EnemyVariant[];

export function registerCombatCommands(registry: CommandRegistry): void {
  registry.register("spawn", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }

    if (args.length === 0) {
      return `Usage: spawn <variant> [count]. Available: ${VARIANT_NAMES.join(", ")}`;
    }

    const variantInput = args[0].toLowerCase();
    if (!(variantInput in ENEMY_CONFIGS)) {
      return `Unknown enemy variant '${variantInput}'. Available: ${VARIANT_NAMES.join(", ")}`;
    }
    const variant = variantInput as EnemyVariant;

    let count = 1;
    if (args.length >= 2) {
      const parsed = parseInt(args[1], 10);
      if (isNaN(parsed) || parsed < 0) {
        return "Count must be a positive number";
      }
      count = Math.max(1, Math.min(parsed, 20));
    }

    for (let i = 0; i < count; i++) {
      ctx.spawnEnemy(variant);
    }

    return `Spawned ${count} ${variant}(s)`;
  });

  registry.register("killall", (_args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }

    const count = ctx.enemies.length;
    if (count === 0) {
      return "No enemies to destroy";
    }

    ctx.destroyAllEnemies();
    return `Destroyed ${count} enemies`;
  });

  registry.register("score", (args, ctx) => {
    if (ctx.gameState !== "playing") {
      return "Command only available while playing";
    }

    if (args.length === 0) {
      return `Score: ${ctx.score} (Total: ${ctx.totalScore})`;
    }

    if (args[0] === "add") {
      const n = parseInt(args[1], 10);
      if (isNaN(n)) {
        return "Score must be a number";
      }
      const newScore = ctx.addScore(n);
      return `Added ${n} to score (total: ${newScore})`;
    }

    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 0) {
      return "Score must be a non-negative number";
    }
    ctx.setScore(n);
    return `Score set to ${n}`;
  });

  registry.register("fps", (_args, ctx) => {
    const newValue = ctx.toggleFps();
    return `FPS display: ${newValue ? "ON" : "OFF"}`;
  });

  registry.register("status", (_args, ctx) => {
    const lines: string[] = [
      `Game State: ${ctx.gameState}`,
      `Level: ${ctx.currentLevel + 1} - ${ctx.levels[ctx.currentLevel].name}`,
      `Score: ${ctx.score} (Total: ${ctx.totalScore})`,
      `Lives: ${ctx.player.lives} | Shield: ${ctx.player.shield}`,
      `Weapon: ${ctx.weaponSystem.currentWeapon} (Tier ${ctx.powerUpManager.weaponTier})`,
      `Enemies: ${ctx.enemies.length} | Bullets: ${ctx.enemyBullets.length}`,
    ];

    const activeEffects = ctx.powerUpManager.getActive();
    if (activeEffects.length > 0) {
      const effectStrs = activeEffects.map(
        (e) => `${e.type} (${e.remainingTime.toFixed(1)}s)`
      );
      lines.push(`Active effects: ${effectStrs.join(", ")}`);
    } else {
      lines.push("Active effects: none");
    }

    return lines;
  });
}
