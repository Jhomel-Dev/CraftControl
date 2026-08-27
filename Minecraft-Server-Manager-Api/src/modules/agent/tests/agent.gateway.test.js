import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSocketEvents } from "../gateways/agent.gateway.js";
import prisma from "../../../core/database/prisma.client.js";

vi.mock("../../../core/database/prisma.client.js", () => ({
  default: {
    server: {
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("agent.gateway.js Characterization", () => {
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      isAgent: true,
      userId: "test-user-id",
      join: vi.fn(),
      on: vi.fn(),
      broadcast: {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      },
    };

    mockIo = {
      use: vi.fn((middleware) => middleware(mockSocket, vi.fn())),
      on: vi.fn((event, cb) => {
        if (event === "connection") cb(mockSocket);
      }),
    };
  });

  it("handleAgentDisconnect should NOT mark all servers offline anymore", async () => {
    handleSocketEvents(mockIo);

    const disconnectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "disconnect",
    )[1];
    await disconnectHandler();

    expect(prisma.server.updateMany).not.toHaveBeenCalled();
  });

  it("handleStatusUpdate should validate server ownership before updating", async () => {
    handleSocketEvents(mockIo);

    const envHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "ENVELOPE",
    )[1];

    prisma.server.findUnique.mockResolvedValueOnce(null);
    await envHandler({
      type: "STATUS_UPDATE",
      payload: { serverId: "invalid-id", status: "ONLINE" },
    });
    expect(prisma.server.update).not.toHaveBeenCalled();

    prisma.server.findUnique.mockResolvedValueOnce({
      id: "alien-server-id",
      userId: "other-user",
    });
    await envHandler({
      type: "STATUS_UPDATE",
      payload: { serverId: "alien-server-id", status: "ONLINE" },
    });
    expect(prisma.server.update).not.toHaveBeenCalled();

    prisma.server.findUnique.mockResolvedValueOnce({
      id: "my-server",
      userId: "test-user-id",
      status: "STARTING",
    });
    await envHandler({
      type: "STATUS_UPDATE",
      payload: { serverId: "my-server", status: "ONLINE" },
    });
    expect(prisma.server.update).toHaveBeenCalledWith({
      where: { id: "my-server" },
      data: { status: "ONLINE" },
    });
  });

  it("handleSyncState should reconcile states based on agent truth", async () => {
    handleSocketEvents(mockIo);
    const envHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "ENVELOPE",
    )[1];

    prisma.server.findMany = vi.fn().mockResolvedValue([
      { id: "srv-1", status: "OFFLINE", userId: "test-user-id" },
      { id: "srv-2", status: "ONLINE", userId: "test-user-id" },
      { id: "srv-3", status: "ONLINE", userId: "test-user-id" },
    ]);

    await envHandler({
      type: "SYNC_STATE",
      payload: [
        { id: "srv-1", status: "ONLINE" },
        { id: "srv-3", status: "ONLINE" },
      ],
    });

    expect(prisma.server.update).toHaveBeenCalledWith({
      where: { id: "srv-1" },
      data: { status: "ONLINE" },
    });
    expect(prisma.server.update).toHaveBeenCalledWith({
      where: { id: "srv-2" },
      data: { status: "OFFLINE", tunnelIp: null },
    });
  });
});
