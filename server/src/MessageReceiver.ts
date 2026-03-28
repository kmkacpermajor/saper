import { CONTRACT_VERSION, GameState, NEW_GAME_ID, decodeClientMessage, encodeServerMessage } from "@saper/contracts";
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
  private readonly gameSessionManager: GameSessionManager;
  private readonly ws: WebSocket;

  constructor(gameSessionManager: GameSessionManager, ws: WebSocket) {
    this.currentGame = null;
    this.gameSessionManager = gameSessionManager;
    this.ws = ws;
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

    if (!this.currentGame && decodedMessage.payload.oneofKind !== "connect") {
      logger.warn("[server] Non-connect message received before handshake. Closing socket.");
      this.ws.close();
      return;
    }

    switch (decodedMessage.payload.oneofKind) {
      case "connect": {
        const connectPayload = decodedMessage.payload.connect;
        logger.info(
          `[server] Connect request: gameId=${connectPayload.requestedGameId}, rows=${connectPayload.rows}, cols=${connectPayload.cols}, bombs=${connectPayload.numBombs}`
        );
        this.handleConnect(connectPayload.requestedGameId, connectPayload.rows, connectPayload.cols, connectPayload.numBombs);
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
      default: {
        logger.warn("[server] Unknown client payload kind. Closing socket.");
        this.ws.close();
        return;
      }
    }
  }

  private handleConnect(requestedGameId: number, rows: number, cols: number, numBombs: number): void {
    let attachError: string | null = null;

    if (requestedGameId === NEW_GAME_ID) {
      const result = this.gameSessionManager.createNewGame(rows, cols, numBombs);
      this.currentGame = result.game;
      attachError = result.error;
    } else {
      const result = this.gameSessionManager.getGame(requestedGameId);
      this.currentGame = result.game;
      attachError = result.error;
    }

    if (!this.currentGame) {
      const reason = attachError ?? "Could not attach client to game session.";
      logger.warn(`[server] Could not attach client to game session: ${reason}`);
      this.sendProtocolError("GAME_ATTACH_FAILED", reason);
      return;
    }

    logger.info(`[server] Client attached to game ${this.currentGame.gameId}.`);

    this.currentGame.messageSender.addClient(this.ws);
    this.currentGame.messageSender.sendConfirmation(this.ws, this.currentGame);

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
