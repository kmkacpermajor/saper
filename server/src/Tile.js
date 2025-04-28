export default class Tile {
    constructor() {
        this.isMine = false;
        this.isRevealed = false;
        this.isFlagged = false;
        this.adjacentMines = 0;
    }

    countAdjacentMines(board, x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let ny = y + dy, nx = x + dx;
                if (ny >= 0 && nx >= 0 && ny < board.length && nx < board[0].length && board[ny][nx].isMine) {
                    count++;
                }
            }
        }
        return count;
    }

    getType() {
        if (this.isFlagged) return 9;
        if (this.isMine) return 10;
        return this.adjacentMines;
    }
}