import type { TileCoordinates, TileUpdate } from "@saper/contracts";
import Tile from "./Tile.js";
import { log } from "./logger.js";

export default class Board {
  rows: number;
  cols: number;
  numBombs: number;
  board: Tile[][];
  bombCoords: Array<{ y: number; x: number }>;
  gameEnded: boolean;
  gameWon: boolean;
  numOfUnrevealedTiles: number;
  numOfFlaggedTiles: number;

  constructor(rows: number, cols: number, numBombs: number, firstTile: TileCoordinates) {
    this.rows = rows;
    this.cols = cols;
    this.numBombs = numBombs;
    this.board = [];
    this.bombCoords = [];
    this.gameEnded = false;
    this.gameWon = false;
    this.numOfUnrevealedTiles = rows * cols;
    this.numOfFlaggedTiles = 0;

    this.createBoard(firstTile);
  }

  flagTile(y: number, x: number): void {
    if (this.board[y][x].isFlagged) {
      return;
    }
    this.board[y][x].isFlagged = true;
    this.numOfFlaggedTiles++;
  }

  unflagTile(y: number, x: number): void {
    if (!this.board[y][x].isFlagged) {
      return;
    }
    this.board[y][x].isFlagged = false;
    this.numOfFlaggedTiles--;
  }

  numOfFlaggedBombs(): number {
    let sum = 0;
    this.bombCoords.forEach((bombLocation) => {
      if (this.board[bombLocation.y][bombLocation.x].isFlagged) {
        sum++;
      }
    });
    return sum;
  }

  /**
   * Places mines using an optimized Partial Fisher-Yates Shuffle,
   * guaranteeing a safe 3x3 zone around the first click.
   */
  private placeMines(tile: TileCoordinates): void {
      
      const pool: TileCoordinates[] = [];

      // 1. Generate pool, excluding the 3x3 safe zone around the starting click
      for (let y = 0; y < this.rows; y++) {
          for (let x = 0; x < this.cols; x++) {
              const isSafeZone = Math.abs(y - tile.y) <= 1 && Math.abs(x - tile.x) <= 1;
              if (!isSafeZone) {
                  pool.push({ y, x });
              }
          }
      }

      // Safety check for impossible board configurations
      if (this.numBombs > pool.length) {
          throw new Error("Too many bombs for this board size while preserving a safe start zone.");
      }

      // 2. Partial Fisher-Yates Shuffle
      // We only loop 'numBombs' times instead of shuffling the whole pool.
      for (let i = 0; i < this.numBombs; i++) {
          const randomIndex = i + Math.floor(Math.random() * (pool.length - i));
          
          // Swap the current element with the random element
          [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
          
          // The item at index 'i' is now a guaranteed random, unique mine location
          const { y, x } = pool[i];
          this.bombCoords.push({ y, x });
          this.board[y][x].isMine = true;
      }
  }

  /**
   * Calculates the numbers for all non-mine cells.
   */
  private countAdjacentMines(): void {
      const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
      ];

      for (let y = 0; y < this.rows; y++) {
          for (let x = 0; x < this.cols; x++) {
              if (this.board[y][x].isMine) continue;

              let count = 0;
              for (const [dx, dy] of directions) {
                  const nx = x + dx;
                  const ny = y + dy;

                  // Check bounds and count mines
                  if (ny >= 0 && ny < this.rows && nx >= 0 && nx < this.cols) {
                      if (this.board[ny][nx].isMine) {
                          count++;
                      }
                  }
              }
              this.board[y][x].adjacentMines = count;
          }
      }
  }

  private createBoard(firstTile: TileCoordinates): void {
    this.board = Array.from({ length: this.rows }, () =>
        Array.from({ length: this.cols }, () => new Tile())
      );

    this.placeMines(firstTile);
    this.countAdjacentMines();

  }

  tilesToReveal(y: number, x: number): TileUpdate[] | undefined {
    if (this.gameEnded || this.board[y][x].isRevealed || this.board[y][x].isFlagged) {
      return undefined;
    }

    if (this.board[y][x].isMine) {
      const mineTiles: TileUpdate[] = [];
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

    const tilesToReveal: TileUpdate[] = [];
    const startIndex = y * this.cols + x;
    const queue: number[] = [startIndex];
    const enqueued = new Uint8Array(this.rows * this.cols);
    enqueued[y * this.cols + x] = 1;
    let head = 0;

    while (head < queue.length) {
      const index = queue[head];
      const cy = Math.floor(index / this.cols);
      const cx = index % this.cols;
      head++;

      this.board[cy][cx].isRevealed = true;
      tilesToReveal.push({ y: cy, x: cx, type: this.board[cy][cx].getType() });

      if (this.board[cy][cx].adjacentMines === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              const ny = cy + dy;
              const nx = cx + dx;

              if (ny < 0 || ny >= this.rows || nx < 0 || nx >= this.cols) {
                continue;
              }

              if (this.board[ny][nx].isRevealed || this.board[ny][nx].isFlagged) {
                continue;
              }

              const nextIndex = ny * this.cols + nx;
              if (enqueued[nextIndex] === 1) {
                continue;
              }

              enqueued[nextIndex] = 1;
              queue.push(nextIndex);
            }
          }
        }
      }
    }

    this.numOfUnrevealedTiles -= tilesToReveal.length;
    return tilesToReveal;
  }

  getShownTiles(): TileUpdate[] {
    const shownTiles: TileUpdate[] = [];

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

  revealAllTiles(clearFlags = false): TileUpdate[] {
    const revealedTiles: TileUpdate[] = [];

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
