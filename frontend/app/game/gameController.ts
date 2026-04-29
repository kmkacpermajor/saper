import { Application, Rectangle } from "pixi.js";
import { TileUpdate ,GameState, TileType, type ServerMessage, type TileCoordinates, BoardSize, Difficulty } from "@saper/contracts";
import log from "~/utils/logger";
import BoardRenderer from "./boardRenderer";
import { GAME_EVENT_TYPE, type GameEvent } from "./gameEvents";
import type { WsClient } from "~/composables/useWsClient";
import MouseInputHandler from "./input/MouseInputHandler";
import TouchInputHandler from "./input/TouchInputHandler";
import ViewportController from "./viewportController";

type GameEventHandler = (event: GameEvent) => void;

export default class GameController {
  private readonly tileSize = 32;
  private readonly minInitialZoom = 0.55;

  private readonly boardRenderer: BoardRenderer = new BoardRenderer(this.tileSize);
  private readonly mouseInputHandler: MouseInputHandler = new MouseInputHandler(this);
  private readonly touchInputHandler: TouchInputHandler = new TouchInputHandler(this);
  private readonly viewportController: ViewportController = new ViewportController();

  private boardState: TileType[][] = [];
  private chordPreviewTiles: TileCoordinates[] = [];
  private _gameState: GameState = GameState.IN_PROGRESS;
  private _numBombs: number = 0;
  private _playerId: number = 0;
  private _gameTimeMs: number = 0;

  private initialized: boolean = false;
  private rows: number = 0;
  private cols: number = 0;
  private initialNumBombs: number = 0;
  private gameId: number = 0;
  private difficulty: Difficulty = 0;
  private boardSize: BoardSize = 0;

  app = new Application();

  constructor(
    private readonly gameEventHandler: GameEventHandler,
    private readonly wsClient: WsClient
  ) {}

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

  get playerId(): number {
    return this._playerId;
  }

  set playerId(value: number) {
    this._playerId = value;
    this.emitEvent(GAME_EVENT_TYPE.PLAYER_ID_UPDATE, value);
  }

  get gameTimeMs(): number {
    return this._gameTimeMs;
  }

  set gameTimeMs(value: number) {
    this._gameTimeMs = value;
    this.emitEvent(GAME_EVENT_TYPE.GAME_TIME_MS_UPDATE, value);
  }

  emitEvent<T extends GameEvent["type"]>(
    type: T,
    payload: Extract<GameEvent, { type: T }>["payload"]
  ): void {
    setTimeout(() => {
      this.gameEventHandler({ type, payload } as GameEvent);
    }, 0);
  }

  async init(requestedGameId: number): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.boardRenderer.init(this.app);
    this.boardRenderer.container.eventMode = "static";
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = new Rectangle(0, 0, 1, 1);

    const joinGameResponse = await this.wsClient.sendJoinGame(
      {
        requestedGameId
      },
      this.handleReceivedServerMessage
    );

    this.app.canvas.addEventListener("contextmenu", this.handleCanvasContextMenu);
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

  handleReceivedServerMessage = (message: ServerMessage): void => {
    switch (message.payload.oneofKind) {
      case "connect": {
        const payload = message.payload.connect;
        this.applyConnected(payload.gameId, payload.playerId, payload.rows, payload.cols, payload.numBombs, payload.difficulty, payload.boardSize);
        return;
      }

      case "revealTiles": {
        const revealUpdates: Array<{ y: number; x: number; type: TileType }> = [];

        for (const tile of message.payload.revealTiles.tiles) {
          if (!this.isTileType(tile.type)) {
            continue;
          }

          if (tile.y >= this.rows || tile.x >= this.cols) {
            continue;
          }

          revealUpdates.push({ y: tile.y, x: tile.x, type: tile.type });
        }

        this.applyRevealTiles(revealUpdates);
        return;
      }

      case "playerCursorUpdate": {
        const cursorPayload = message.payload.playerCursorUpdate;

        if (!cursorPayload.tile || cursorPayload.playerId === this.playerId) {
          return;
        }

        if (!this.isWithinBoard(cursorPayload.tile.y, cursorPayload.tile.x)) {
          return;
        }

        this.boardRenderer.updatePlayerCursor(cursorPayload.playerId, cursorPayload.tile);
        return;
      }

      case "playerCursorRemove": {
        this.boardRenderer.removePlayerCursor(message.payload.playerCursorRemove.playerId);
        return;
      }

      case "gameOver": {
        this.applyGameOver(message.payload.gameOver.state as GameState, message.payload.gameOver.gameTimeMs);
        return;
      }

      case "reset": {
        this.applyReset();
        return;
      }

      case "error": {
        const errorPayload = message.payload.error;
        log.error(`[client] Server error: ${errorPayload.code} ${errorPayload.message}`);
        return;
      }

      default:
        log.warn("[client] Received server message with unsupported payload kind.");
    }
  };

