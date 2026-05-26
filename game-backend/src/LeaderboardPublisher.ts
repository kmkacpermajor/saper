import { PubSub, Topic } from "@google-cloud/pubsub";
import { BoardSize, Difficulty } from "@saper/contracts";
import { log } from "./logger.js";

const DEFAULT_TOPIC_NAME = "game-results";
const DEFAULT_PROJECT_ID = "minesweeper-local";

export type LeaderboardGameResult = {
  gameId: number;
  levelCode: string;
  playerNames: string[];
  timeMs: number;
  difficulty: Difficulty;
  boardSize: BoardSize;
  completedAt: string;
};

const boardSizeCodeMap: Record<BoardSize, string | null> = {
  [BoardSize.SMALL]: "S",
  [BoardSize.MEDIUM]: "M",
  [BoardSize.BIG]: "B",
  [BoardSize.HUGE]: "H",
  [BoardSize.CUSTOM]: null
};

const difficultyCodeMap: Record<Difficulty, string | null> = {
  [Difficulty.EASY]: "E",
  [Difficulty.INTERMEDIATE]: "I",
  [Difficulty.HARD]: "H",
  [Difficulty.EXPERT]: "X",
  [Difficulty.CUSTOM]: null
};

export const resolveLevelCode = (boardSize: BoardSize, difficulty: Difficulty): string | null => {
  const boardSizeCode = boardSizeCodeMap[boardSize];
  const difficultyCode = difficultyCodeMap[difficulty];

  if (!boardSizeCode || !difficultyCode) {
    return null;
  }

  return `${boardSizeCode}${difficultyCode}`;
};

export default class LeaderboardPublisher {
  private readonly topic: Topic;

  constructor() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT_ID;
    const topicName = process.env.PUBSUB_TOPIC || DEFAULT_TOPIC_NAME;
    const pubSub = new PubSub({ projectId });

    this.topic = pubSub.topic(topicName);
  }

  async publishGameResult(result: LeaderboardGameResult): Promise<void> {
    try {
      await this.topic.publishMessage({
        json: result
      });
      log.debug(`[server] Published leaderboard result for game ${result.gameId}.`);
    } catch (error) {
      log.error({ err: error }, `[server] Failed to publish leaderboard result for game ${result.gameId}.`);
    }
  }
}