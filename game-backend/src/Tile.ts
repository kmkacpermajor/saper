import { TileType } from "@saper/contracts";

export default class Tile {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;

  constructor() {
    this.isMine = false;
    this.isRevealed = false;
    this.isFlagged = false;
    this.adjacentMines = -1;
  }

  getType(): TileType {
    if (!this.isRevealed && !this.isFlagged) {
      return TileType.HIDDEN;
    }

    if (this.isFlagged) {
      return TileType.FLAGGED;
    }

    if (this.isMine) {
      return TileType.MINE;
    }

    if (this.adjacentMines === 0) {
      return TileType.EMPTY;
    }

    return (TileType.EMPTY + this.adjacentMines) as TileType;
  }
}
