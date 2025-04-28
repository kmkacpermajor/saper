import Board from './Board.js';
import MessageSender from './MessageSender.js';

export default class Game {
    constructor(gameId, rows, cols, numBombs) {
        this.gameId = gameId;
        this.board = new Board(10, 10, 5);
        this.messageSender = new MessageSender();
        this.firstMove = true;
    }

    resetGame() {
        this.board = new Board(rows, cols, numBombs);
    }

    revealTiles(x,y){
        if (this.firstMove) {
            let numTries = 0;
            while (numTries < 5){
                if (this.board.board[y][x].getType() === 0) break;
                this.board = new Board(10, 10, 5);
                numTries++;
            }
            this.firstMove = false;
        }

        const tilesToReveal = this.board.tilesToReveal(x,y);

        this.messageSender.sendRevealTiles(tilesToReveal);

        if (tilesToReveal[0].type === 10){
            this.gameEnded = true;
            this.messageSender.sendGameOver(false);
        }

        if ((this.board.numBombs - this.board.numOfFlaggedBombs()) === (this.board.numOfUnrevealedTiles - this.board.numOfFlaggedTiles)){
            this.gameEnded = true;
            this.messageSender.sendGameOver(true);
        }
    }

    flagTile(x, y){
        this.board.flagTile(x, y);
        this.board.board[y][x].isFlagged = true;
        this.messageSender.sendRevealTiles([{x, y, type: 9}]);
        
        if (this.board.numOfFlaggedTiles === this.board.numBombs){
            this.gameEnded = true;
            this.messageSender.sendGameOver(this.board.numOfFlaggedBombs() === this.board.numBombs);
        }

        if ((this.board.numBombs - this.board.numOfFlaggedBombs()) === (this.board.numOfUnrevealedTiles - this.board.numOfFlaggedTiles)){
            this.gameEnded = true;
            this.messageSender.sendGameOver(true);
        }
    }

    unflagTile(x, y){
        this.board.unflagTile(x, y);
        this.messageSender.sendRevealTiles([{x, y, type: -1}]);
    }

    getGameEnded() {
        return this.board.gameEnded;
    }
};