import { GameDescriptor } from "../../shared/types";
import { ArcherGame } from "./ArcherGame";

export const archerDescriptor: GameDescriptor = {
  id: "archer",
  name: "Balloon Archer",
  description: "Shoot balloons with your bow before you run out of arrows!",
  thumbnailColor: "#87CEEB",
  createGame: (canvas: HTMLCanvasElement) => new ArcherGame(canvas),
};
