import Board from './Board.js';
import MessageSender from './MessageSender.js';

export default class Game {
    constructor(gameId, rows, cols, numBombs) {
        this.gameId = gameId;
        this.rows = rows;
        this.cols = cols;
        this.numBombs = numBombs;
        this.messageSender = new MessageSender();
    }

    resetGame() {
        this.board = null;
        this.messageSender.sendReset();
    }

    revealTiles(y, x){
        if (!this.board) {
            console.log("firs move");
            this.board = new Board(this.rows, this.cols, this.numBombs); // TODO: we can pass first move and generate board around that...
            let numTries = 0;
            while (numTries < 20){
                console.log("type: "+this.board.board[y][x].getType());
                if (this.board.board[y][x].getType() === 0) break;
                this.board = new Board(this.rows, this.cols, this.numBombs);
                numTries++;
            }
        }

        const tilesToReveal = this.board.tilesToReveal(y, x);

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

    flagTile(y, x){
        this.board.flagTile(y, x);
        this.board.board[y][x].isFlagged = true;
        this.messageSender.sendRevealTiles([{y: y, x: x, type: 9}]);
        
        if (this.board.numOfFlaggedTiles === this.board.numBombs){
            this.gameEnded = true;
            this.messageSender.sendGameOver(this.board.numOfFlaggedBombs() === this.board.numBombs);
        }

        if ((this.board.numBombs - this.board.numOfFlaggedBombs()) === (this.board.numOfUnrevealedTiles - this.board.numOfFlaggedTiles)){
            this.gameEnded = true;
            this.messageSender.sendGameOver(true);
        }
    }

    unflagTile(y, x){
        this.board.unflagTile(y, x);
        this.messageSender.sendRevealTiles([{y: y, x: x, type: -1}]);
    }

    getGameEnded() {
        return this.board.gameEnded;
    }
};