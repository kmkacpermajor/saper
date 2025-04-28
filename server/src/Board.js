import Tile from './Tile.js';

export default class Board {
    constructor(rows, cols, numBombs) {
        this.rows = rows;
        this.cols = cols;
        this.numBombs = numBombs;
        this.board = [];
        this.bombCoords = [];
        this.gameEnded = false;
        this.numOfUnrevealedTiles = rows*cols;
        this.numOfFlaggedTiles = 0;

        this.createBoard();
    }

    flagTile(x, y){
        this.board[y][x].isFlagged = true;
        this.numOfFlaggedTiles++;
    }

    unflagTile(x, y){
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

    createBoard() {
        this.board = Array.from({ length: this.rows }, () => 
            Array.from({ length: this.cols }, () => new Tile()));

        let minesPlaced = 0;
        while (minesPlaced < this.numBombs) {
            let y = Math.floor(Math.random() * this.rows);
            let x = Math.floor(Math.random() * this.cols);
            if (!this.board[y][x].isMine) {
                this.board[y][x].isMine = true;
                this.bombCoords.push({x: x, y: y});
                minesPlaced++;
            }
        }

        for (let y = 0; y < this.cols; y++) {
            for (let x = 0; x < this.rows; x++) {
                if (!this.board[y][x].isMine) {
                    this.board[y][x].adjacentMines = this.board[y][x].countAdjacentMines(this.board, x, y);
                }
            }
        }
    }

    tilesToReveal(x, y) {
        if (this.gameEnded || this.board[y][x].isRevealed) return [];
    
        if (this.board[y][x].isMine) {
            this.board[y][x].isRevealed = true;
            return [{x: x, y: y, type: this.board[y][x].getType()}];
        }
        
        const tilesToReveal = [];
        const queue = [{x: x, y: y}];
        
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
            tilesToReveal.push({x: cx, y: cy, type: this.board[cy][cx].getType()});
            
            // If it's a zero, add adjacent tiles to queue
            if (this.board[cy][cx].adjacentMines === 0) {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx !== 0 || dy !== 0) {
                            queue.push({x: cx + dx, y: cy + dy});
                        }
                    }
                }
            }
        }

        this.numOfUnrevealedTiles -= tilesToReveal.length;
        
        return tilesToReveal;
    }

    getShownTiles() {
        const shownTiles = [];
        for (let y = 0; y < this.board.length; y++) {
            for (let x = 0; x < this.board[y].length; x++) {
                const tile = this.board[y][x];
                if (tile.isRevealed || tile.isFlagged) {
                    shownTiles.push({x: x, y: y, type: tile.getType()});
                }
            }
        }

        return shownTiles;
    }
}