import { CONTRACT_VERSION, GameState, decodeClientMessage, encodeServerMessage } from "@saper/contracts";
import type { RawData, WebSocket } from "ws";
import type Game from "./Game.js";
import type GameSessionManager from "./GameSessionManager.js";
import { logger } from "./logger.js";

const toUint8Array = (message: RawData): Uint8Array => {
  if (message instanceof Buffer) {
    return new Uint8Array(message);
  }

  if (Array.isArray(message)) {
    const merged = Buffer.concat(message);
    return new Uint8Array(merged);
  }

  if (message instanceof ArrayBuffer) {
    return new Uint8Array(message);
  }

  return new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
};

export default class MessageReceiver {
  private currentGame: Game | null;
  private currentPlayerId: number | null;
  private readonly gameSessionManager: GameSessionManager;
  private readonly ws: WebSocket;

  constructor(gameSessionManager: GameSessionManager, ws: WebSocket) {
    this.currentGame = null;
    this.currentPlayerId = null;
    this.gameSessionManager = gameSessionManager;
    this.ws = ws;

    this.ws.on("close", () => {
      if (!this.currentGame) {
        return;
      }

      const removedPlayerId = this.currentGame.removePlayer(this.ws);
      if (removedPlayerId !== null) {
        this.currentGame.messageSender.sendPlayerCursorRemove(removedPlayerId);
      }
      logger.debug(
        `[server] Detached player ${removedPlayerId ?? "unknown"} from game ${this.currentGame.gameId}.`
      );
      this.currentGame = null;
      this.currentPlayerId = null;
    });
  }

  private sendProtocolError(code: string, message: string): void {
    const payload = encodeServerMessage({
      payload: {
        oneofKind: "error",
        error: {
          code,
          message
        }
      }
    });

    this.ws.send(payload);
  }

  handleMessage(message: RawData): void {
    let decodedMessage;

    try {
      decodedMessage = decodeClientMessage(toUint8Array(message));
    } catch (error) {
      logger.warn({ err: error }, "[server] Failed to decode client message. Closing socket.");
      this.ws.close();
      return;
    }

    if (decodedMessage.contractVersion !== CONTRACT_VERSION) {
      logger.warn(
        `[server] Contract version mismatch: expected ${CONTRACT_VERSION}, got ${decodedMessage.contractVersion}. Closing socket.`
      );
      this.ws.close();
      return;
    }

    if (
      !this.currentGame &&
      decodedMessage.payload.oneofKind !== "createGame" &&
      decodedMessage.payload.oneofKind !== "joinGame"
    ) {
      const payloadKind = decodedMessage.payload.oneofKind ?? "unknown";
      logger.warn(
        `[server] Non-handshake message (${payloadKind}) received before session attach. Closing socket.`
      );
      this.sendProtocolError(
        "HANDSHAKE_REQUIRED",
        "First client message must be createGame or joinGame."
      );
      this.ws.close();
      return;
    }

    if (
      this.currentGame &&
      (decodedMessage.payload.oneofKind === "createGame" || decodedMessage.payload.oneofKind === "joinGame")
    ) {
      this.sendProtocolError(
        "ALREADY_ATTACHED",
        "Session already attached. Open a new socket to create or join another game."
      );
      this.ws.close();
      return;
    }

    switch (decodedMessage.payload.oneofKind) {
      case "createGame": {
        const createPayload = decodedMessage.payload.createGame;
        logger.debug(
          `[server] Create game request: rows=${createPayload.rows}, cols=${createPayload.cols}, bombs=${createPayload.numBombs}`
        );
        this.handleCreateGame(createPayload.rows, createPayload.cols, createPayload.numBombs);
        return;
      }
      case "joinGame": {
        const joinPayload = decodedMessage.payload.joinGame;
        logger.debug(`[server] Join game request: gameId=${joinPayload.requestedGameId}`);
        this.handleJoinGame(joinPayload.requestedGameId);
        return;
      }
      case "revealTile": {
        if (!this.currentGame) {
          this.ws.close();
          return;
        }
        const revealPayload = decodedMessage.payload.revealTile;
        if (revealPayload.tiles.length === 0) {
          logger.warn("[server] Empty reveal tile request received.");
          this.sendProtocolError(
            "EMPTY_REVEAL_REQUEST",
            "RevealTileRequest.tiles must contain at least one tile."
          );
          return;
        }
        logger.debug(`[server] Reveal tile request: ${revealPayload.tiles.length} tiles.`);
        this.currentGame.revealTiles(revealPayload.tiles);
        return;
      }
      case "reset": {
        if (!this.currentGame) {
          this.ws.close();
          return;
        }
        this.currentGame.resetGame();
        return;
      }
      case "flagTile": {
        if (!this.currentGame) {
          this.ws.close();
          return;
        }
        const flagPayload = decodedMessage.payload.flagTile;
        if (flagPayload.unflag) {
          this.currentGame.unflagTile(flagPayload.y, flagPayload.x);
        } else {
          this.currentGame.flagTile(flagPayload.y, flagPayload.x);
        }
        return;
      }
      case "cursorClick": {
        if (!this.currentGame || this.currentPlayerId === null) {
          this.ws.close();
          return;
        }

        const cursorPayload = decodedMessage.payload.cursorClick;
        const tile = cursorPayload.tile;
        if (!tile) {
          this.sendProtocolError("CURSOR_TILE_MISSING", "Cursor click must include tile coordinates.");
          return;
        }

        const isValidTile =
          tile.y < this.currentGame.rows &&
          tile.x < this.currentGame.cols;

        if (!isValidTile) {
          this.sendProtocolError(
            "CURSOR_TILE_OUT_OF_BOUNDS",
            `Cursor tile (${tile.y}, ${tile.x}) is outside board bounds.`
          );
          return;
        }

        this.currentGame.updatePlayerCursorPosition(this.currentPlayerId, tile);
        this.currentGame.messageSender.sendPlayerCursorUpdate(this.currentPlayerId, tile);
        return;
      }
      default: {
        logger.warn("[server] Unknown client payload kind. Closing socket.");
        this.ws.close();
        return;
      }
    }
  }

