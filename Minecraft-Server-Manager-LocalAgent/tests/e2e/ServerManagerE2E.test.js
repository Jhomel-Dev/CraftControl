import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ServerManagerService from '../../src/services/ServerManagerService.js';

describe('ServerManagerService E2E Lifecycle Tests', () => {
  let serverManager;
  let mockConnectionService;

  beforeEach(() => {
    mockConnectionService = {
      sendLog: vi.fn(),
      sendTelemetry: vi.fn(),
      sendStateUpdate: vi.fn(),
      sendTunnelInfo: vi.fn()
    };
    serverManager = new ServerManagerService(mockConnectionService);
  });

  afterEach(async () => {
    await serverManager.stopAllServers();
    vi.restoreAllMocks();
  });

  it('Debe asignar puertos disponibles secuencialmente y evitar colisiones', () => {
    const port1 = serverManager.getAvailablePort();
    expect(port1).toBe(25565);

    serverManager.activeServers.set('server-1', { port: 25565 });
    const port2 = serverManager.getAvailablePort();
    expect(port2).toBe(25566);
  });

  it('Debe ejecutar killServerForcefully y limpiar el mapa de servidores activos', () => {
    const mockTunnelService = { stopTunnel: vi.fn() };
    const mockNativeService = { killMinecraftServer: vi.fn() };

    serverManager.activeServers.set('test-server', {
      tunnelService: mockTunnelService,
      nativeServerService: mockNativeService,
      port: 25565
    });

    serverManager.killServerForcefully('test-server');

    expect(mockTunnelService.stopTunnel).toHaveBeenCalled();
    expect(mockNativeService.killMinecraftServer).toHaveBeenCalled();
    expect(serverManager.activeServers.has('test-server')).toBe(false);
    expect(mockConnectionService.sendStateUpdate).toHaveBeenCalledWith({
      serverId: 'test-server',
      status: 'OFFLINE'
    });
  });

  it('Debe detener todos los servidores activos al ejecutar stopAllServers', async () => {
    const mockNative1 = { killMinecraftServer: vi.fn() };
    const mockNative2 = { killMinecraftServer: vi.fn() };

    serverManager.activeServers.set('srv-1', { nativeServerService: mockNative1 });
    serverManager.activeServers.set('srv-2', { nativeServerService: mockNative2 });

    await serverManager.stopAllServers();

    expect(mockNative1.killMinecraftServer).toHaveBeenCalled();
    expect(mockNative2.killMinecraftServer).toHaveBeenCalled();
    expect(serverManager.activeServers.size).toBe(0);
  });
});
