import crypto from "crypto";
import logger, { requestContext } from "../core/utils/logger.js";

export const requestLogger = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;

  requestContext.run({ requestId, agentId: req.user?.id }, () => {
    logger.info(`HTTP ${req.method} ${req.url}`);

    // Log response status on finish
    res.on("finish", () => {
      logger.info(`HTTP ${req.method} ${req.url} - ${res.statusCode}`);
    });

    next();
  });
};
