export const rankedLevelCodes = [
  "SE",
  "SI",
  "SH",
  "SX",
  "ME",
  "MI",
  "MH",
  "MX",
  "BE",
  "BI",
  "BH",
  "BX",
  "HE",
  "HI",
  "HH",
  "HX"
] as const;

export type RankedLevelCode = (typeof rankedLevelCodes)[number];

export const isRankedLevelCode = (levelCode: string): levelCode is RankedLevelCode =>
  rankedLevelCodes.includes(levelCode as RankedLevelCode);