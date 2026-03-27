import { Application } from "pixi.js";
import { GameState, TileType } from "@saper/contracts";
import log from "loglevel";
import BoardRenderer from "./boardRenderer";

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

type GameEvent =
  | { type: "GAME_ID_UPDATE"; payload: string }
  | { type: "GAME_STATE_UPDATE"; payload: GameState }
  | { type: "NUM_BOMBS_UPDATE"; payload: number };

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

export default class Minesweeper {
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
    this.boardRenderer = new BoardRenderer(25);
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
    this.emitEvent("GAME_ID_UPDATE", value.toString());
  }

  get gameState(): GameState {
    return this._gameState;
  }

  set gameState(value: GameState) {
    this._gameState = value;
    this.emitEvent("GAME_STATE_UPDATE", value);
  }

  get numBombs(): number {
    return this._numBombs;
  }

  set numBombs(value: number) {
    this._numBombs = value;
    this.emitEvent("NUM_BOMBS_UPDATE", value);
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
    this.initialized = true;
  }

  applyConnected(gameId: number, rows: number, cols: number, bombs: number): void {
    this.gameId = gameId;
    this.rows = rows;
    this.cols = cols;
    this.numBombs = bombs;
    this.initialNumBombs = bombs;

    this.boardRenderer.setupBoard(this.app, rows, cols, (y, x, button) => {
      if (button === 0) {
        this.requestReveal(y, x);
      }

      if (button === 2) {
        this.requestFlag(y, x);
      }
    });
  }

  applyRevealTile(y: number, x: number, type: TileType): void {
    const update = this.boardRenderer.setTileType(y, x, type);

    if (!update) {
      return;
    }

    if (update.previousType !== TileType.FLAGGED && update.nextType === TileType.FLAGGED) {
      this.numBombs--;
    } else if (update.previousType === TileType.FLAGGED && update.nextType !== TileType.FLAGGED) {
      this.numBombs++;
    }
  }

  applyGameOver(state: GameState): void {
    this.gameState = state;
  }

  applyReset(): void {
    this.boardRenderer.setupBoard(this.app, this.rows, this.cols, (y, x, button) => {
      if (button === 0) {
        this.requestReveal(y, x);
      }

      if (button === 2) {
        this.requestFlag(y, x);
      }
    });

    this.gameState = GameState.IN_PROGRESS;
    this.numBombs = this.initialNumBombs;
  }

  cleanup(): void {
    logInfo("Cleaning up game instance.");
    this.app.ticker.stop();
    this.boardRenderer.destroy();
    this.app.stage.destroy({ children: true });
    this.initialized = false;
  }

  private requestReveal(y: number, x: number): void {
    if (this.boardRenderer.getTileType(y, x) !== TileType.HIDDEN) {
      return;
    }

    this.transportActions.revealTile(y, x);
  }

  private requestFlag(y: number, x: number): void {
    const tileType = this.boardRenderer.getTileType(y, x);
    if (tileType !== TileType.HIDDEN && tileType !== TileType.FLAGGED) {
      return;
    }

    this.transportActions.flagTile(y, x, tileType === TileType.FLAGGED);
  }
}
