import Tile from './Tile.js';

export default class Board {
    constructor(rows = 10, cols = 10, mineCount = 5) {
        this.rows = rows;
        this.cols = cols;
        this.mineCount = mineCount;
        this.board = [];
        this.gameEnded = 0x00;
        this.numOfRevealedTiles = 0;

        this.createBoard();
    }

    // liczba flag == liczba bomb
    // pozostałe nieodkryte pola są równe bomby - flagi

    getFlaggedTiles(){

    }

    createBoard() {
        this.board = Array.from({ length: this.rows }, () => 
            Array.from({ length: this.cols }, () => new Tile()));

        let minesPlaced = 0;
        while (minesPlaced < this.mineCount) {
            let x = Math.floor(Math.random() * this.rows);
            let y = Math.floor(Math.random() * this.cols);
            if (!this.board[x][y].isMine) {
                this.board[x][y].isMine = true;
                minesPlaced++;
            }
        }

        for (let x = 0; x < this.rows; x++) {
            for (let y = 0; y < this.cols; y++) {
                if (!this.board[x][y].isMine) {
                    this.board[x][y].adjacentMines = this.board[x][y].countAdjacentMines(this.board, x, y);
                }
            }
        }
    }

    tilesToReveal(x, y) {
        if (this.gameEnded || this.board[y][x].isRevealed) return [];
    
        if (this.board[y][x].isMine) {
            this.gameEnded = 0x02;
            this.board[y][x].isRevealed = true;
            return [{x, y, type: this.board[y][x].getType()}];
        }
        
        const tilesToReveal = [];
        const queue = [[x, y]];
        
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            
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
                            queue.push([cx + dx, cy + dy]);
                        }
                    }
                }
            }
        }

        this.numOfRevealedTiles += tilesToReveal.length;
        
        return tilesToReveal;
    }

    getShownTiles() {
        const shownTiles = [];
        for (let y = 0; y < this.board.length; y++) {
            for (let x = 0; x < this.board[y].length; x++) {
                const tile = this.board[y][x];
                if (tile.isRevealed || tile.isFlagged) {
                    shownTiles.push({x, y, type: tile.getType()});
                }
            }
        }

        return shownTiles;
    }
}