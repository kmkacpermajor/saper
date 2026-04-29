import pino from "pino";

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const parseLogLevel = (value: string | undefined): LogLevel => {
  switch ((value ?? "").toLowerCase()) {
    case "debug":
    case "info":
    case "warn":
    case "error":
    case "silent":
      return value!.toLowerCase() as LogLevel;
    default:
      return "debug";
  }
};

const level = parseLogLevel(process.env.LOG_LEVEL);
const isProduction = process.env.NODE_ENV === "production";

export const log = pino({
  level,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      }
});
