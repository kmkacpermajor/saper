import log from "loglevel";

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const level: LogLevel = __APP_LOG_LEVEL__;

log.setLevel(level);

export { level as clientLogLevel };
export default log;
