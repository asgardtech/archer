import type { CommandRegistry } from "../CommandRegistry";
import { ACHIEVEMENT_DEFINITIONS } from "./AchievementDefinitions";
import { AchievementStorage } from "./AchievementStorage";

export function registerAchievementCommands(registry: CommandRegistry): void {
  registry.register("achievements", (_args, ctx) => {
    const all = ctx.achievementManager.getAllAchievements();
    if (all.length === 0) return "No achievements defined.";

    const categories = new Map<string, typeof all>();
    for (const a of all) {
      const cat = a.definition.category ?? "other";
      let list = categories.get(cat);
      if (!list) {
        list = [];
        categories.set(cat, list);
      }
      list.push(a);
    }

    const lines: string[] = [];
    for (const [category, achievements] of categories) {
      lines.push(`── ${category.charAt(0).toUpperCase() + category.slice(1)} ──`);
      for (const a of achievements) {
        const marker = a.unlocked ? "✓" : "○";
        lines.push(`${marker} ${a.definition.id}: ${a.definition.name} (${Math.floor(a.progress)}%)`);
      }
    }
    return lines;
  });

  registry.register("achievement", (args, ctx) => {
    if (args.length === 0) {
      return "Usage: achievement <unlock|lock|unlock-all|reset|progress> [id]";
    }

    const sub = args[0].toLowerCase();

    if (sub === "unlock") {
      if (args.length < 2) return "Usage: achievement unlock <id>";
      const id = args[1];
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      if (!def) return `Unknown achievement: '${id}'. Use 'achievements' to list all.`;
      if (ctx.achievementManager.isUnlocked(id)) {
        return `Achievement '${id}' is already unlocked.`;
      }
      ctx.achievementManager.forceUnlock(id);
      ctx.saveAchievements();
      return `Unlocked achievement: ${def.name} (${id})`;
    }

    if (sub === "lock") {
      if (args.length < 2) return "Usage: achievement lock <id>";
      const id = args[1];
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      if (!def) return `Unknown achievement: '${id}'. Use 'achievements' to list all.`;
      if (!ctx.achievementManager.isUnlocked(id)) {
        return `Achievement '${id}' is not currently unlocked.`;
      }
      ctx.achievementManager.forceLock(id);
      ctx.saveAchievements();
      return `Locked achievement: ${def.name} (${id})`;
    }

    if (sub === "unlock-all") {
      let count = 0;
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        if (!ctx.achievementManager.isUnlocked(def.id)) {
          ctx.achievementManager.forceUnlock(def.id);
          count++;
        }
      }
      if (count === 0) return "All achievements are already unlocked.";
      ctx.saveAchievements();
      return `Unlocked ${count} achievement${count !== 1 ? "s" : ""}.`;
    }

    if (sub === "reset") {
      ctx.achievementManager.reset();
      ctx.statsTracker.resetAll();
      AchievementStorage.clear().catch(console.error);
      return "All achievements and stats have been reset.";
    }

    if (sub === "progress") {
      if (args.length < 2) return "Usage: achievement progress <id>";
      const id = args[1];
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      if (!def) return `Unknown achievement: '${id}'. Use 'achievements' to list all.`;
      const progress = ctx.achievementManager.getProgress(id);
      const unlocked = ctx.achievementManager.isUnlocked(id);
      return [
        `${id}: ${def.name}`,
        `  ${def.description}`,
        `  Progress: ${progress.current}/${progress.target} (${Math.floor(progress.percentage)}%)`,
        `  Status: ${unlocked ? "Unlocked" : "Locked"}`,
      ];
    }

    return "Usage: achievement <unlock|lock|unlock-all|reset|progress> [id]";
  });

  registry.register("stats", (args, ctx) => {
    if (args.length > 0) {
      const sub = args[0].toLowerCase();

      if (sub === "reset") {
        ctx.statsTracker.resetAll();
        ctx.saveAchievements();
        return "All player stats have been reset.";
      }

      return "Usage: stats [reset]";
    }

    const s = ctx.statsTracker.getStats();
    const fmt = (n: number) => n.toLocaleString();
    const playTime = formatPlayTime(s.totalPlayTimeSeconds);

    return [
      "── Player Stats ──",
      `Total Kills: ${fmt(s.totalKills)}`,
      `Bosses Defeated: ${fmt(s.bossesDefeated)}`,
      `Ram Kills: ${fmt(s.ramKills)}`,
      `Total Score: ${fmt(s.totalScore)}`,
      `Levels Completed: ${fmt(s.levelsCompleted)}`,
      `Highest Level: ${fmt(s.highestLevelCompleted + 1)}`,
      `Total Deaths: ${fmt(s.totalDeaths)}`,
      `Dodges Used: ${fmt(s.totalDodgesUsed)}`,
      `EMPs Used: ${fmt(s.totalEmpsUsed)}`,
      `Power-Ups Collected: ${fmt(s.totalPowerUpsCollected)}`,
      `Weapons Owned: ${s.weaponsOwned.join(", ")}`,
      `Highest Weapon Tier: ${s.highestWeaponTier}`,
      `Projectiles Reflected: ${fmt(s.projectilesReflected)}`,
      `Total Play Time: ${playTime}`,
    ];
  });
}

function formatPlayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
