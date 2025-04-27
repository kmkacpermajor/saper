import Game from "./Game.js";

const MAX_GAME_ID = 254;

export default class GameSessionManager {
    constructor(){
        this.games = new Map(); // gameId -> Game instance
    }

    createNewGame() {
        // Find an available gameId
        for (let gameId = 0; gameId <= MAX_GAME_ID; gameId++) {
            if (!this.games.has(gameId)) {
                const game = new Game(gameId);
                return game;
            }
        }
        return null; // No available game IDs
    }

    getGame(requestedGameId, ws){
        let game = null;
        if (requestedGameId === 0xFF) {
            // Request to create a new game
            game = this.createNewGame();
            if (!game) {
                ws.close();
                return null;
            }

            this.games.set(gameId, game);

        } else {
            // Try to get existing game or create new one if it doesn't exist
            game = this.games.get(requestedGameId);
            if (!game) {
                game = new Game(requestedGameId);
                this.games.set(requestedGameId, game);
            }
        }
        game.addClient(ws);

        return game;
    }
}