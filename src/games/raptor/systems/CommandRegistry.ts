export interface CommandContext {
  currentLevel: number;
  levelCount: number;
  levels: readonly { level: number; name: string }[];
  startLevel(levelIndex: number): void;
  setState(state: "playing"): void;
  startMusic(levelIndex: number): void;
  stopMusic(): void;
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
