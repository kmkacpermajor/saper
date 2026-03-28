import { Application } from "pixi.js";
import { GameState, TileType, type TileCoordinates } from "@saper/contracts";
import log, { clientLogLevel } from "@/services/logger";
import BoardRenderer from "./boardRenderer";
import { GAME_EVENT_TYPE, type GameEvent } from "./gameEvents";
import type { TransportClient } from "@/services/wsClient";

type EventHandler = (event: GameEvent) => void;

export default class GameController {
  private readonly tileSize = 25;
  private boardState: TileType[][] = [];
  private gestureTile: TileCoordinates | null = null;
  private mouseButtonsMask = 0;
  private chordArmedForGesture = false;
  private chordTriggeredForGesture = false;
  private chordPreviewTiles: TileCoordinates[] = [];
  private _gameId: number;
  private _gameState: GameState;
  private _numBombs: number;
  private readonly eventHandler: EventHandler;
  private readonly boardRenderer: BoardRenderer;
  private readonly transportClient: TransportClient;
  private initialized: boolean;

  rows: number;
  cols: number;
  initialNumBombs: number;
  app!: Application;

  constructor(gameId: number, eventHandler: EventHandler, transportClient: TransportClient) {
    this._gameId = gameId;
    this.eventHandler = eventHandler;
    this.boardRenderer = new BoardRenderer(this.tileSize);
    this.transportClient = transportClient;
    this._gameState = GameState.IN_PROGRESS;
    this._numBombs = 0;
    this.initialNumBombs = 0;
    this.rows = 0;
    this.cols = 0;
    this.initialized = false;

    log.info(`[client] Log level: ${clientLogLevel}`);
  }

  get gameId(): number {
    return this._gameId;
  }

  set gameId(value: number) {
    this._gameId = value;
    this.emitEvent(GAME_EVENT_TYPE.GAME_ID_UPDATE, value.toString());
  }

  get gameState(): GameState {
    return this._gameState;
  }

  set gameState(value: GameState) {
    this._gameState = value;
    this.emitEvent(GAME_EVENT_TYPE.GAME_STATE_UPDATE, value);
  }

  get numBombs(): number {
    return this._numBombs;
  }

  set numBombs(value: number) {
    this._numBombs = value;
    this.emitEvent(GAME_EVENT_TYPE.NUM_BOMBS_UPDATE, value);
  }

  emitEvent<T extends GameEvent["type"]>(
    type: T,
    payload: Extract<GameEvent, { type: T }>["payload"]
  ): void {
    setTimeout(() => {
      this.eventHandler({ type, payload } as GameEvent);
    }, 0);
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.app = new Application();
    await this.app.init({
      width: 0,
      height: 0,
      backgroundColor: 0x1099bb
    });

    await this.boardRenderer.init(this.app);
    this.boardRenderer.container.eventMode = "static";
    this.app.canvas.addEventListener("mousedown", this.handleCanvasMouseDown);
    window.addEventListener("mouseup", this.handleWindowMouseUp);
    this.initialized = true;
  }

  applyConnected(gameId: number, rows: number, cols: number, bombs: number): void {
    this.gameId = gameId;
    this.rows = rows;
    this.cols = cols;
    this.boardState = this.initializeBoard(rows, cols);
    this.numBombs = bombs;
    this.initialNumBombs = bombs;

    this.boardRenderer.setupBoard(this.app, rows, cols);
  }

  applyRevealTile(y: number, x: number, type: TileType): void {
    const previousType = this.boardState[y]?.[x];
    if (previousType === undefined) {
      return;
    }

    if (previousType === type) {
      this.boardRenderer.renderTile(y, x, type);
      return;
    }

    this.boardState[y][x] = type;
    this.boardRenderer.renderTile(y, x, type);

    if (previousType !== TileType.FLAGGED && type === TileType.FLAGGED) {
      this.numBombs--;
    } else if (previousType === TileType.FLAGGED && type !== TileType.FLAGGED) {
      this.numBombs++;
    }
  }

  applyGameOver(state: GameState): void {
    this.gameState = state;
  }

  applyReset(): void {
    this.clearChordPreview();
    this.boardState = this.initializeBoard(this.rows, this.cols);
    this.boardRenderer.setupBoard(this.app, this.rows, this.cols);

    this.gameState = GameState.IN_PROGRESS;
    this.numBombs = this.initialNumBombs;
  }

