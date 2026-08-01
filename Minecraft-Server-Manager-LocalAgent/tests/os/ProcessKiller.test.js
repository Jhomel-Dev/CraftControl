import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { killProcessHard } from '../../src/utils/osUtils.js';

function isPidAlive(pid) {
  try {
    return process.kill(pid, 0);
  } catch {
    return false;
  }
}

describe('OS Process Killer Integration Tests', () => {
  it('Debe erradicar un proceso de Node en ejecución utilizando killProcessHard', async () => {
    const child = spawn('node', ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
      detached: process.platform !== 'win32'
    });

    const pid = child.pid;
    expect(pid).toBeGreaterThan(0);
    expect(isPidAlive(pid)).toBe(true);

    killProcessHard(pid);

    await new Promise(resolve => setTimeout(resolve, 600));

    expect(isPidAlive(pid)).toBe(false);
  });
});
