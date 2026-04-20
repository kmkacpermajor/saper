import pino from "pino";
const parseLogLevel = (value) => {
    switch ((value ?? "").toLowerCase()) {
        case "debug":
        case "info":
        case "warn":
        case "error":
        case "silent":
            return value.toLowerCase();
        default:
            return "debug";
    }
};
const level = parseLogLevel(process.env.LOG_LEVEL);
const isProduction = process.env.NODE_ENV === "production";
export const logger = pino({
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
