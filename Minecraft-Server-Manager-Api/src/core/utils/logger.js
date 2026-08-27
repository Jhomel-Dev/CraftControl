import winston from "winston";
import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage();

const sensitiveKeys = [
  "tunnelsecret",
  "agenttoken",
  "password",
  "token",
  "jwt",
  "pairingpin",
  "database_url",
];

const redact = (obj) => {
  if (typeof obj === "string") {
    let masked = obj;
    masked = masked.replace(
      /(eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,})/g,
      "[REDACTED_JWT]",
    );
    return masked;
  }
  if (Array.isArray(obj)) return obj.map(redact);
  if (obj && typeof obj === "object") {
    const copy = { ...obj };
    for (const key in copy) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        copy[key] = "[REDACTED]";
      } else {
        copy[key] = redact(copy[key]);
      }
    }
    return copy;
  }
  return obj;
};

const maskFormat = winston.format((info) => redact(info));

const injectContextFormat = winston.format((info) => {
  const store = requestContext.getStore();
  if (store && store.requestId) info.requestId = store.requestId;
  if (store && store.agentId) info.agentId = store.agentId;
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    injectContextFormat(),
    maskFormat(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
