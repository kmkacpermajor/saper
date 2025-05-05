import Game from "./Game.js";

const MAX_GAME_ID = 254;

export default class GameSessionManager {
    constructor(){
        this.games = new Map(); // gameId -> Game instance
    }

    createNewGame(rows, cols, numBombs, ws) {
        // Find an available gameId
        for (let gameId = 0; gameId <= MAX_GAME_ID; gameId++) {
            if (!this.games.has(gameId)) {
                const game = new Game(gameId, rows, cols, numBombs);
                this.games.set(gameId, game);
                return game;
            }
        }
        ws.close();
        return null; // No available game IDs
    }

    getGame(requestedGameId, ws){
        let game = this.games.get(requestedGameId);
        if (!game) {
            ws.close();
            return null;
        }
        return game;
    }
}