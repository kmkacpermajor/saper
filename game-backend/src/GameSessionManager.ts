import type { WebSocket } from "ws";
import Game from "./Game.js";

const MAX_GAME_ID = 255;
const MAX_BOMB_DENSITY = 0.35;
const MIN_BOMB_DENSITY = 0.03;
const MIN_TILES_FOR_ZERO_START = 9;
const DEFAULT_GAME_PARK_TTL_MS = 300000;

const parsedParkTtlMs = Number(process.env.GAME_PARK_TTL_MS);
const GAME_PARK_TTL_MS =
  Number.isInteger(parsedParkTtlMs) && parsedParkTtlMs > 0 ? parsedParkTtlMs : DEFAULT_GAME_PARK_TTL_MS;

export default class GameSessionManager {
  private readonly games: Map<number, Game>;
  private readonly cleanupTimers: Map<number, ReturnType<typeof setTimeout>>;

  constructor() {
    this.games = new Map<number, Game>();
    this.cleanupTimers = new Map<number, ReturnType<typeof setTimeout>>();
  }

  private validateConfig(rows: number, cols: number, numBombs: number): string | null {
    if (rows < 5 || cols < 5) {
      return "Board size must be at least 5x5.";
    }

    // if (rows > 30 || cols > 30) {
    //   return "Board size must not exceed 30x30.";
    // }

    const boardArea = rows * cols;
    const minBombs = Math.max(1, Math.floor(boardArea * MIN_BOMB_DENSITY));
    if (numBombs < minBombs) {
      return `Bomb count is too low for this board. Min allowed: ${minBombs}.`;
    }

    const maxBombsByDensity = Math.floor(boardArea * MAX_BOMB_DENSITY);
    const maxBombsForZeroStart = boardArea - MIN_TILES_FOR_ZERO_START;
    const maxBombs = Math.min(maxBombsByDensity, maxBombsForZeroStart);
    if (numBombs > maxBombs) {
      return `Bomb count exceeds limit for this board. Max allowed: ${maxBombs}.`;
    }

    return null;
  }

  private clearScheduledCleanup(gameId: number): void {
    const scheduledCleanup = this.cleanupTimers.get(gameId);
    if (!scheduledCleanup) {
      return;
    }

    clearTimeout(scheduledCleanup);
    this.cleanupTimers.delete(gameId);
  }

  private cleanupGame(gameId: number): void {
    this.clearScheduledCleanup(gameId);
    this.games.delete(gameId);
  }

  private scheduleCleanup(gameId: number): void {
    if (this.cleanupTimers.has(gameId)) {
      return;
    }

    const cleanupTimeout = setTimeout(() => {
      this.cleanupTimers.delete(gameId);
      this.games.delete(gameId);
    }, GAME_PARK_TTL_MS);

    this.cleanupTimers.set(gameId, cleanupTimeout);
  }

  createNewGame(rows: number, cols: number, numBombs: number): { game: Game | null; error: string | null } {
    const validationError = this.validateConfig(rows, cols, numBombs);
    if (validationError) {
      return { game: null, error: validationError };
    }

    for (let gameId = 0; gameId <= MAX_GAME_ID; gameId++) {
      if (!this.games.has(gameId)) {
        const game = new Game(gameId, rows, cols, numBombs, () => this.scheduleCleanup(gameId));
        this.games.set(gameId, game);
        return { game, error: null };
      }
    }

    return { game: null, error: "No free game slots available." };
  }

  getGame(requestedGameId: number): { game: Game | null; error: string | null } {
    const game = this.games.get(requestedGameId);
    if (!game) {
      return { game: null, error: `Game ${requestedGameId} does not exist.` };
    }

    this.clearScheduledCleanup(requestedGameId);

    return { game, error: null };
  }
}
