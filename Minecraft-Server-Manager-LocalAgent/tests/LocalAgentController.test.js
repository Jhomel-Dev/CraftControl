import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import LocalAgentController from '../src/controllers/LocalAgentController.js';
import ConnectionService from '../src/services/ConnectionService.js';

vi.mock('../src/services/NativeServerService.js');
vi.mock('../src/services/TunnelService.js');
vi.mock('../src/services/ConnectionService.js');

describe('LocalAgentController', () => {
  let controller;
  let mockConfig;

  beforeEach(() => {
    mockConfig = { apiUrl: 'http://test', agentToken: 'token123' };
    controller = new LocalAgentController(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('constructor validates config', () => {
    expect(() => new LocalAgentController()).toThrow('Controller configuration is required');
  });

  test('start initiates connection', () => {
    controller.start();
    const connectionInstance = vi.mocked(ConnectionService).mock.instances[0];
    expect(connectionInstance.connect).toHaveBeenCalled();
  });

  test('emits SYNC_STATE on connected with active servers', () => {
    controller.serverManager.activeServers = new Map([
      ['srv-1', {}]
    ]);
    const connectionInstance = vi.mocked(ConnectionService).mock.instances[0];
    connectionInstance.socket = { emit: vi.fn() };
    
    const connectedHandler = connectionInstance.on.mock.calls.find(c => c[0] === 'connected')[1];
    connectedHandler();
    
    expect(connectionInstance.socket.emit).toHaveBeenCalledWith('ENVELOPE', {
      type: 'SYNC_STATE',
      payload: [{ id: 'srv-1', status: 'ONLINE' }]
    });
  });
});
