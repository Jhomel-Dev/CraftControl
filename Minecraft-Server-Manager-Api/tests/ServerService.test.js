import { describe, test, expect, beforeEach, vi } from 'vitest';
import prisma from '../src/core/database/prisma.client.js';
import ServerService from '../src/modules/servers/services/server.service.js';

vi.mock('../src/core/database/prisma.client.js', () => ({
  default: {
    user: {
      findUnique: vi.fn()
    },
    server: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe('ServerService', () => {
  let serverService;
  let mockIo;
  let mockEmit;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmit = vi.fn();
    mockIo = {
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: mockEmit })
    };
    serverService = new ServerService(mockIo);
  });

  describe('createServer', () => {
    test('createServer throws error if no name or version provided', async () => {
      await expect(serverService.createServer('user1', {}))
        .rejects.toThrow('Server name and version are required');
    });

    test('createServer throws error if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(serverService.createServer('invalid-user', { name: 'My Server', version: '1.20.1' }))
        .rejects.toThrow('User not found');
    });

    test('createServer saves server to db with defaults', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user1' });
      prisma.server.findMany.mockResolvedValue([]);
      prisma.server.create.mockResolvedValue({ id: 'new-server' });

      const result = await serverService.createServer('user1', {
        name: 'My Server',
        version: '1.20.1',
        type: 'vanilla'
      });

      expect(prisma.server.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'new-server' });
    });
  });

  describe('startServer', () => {
    test('startServer throws error if server not found', async () => {
      prisma.server.findUnique.mockResolvedValue(null);
      await expect(serverService.startServer('invalid-server'))
        .rejects.toThrow('Server not found');
    });

    test('startServer updates status and emits event to agent', async () => {
      prisma.server.findUnique.mockResolvedValue({
        id: 'server1',
        userId: 'user1',
        status: 'OFFLINE'
      });
      prisma.server.update.mockResolvedValue({});

      await serverService.startServer('server1');

      expect(prisma.server.update).toHaveBeenCalledWith({
        where: { id: 'server1' },
        data: { status: 'STARTING', tunnelIp: null }
      });

      expect(mockIo.to).toHaveBeenCalledWith('agent-user1');
      expect(mockEmit).toHaveBeenCalledWith('START_SERVER', expect.any(Object));
    });
  });

  describe('stopServer', () => {
    test('stopServer throws error if server not found', async () => {
      prisma.server.findUnique.mockResolvedValue(null);
      await expect(serverService.stopServer('invalid-server'))
        .rejects.toThrow('Server not found');
    });

    test('stopServer updates status and emits stop event', async () => {
      prisma.server.findUnique.mockResolvedValue({
        id: 'server1',
        userId: 'user1',
        status: 'ONLINE'
      });

      await serverService.stopServer('server1');

      expect(prisma.server.update).toHaveBeenCalledWith({
        where: { id: 'server1' },
        data: { status: 'STOPPING', tunnelIp: null }
      });

      expect(mockIo.to).toHaveBeenCalledWith('agent-user1');
      expect(mockEmit).toHaveBeenCalledWith('STOP_SERVER', { id: 'server1' });
    });
  });
});
