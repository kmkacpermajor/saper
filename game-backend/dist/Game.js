import { GameState, TileType } from "@saper/contracts";
import Board from "./Board.js";
import MessageSender from "./MessageSender.js";
export default class Game {
    gameId;
    rows;
    cols;
    numBombs;
    messageSender;
    board;
    constructor(gameId, rows, cols, numBombs, onAllClientsDisconnected) {
        this.gameId = gameId;
        this.rows = rows;
        this.cols = cols;
        this.numBombs = numBombs;
        this.messageSender = new MessageSender(onAllClientsDisconnected);
        this.board = null;
    }
    get gameEnded() {
        return this.board?.gameEnded ?? false;
    }
    get gameWon() {
        return this.board?.gameWon ?? false;
    }
    resetGame() {
        this.board = null;
        this.messageSender.sendReset();
    }
    endGame(state) {
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
            this.messageSender.sendGameOver(state);
        }
    }
    ensureBoardForFirstMove(y, x) {
        if (this.board) {
            return;
        }
        this.board = new Board(this.rows, this.cols, this.numBombs);
        let retries = 0;
        while (retries < 20 && this.board.board[y][x].adjacentMines !== 0) {
            this.board = new Board(this.rows, this.cols, this.numBombs);
            retries++;
        }
    }
    checkGameWinCondition() {
        if (!this.board) {
            return false;
        }
        return this.board.numOfUnrevealedTiles === this.board.numBombs;
    }
    revealTiles(tiles) {
        if (tiles.length === 0) {
            return;
        }
        const firstTile = tiles[0];
        this.ensureBoardForFirstMove(firstTile.y, firstTile.x);
        if (!this.board || this.board.gameEnded) {
            return;
        }
        const combinedTilesToReveal = [];
        for (const tile of tiles) {
            const tilesToReveal = this.board.tilesToReveal(tile.y, tile.x);
            if (!tilesToReveal || tilesToReveal.length === 0) {
                continue;
            }
            combinedTilesToReveal.push(...tilesToReveal);
        }
        if (combinedTilesToReveal.length === 0) {
            return;
        }
        this.messageSender.sendRevealTiles(combinedTilesToReveal);
        if (combinedTilesToReveal.some((tile) => tile.type === TileType.MINE)) {
            this.endGame(GameState.LOST);
            return;
        }
        if (this.checkGameWinCondition()) {
            this.endGame(GameState.WON);
        }
    }
    flagTile(y, x) {
        if (!this.board || this.board.gameEnded || this.board.board[y][x].isRevealed) {
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
    unflagTile(y, x) {
        if (!this.board || this.board.gameEnded || this.board.board[y][x].isRevealed) {
            return;
        }
        this.board.unflagTile(y, x);
        this.messageSender.sendRevealTiles([{ y, x, type: TileType.HIDDEN }]);
    }
}
