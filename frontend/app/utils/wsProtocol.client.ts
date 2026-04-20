import {
  CONTRACT_VERSION,
  encodeClientMessage,
  type TileCoordinates,
  type CreateGameRequest,
  type JoinGameRequest
} from "@saper/contracts";

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

export const createCursorClickPayload = (tile: TileCoordinates): Uint8Array =>
  encodeClientMessage({
    payload: {
      oneofKind: "cursorClick",
      cursorClick: {
        tile
      }
    }
  });
