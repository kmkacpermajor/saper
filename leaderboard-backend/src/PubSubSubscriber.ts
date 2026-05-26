import { PubSub, Subscription, Topic } from "@google-cloud/pubsub";
import Database, { type GameResult } from "./database.js";
import { isRankedLevelCode } from "./levels.js";
import { log } from "./logger.js";

const DEFAULT_PROJECT_ID = "minesweeper-local";
const DEFAULT_TOPIC_NAME = "game-results";
const DEFAULT_SUBSCRIPTION_NAME = "leaderboard-game-results";

const normalizeGameResult = (payload: unknown): GameResult | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const result = payload as Record<string, unknown>;
  const gameId = Number(result.gameId);
  const levelCode = String(result.levelCode ?? "");
  const playerNames = Array.isArray(result.playerNames)
    ? result.playerNames
        .map((name) => String(name ?? "").trim().slice(0, 40))
        .filter((name) => name.length > 0)
    : [String(result.username ?? "").trim().slice(0, 40)].filter((name) => name.length > 0);
  const timeMs = Number(result.timeMs);
  const completedAt = String(result.completedAt ?? "");

  if (
    !Number.isInteger(gameId) ||
    !isRankedLevelCode(levelCode) ||
    playerNames.length === 0 ||
    !Number.isInteger(timeMs) ||
    timeMs <= 0 ||
    Number.isNaN(Date.parse(completedAt))
  ) {
    return null;
  }

  return {
    gameId,
    levelCode,
    playerNames,
    timeMs,
    completedAt
  };
};

export default class PubSubSubscriber {
  private readonly topic: Topic;
  private readonly subscription: Subscription;
  private readonly subscriptionName: string;

  constructor(private readonly database: Database) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT_ID;
    const topicName = process.env.PUBSUB_TOPIC || DEFAULT_TOPIC_NAME;
    this.subscriptionName = process.env.PUBSUB_SUBSCRIPTION || DEFAULT_SUBSCRIPTION_NAME;
    const pubSub = new PubSub({ projectId });

    this.topic = pubSub.topic(topicName);
    this.subscription = this.topic.subscription(this.subscriptionName);
  }

  async listen(): Promise<void> {
    await this.ensureSubscription();

    this.subscription.on("message", (message) => {
      void this.handleMessage(message);
    });

    this.subscription.on("error", (error) => {
      log.error({ err: error }, "[leaderboard] Pub/Sub subscription error.");
    });

    log.info("[leaderboard] Pub/Sub subscriber started.");
  }

  private async ensureSubscription(): Promise<void> {
    const [topicExists] = await this.topic.exists();
    if (!topicExists) {
      await this.topic.create();
      log.info("[leaderboard] Pub/Sub topic created.");
    }

    const [subscriptionExists] = await this.subscription.exists();
    if (!subscriptionExists) {
      await this.topic.createSubscription(this.subscriptionName);
      log.info("[leaderboard] Pub/Sub subscription created.");
    }
  }

  private async handleMessage(message: { data: Buffer; ack: () => void; nack: () => void }): Promise<void> {
    try {
      const payload = JSON.parse(message.data.toString("utf8")) as unknown;
      const gameResult = normalizeGameResult(payload);

      if (!gameResult) {
        log.warn("[leaderboard] Ignored invalid game result message.");
        message.ack();
        return;
      }

      await this.database.insertGameResult(gameResult);
      message.ack();
      log.info(`[leaderboard] Stored ${gameResult.levelCode} result for ${gameResult.playerNames.join(", ")}.`);
    } catch (error) {
      log.error({ err: error }, "[leaderboard] Failed to handle game result message.");
      message.nack();
    }
  }
}