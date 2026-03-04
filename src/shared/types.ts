export interface GameDescriptor {
  id: string;
  name: string;
  description: string;
  thumbnailColor: string;
  createGame: (canvas: HTMLCanvasElement) => IGame;
}

export interface IGame {
  start(): void;
  stop(): void;
  destroy(): void;
  onExit: (() => void) | null;
}
