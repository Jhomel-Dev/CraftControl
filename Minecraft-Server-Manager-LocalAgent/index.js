import dotenv from 'dotenv';
import EnvManager from './src/config/EnvManager.js';
dotenv.config({ path: EnvManager.ENV_PATH });

import fs from 'fs/promises';
import PairingService from './src/services/PairingService.js';
import LocalAgentController from './src/controllers/LocalAgentController.js';
import LocalDaemonController from './src/controllers/LocalDaemonController.js';

const handleSetupModeExit = (message) => {
  console.log(`\n[SUCCESS] ${message}`);
  console.log('El instalador continuará con la configuración de segundo plano...\n');
  process.exit(0);
};

process.title = 'craftcontrol-daemon';

const start = async () => {
  try {
    const daemon = new LocalDaemonController();
    await daemon.start();
    
    let agent = null;

    const shutdownSafely = async () => {
      console.log('\n[System] Iniciando apagado seguro (Graceful Shutdown)...');
      daemon.setStatus('shutting_down');
      
      if (agent && agent.activeServers) {
        for (const [serverId, active] of agent.activeServers.entries()) {
          console.log(`[System] Deteniendo servidor ${serverId}...`);
          try {
            if (active.tunnelService) active.tunnelService.stopTunnel();
            if (active.nativeServerService) await active.nativeServerService.stopMinecraftServer();
          } catch (e) {
            console.error(`[Error] Fallo al detener servidor ${serverId}:`, e);
          }
        }
      }
      if (agent && agent.connectionService && agent.connectionService.socket) {
        console.log('[System] Notificando desconexión a la nube...');
        agent.connectionService.socket.disconnect();
        await new Promise(r => setTimeout(r, 200));
      }
      
      console.log('[System] Apagado completado. Saliendo...');
      if (agent && agent.connectionService) {
        agent.connectionService.disconnect();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      EnvManager.deleteDaemonLock();
      process.exit(0);
    };

    process.on('SIGINT', shutdownSafely);
    process.on('SIGTERM', shutdownSafely);
    process.on('uncaughtException', async (err) => {
      console.error('[CRITICAL] Uncaught Exception:', err);
      await shutdownSafely();
    });
    process.on('unhandledRejection', (reason) => {
      console.error('[WARN] Unhandled Rejection:', reason);
    });
    daemon.onShutdown(shutdownSafely);

    const apiUrl = EnvManager.getApiUrl();
    console.log(`\n[System] El agente está configurado para conectarse a: ${apiUrl}`);
    const isSetupMode = process.argv.includes('--setup');
    let agentToken = EnvManager.getAgentToken();
    console.log(`[DEBUG] Loaded agentToken from EnvManager: type=${typeof agentToken}, value='${agentToken}'`);

    daemon.onUnlink(async () => {
      console.log('\n[System] Desvinculación solicitada vía Local API.');
      try {
        await fetch(`${apiUrl}/api/agent/unlink-self`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${agentToken}` }
        });
      } catch (e) {
        console.log('[System] Advertencia: No se pudo notificar a la nube de la desvinculación.');
      }
      try {
        let envContent = await fs.readFile('.env', 'utf8');
        envContent = envContent.replace(/AGENT_SECRET_TOKEN=.*/g, '');
        await fs.writeFile('.env', envContent);
      } catch(e) {}
      await shutdownSafely();
    });

    if (!agentToken) {
      daemon.setStatus('waiting_pin');
      agentToken = await PairingService.performDeviceFlow(apiUrl);
      EnvManager.saveTokenToEnv(agentToken);
      
      if (isSetupMode) return handleSetupModeExit('Vinculación completada exitosamente.');
    }

    if (isSetupMode) {
      return handleSetupModeExit('El Agente ya se encontraba vinculado con la nube.');
    }

    agent = new LocalAgentController({ 
      apiUrl, 
      agentToken, 
      agentStatus: EnvManager.getAgentStatus(), 
      saveStatusToEnv: (status) => EnvManager.saveStatusToEnv(status),
      daemon
    });

    
    agent.start();
    console.log('\n[SUCCESS] Local Agent inicializado y conectado exitosamente.\n');

  } catch (error) {
    console.error('\n[ERROR] Failed to start Local Agent:', error.message);
    process.exit(1);
  }
};

start();
