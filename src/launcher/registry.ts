import { GameDescriptor } from "../shared/types";
import { archerDescriptor } from "../games/archer";
import { jardinainsDescriptor } from "../games/jardinains";

export const GAME_REGISTRY: GameDescriptor[] = [
  archerDescriptor,
  jardinainsDescriptor,
];