  applyConnected(gameId: number, playerId: number, rows: number, cols: number, bombs: number, difficulty: Difficulty, boardSize: BoardSize): void {
    this.gameId = gameId;
    this.playerId = playerId;
    this.rows = rows;
    this.cols = cols;
    this.boardState = this.initializeBoard(rows, cols);
    this.numBombs = bombs;
    this.initialNumBombs = bombs;
    this.difficulty = difficulty;
    this.boardSize = boardSize;

    this.boardRenderer.setupBoard(rows, cols);
    this.boardRenderer.clearPlayerCursors();
    this.viewportController.setWorldSize(this.cols * this.tileSize, this.rows * this.tileSize);
    this.updateViewportFromContainer(true);
  }

  applyRevealTiles(tiles: ReadonlyArray<TileUpdate>): void {
    if (tiles.length === 0) {
      return;
    }

    let numBombsDelta = 0;
    const tilesToRender: TileUpdate[] = [];

    for (const tile of tiles) {
      const previousType = this.boardState[tile.y]?.[tile.x];
      if (previousType === undefined) {
        continue;
      }

      if (previousType !== tile.type) {
        this.boardState[tile.y]![tile.x] = tile.type;

        if (previousType !== TileType.FLAGGED && tile.type === TileType.FLAGGED) {
          numBombsDelta--;
        } else if (previousType === TileType.FLAGGED && tile.type !== TileType.FLAGGED) {
          numBombsDelta++;
        }
      }

      tilesToRender.push(tile);
    }

    if (tilesToRender.length > 0) {
      this.boardRenderer.renderTiles(tilesToRender);
    }

    if (numBombsDelta !== 0) {
      this.numBombs = this.numBombs + numBombsDelta;
    }
  }

  applyGameOver(state: GameState, gameTimeMs: number): void {
    this.gameState = state;
    this.gameTimeMs = gameTimeMs;
  }

  applyReset(): void {
    this.clearChordPreview();
    this.mouseInputHandler.reset();
    this.touchInputHandler.reset();
    this.boardState = this.initializeBoard(this.rows, this.cols);
    this.boardRenderer.setupBoard(this.rows, this.cols);
    this.boardRenderer.clearPlayerCursors();
    this.viewportController.setWorldSize(this.cols * this.tileSize, this.rows * this.tileSize);
    this.updateViewportFromContainer(true);

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
    // prerender as empty, fill when response comes
    // this.boardRenderer.renderTiles([{ y: tile.y, x: tile.x, type: TileType.EMPTY }]);

    this.wsClient.sendCursorClick(tile);
    this.wsClient.sendRevealTiles([tile]);
  }

