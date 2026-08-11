import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LocalDaemonController from '../../src/controllers/LocalDaemonController.js';
import EnvManager from '../../src/config/EnvManager.js';
import SmartBootService from '../../src/services/SmartBootService.js';

describe('LocalDaemonController E2E API Tests', () => {
  let daemon;
  const TEST_PORT = 45678;

  beforeEach(() => {
    vi.spyOn(SmartBootService, 'runPreflightCleanup').mockResolvedValue(undefined);
    vi.spyOn(EnvManager, 'writeDaemonLock').mockImplementation(() => {});
    vi.spyOn(EnvManager, 'deleteDaemonLock').mockImplementation(() => {});
    vi.spyOn(EnvManager, 'updateApiUrl').mockImplementation(() => {});
    vi.spyOn(EnvManager, 'getDaemonSecret').mockReturnValue('test-secret');
  });

  afterEach(async () => {
    if (daemon && daemon.server) {
      await new Promise(resolve => daemon.server.close(resolve));
    }
    vi.restoreAllMocks();
  });

  it('Debe responder correctamente a /identity y /status', async () => {
    daemon = new LocalDaemonController(TEST_PORT);
    await daemon.start();

    const identityRes = await fetch(`http://127.0.0.1:${daemon.port}/identity`);
    const identityData = await identityRes.json();

    expect(identityRes.status).toBe(200);
    expect(identityData.identity).toBe('CraftControlAgent');

    const statusRes = await fetch(`http://127.0.0.1:${daemon.port}/status`, {
      headers: { 'Authorization': 'Bearer test-secret' }
    });
    const statusData = await statusRes.json();

    expect(statusRes.status).toBe(200);
    expect(statusData.status).toBe('initializing');
  });

  it('Debe actualizar API URL vía /set-api y procesar solicitud de apagado', async () => {
    daemon = new LocalDaemonController(TEST_PORT + 1);
    await daemon.start();

    const setApiRes = await fetch(`http://127.0.0.1:${daemon.port}/set-api`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-secret' 
      },
      body: JSON.stringify({ apiUrl: 'http://test-api.localhost' })
    });
    const setApiData = await setApiRes.json();

    expect(setApiRes.status).toBe(200);
    expect(setApiData.success).toBe(true);

    const shutdownCallback = vi.fn();
    daemon.onShutdown(shutdownCallback);

    const shutdownRes = await fetch(`http://127.0.0.1:${daemon.port}/shutdown`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-secret' }
    });
    const shutdownData = await shutdownRes.json();

    expect(shutdownRes.status).toBe(200);
    expect(shutdownData.success).toBe(true);
    expect(shutdownCallback).toHaveBeenCalled();
  });
});
