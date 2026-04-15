import { encodeClientMessage, type TileCoordinates } from "@saper/contracts";

export const createCursorClickPayload = (tile: TileCoordinates): Uint8Array =>
  encodeClientMessage({
    payload: {
      oneofKind: "cursorClick",
      cursorClick: {
        tile
      }
    }
  });
