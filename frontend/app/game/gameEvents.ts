import { GameState } from "@saper/contracts";

export const GAME_EVENT_TYPE = {
  GAME_STATE_UPDATE: "GAME_STATE_UPDATE",
  NUM_BOMBS_UPDATE: "NUM_BOMBS_UPDATE",
  GAME_TIME_MS_UPDATE: "GAME_TIME_MS_UPDATE",
  PLAYER_ID_UPDATE: "PLAYER_ID_UPDATE",
  FIRST_MOVE_UPDATE: "FIRST_MOVE_UPDATE",
} as const;

export type GameEvent =
  | { type: typeof GAME_EVENT_TYPE.GAME_STATE_UPDATE; payload: GameState }
  | { type: typeof GAME_EVENT_TYPE.NUM_BOMBS_UPDATE; payload: number }
  | { type: typeof GAME_EVENT_TYPE.GAME_TIME_MS_UPDATE; payload: number }
  | { type: typeof GAME_EVENT_TYPE.PLAYER_ID_UPDATE; payload: number }
  | { type: typeof GAME_EVENT_TYPE.FIRST_MOVE_UPDATE; payload: boolean };
