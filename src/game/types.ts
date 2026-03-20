// ===== CONSTANTS =====
export const INTERNAL_W = 320;
export const INTERNAL_H = 180;
export const GROUND_Y = 154;
export const PLAYER_SPEED = 1.2;
export const TOTAL_HEARTS = 6;
export const HEART_SPACING = 500;
export const FIRST_HEART_X = 450;

// ===== ENUMS =====
export enum GameScreen {
  TITLE = "title",
  RUNNING = "running",
  MEMORY = "memory",
  FINAL = "final",
}

// ===== INTERFACES =====
export interface Heart {
  worldX: number;
  memoryIndex: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface BackgroundTheme {
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  groundTopColor: string;
}

export interface GameState {
  screen: GameScreen;
  playerX: number;
  playerY: number;
  cameraX: number;
  animFrame: number;
  animTimer: number;
  hearts: Heart[];
  particles: Particle[];
  currentMemory: number;
  heartsCollected: number;
  timer: number;
  themeIndex: number;
  running: boolean;
  meeting: boolean;
  meetX: number;
  meetTimer: number;
  meetTextIndex: number;
  meetTextTimer: number;
  heartExploded: boolean;
  heartRain: { x: number; y: number; vy: number; size: number; alpha: number; color: string }[];

}
