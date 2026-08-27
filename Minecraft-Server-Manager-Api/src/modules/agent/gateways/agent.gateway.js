import jwt from "jsonwebtoken";
import prisma from "../../../core/database/prisma.client.js";
import DnsService from "../../servers/services/dns.service.js";
import ServerStateMachine from "../../servers/core/ServerStateMachine.js";
import logger, { requestContext } from "../../../core/utils/logger.js";

const dnsService = new DnsService();
const serverLogsBuffer = new Map();
export const agentHardwareMap = new Map();
export const agentStateMap = new Map();

export const handleSocketEvents = (io) => {
  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    if (socket.isPairing) {
      socket.join(`room_${socket.pairingPin}`);
      return;
    }
    if (socket.isAgent) return registerAgentEvents(socket);
    if (socket.isClient) return registerClientEvents(socket);
  });
};

const authenticateSocket = async (socket, next) => {
  const agentToken = socket.handshake.auth?.token;

  let cookieAccessToken = null;
  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, current) => {
      const [name, ...value] = current.trim().split("=");
      acc[name] = value.join("=");
      return acc;
    }, {});
    cookieAccessToken = cookies.accessToken;
  }

  const clientToken = socket.handshake.auth?.jwt || cookieAccessToken;
  const pairingPin = socket.handshake.auth?.pairingPin;

  if (agentToken) {
    try {
      const user = await prisma.user.findUnique({ where: { agentToken } });
      if (user) {
        socket.isAgent = true;
        socket.userId = user.id;
        return next();
      }
    } catch (e) {
      logger.error("DB error auth agent", e);
    }
  }

  if (clientToken) {
    try {
      const decoded = jwt.verify(clientToken, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.isClient = true;
      return next();
    } catch (e) {
      return next(new Error("Invalid JWT"));
    }
  }

  if (pairingPin) {
    socket.isPairing = true;
    socket.pairingPin = pairingPin;
    return next();
  }

  return next(new Error("Authentication Error: Missing Token"));
};

const registerAgentEvents = (socket) => {
  socket.join(`agent-${socket.userId}`);

  socket.on("ENVELOPE", async (env) => {
    if (!env || !env.type) return;

    return requestContext.run(
      { requestId: env.requestId, agentId: socket.userId },
      async () => {
        const p = env.payload;
        if (env.type === "TELEMETRY_UPDATE") handleTelemetry(socket, p);
        if (env.type === "AGENT_INFO") {
          agentHardwareMap.set(socket.userId, p);
          if (p.status) agentStateMap.set(socket.userId, p.status);
        }
        if (env.type === "AGENT_STATUS_ACK" && p.status)
          agentStateMap.set(socket.userId, p.status);
        if (env.type === "SERVER_LOG") handleServerLog(socket, p);
        if (env.type === "TUNNEL_INFO") await handleTunnelInfo(socket, p);
        if (env.type === "STATUS_UPDATE") await handleStatusUpdate(socket, p);
        if (env.type === "SYNC_STATE") await handleSyncState(socket, p);
      },
    );
  });

  socket.on("disconnect", () => handleAgentDisconnect(socket));
};

const registerClientEvents = (socket) => {
  socket.on("JOIN_SERVER_CONSOLE", (serverId) =>
    joinServerConsole(socket, serverId),
  );
  socket.on("LEAVE_SERVER_CONSOLE", (serverId) => socket.leave(serverId));
  socket.on("CLEAR_SERVER_CONSOLE", async (serverId) => {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
      });
      if (!server || server.userId !== socket.user.id) return;
      clearServerConsole(serverId);
    } catch (e) {}
  });
  socket.on("SEND_COMMAND", async (payload) => {
    try {
      const server = await prisma.server.findUnique({
        where: { id: payload.serverId },
      });
      if (!server || server.userId !== socket.user.id) return;
      socket.to(`agent-${server.userId}`).emit("SEND_COMMAND", payload);
    } catch (e) {
      console.error("[Agent Gateway] Error in SEND_COMMAND:", e);
    }
  });
};

