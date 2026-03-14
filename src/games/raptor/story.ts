import { ActStory } from "./types";

export const GAME_STORY: {
  acts: ActStory[];
} = {
  acts: [
    {
      act: 1,
      name: "The Vektran Offensive",
      opening: [
        "The year is 2187. Humanity had spread across the stars —",
        "twelve colony worlds, bound by fragile peace.",
        "Then the Vektrans came.",
        "Their warships tore through the outer perimeter in hours,",
        "reducing three colony fleets to drifting wreckage.",
        "No demands. No negotiation. Only annihilation.",
        "Admiral Rennick has assembled the last operational strike wing",
        "from whatever pilots and ships survived the initial onslaught.",
        "You are Raptor-1 — a recon pilot reassigned to the front line.",
        "Your orders: push through enemy territory, sector by sector,",
        "and destroy the Vektran command core before they consolidate.",
        "The colonies are counting on you. There will be no second chance.",
      ],
      ending: [
        "The Vektran command core detonates. Chain reactions",
        "rip through the stronghold as its reactor implodes.",
        "For a moment, silence. Then — a burst of intercepted data.",
        "Sensor arrays decode the transmission automatically.",
        "What you see stops you cold.",
        "The Vektrans were not an empire. They were a vanguard —",
        "a forward expeditionary force sent to soften resistance.",
        "Behind them, the Dominion: a civilization spanning",
        "hundreds of systems, with a fleet that dwarfs",
        "everything humanity has ever built.",
        "Admiral Rennick's voice cuts through the static:",
        "\"Raptor-1... we're reading the same data you are.\"",
        "\"The war we just fought? That was the scouting party.\"",
        "\"The real fleet is already on its way.\"",
        "The comm channel falls silent.",
        "This war isn't over. It hasn't truly begun.",
      ],
      isFinal: false,
    },
  ],
};

export function getActForLevel(levelIndex: number): ActStory {
  if (GAME_STORY.acts.length === 0) {
    return {
      act: 1,
      name: "Unknown",
      opening: [],
      ending: [],
      isFinal: true,
    };
  }

  // For now all 10 levels belong to Act 1.
  // Future acts will define their own level ranges.
  const actIndex = Math.min(
    Math.floor(levelIndex / 10),
    GAME_STORY.acts.length - 1
  );
  return GAME_STORY.acts[Math.max(0, actIndex)];
}
