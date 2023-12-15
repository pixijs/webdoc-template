const {Log, LogLevel} = require("missionlog");

const logFunction = (
  level: string,
  tag: string,
  msg?: string,
  params?: any,
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

export function initLogger() {
  const defaultLevel = "INFO";
  return new Log().init(
    {
      TemplateLibrary: "WARN",
      TemplateGenerator: defaultLevel,
      ContentBar: defaultLevel,
      Signature: defaultLevel,
    },
    logFunction,
  );
}