  private handleCanvasMouseDown = (event: MouseEvent): void => {
    if (this.gameState !== GameState.IN_PROGRESS) {
      return;
    }

    const pointerTile = this.resolveTileFromMouseEvent(event);
    if (!pointerTile) {
      return;
    }

    const previousMask = this.mouseButtonsMask;
    const currentMask = event.buttons & 0b11;
    this.mouseButtonsMask = currentMask;

    if (previousMask === 0 || this.gestureTile === null) {
      this.gestureTile = pointerTile;
      this.chordTriggeredForGesture = false;
    } else if (!this.isSameTile(this.gestureTile, pointerTile)) {
      this.gestureTile = pointerTile;
      this.chordTriggeredForGesture = false;
    }

    const bothPressedNow = currentMask === 0b11;
    const bothPressedBefore = previousMask === 0b11;
    if (!bothPressedBefore && bothPressedNow && this.gestureTile && !this.chordArmedForGesture) {
      this.applyChordPreview(this.gestureTile);
      this.chordArmedForGesture = true;
      log.debug("[client] Combo armed on buttons transition", {
        tile: this.gestureTile,
        previousMask,
        currentMask
      });
    }

    log.debug("[client] Canvas mousedown", {
      tile: pointerTile,
      button: event.button,
      previousMask,
      currentMask,
      gestureTile: this.gestureTile,
      chordTriggeredForGesture: this.chordTriggeredForGesture
    });
  };

  private handleWindowMouseUp = (event: MouseEvent): void => {
    const previousMask = this.mouseButtonsMask;
    const currentMask = event.buttons & 0b11;
    this.mouseButtonsMask = currentMask;

    if (previousMask === 0b11 && currentMask !== 0b11) {
      this.clearChordPreview();

      if (this.chordArmedForGesture && this.gestureTile && !this.chordTriggeredForGesture) {
        log.debug("[client] Combo reveal triggered on release", {
          tile: this.gestureTile,
          previousMask,
          currentMask
        });
        this.tryChordReveal(this.gestureTile);
        this.chordTriggeredForGesture = true;
      }

      this.chordArmedForGesture = false;
    }

    if (previousMask === 0) {
      return;
    }

    const isLeftRelease = event.button === 0;
    const isRightRelease = event.button === 2;
    if (!isLeftRelease && !isRightRelease) {
      if (this.mouseButtonsMask === 0) {
        this.resetPointerState();
      }
      return;
    }

    const pointerTile = this.resolveTileFromMouseEvent(event);
    const shouldSkipSingleAction = previousMask === 0b11 || this.chordArmedForGesture || this.chordTriggeredForGesture;

    if (
      !shouldSkipSingleAction &&
      this.gameState === GameState.IN_PROGRESS &&
      this.gestureTile !== null &&
      pointerTile !== null &&
      this.isSameTile(this.gestureTile, pointerTile)
    ) {
      const tileType = this.boardState[pointerTile.y]?.[pointerTile.x];
      if (isLeftRelease && tileType === TileType.HIDDEN) {
        log.debug("[client] Single reveal triggered", { tile: pointerTile });
        this.transportClient.revealTiles([pointerTile]);
      }

      if (isRightRelease && (tileType === TileType.HIDDEN || tileType === TileType.FLAGGED)) {
        log.debug("[client] Flag toggle triggered", { tile: pointerTile, unflag: tileType === TileType.FLAGGED });
        this.transportClient.flagTile(pointerTile.y, pointerTile.x, tileType === TileType.FLAGGED);
      }
    }

    log.debug("[client] Window mouseup", {
      tile: pointerTile,
      button: event.button,
      previousMask,
      currentMask,
      shouldSkipSingleAction,
      gestureTile: this.gestureTile,
      chordTriggeredForGesture: this.chordTriggeredForGesture
    });

    if (this.mouseButtonsMask === 0) {
      this.resetPointerState();
    }
  };

  private tryChordReveal(centerTile: TileCoordinates): void {
    const tileType = this.boardState[centerTile.y]?.[centerTile.x];
    if (tileType === undefined || tileType === TileType.HIDDEN || tileType === TileType.FLAGGED) {
      return;
    }

    const adjacentMines = this.resolveAdjacentMines(tileType);
    if (adjacentMines === null) {
      return;
    }

    const flaggedNeighbors = this.countFlaggedNeighbors(centerTile.y, centerTile.x);
    if (flaggedNeighbors !== adjacentMines) {
      log.debug("[client] Chord skipped due to flag mismatch", {
        tile: centerTile,
        flaggedNeighbors,
        adjacentMines
      });
      return;
    }

    const hiddenNeighbors = this.collectHiddenNeighbors(centerTile.y, centerTile.x);
    if (hiddenNeighbors.length > 0) {
      log.debug("[client] Chord reveal triggered", {
        tile: centerTile,
        hiddenNeighborsCount: hiddenNeighbors.length
      });
      this.transportClient.revealTiles(hiddenNeighbors);
      return;
    }

    log.debug("[client] Chord had no hidden neighbors", { tile: centerTile });
  }