const joinServerConsole = async (socket, serverId) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.userId !== socket.user.id) return;

    socket.join(serverId);
    const history = serverLogsBuffer.get(serverId) || [];

    if (history.length > 0) {
      socket.emit("CONSOLE_LOG_HISTORY", history);
    }
  } catch (e) {
    console.error("[Agent Gateway] Error joining console:", e);
  }
};

const clearServerConsole = (serverId) => {
  if (serverLogsBuffer.has(serverId)) {
    serverLogsBuffer.set(serverId, []);
  }
};

const handleTelemetry = (socket, payload) => {
  if (!payload.serverId) return;
  socket.broadcast.to(payload.serverId).emit("TELEMETRY", payload.stats);
};

const handleServerLog = (socket, payload) => {
  if (!payload.serverId) return;

  if (!serverLogsBuffer.has(payload.serverId)) {
    serverLogsBuffer.set(payload.serverId, []);
  }

  const buffer = serverLogsBuffer.get(payload.serverId);
  buffer.push(payload.logLine);

  if (buffer.length > 200) buffer.shift();

  socket.broadcast.to(payload.serverId).emit("CONSOLE_LOG", payload.logLine);
};

const handleStatusUpdate = async (socket, payload) => {
  if (!payload.serverId) return;
  if (!payload.status) return;

  try {
    const server = await prisma.server.findUnique({
      where: { id: payload.serverId },
    });
    if (!server) return;
    if (server.userId !== socket.userId) return;

    ServerStateMachine.assertValidTransition(server.status, payload.status);

    const updateData = { status: payload.status };
    const isOffline = payload.status === "OFFLINE";
    const isStopping = payload.status === "STOPPING";

    if (isOffline || isStopping) {
      updateData.tunnelIp = null;
    }

    await prisma.server.update({
      where: { id: payload.serverId },
      data: updateData,
    });

    socket.broadcast.to(payload.serverId).emit("STATUS_UPDATE", payload.status);
  } catch (error) {
    logger.error(
      `[Agent Gateway] Error updating status via socket: ${error.message}`,
    );
  }
};

const handleTunnelInfo = async (socket, info) => {
  if (!info.serverId) return;

  try {
    const updateData = {};
    if (info.address) updateData.tunnelIp = info.address;
    if (info.claimLink) updateData.claimLink = info.claimLink;

    if (Object.keys(updateData).length === 0) return;

    const server = await prisma.server.update({
      where: { id: info.serverId },
      data: updateData,
    });

    await updateDnsBackground(server, info.address);

    socket.broadcast.to(info.serverId).emit("TUNNEL_INFO", info);
  } catch (e) {
    console.error("[Agent Gateway] Error saving tunnel info:", e);
  }
};

const updateDnsBackground = async (server, address) => {
  if (!server.customDomain || !address) return;

  try {
    await dnsService.setCustomDomain(server.customDomain, address);
  } catch (e) {
    console.error(
      "[Agent Gateway] Failed to auto-update DNS in background:",
      e,
    );
  }
};

const handleAgentDisconnect = async (socket) => {
  try {
    agentHardwareMap.delete(socket.userId);
  } catch (error) {
    console.error(error);
  }
};

const handleSyncState = async (socket, servers) => {
  try {
    if (!Array.isArray(servers)) return;
    const dbServers = await prisma.server.findMany({
      where: { userId: socket.userId },
    });
    const agentActiveIds = servers.map((s) => s.id);

    for (const server of dbServers) {
      const isAgentActive = agentActiveIds.includes(server.id);
      const isDbActive =
        server.status === "ONLINE" ||
        server.status === "STARTING" ||
        server.status === "STOPPING";

      if (isAgentActive && server.status !== "ONLINE") {
        await prisma.server.update({
          where: { id: server.id },
          data: { status: "ONLINE" },
        });
        socket.broadcast.to(server.id).emit("STATUS_UPDATE", "ONLINE");
        continue;
      }

      if (!isAgentActive && isDbActive) {
        await prisma.server.update({
          where: { id: server.id },
          data: { status: "OFFLINE", tunnelIp: null },
        });
        socket.broadcast.to(server.id).emit("STATUS_UPDATE", "OFFLINE");
      }
    }
  } catch (error) {
    console.error(error);
  }
};
