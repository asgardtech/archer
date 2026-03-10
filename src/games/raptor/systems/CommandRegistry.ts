import { RaptorGameState, RaptorPowerUpType, WeaponType, WEAPON_CONFIGS } from "../types";
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
  player: { shield: number; lives: number };
  powerUpManager: PowerUpManager;
  weaponSystem: WeaponSystem;
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

        lines.push(`  ${paddedName} \u2014 ${parts.join(" ")}`);
      }
      return lines;
    }

    const resolved = WEAPON_ALIASES[sub];
    if (!resolved) {
      return `Unknown weapon '${sub}'. Available: machine-gun (mg), missile (msl), laser (lsr)`;
    }

    ctx.powerUpManager.setWeapon(resolved);
    ctx.weaponSystem.setWeapon(resolved);
    return `Weapon switched to ${resolved}`;
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
