import { ObstacleType } from "./types";

export interface LevelConfig {
  level: number;
  name: string;
  targetScore: number;
  arrowsGranted: number;
  spawnInterval: number;
  minSpawnInterval: number;
  rampRate: number;
  balloonSpeedMin: number;
  balloonSpeedMax: number;
  upgradeMinInterval: number;
  upgradeMaxInterval: number;
  bossEnabled: boolean;
  bossDelay: number;
  bossIntervalMin: number;
  bossIntervalMax: number;
  bossHitPoints: number;
  skyGradient: [string, string];
  obstacleEnabled: boolean;
  obstacleTypes: ObstacleType[];
  obstacleMinInterval: number;
  obstacleMaxInterval: number;
  obstacleSpeedMin: number;
  obstacleSpeedMax: number;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: "Meadow",
    targetScore: 20,
    arrowsGranted: 100,
    spawnInterval: 2.5,
    minSpawnInterval: 1.2,
    rampRate: 0.005,
    balloonSpeedMin: 50,
    balloonSpeedMax: 80,
    upgradeMinInterval: 8,
    upgradeMaxInterval: 15,
    bossEnabled: false,
    bossDelay: 45,
    bossIntervalMin: 60,
    bossIntervalMax: 90,
    bossHitPoints: 5,
    skyGradient: ["#87CEEB", "#4682B4"],
    obstacleEnabled: true,
    obstacleTypes: ["bird"],
    obstacleMinInterval: 8,
    obstacleMaxInterval: 15,
    obstacleSpeedMin: 80,
    obstacleSpeedMax: 140,
  },
  {
    level: 2,
    name: "Forest",
    targetScore: 35,
    arrowsGranted: 80,
    spawnInterval: 2.0,
    minSpawnInterval: 1.0,
    rampRate: 0.005,
    balloonSpeedMin: 60,
    balloonSpeedMax: 100,
    upgradeMinInterval: 8,
    upgradeMaxInterval: 15,
    bossEnabled: false,
    bossDelay: 45,
    bossIntervalMin: 60,
    bossIntervalMax: 90,
    bossHitPoints: 5,
    skyGradient: ["#228B22", "#2E8B57"],
    obstacleEnabled: true,
    obstacleTypes: ["bird"],
    obstacleMinInterval: 8,
    obstacleMaxInterval: 15,
    obstacleSpeedMin: 80,
    obstacleSpeedMax: 140,
  },
  {
    level: 3,
    name: "Mountains",
    targetScore: 50,
    arrowsGranted: 70,
    spawnInterval: 1.8,
    minSpawnInterval: 0.8,
    rampRate: 0.005,
    balloonSpeedMin: 70,
    balloonSpeedMax: 110,
    upgradeMinInterval: 8,
    upgradeMaxInterval: 15,
    bossEnabled: true,
    bossDelay: 40,
    bossIntervalMin: 60,
    bossIntervalMax: 90,
    bossHitPoints: 5,
    skyGradient: ["#6A5ACD", "#483D8B"],
    obstacleEnabled: true,
    obstacleTypes: ["bird", "airplane"],
    obstacleMinInterval: 5,
    obstacleMaxInterval: 10,
    obstacleSpeedMin: 80,
    obstacleSpeedMax: 250,
  },
  {
    level: 4,
    name: "Storm",
    targetScore: 70,
    arrowsGranted: 60,
    spawnInterval: 1.5,
    minSpawnInterval: 0.7,
    rampRate: 0.005,
    balloonSpeedMin: 80,
    balloonSpeedMax: 130,
    upgradeMinInterval: 8,
    upgradeMaxInterval: 15,
    bossEnabled: true,
    bossDelay: 30,
    bossIntervalMin: 60,
    bossIntervalMax: 90,
    bossHitPoints: 7,
    skyGradient: ["#2F4F4F", "#1a1a2e"],
    obstacleEnabled: true,
    obstacleTypes: ["bird", "airplane"],
    obstacleMinInterval: 5,
    obstacleMaxInterval: 10,
    obstacleSpeedMin: 80,
    obstacleSpeedMax: 250,
  },
  {
    level: 5,
    name: "Sky Fortress",
    targetScore: 100,
    arrowsGranted: 50,
    spawnInterval: 1.2,
    minSpawnInterval: 0.5,
    rampRate: 0.005,
    balloonSpeedMin: 90,
    balloonSpeedMax: 150,
    upgradeMinInterval: 8,
    upgradeMaxInterval: 15,
    bossEnabled: true,
    bossDelay: 20,
    bossIntervalMin: 60,
    bossIntervalMax: 90,
    bossHitPoints: 10,
    skyGradient: ["#FF4500", "#8B0000"],
    obstacleEnabled: true,
    obstacleTypes: ["bird", "airplane", "ufo"],
    obstacleMinInterval: 3,
    obstacleMaxInterval: 7,
    obstacleSpeedMin: 60,
    obstacleSpeedMax: 250,
  },
];
