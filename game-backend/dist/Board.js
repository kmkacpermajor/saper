import Tile from "./Tile.js";
export default class Board {
    rows;
    cols;
    numBombs;
    board;
    bombCoords;
    gameEnded;
    gameWon;
    numOfUnrevealedTiles;
    numOfFlaggedTiles;
    constructor(rows, cols, numBombs) {
        this.rows = rows;
        this.cols = cols;
        this.numBombs = numBombs;
        this.board = [];
        this.bombCoords = [];
        this.gameEnded = false;
        this.gameWon = false;
        this.numOfUnrevealedTiles = rows * cols;
        this.numOfFlaggedTiles = 0;
        this.createBoard();
    }
    flagTile(y, x) {
        if (this.board[y][x].isFlagged) {
            return;
        }
        this.board[y][x].isFlagged = true;
        this.numOfFlaggedTiles++;
    }
    unflagTile(y, x) {
        if (!this.board[y][x].isFlagged) {
            return;
        }
        this.board[y][x].isFlagged = false;
        this.numOfFlaggedTiles--;
    }
    numOfFlaggedBombs() {
        let sum = 0;
        this.bombCoords.forEach((bombLocation) => {
            if (this.board[bombLocation.y][bombLocation.x].isFlagged) {
                sum++;
            }
        });
        return sum;
    }
    countAdjacentMines(y, x) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0 && dx === 0) {
                    continue;
                }
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && nx >= 0 && ny < this.rows && nx < this.cols && this.board[ny][nx].isMine) {
                    count++;
                }
            }
        }
        return count;
    }
    createBoard() {
        this.board = Array.from({ length: this.rows }, () => Array.from({ length: this.cols }, () => new Tile()));
        let minesPlaced = 0;
        while (minesPlaced < this.numBombs) {
            const y = Math.floor(Math.random() * this.rows);
            const x = Math.floor(Math.random() * this.cols);
            if (!this.board[y][x].isMine) {
                this.board[y][x].isMine = true;
                this.bombCoords.push({ y, x });
                minesPlaced++;
            }
        }
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.board[y][x].isMine) {
                    this.board[y][x].adjacentMines = this.countAdjacentMines(y, x);
                }
            }
        }
    }
    tilesToReveal(y, x) {
        if (this.gameEnded || this.board[y][x].isRevealed || this.board[y][x].isFlagged) {
            return undefined;
        }
        if (this.board[y][x].isMine) {
            const mineTiles = [];
            this.bombCoords.forEach((bombLocation) => {
                this.board[bombLocation.y][bombLocation.x].isRevealed = true;
                mineTiles.push({
                    y: bombLocation.y,
                    x: bombLocation.x,
                    type: this.board[bombLocation.y][bombLocation.x].getType()
                });
            });
            return mineTiles;
        }
        const tilesToReveal = [];
        const queue = [{ y, x }];
        while (queue.length > 0) {
            const tileCoords = queue.shift();
            if (!tileCoords) {
                continue;
            }
            const cy = tileCoords.y;
            const cx = tileCoords.x;
            if (cy < 0 || cy >= this.rows || cx < 0 || cx >= this.cols || this.board[cy][cx].isRevealed || this.board[cy][cx].isFlagged) {
                continue;
            }
            this.board[cy][cx].isRevealed = true;
            tilesToReveal.push({ y: cy, x: cx, type: this.board[cy][cx].getType() });
            if (this.board[cy][cx].adjacentMines === 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx !== 0 || dy !== 0) {
                            queue.push({ y: cy + dy, x: cx + dx });
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
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tile = this.board[y][x];
                if (tile.isRevealed || tile.isFlagged) {
                    shownTiles.push({ y, x, type: tile.getType() });
                }
            }
        }
        return shownTiles;
    }
    revealAllTiles(clearFlags = false) {
        const revealedTiles = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tile = this.board[y][x];
                if (clearFlags && tile.isFlagged) {
                    tile.isFlagged = false;
                }
                if (tile.isRevealed) {
                    continue;
                }
                tile.isRevealed = true;
                revealedTiles.push({ y, x, type: tile.getType() });
            }
        }
        if (clearFlags) {
            this.numOfFlaggedTiles = 0;
        }
        this.numOfUnrevealedTiles = 0;
        return revealedTiles;
    }
}
