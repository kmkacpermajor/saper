import { BoardSize, Difficulty, GameState, TileType, type TileCoordinates, type TileUpdate } from "@saper/contracts";
import type { WebSocket } from "ws";
import Board from "./Board.js";
import MessageSender from "./MessageSender.js";
import PlayerIdentityRegistry from "./PlayerIdentityRegistry.js";
import { log } from "./logger.js";

const MAX_ZERO_START_RETRIES = 8;

export default class Game {
  readonly messageSender: MessageSender;
  private readonly playerIdentityRegistry: PlayerIdentityRegistry = new PlayerIdentityRegistry();
  private readonly playerCursorPositions: Map<number, TileCoordinates> = new Map<number, TileCoordinates>();

  board: Board | null = null;
  gameStartTime: number | null = null;

  constructor(readonly gameId: number, readonly rows: number, readonly cols: number, readonly numBombs: number, readonly difficulty: Difficulty, readonly boardSize: BoardSize, onAllClientsDisconnected: () => void) {
    this.messageSender = new MessageSender(onAllClientsDisconnected);
  }

  registerPlayer(ws: WebSocket): number {
    return this.playerIdentityRegistry.assignPlayerId(ws);
  }

  getPlayerId(ws: WebSocket): number | null {
    return this.playerIdentityRegistry.getPlayerId(ws);
  }

  removePlayer(ws: WebSocket): number | null {
    const removedPlayerId = this.playerIdentityRegistry.removePlayer(ws);
    if (removedPlayerId !== null) {
      this.playerCursorPositions.delete(removedPlayerId);
    }

    return removedPlayerId;
  }

  updatePlayerCursorPosition(playerId: number, tile: TileCoordinates): void {
    this.playerCursorPositions.set(playerId, { y: tile.y, x: tile.x });
  }

  getPlayerCursorSnapshot(excludePlayerId: number | null = null): Array<{ playerId: number; tile: TileCoordinates }> {
    const snapshot: Array<{ playerId: number; tile: TileCoordinates }> = [];

    for (const [playerId, tile] of this.playerCursorPositions.entries()) {
      if (excludePlayerId !== null && playerId === excludePlayerId) {
        continue;
      }

      snapshot.push({
        playerId,
        tile: { y: tile.y, x: tile.x }
      });
    }

    return snapshot;
  }

  get gameEnded(): boolean {
    return this.board?.gameEnded ?? false;
  }

  get gameWon(): boolean {
    return this.board?.gameWon ?? false;
  }

  resetGame(): void {
    this.board = null;
    this.playerCursorPositions.clear();
    this.messageSender.sendReset();
  }

  private endGame(state: GameState): void {
    if (!this.board) {
      return;
    }

    if (state === GameState.WON || state === GameState.LOST) {
      const revealUpdates = this.board.revealAllTiles(true);
      if (revealUpdates.length > 0) {
        this.messageSender.sendRevealTiles(revealUpdates);
      }

        this.board.gameEnded = true;
        this.board.gameWon = state === GameState.WON;
        const gameTimeMs = Date.now() - this.gameStartTime!;
        this.messageSender.sendGameOver(state, gameTimeMs);
        log.warn(`Game ${this.gameId} ended. State: ${state}, Time: ${gameTimeMs}ms, Bombs: ${this.board.numBombs}, Flagged Bombs: ${this.board.numOfFlaggedBombs()}`);
    }
  }

  private checkGameWinCondition(): boolean {
    if (!this.board) {
      return false;
    }

    return this.board.numOfUnrevealedTiles === this.board.numBombs;
  }

  revealTiles(tiles: TileCoordinates[]): void {
    if (tiles.length === 0) {
      return;
    }

    const firstMove = this.board === null;

    if (firstMove) {
      this.board = new Board(this.rows, this.cols, this.numBombs, tiles[0]);
    }
    
    if (!this.board) {
      return;
    }

    const combinedTilesToReveal: TileUpdate[] = [];
    for (const tile of tiles) {
      const tilesToReveal = this.board.tilesToReveal(tile.y, tile.x);
      if (!tilesToReveal || tilesToReveal.length === 0) {
        continue;
      }

      for (const tileToReveal of tilesToReveal) {
        combinedTilesToReveal.push(tileToReveal);
      }
    }

    if (combinedTilesToReveal.length === 0) {
      return;
    }

    if (firstMove) {
      this.gameStartTime = Date.now();
    }

    this.messageSender.sendRevealTiles(combinedTilesToReveal);

    if (combinedTilesToReveal.some((tile: TileUpdate) => tile.type === TileType.MINE)) {
      this.endGame(GameState.LOST);
      return;
    }

    if (this.checkGameWinCondition()) {
      this.endGame(GameState.WON);
    }
  }

  flagTile(y: number, x: number): void {
    if (!this.board || this.board.board[y][x].isRevealed) {
      return;
    }

    this.board.flagTile(y, x);
    this.messageSender.sendRevealTiles([{ y, x, type: TileType.FLAGGED }]);

    if (this.board.numOfFlaggedTiles === this.board.numBombs) {
      this.endGame(this.board.numOfFlaggedBombs() === this.board.numBombs ? GameState.WON : GameState.LOST);
      return;
    }

    if (this.checkGameWinCondition()) {
      this.endGame(GameState.WON);
    }
  }

  unflagTile(y: number, x: number): void {
    if (!this.board || this.board.board[y][x].isRevealed) {
      return;
    }

    this.board.unflagTile(y, x);
    this.messageSender.sendRevealTiles([{ y, x, type: TileType.HIDDEN }]);
  }
}
