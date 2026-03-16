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
        "You are James Archer — a recon pilot reassigned to the front line.",
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
        "\"Archer... we're reading the same data you are.\"",
        "\"The war we just fought? That was the scouting party.\"",
        "\"The real fleet is already on its way.\"",
        "The comm channel falls silent.",
        "This war isn't over. It hasn't truly begun.",
      ],
      isFinal: false,
    },
    {
      act: 2,
      name: "The Dominion's Shadow",
      opening: [
        "The Vektran command core is ash — but the victory rings hollow.",
        "Within hours of the stronghold's fall, long-range sensors",
        "lit up with contacts. Hundreds of them. Then thousands.",
        "The Dominion armada has entered human space.",
        "Their ships dwarf anything the Vektrans fielded —",
        "carrier groups stretching across entire sensor grids.",
        "Admiral Rennick has issued a general mobilization order.",
        "Every colony, every shipyard, every remaining warship",
        "is being pressed into a unified defense line.",
        "You are reassigned to the vanguard of a new campaign:",
        "strike deep behind Dominion lines, disrupt their supply chain,",
        "and buy humanity the time it needs to fortify.",
        "\"Archer, you broke the Vektrans,\" Rennick says.",
        "\"Now show the Dominion what that means.\"",
      ],
      ending: [
        "The Dominion forward base burns behind you.",
        "Ten sectors cleared, a hundred engagements survived.",
        "But the data cores you recovered paint a grim picture.",
        "The forces you've been fighting — elite as they were —",
        "are a regional garrison. A fraction of the whole.",
        "The Dominion doesn't conquer through brute force alone.",
        "They seed worlds with autonomous weapon networks,",
        "self-replicating factories that churn out drones by the million.",
        "Deep scans reveal a construction signature",
        "at the edge of charted space: a Nexus Array,",
        "a command node coordinating every Dominion asset in this sector.",
        "If it goes fully online, no fleet humanity can muster will matter.",
        "Rennick's orders arrive before you even dock:",
        "\"We don't get to rest, Archer. Not yet.\"",
        "\"Find that Nexus. And shut it down.\"",
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
