const DEFAULT_MAX_GAME_ID = 254;

export const parseGameId = (rawGameId: string, maxGameId: number = DEFAULT_MAX_GAME_ID): number => {
  const parsedGameId = Number(rawGameId.trim());

  if (!Number.isInteger(parsedGameId) || parsedGameId < 0 || parsedGameId > maxGameId) {
    throw new Error(`Game ID must be an integer between 0 and ${maxGameId}.`);
  }

  return parsedGameId;
};