import prisma from '../../../core/database/prisma.client.js';
import crypto from 'crypto';
import { agentStateMap, agentHardwareMap } from '../gateways/agent.gateway.js';

const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PAIRING_CODE_VALIDITY_MINUTES = 15;

const generateRandomString = (length) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC_CHARS.charAt(crypto.randomInt(0, ALPHANUMERIC_CHARS.length));
  }
  return result;
};

const createUniquePairingPin = async () => {
  const pin = generateRandomString(6);
  const existingCode = await prisma.pairingCode.findUnique({ where: { pin } });
  
  if (existingCode) return createUniquePairingPin();
  return pin;
};

const calculateExpirationDate = () => {
  return new Date(Date.now() + PAIRING_CODE_VALIDITY_MINUTES * 60 * 1000);
};

export const requestPairingCode = async (req, res) => {
  try {
    const pin = await createUniquePairingPin();
    const expiresAt = calculateExpirationDate();

    const pairingCode = await prisma.pairingCode.create({
      data: { pin, expiresAt }
    });

    return res.status(200).json({ pin: pairingCode.pin, expiresAt: pairingCode.expiresAt });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

const getValidPairingCode = async (pin) => {
  const pairingCode = await prisma.pairingCode.findUnique({ where: { pin: pin.toUpperCase() } });
  
  if (!pairingCode) throw new Error('InvalidPIN');
  if (pairingCode.isClaimed) throw new Error('ClaimedPIN');
  if (pairingCode.expiresAt < new Date()) throw new Error('ExpiredPIN');
  
  return pairingCode;
};

const getOrGenerateUserAgentToken = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.agentToken) return user.agentToken;

  const newAgentToken = crypto.randomBytes(32).toString('hex');
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { agentToken: newAgentToken }
  });
  
  return updatedUser.agentToken;
};

const markPairingCodeAsClaimed = async (pairingCodeId, userId) => {
  await prisma.pairingCode.update({
    where: { id: pairingCodeId },
    data: { isClaimed: true, userId }
  });
};

const notifyAgentViaSocket = (io, pin, agentToken) => {
  if (!io) return;
  io.to(`room_${pin.toUpperCase()}`).emit('paired', { token: agentToken });
};

export const claimPairingCode = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin) return res.status(400).json({ error: 'MissingPIN' });

    const pairingCode = await getValidPairingCode(pin);
    const agentToken = await getOrGenerateUserAgentToken(userId);
    
    await markPairingCodeAsClaimed(pairingCode.id, userId);
    notifyAgentViaSocket(req.app.get('io'), pin, agentToken);

    return res.status(200).json({ success: true });
  } catch (error) {
    if (['InvalidPIN', 'ClaimedPIN', 'ExpiredPIN'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const checkAgentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'UserNotFound' });
    
    const isOnline = agentHardwareMap.has(userId);
    
    let status = 'OFFLINE';
    if (user.agentToken && isOnline) {
      status = agentStateMap.get(userId) || 'ACTIVE';
    }
    
    return res.status(200).json({ isLinked: !!user.agentToken, status });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const unlinkAgent = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const io = req.app.get('io');
    if (io) {
      io.to(`agent-${userId}`).emit('AGENT_UNLINK');
      io.in(`agent-${userId}`).disconnectSockets(true);
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { agentToken: null }
    });
    
    return res.status(200).json({ success: true, message: 'Agent unlinked successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const unlinkSelfAgent = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'MissingToken' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'MissingToken' });

    const user = await prisma.user.findUnique({ where: { agentToken: token } });
    if (!user) return res.status(404).json({ error: 'UserNotFound' });

    await prisma.user.update({
      where: { id: user.id },
      data: { agentToken: null }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`agent-${user.id}`).emit('AGENT_UNLINKED_EXPLICITLY');
      io.in(`agent-${user.id}`).disconnectSockets(true);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const hibernateAgent = async (req, res) => {
  try {
    const io = req.app.get('io');
    if (io) io.to(`agent-${req.user.id}`).emit('AGENT_HIBERNATE');
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const wakeAgent = async (req, res) => {
  try {
    const io = req.app.get('io');
    if (io) io.to(`agent-${req.user.id}`).emit('AGENT_WAKE');
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const getUpdateInfo = async (req, res) => {
  try {
    const latest = process.env.AGENT_LATEST_VERSION || '1.0.0';
    const minimum = process.env.AGENT_MIN_VERSION || '1.0.0';
    const notes = process.env.AGENT_UPDATE_NOTES || 'Update available';

    if (!process.env.AGENT_MIN_VERSION) console.warn("WARNING: AGENT_MIN_VERSION is not set in ENV!");

    return res.status(200).json({ latest, minimum, notes });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};

export const getLatestRelease = async (req, res) => {
  try {
    const latest = process.env.AGENT_LATEST_VERSION || '1.0.0';
    const notes = process.env.AGENT_UPDATE_NOTES || 'Update available';
    
    // Fallbacks if not set, avoiding silent fails (UA-6 is somewhat handled by logging)
    if (!process.env.AGENT_LATEST_VERSION) console.warn("WARNING: AGENT_LATEST_VERSION is not set in ENV!");

    // Tauri v2 standard updater JSON schema
    return res.status(200).json({
      version: latest,
      notes: notes,
      pub_date: new Date().toISOString(),
      platforms: {
        "linux-x86_64": {
          "url": `https://github.com/Jhomel-Dev/CraftControl/releases/download/v${latest}/CraftControl-Agent_${latest}_amd64.AppImage.tar.gz`,
          "signature": process.env.AGENT_LINUX_SIGNATURE || "dW5kZWZpbmVk"
        },
        "windows-x86_64": {
          "url": `https://github.com/Jhomel-Dev/CraftControl/releases/download/v${latest}/CraftControl-Agent_${latest}_x64-setup.nsis.zip`,
          "signature": process.env.AGENT_WINDOWS_SIGNATURE || "dW5kZWZpbmVk"
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'InternalServerError' });
  }
};
