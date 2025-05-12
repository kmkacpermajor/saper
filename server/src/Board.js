import Tile from './Tile.js';

export default class Board {
    constructor(rows, cols, numBombs) {
        this.rows = rows;
        this.cols = cols;
        this.numBombs = numBombs;
        this.board = [];
        this.bombCoords = [];
        this.gameEnded = false;
        this.gameWon = false;
        this.numOfUnrevealedTiles = rows*cols;
        this.numOfFlaggedTiles = 0;

        this.createBoard();
    }

    flagTile(y, x){
        this.board[y][x].isFlagged = true;
        this.numOfFlaggedTiles++;
    }

    unflagTile(y, x){
        this.board[y][x].isFlagged = false;
        this.numOfFlaggedTiles--;
    }

    numOfFlaggedBombs(){
        let sum = 0;
        this.bombCoords.forEach((bombLocation) => {
            if (this.board[bombLocation.y][bombLocation.x].isFlagged) sum++;
        });
        return sum;
    }

    countAdjacentMines(y, x) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let ny = y + dy, nx = x + dx;
                if (ny >= 0 && nx >= 0 && ny < this.cols && nx < this.rows && this.board[ny][nx].isMine) {
                    count++;
                }
            }
        }
        return count;
    }

    createBoard() {
        this.board = Array.from({ length: this.rows }, () => 
            Array.from({ length: this.cols }, () => new Tile()));

        let minesPlaced = 0;
        while (minesPlaced < this.numBombs) {
            let y = Math.floor(Math.random() * this.rows);
            let x = Math.floor(Math.random() * this.cols);
            if (!this.board[y][x].isMine) {
                this.board[y][x].isMine = true;
                this.bombCoords.push({y: y, x: x});
                minesPlaced++;
            }
        }

        for (let y = 0; y < this.cols; y++) {
            for (let x = 0; x < this.rows; x++) {
                if (!this.board[y][x].isMine) {
                    this.board[y][x].adjacentMines = this.countAdjacentMines(y, x);
                }
            }
        }
    }

    tilesToReveal(y, x) {
        if (this.gameEnded || this.board[y][x].isRevealed) return;
    
        if (this.board[y][x].isMine) {
            const tilesToReveal = [];
            this.bombCoords.forEach((bombLocation) => {
                this.board[bombLocation.y][bombLocation.x].isRevealed = true;
                tilesToReveal.push({y: bombLocation.y, x: bombLocation.x, type: this.board[bombLocation.y][bombLocation.x].getType()});
            });
            this.board[y][x].isRevealed = true;
            return tilesToReveal;
        }
        
        const tilesToReveal = [];
        const queue = [{y: y, x: x}];
        
        while (queue.length > 0) {
            const tileCoords = queue.shift();
            const cx = tileCoords.x;
            const cy = tileCoords.y;
            
            // Skip if out of bounds (note y check comes first)
            if (cy < 0 || cy >= this.board.length || 
                cx < 0 || cx >= this.board[cy].length || 
                this.board[cy][cx].isRevealed) {
                continue;
            }
            
            // Reveal the tile (access as board[cy][cx])
            this.board[cy][cx].isRevealed = true;
            tilesToReveal.push({y: cy, x: cx, type: this.board[cy][cx].getType()});
            
            // If it's a zero, add adjacent tiles to queue
            if (this.board[cy][cx].adjacentMines === 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx !== 0 || dy !== 0) {
                            queue.push({y: cy + dy, x: cx + dx});
                        }
                    }
                }
            }
        }

        this.numOfUnrevealedTiles -= tilesToReveal.length;

        console.log(tilesToReveal); 
        
        return tilesToReveal;
    }

    getShownTiles() {
        const shownTiles = [];
        for (let y = 0; y < this.board.length; y++) {
            for (let x = 0; x < this.board[y].length; x++) {
                const tile = this.board[y][x];
                if (tile.isRevealed || tile.isFlagged) {
                    shownTiles.push({y: y, x: x, type: tile.getType()});
                }
            }
        }

        return shownTiles;
    }
}