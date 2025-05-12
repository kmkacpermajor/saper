export default class Tile {
    constructor() {
        this.isMine = false;
        this.isRevealed = false;
        this.isFlagged = false;
        this.adjacentMines = -1;
    }

    getType() {
        if (this.isFlagged) return 9;
        if (this.isMine) return 10;
        return this.adjacentMines;
    }
}