  private handleCreateGame(rows: number, cols: number, numBombs: number): void {
    const result = this.gameSessionManager.createNewGame(rows, cols, numBombs);
    this.attachGame(result.game, result.error);
  }

  private handleJoinGame(requestedGameId: number): void {
    const result = this.gameSessionManager.getGame(requestedGameId);
    this.attachGame(result.game, result.error);
  }

  private attachGame(game: Game | null, error: string | null): void {
    this.currentGame = game;

    if (!this.currentGame) {
      const reason = error ?? "Could not attach client to game session.";
      logger.warn(`[server] Could not attach client to game session: ${reason}`);
      this.sendProtocolError("GAME_ATTACH_FAILED", reason);
      this.ws.close();
      return;
    }

    logger.debug(`[server] Client attached to game ${this.currentGame.gameId}.`);

    this.currentPlayerId = this.currentGame.registerPlayer(this.ws);
    logger.debug(
      `[server] Assigned player ${this.currentPlayerId} to game ${this.currentGame.gameId}.`
    );

    this.currentGame.messageSender.addClient(this.ws);
    this.currentGame.messageSender.sendConfirmation(this.ws, this.currentGame, this.currentPlayerId);

    const existingCursorPositions = this.currentGame.getPlayerCursorSnapshot(this.currentPlayerId);
    for (const cursorPosition of existingCursorPositions) {
      this.currentGame.messageSender.sendPlayerCursorUpdate(
        cursorPosition.playerId,
        cursorPosition.tile,
        this.ws
      );
    }

    if (this.currentGame.board) {
      const shownTiles = this.currentGame.board.getShownTiles();
      if (shownTiles.length > 0) {
        this.currentGame.messageSender.sendRevealTiles(shownTiles, this.ws);
      }

      if (this.currentGame.gameEnded) {
        this.currentGame.messageSender.sendGameOver(this.currentGame.gameWon ? GameState.WON : GameState.LOST);
      }
    }
  }
}
