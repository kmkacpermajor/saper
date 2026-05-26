import pino from "pino";

const parseLogLevel = (value: string | undefined): string => {
  if (!value) {
    return "info";
  }

  return value;
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
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname"
        }
      }
});