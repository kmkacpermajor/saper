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

    get gameEnded() {
        return this.board.gameEnded
    }

    set gameEnded(value) {
        this.board.gameEnded = value
    }

    get gameWon() {
        return this.board.gameWon
    }

    set gameWon(value) {
        this.board.gameWon = value
    }

    resetGame() {
        this.board = null;
        this.messageSender.sendReset();
    }

    gameOver(isWin) {
        this.gameEnded = true;
        this.gameWon = isWin;
        this.messageSender.sendGameOver(this.gameWon);
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

        if (!tilesToReveal) return;

        this.messageSender.sendRevealTiles(tilesToReveal);

        if (tilesToReveal.some(tile => tile.type === 10)){
            this.gameOver(false);
        }

        if ((this.board.numBombs - this.board.numOfFlaggedBombs()) === (this.board.numOfUnrevealedTiles - this.board.numOfFlaggedTiles)){
            this.gameOver(true);
        }
    }

    flagTile(y, x){
        this.board.flagTile(y, x);
        this.board.board[y][x].isFlagged = true;
        this.messageSender.sendRevealTiles([{y: y, x: x, type: 9}]);
        
        if (this.board.numOfFlaggedTiles === this.board.numBombs){
            this.gameOver(this.board.numOfFlaggedBombs() === this.board.numBombs);
        }

        if ((this.board.numBombs - this.board.numOfFlaggedBombs()) === (this.board.numOfUnrevealedTiles - this.board.numOfFlaggedTiles)){
            this.gameOver(true);
        }
    }

    unflagTile(y, x){
        this.board.unflagTile(y, x);
        this.messageSender.sendRevealTiles([{y: y, x: x, type: -1}]);
    }
};