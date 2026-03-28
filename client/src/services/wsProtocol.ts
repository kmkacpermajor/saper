import {
  CONTRACT_VERSION,
  encodeClientMessage,
  type TileCoordinates
} from "@saper/contracts";

export const createConnectPayload = (
  gameId: number,
  rows: number,
  cols: number,
  numBombs: number
): Uint8Array =>
  encodeClientMessage({
    contractVersion: CONTRACT_VERSION,
    payload: {
      oneofKind: "connect",
      connect: {
        requestedGameId: gameId,
        rows,
        cols,
        numBombs
      }
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
