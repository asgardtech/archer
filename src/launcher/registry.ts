import { GameDescriptor } from "../shared/types";
import { archerDescriptor } from "../games/archer";
import { jardinainsDescriptor } from "../games/jardinains";
import { raptorDescriptor } from "../games/raptor";

export const GAME_REGISTRY: GameDescriptor[] = [
  archerDescriptor,
  jardinainsDescriptor,
  raptorDescriptor,
];
