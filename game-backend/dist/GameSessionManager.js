import { NEW_GAME_ID } from "@saper/contracts";
import Game from "./Game.js";
const MAX_GAME_ID = NEW_GAME_ID - 1;
export default class GameSessionManager {
    games;
    constructor() {
        this.games = new Map();
    }
    validateConfig(rows, cols, numBombs) {
        if (rows < 5 || cols < 5) {
            return "Board size must be at least 5x5.";
        }
        // if (rows > 30 || cols > 30) {
        //   return "Board size must not exceed 30x30.";
        // }
        if (numBombs <= 0) {
            return "Bomb count must be greater than 0.";
        }
        const maxBombs = Math.floor(rows * cols * 0.35);
        if (numBombs > maxBombs) {
            return `Bomb count exceeds limit for this board. Max allowed: ${maxBombs}.`;
        }
        return null;
    }
    cleanupGame(gameId) {
        this.games.delete(gameId);
    }
    createNewGame(rows, cols, numBombs) {
        const validationError = this.validateConfig(rows, cols, numBombs);
        if (validationError) {
            return { game: null, error: validationError };
        }
        for (let gameId = 0; gameId <= MAX_GAME_ID; gameId++) {
            if (!this.games.has(gameId)) {
                const game = new Game(gameId, rows, cols, numBombs, () => this.cleanupGame(gameId));
                this.games.set(gameId, game);
                return { game, error: null };
            }
        }
        return { game: null, error: "No free game slots available." };
    }
    getGame(requestedGameId) {
        const game = this.games.get(requestedGameId);
        if (!game) {
            return { game: null, error: `Game ${requestedGameId} does not exist.` };
        }
        return { game, error: null };
    }
}
