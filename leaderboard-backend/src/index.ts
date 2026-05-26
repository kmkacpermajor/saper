import Database from "./database.js";
import PubSubSubscriber from "./PubSubSubscriber.js";
import { log } from "./logger.js";
import { createServer } from "./server.js";

const host = process.env.HOST || "0.0.0.0";
const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8090;
const STARTUP_RETRY_DELAY_MS = 2000;
const STARTUP_RETRIES = 30;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const retryStartup = async (label: string, action: () => Promise<void>): Promise<void> => {
  for (let attempt = 1; attempt <= STARTUP_RETRIES; attempt++) {
    try {
      await action();
      return;
    } catch (error) {
      if (attempt === STARTUP_RETRIES) {
        throw error;
      }

      log.warn({ err: error }, `[leaderboard] ${label} is not ready yet (${attempt}/${STARTUP_RETRIES}).`);
      await wait(STARTUP_RETRY_DELAY_MS);
    }
  }
};

const database = new Database();
await retryStartup("Database", () => database.connect());

const subscriber = new PubSubSubscriber(database);
await retryStartup("Pub/Sub", () => subscriber.listen());

const server = createServer(database);
server.listen(port, host, () => {
  log.info(`[leaderboard] HTTP server started on http://${host}:${port}`);
});

const shutdown = (): void => {
  server.close(() => {
    void database.close().finally(() => process.exit(0));
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);