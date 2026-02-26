const { maybeNovaSonicVoiceReply } = require('./bedrock');
const { TRANSFER_STATUS, VOICE_SESSION_STATUS, generateId, logMetric } = require('./util');

const TRANSFER_INTENT_PATTERNS = [
  /human agent/i,
  /live agent/i,
  /speak to (a )?person/i,
  /representative/i,
  /transfer me/i,
  /escalate/i,
];

function detectTransferIntent(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  return TRANSFER_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function createVoiceSessionRecord({ sessionId, locale = 'en-US' }) {
  const now = new Date().toISOString();
  return {
    voiceSessionId: generateId('VCS'),
    sessionId,
    status: VOICE_SESSION_STATUS.ACTIVE,
    startedAt: now,
    lastActivityAt: now,
    transport: 'simulated-stream',
    locale,
    turnCount: 0,
    transferStatus: null,
  };
}

function buildTransferStatus({ transferRequestId, status, statusMessage, fallbackOption }) {
  return {
    transferRequestId,
    status,
    statusMessage,
    fallbackOption: fallbackOption || null,
    updatedAt: new Date().toISOString(),
  };
}

async function orchestrateVoiceTurn({ message, passenger, disruptionId, history }) {
  const response = await maybeNovaSonicVoiceReply({
    message,
    passenger,
    disruptionId,
    history,
  });

  if (!response?.text) {
    return {
      text: 'I could not process that request. I can connect you to a human agent if you prefer.',
      source: 'fallback',
      citations: [],
      fallbackReason: 'empty_voice_response',
      audioBase64: null,
    };
  }

  logMetric('VOICE_RESPONSE_ORCHESTRATED', 1, { source: response.source || 'fallback' });
  return {
    text: response.text,
    source: response.source || 'fallback',
    citations: response.citations || [],
    fallbackReason: response.fallbackReason || null,
    audioBase64: response.audioBase64 || null,
  };
}

module.exports = {
  detectTransferIntent,
  createVoiceSessionRecord,
  buildTransferStatus,
  orchestrateVoiceTurn,
  TRANSFER_STATUS,
  VOICE_SESSION_STATUS,
};
