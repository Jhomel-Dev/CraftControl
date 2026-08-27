import { describe, test, expect, vi, beforeEach } from 'vitest';
import NativeServerService from '../src/services/NativeServerService.js';
import AdoptiumInstaller from '../src/installers/java/AdoptiumInstaller.js';
import SoftwareInstallerFactory from '../src/installers/software/SoftwareInstallerFactory.js';
import ServerProcess from '../src/core/ServerProcess.js';

vi.mock('../src/installers/java/AdoptiumInstaller.js');
vi.mock('../src/installers/software/SoftwareInstallerFactory.js');
vi.mock('../src/core/ServerProcess.js');
vi.mock('../src/utils/osUtils.js', () => ({
  freePort: vi.fn(),
  killProcessHard: vi.fn()
}));
vi.mock('../src/configurators/ServerPropertiesEditor.js', () => {
  return {
    default: function() {
      this.acceptEula = vi.fn();
      this.createOrUpdateProperties = vi.fn();
      this.formatJvmArgs = vi.fn().mockReturnValue(['-jar', 'server.jar']);
    }
  };
});
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn()
  }
}));

describe('NativeServerService Characterization', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(AdoptiumInstaller).mockImplementation(function() {
      this.ensureJavaIsInstalled = vi.fn().mockResolvedValue('/mock/java');
    });

    vi.mocked(SoftwareInstallerFactory).mockImplementation(function() {
      this.getInstaller = vi.fn().mockReturnValue({
        install: vi.fn().mockResolvedValue({ type: 'jar', path: '/mock/server.jar' })
      });
    });

    vi.mocked(ServerProcess).mockImplementation(function() {
      this.start = vi.fn().mockReturnValue('9999');
      this.stop = vi.fn().mockResolvedValue(true);
      this.on = vi.fn();
      this.removeAllListeners = vi.fn();
    });

    service = new NativeServerService();
  });

  test('startMinecraftServer delegates to ServerProcess', async () => {
    const config = {
      id: 'test-server',
      dataDir: '/mock/dir',
      version: '1.19.4',
      type: 'vanilla'
    };

    const pid = await service.startMinecraftServer(config);
    
    expect(pid).toBe('9999');
    expect(ServerProcess).toHaveBeenCalledTimes(1);
    expect(ServerProcess).toHaveBeenCalledWith(
      '/mock/dir',
      '/mock/java',
      ['-jar', 'server.jar']
    );
  });

  test('stopMinecraftServer calls stop on process', async () => {
    service.process = new ServerProcess();
    await service.stopMinecraftServer();
    expect(service.process.stop).toHaveBeenCalledTimes(1);
  });
});