  private applyChordPreview(centerTile: TileCoordinates): void {
    this.clearChordPreview();

    const tileType = this.boardState[centerTile.y]?.[centerTile.x];
    if (tileType === undefined || tileType === TileType.HIDDEN || tileType === TileType.FLAGGED) {
      return;
    }

    const hiddenNeighbors = this.collectHiddenNeighbors(centerTile.y, centerTile.x);
    for (const tile of hiddenNeighbors) {
      this.boardRenderer.renderTile(tile.y, tile.x, TileType.EMPTY);
    }

    this.chordPreviewTiles = hiddenNeighbors;
    if (hiddenNeighbors.length > 0) {
      log.debug("[client] Chord preview applied", {
        tile: centerTile,
        previewTiles: hiddenNeighbors.length
      });
    }
  }

  private clearChordPreview(): void {
    if (this.chordPreviewTiles.length === 0) {
      return;
    }

    for (const tile of this.chordPreviewTiles) {
      const currentType = this.boardState[tile.y]?.[tile.x];
      if (currentType === undefined) {
        continue;
      }

      this.boardRenderer.renderTile(tile.y, tile.x, currentType);
    }

    log.debug("[client] Chord preview cleared", { previewTiles: this.chordPreviewTiles.length });
    this.chordPreviewTiles = [];
  }

  private resolveTileFromMouseEvent(event: MouseEvent): TileCoordinates | null {
    const rect = this.app.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    const normalizedX = event.clientX - rect.left;
    const normalizedY = event.clientY - rect.top;
    if (normalizedX < 0 || normalizedY < 0 || normalizedX > rect.width || normalizedY > rect.height) {
      return null;
    }

    const scaleX = this.app.canvas.width / rect.width;
    const scaleY = this.app.canvas.height / rect.height;
    const x = Math.floor((normalizedX * scaleX) / this.tileSize);
    const y = Math.floor((normalizedY * scaleY) / this.tileSize);

    if (!this.isWithinBoard(y, x)) {
      return null;
    }

    return { y, x };
  }

  private resetPointerState(): void {
    this.clearChordPreview();
    log.debug("[client] Resetting gesture state", {
      mouseButtonsMask: this.mouseButtonsMask,
      gestureTile: this.gestureTile
    });
    this.gestureTile = null;
    this.mouseButtonsMask = 0;
    this.chordArmedForGesture = false;
    this.chordTriggeredForGesture = false;
  }

  private isSameTile(a: TileCoordinates | null, b: TileCoordinates): boolean {
    return a !== null && a.y === b.y && a.x === b.x;
  }

  private resolveAdjacentMines(tileType: TileType): number | null {
    if (tileType === TileType.EMPTY) {
      return 0;
    }

    if (tileType >= TileType.ONE && tileType <= TileType.EIGHT) {
      return tileType - TileType.EMPTY;
    }

    return null;
  }

  private countFlaggedNeighbors(y: number, x: number): number {
    let count = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) {
          continue;
        }

        const ny = y + dy;
        const nx = x + dx;
        if (!this.isWithinBoard(ny, nx)) {
          continue;
        }

        if (this.boardState[ny][nx] === TileType.FLAGGED) {
          count++;
        }
      }
    }

    return count;
  }

  private collectHiddenNeighbors(y: number, x: number): TileCoordinates[] {
    const neighbors: TileCoordinates[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) {
          continue;
        }

        const ny = y + dy;
        const nx = x + dx;
        if (!this.isWithinBoard(ny, nx)) {
          continue;
        }

        if (this.boardState[ny][nx] === TileType.HIDDEN) {
          neighbors.push({ y: ny, x: nx });
        }
      }
    }

    return neighbors;
  }

  private isWithinBoard(y: number, x: number): boolean {
    return y >= 0 && y < this.rows && x >= 0 && x < this.cols;
  }

  private initializeBoard(rows: number, cols: number): TileType[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => TileType.HIDDEN));
  }

  cleanup(): void {
    log.info("[client] Cleaning up game instance.");
    this.app.canvas.removeEventListener("mousedown", this.handleCanvasMouseDown);
    window.removeEventListener("mouseup", this.handleWindowMouseUp);
    this.app.ticker.stop();
    this.boardRenderer.destroy();
    this.app.stage.destroy({ children: true });
    this.initialized = false;
  }
}
