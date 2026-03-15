import { GameDescriptor } from "../../shared/types";
import { RaptorGame } from "./RaptorGame";

export const raptorDescriptor: GameDescriptor = {
  id: "raptor",
  name: "Archer",
  description: "Pilot a fighter jet through waves of enemies in this vertical-scrolling shoot-em-up!",
  thumbnailColor: "#1a1a2e",
  createGame: (canvas: HTMLCanvasElement) => new RaptorGame(canvas),
};
