import { Application } from "pixi.js";
import { GameState, TileType, type TileCoordinates } from "@saper/contracts";
import log, { clientLogLevel } from "@/services/logger";
import BoardRenderer from "./boardRenderer";
import { GAME_EVENT_TYPE, type GameEvent } from "./gameEvents";
import type { TransportClient } from "@/services/wsClient";
import MouseInputHandler from "./input/MouseInputHandler";
import TouchInputHandler from "./input/TouchInputHandler";
import ViewportController from "./viewportController";

type EventHandler = (event: GameEvent) => void;

export default class GameController {
  private readonly tileSize = 32;
  private readonly minInitialZoom = 0.55;
  private boardState: TileType[][] = [];
  private chordPreviewTiles: TileCoordinates[] = [];
  private _gameId: number;
  private _gameState: GameState;
  private _numBombs: number;
  private readonly eventHandler: EventHandler;
  private readonly boardRenderer: BoardRenderer;
  private readonly transportClient: TransportClient;
  private readonly mouseInputHandler: MouseInputHandler;
  private readonly touchInputHandler: TouchInputHandler;
  private readonly viewportController: ViewportController;
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
    this.mouseInputHandler = new MouseInputHandler(this);
    this.touchInputHandler = new TouchInputHandler(this);
    this.viewportController = new ViewportController();

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
      backgroundColor: 0x000000,
      backgroundAlpha: 0
    });

    await this.boardRenderer.init(this.app);
    this.boardRenderer.container.eventMode = "static";
    this.app.canvas.addEventListener("mousedown", this.mouseInputHandler.handleCanvasMouseDown);
    this.app.canvas.addEventListener("touchstart", this.touchInputHandler.handleCanvasTouchStart, { passive: false });
    this.app.canvas.addEventListener("touchmove", this.touchInputHandler.handleCanvasTouchMove, { passive: false });
    this.app.canvas.addEventListener("touchend", this.touchInputHandler.handleCanvasTouchEnd, { passive: false });
    this.app.canvas.addEventListener("touchcancel", this.touchInputHandler.handleCanvasTouchCancel, { passive: false });
    this.app.canvas.addEventListener("wheel", this.handleCanvasWheel, { passive: false });
    window.addEventListener("mouseup", this.mouseInputHandler.handleWindowMouseUp);
    window.addEventListener("mousemove", this.mouseInputHandler.handleWindowMouseMove);
    window.addEventListener("resize", this.handleWindowResize);
    this.initialized = true;
  }

  applyConnected(gameId: number, rows: number, cols: number, bombs: number): void {
    this.gameId = gameId;
    this.rows = rows;
    this.cols = cols;
    this.boardState = this.initializeBoard(rows, cols);
    this.numBombs = bombs;
    this.initialNumBombs = bombs;

    this.boardRenderer.setupBoard(rows, cols);
    this.viewportController.setWorldSize(this.cols * this.tileSize, this.rows * this.tileSize);
    this.updateViewportFromContainer(true, true);

    // The canvas may be attached to DOM after connect resolves.
    setTimeout(() => {
      if (this.initialized) {
        this.updateViewportFromContainer(true, true);
      }
    }, 0);
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
    this.mouseInputHandler.reset();
    this.touchInputHandler.reset();
    this.boardState = this.initializeBoard(this.rows, this.cols);
    this.boardRenderer.setupBoard(this.rows, this.cols);
    this.viewportController.setWorldSize(this.cols * this.tileSize, this.rows * this.tileSize);
    this.updateViewportFromContainer(true, true);

    this.gameState = GameState.IN_PROGRESS;
    this.numBombs = this.initialNumBombs;
  }

  isGameInProgress(): boolean {
    return this.gameState === GameState.IN_PROGRESS;
  }

  getTileType(tile: TileCoordinates): TileType | undefined {
    return this.boardState[tile.y]?.[tile.x];
  }

  revealTile(tile: TileCoordinates): void {
    this.transportClient.revealTiles([tile]);
  }

  toggleFlag(tile: TileCoordinates): void {
    const tileType = this.boardState[tile.y]?.[tile.x];
    if (tileType !== TileType.HIDDEN && tileType !== TileType.FLAGGED) {
      return;
    }

    this.transportClient.flagTile(tile, tileType === TileType.FLAGGED);
  }

  tryChordReveal(centerTile: TileCoordinates): boolean {
    const tileType = this.boardState[centerTile.y]?.[centerTile.x];
    if (tileType === undefined || tileType === TileType.HIDDEN || tileType === TileType.FLAGGED) {
      return false;
    }

    const adjacentMines = this.resolveAdjacentMines(tileType);
    if (adjacentMines === null) {
      return false;
    }

    const flaggedNeighbors = this.countFlaggedNeighbors(centerTile.y, centerTile.x);
    if (adjacentMines > 0 && flaggedNeighbors !== adjacentMines) {
      log.debug("[client] Chord skipped due to flag mismatch", {
        tile: centerTile,
        flaggedNeighbors,
        adjacentMines
      });
      return false;
    }

    const hiddenNeighbors = this.collectHiddenNeighbors(centerTile.y, centerTile.x);
    if (hiddenNeighbors.length > 0) {
      log.debug("[client] Chord reveal triggered", {
        tile: centerTile,
        hiddenNeighborsCount: hiddenNeighbors.length
      });
      this.transportClient.revealTiles(hiddenNeighbors);
      return true;
    }

    log.debug("[client] Chord had no hidden neighbors", { tile: centerTile });
    return false;
  }

  applyChordPreview(centerTile: TileCoordinates): void {
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

  clearChordPreview(): void {
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

  resolveTileFromClientPosition(clientX: number, clientY: number): TileCoordinates | null {
    const rect = this.app.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    const normalizedX = clientX - rect.left;
    const normalizedY = clientY - rect.top;
    if (normalizedX < 0 || normalizedY < 0 || normalizedX > rect.width || normalizedY > rect.height) {
      return null;
    }

    const scaleX = this.app.renderer.width / rect.width;
    const scaleY = this.app.renderer.height / rect.height;
    const canvasX = normalizedX * scaleX;
    const canvasY = normalizedY * scaleY;

    const { zoom } = this.viewportController.getState();
    const { x: horizontalOffset, y: verticalOffset } = this.resolveBoardOffsets(zoom);
    const localX = canvasX - horizontalOffset;
    const localY = canvasY - verticalOffset;

    const worldPixelWidth = this.cols * this.tileSize;
    const worldPixelHeight = this.rows * this.tileSize;
    if (
      localX < 0 ||
      localY < 0 ||
      localX > worldPixelWidth * zoom ||
      localY > worldPixelHeight * zoom
    ) {
      return null;
    }

    const worldPoint = this.viewportController.screenToWorld(localX, localY);
    const x = Math.floor(worldPoint.x / this.tileSize);
    const y = Math.floor(worldPoint.y / this.tileSize);

    if (!this.isWithinBoard(y, x)) {
      return null;
    }

    return { y, x };
  }

  panViewportByScreenDelta(deltaX: number, deltaY: number): void {
    const { zoom } = this.viewportController.getState();
    this.viewportController.panByWorldDelta(-deltaX / zoom, -deltaY / zoom);
    this.applyViewportTransform();
  }

  zoomViewportAtClientPoint(clientX: number, clientY: number, scaleFactor: number): void {
    const rect = this.app.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const normalizedX = clientX - rect.left;
    const normalizedY = clientY - rect.top;
    if (normalizedX < 0 || normalizedY < 0 || normalizedX > rect.width || normalizedY > rect.height) {
      return;
    }

    const scaleX = this.app.renderer.width / rect.width;
    const scaleY = this.app.renderer.height / rect.height;
    const canvasX = normalizedX * scaleX;
    const canvasY = normalizedY * scaleY;

    const { zoom } = this.viewportController.getState();
    const { x: horizontalOffset, y: verticalOffset } = this.resolveBoardOffsets(zoom);
    this.viewportController.zoomAtScreenPoint(
      scaleFactor,
      canvasX - horizontalOffset,
      canvasY - verticalOffset
    );
    this.applyViewportTransform();
  }

  fitViewport(): void {
    this.viewportController.fitToViewport();
    this.applyViewportTransform();
  }

  centerViewport(): void {
    this.viewportController.centerAtCurrentZoom();
    this.applyViewportTransform();
  }

  zoomViewportAtCanvasCenter(scaleFactor: number): void {
    const rect = this.app.canvas.getBoundingClientRect();
    this.zoomViewportAtClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, scaleFactor);
  }

  private handleCanvasWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomViewportAtClientPoint(event.clientX, event.clientY, factor);
  };

  private handleWindowResize = (): void => {
    this.updateViewportFromContainer(false, false);
  };

  private updateViewportFromContainer(fitToViewport: boolean, preferCloserStart: boolean): void {
    const parent = this.app.canvas.parentElement;
    const width = Math.max(320, Math.floor(parent?.clientWidth ?? window.innerWidth));
    const height = Math.max(240, Math.floor(parent?.clientHeight ?? window.innerHeight));

    this.app.renderer.resize(width, height);
    this.viewportController.setViewportSize(width, height);

    if (fitToViewport) {
      this.viewportController.fitToViewport(0.96, preferCloserStart ? this.minInitialZoom : 0);
    }

    this.applyViewportTransform();
  }

  private applyViewportTransform(): void {
    const { cameraX, cameraY, zoom } = this.viewportController.getState();
    const { x: horizontalOffset, y: verticalOffset } = this.resolveBoardOffsets(zoom);

    this.boardRenderer.container.scale.set(zoom);
    this.boardRenderer.container.position.set(
      horizontalOffset - cameraX * zoom,
      verticalOffset - cameraY * zoom
    );
  }

  private resolveBoardOffsets(zoom: number): { x: number; y: number } {
    const worldPixelWidth = this.cols * this.tileSize;
    const worldPixelHeight = this.rows * this.tileSize;

    return {
      x: Math.max(0, (this.app.renderer.width - worldPixelWidth * zoom) / 2),
      y: Math.max(0, (this.app.renderer.height - worldPixelHeight * zoom) / 2)
    };
  }

  private isWithinBoard(y: number, x: number): boolean {
    return y >= 0 && y < this.rows && x >= 0 && x < this.cols;
  }

  private initializeBoard(rows: number, cols: number): TileType[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => TileType.HIDDEN));
  }

  cleanup(): void {
    log.info("[client] Cleaning up game instance.");
    this.app.canvas.removeEventListener("mousedown", this.mouseInputHandler.handleCanvasMouseDown);
    this.app.canvas.removeEventListener("touchstart", this.touchInputHandler.handleCanvasTouchStart);
    this.app.canvas.removeEventListener("touchmove", this.touchInputHandler.handleCanvasTouchMove);
    this.app.canvas.removeEventListener("touchend", this.touchInputHandler.handleCanvasTouchEnd);
    this.app.canvas.removeEventListener("touchcancel", this.touchInputHandler.handleCanvasTouchCancel);
    this.app.canvas.removeEventListener("wheel", this.handleCanvasWheel);
    window.removeEventListener("mouseup", this.mouseInputHandler.handleWindowMouseUp);
    window.removeEventListener("mousemove", this.mouseInputHandler.handleWindowMouseMove);
    window.removeEventListener("resize", this.handleWindowResize);
    this.mouseInputHandler.reset();
    this.touchInputHandler.reset();
    this.app.ticker.stop();
    this.boardRenderer.destroy();
    this.app.stage.destroy({ children: true });
    this.initialized = false;
  }
}
