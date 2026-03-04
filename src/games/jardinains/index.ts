import { GameDescriptor } from "../../shared/types";
import { JardinainsGame } from "./JardinainsGame";

export const jardinainsDescriptor: GameDescriptor = {
  id: "jardinains",
  name: "Jardinains",
  description: "Break bricks, dodge flower pots, and catch falling gnomes in this garden-themed brick breaker!",
  thumbnailColor: "#4CAF50",
  createGame: (canvas: HTMLCanvasElement) => new JardinainsGame(canvas),
};
