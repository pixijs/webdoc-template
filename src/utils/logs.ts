const { Log, LogLevel, tag } = require("missionlog");

const logFunction = (
  level: string,
  tag: string,
  msg?: string,
  params?: any
) => {
  tag = `[${tag}]:`;
  switch (level) {
    case LogLevel.ERROR:
      console.error(tag, msg, ...params);
      break;
    case LogLevel.WARN:
      console.warn(tag, msg, ...params);
      break;
    case LogLevel.INFO:
      console.info(tag, msg, ...params);
      break;
    default:
      console.log(tag, msg, ...params);
      break;
  }
};

type LogFuctionType = typeof logFunction;
type Log = {
  error: LogFuctionType;
  warn: LogFuctionType;
  info: LogFuctionType;
  debug: LogFuctionType;
};

export function initLogger() {
  const defaultLevel = "INFO";
  return new Log().init(
    {
      TemplateLibrary: "WARN",
      TemplateGenerator: defaultLevel,
      ContentBar: defaultLevel,
      Signature: defaultLevel,
    },
    logFunction
  );
}
