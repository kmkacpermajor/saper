import {
  CONTRACT_VERSION,
  encodeClientMessage
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

export const createRevealTilePayload = (y: number, x: number): Uint8Array =>
  encodeClientMessage({
    payload: {
      oneofKind: "revealTile",
      revealTile: {
        y,
        x
      }
    }
  });

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
