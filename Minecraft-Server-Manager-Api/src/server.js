import { createServer } from "http";
import { Server } from "socket.io";
import app from "./index.js";
import { handleSocketEvents } from "./modules/agent/gateways/agent.gateway.js";
import dotenv from "dotenv";
import logger from "./core/utils/logger.js";
import { requestLogger } from "./middlewares/logger.middleware.js";

dotenv.config();

app.use(requestLogger);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      callback(null, origin || true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

handleSocketEvents(io);
app.set("io", io);

let port = parseInt(process.env.PORT) || 4000;

const startServer = async (currentPort) => {
  httpServer.listen(currentPort, () => {
    logger.info(`Server HTTP & Socket.io running on port: ${currentPort}`);
  });
};

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      ` ERROR: Port ${port} is already in use, trying the next one...`,
    );
    port++;
    startServer(port);
  } else if (err.code === "EACCES") {
    logger.error(` ERROR: No permission to use port ${port}`);
    process.exit(1);
  } else {
    logger.error(` HTTP server ERROR: ${err}`);
    process.exit(1);
  }
});

startServer(port);

io.engine.on("connection_error", (err) => {
  logger.error(` Socket.IO connection error: ${err.message}`, {
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

process.on("uncaughtException", (error) => {
  logger.error(`\n[CRITICAL] Uncaught Exception caught: ${error}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`\n[CRITICAL] Unhandled Rejection caught: ${reason}`);
});
