import { Application, FederatedPointerEvent } from "pixi.js";
import { GameState, TileType } from "@saper/contracts";
import log from "loglevel";
import BoardRenderer from "./boardRenderer";
import { GAME_EVENT_TYPE, type GameEvent } from "./gameEvents";

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

type EventHandler = (event: GameEvent) => void;

type TransportActions = {
  revealTile: (y: number, x: number) => void;
  flagTile: (y: number, x: number, unflag: boolean) => void;
};

const parseLogLevel = (value: string | undefined): LogLevel => {
  switch ((value ?? "").toLowerCase()) {
    case "debug":
    case "info":
    case "warn":
    case "error":
    case "silent":
      return value!.toLowerCase() as LogLevel;
    default:
      return "info";
  }
};

const currentLogLevel = parseLogLevel(import.meta.env.VITE_LOG_LEVEL);

log.setLevel(currentLogLevel);

const logInfo = (message: string, data?: unknown): void => {
  if (data === undefined) {
    log.info(`[client] ${message}`);
    return;
  }

  log.info(`[client] ${message}`, data);
};

export default class GameController {
  private readonly tileSize = 25;
  private boardState: TileType[][] = [];
  private _gameId: number;
  private _gameState: GameState;
  private _numBombs: number;
  private readonly eventHandler: EventHandler;
  private readonly boardRenderer: BoardRenderer;
  private readonly transportActions: TransportActions;
  private initialized: boolean;

  rows: number;
  cols: number;
  initialNumBombs: number;
  app!: Application;

  constructor(gameId: number, eventHandler: EventHandler, transportActions: TransportActions) {
    this._gameId = gameId;
    this.eventHandler = eventHandler;
    this.boardRenderer = new BoardRenderer(this.tileSize);
    this.transportActions = transportActions;
    this._gameState = GameState.IN_PROGRESS;
    this._numBombs = 0;
    this.initialNumBombs = 0;
    this.rows = 0;
    this.cols = 0;
    this.initialized = false;

    logInfo(`Log level: ${currentLogLevel}`);
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
    this.boardRenderer.container.on("pointerdown", this.handleBoardPointerDown);
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
    this.boardState = this.initializeBoard(this.rows, this.cols);
    this.boardRenderer.setupBoard(this.app, this.rows, this.cols);

    this.gameState = GameState.IN_PROGRESS;
    this.numBombs = this.initialNumBombs;
  }

  private handleBoardPointerDown = (event: FederatedPointerEvent): void => {
    const localPosition = this.boardRenderer.container.toLocal(event.global);
    const x = Math.floor(localPosition.x / this.tileSize);
    const y = Math.floor(localPosition.y / this.tileSize);
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      return;
    }

    if (event.button === 0) {
        if (this.boardState[y]?.[x] !== TileType.HIDDEN) {
            return;
        }

        this.transportActions.revealTile(y, x);
    }

    if (event.button === 2) {
        const tileType = this.boardState[y]?.[x];
        if (tileType !== TileType.HIDDEN && tileType !== TileType.FLAGGED) {
            return;
        }

        this.transportActions.flagTile(y, x, tileType === TileType.FLAGGED);
    }
  };

  private initializeBoard(rows: number, cols: number): TileType[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => TileType.HIDDEN));
  }

  cleanup(): void {
    logInfo("Cleaning up game instance.");
    this.boardRenderer.container.off("pointerdown", this.handleBoardPointerDown);
    this.app.ticker.stop();
    this.boardRenderer.destroy();
    this.app.stage.destroy({ children: true });
    this.initialized = false;
  }
}
