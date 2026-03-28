import { GameState } from "@saper/contracts";

export const GAME_EVENT_TYPE = {
  GAME_ID_UPDATE: "GAME_ID_UPDATE",
  GAME_STATE_UPDATE: "GAME_STATE_UPDATE",
  NUM_BOMBS_UPDATE: "NUM_BOMBS_UPDATE"
} as const;

export type GameEvent =
  | { type: typeof GAME_EVENT_TYPE.GAME_ID_UPDATE; payload: string }
  | { type: typeof GAME_EVENT_TYPE.GAME_STATE_UPDATE; payload: GameState }
  | { type: typeof GAME_EVENT_TYPE.NUM_BOMBS_UPDATE; payload: number };
