import Board from './Board.js';
import MessageSender from './MessageSender.js';

export default class Game {
    constructor(gameId) {
        this.gameId = gameId;
        this.board = new Board();
        this.messageSender = new MessageSender();
        this.firstMove = true;
    }
        
    resetGame() {
        this.board = new Board();
    }

    tilesToReveal(x,y){
        let tilesToReveal = this.board.tilesToReveal(x,y);
        if (this.firstMove) {
            while (tilesToReveal < 2 && numTries < 5){ // TODO: find smarter way:D
                this.board = new Board();
                tilesToReveal = this.board.tilesToReveal(x,y);
                numTries++;
            }
        }
        return tilesToReveal;
    }

    flagTile(x, y){
        this.currentGame.board.board[y][x].isFlagged = true;
        
    }

    unflagTile(x, y){
        this.currentGame.board.board[y][x].isFlagged = false;
        
    }

    getGameEnded() {
        return this.board.gameEnded;
    }
};