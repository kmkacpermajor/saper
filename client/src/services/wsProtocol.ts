import {
  CONTRACT_VERSION,
  encodeClientMessage,
  type TileCoordinates
} from "@saper/contracts";
import type { CreateGameRequest, JoinGameRequest } from "../../../shared/contracts/src/generated/game.js";

export const createGamePayload = (createGame: CreateGameRequest): Uint8Array =>
  encodeClientMessage({
    contractVersion: CONTRACT_VERSION,
    payload: {
      oneofKind: "createGame",
      createGame
    }
  });

export const joinGamePayload = (joinGame: JoinGameRequest): Uint8Array =>
  encodeClientMessage({
    contractVersion: CONTRACT_VERSION,
    payload: {
      oneofKind: "joinGame",
      joinGame
    }
  });

export const createRevealTilePayload = (tiles: TileCoordinates[]): Uint8Array => {
  return encodeClientMessage({
    payload: {
      oneofKind: "revealTile",
      revealTile: {
        tiles
      }
    }
  });
};

export const createResetPayload = (): Uint8Array =>
  encodeClientMessage({
    payload: {
      oneofKind: "reset",
      reset: {}
    }
  });

export const createFlagTilePayload = (y: number, x: number, unflag: boolean): Uint8Array =>
  encodeClientMessage({
    payload: {
      oneofKind: "flagTile",
      flagTile: {
        y,
        x,
        unflag
      }
    }
  });
