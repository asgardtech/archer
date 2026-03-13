import { RaptorGame } from "./games/raptor/RaptorGame";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const game = new RaptorGame(canvas);
game.start();