  toggleFlag(tile: TileCoordinates): void {
    const tileType = this.boardState[tile.y]?.[tile.x];
    if (tileType !== TileType.HIDDEN && tileType !== TileType.FLAGGED) {
      return;
    }
    // prerender as toggled, fill when response comes
    // this.boardRenderer.renderTiles([{ y: tile.y, x: tile.x, type: tileType === TileType.FLAGGED ? TileType.HIDDEN : TileType.FLAGGED }]);

    this.wsClient.sendCursorClick(tile);
    this.wsClient.sendFlagTile(tile, tileType === TileType.FLAGGED);
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
      this.wsClient.sendCursorClick(centerTile);
      this.wsClient.sendRevealTiles(hiddenNeighbors);
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
    this.boardRenderer.renderTiles(hiddenNeighbors.map((tile) => ({ y: tile.y, x: tile.x, type: TileType.EMPTY })));

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

    const tilesToRender: TileUpdate[] = [];
    for (const tile of this.chordPreviewTiles) {
      const currentType = this.boardState[tile.y]?.[tile.x];
      if (currentType === undefined) {
        continue;
      }

      tilesToRender.push({ y: tile.y, x: tile.x, type: currentType });
    }

    if (tilesToRender.length > 0) {
      this.boardRenderer.renderTiles(tilesToRender);
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

        if (this.boardState[ny]![nx] === TileType.FLAGGED) {
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

        if (this.boardState[ny]![nx] === TileType.HIDDEN) {
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

    return this.resolveTileFromCanvasPoint(canvasX, canvasY);
  }

  private resolveTileFromCanvasPoint(canvasX: number, canvasY: number): TileCoordinates | null {
    if (canvasX < 0 || canvasY < 0 || canvasX > this.app.renderer.width || canvasY > this.app.renderer.height) {
      return null;
    }

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

    this.zoomViewportAtCanvasPoint(canvasX, canvasY, scaleFactor);
  }

  private zoomViewportAtCanvasPoint(canvasX: number, canvasY: number, scaleFactor: number): void {
    if (canvasX < 0 || canvasY < 0 || canvasX > this.app.renderer.width || canvasY > this.app.renderer.height) {
      return;
    }

    this.viewportController.zoomAtScreenPoint(
      scaleFactor,
      canvasX,
      canvasY
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

  private handleCanvasContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private handleWindowResize = (): void => {
    this.viewportController.centerAtCurrentZoom(); //TODO: we shouldn't have to do this, but i don't understand why tile resolving gets messed up after resize without it
    this.updateViewportFromContainer(true);
  };

  updateViewportFromContainer(fitToViewport: boolean): void {
    // const parent = this.app.canvas.parentElement;
    const parent = document.getElementById('gameCanvasContainer');
    const width = parent?.clientWidth ?? 0;
    const height = parent?.clientHeight ?? 0;

    this.app.renderer.resize(width, height);
    this.app.stage.hitArea = new Rectangle(0, 0, width, height);

    this.viewportController.setViewportSize(width, height);

    if (fitToViewport) {
      this.viewportController.fitToViewport(0.96, 1.0);
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
    this.boardRenderer.container.cullable = true;
    this.boardRenderer.container.cullableChildren = true;

    this.boardRenderer.updateVisibleWorld(
      this.resolveVisibleWorld(cameraX, cameraY, zoom, horizontalOffset, verticalOffset)
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

  private resolveVisibleWorld(
    cameraX: number,
    cameraY: number,
    zoom: number,
    horizontalOffset: number,
    verticalOffset: number
  ): { x: number; y: number; width: number; height: number } {
    const startX = cameraX + (0 - horizontalOffset) / zoom;
    const startY = cameraY + (0 - verticalOffset) / zoom;
    const endX = cameraX + (this.app.renderer.width - horizontalOffset) / zoom;
    const endY = cameraY + (this.app.renderer.height - verticalOffset) / zoom;

    return {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    };
  }

  private isWithinBoard(y: number, x: number): boolean {
    return y >= 0 && y < this.rows && x >= 0 && x < this.cols;
  }

  private initializeBoard(rows: number, cols: number): TileType[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => TileType.HIDDEN));
  }

  private isTileType(value: number): value is TileType {
    return Number.isInteger(value) && value >= TileType.HIDDEN && value <= TileType.EIGHT;
  }

  cleanup(): void {
    log.info("[client] Cleaning up game instance.");
    this.app.canvas.removeEventListener("contextmenu", this.handleCanvasContextMenu);
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
    this.boardRenderer.clearPlayerCursors();
    this.playerId = 0;
    // this.app.destroy();
    this.boardRenderer.destroy();
    this.initialized = false;
  }
}
