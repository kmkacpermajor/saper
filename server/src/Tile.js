export default class Tile {
    constructor() {
        this.isMine = false;
        this.isRevealed = false;
        this.isFlagged = false;
        this.adjacentMines = 0;
    }

    countAdjacentMines(board, x, y) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                let nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < board.length && ny < board[0].length && board[nx][ny].isMine) {
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