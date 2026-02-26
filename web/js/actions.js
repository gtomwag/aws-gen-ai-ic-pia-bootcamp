// ── Actions ───────────────────────────────────────────────

async function createDisruption() {
  btnDisruption.disabled = true;
  addMessage('system', 'Creating disruption event...');
  addMetric('disruption_request', 'type=CANCELLATION airport=FRA');

  storedDisruptionType = 'CANCELLATION';
  storedDisruptionCause = 'Severe weather – thunderstorm at FRA, runway closure';

  try {
    const data = await apiCall('/disruption', {
      type: 'CANCELLATION',
      reason: 'Severe weather – thunderstorm at FRA, runway closure',
      airport: 'FRA',
      passengerCount: 200,
      passenger: {
        firstName: 'Alice',
        lastName: 'Anderson',
        tier: 'Platinum',
        origin: 'FRA',
        destination: 'JFK',
        flightNumber: 'UA891',
        date: '2026-02-25',
        hasApp: true,
        consentForProactive: true,
        passengerId: 'PAX-0001',
        constraints: ['arrive_before_21_00'],
        specialRequirements: null,
        connectionRisk: null,
      },
    });

    sessionId = data.sessionId;
    addMessage('system', data.message);
    addMetric('disruption_detected', `disruptionId=${data.disruptionId} passengers=${data.manifestSummary?.totalPassengers}`);

    // Show notification
    if (data.notification) {
      showNotification(data.notification, data.passenger);
      addMetric('notification_prepared', `channel=${data.notification.primaryChannel} tier=${data.passenger.tier}`);
    }

    // Show manifest summary (in metrics drawer)
    if (data.manifestSummary) {
      showManifestSummary(data.manifestSummary);
      addMetric('passengers_assessed', `total=${data.manifestSummary.totalPassengers} platinum=${data.manifestSummary.tierBreakdown.Platinum}`);
    }

    // Enable controls
    chatInput.disabled = false;
    btnSend.disabled = false;
    btnConfirm.disabled = false;
    btnEscalate.disabled = false;

    // Render options directly from disruption response
    if (data.options && data.options.length > 0) {
      renderOptions(data.options);
      addMetric('options_generated', `count=${data.options.length}`);
    }

    // Auto-chat to get assistant response
    addMessage('user', 'Show me the best options and tradeoffs.');
    const chatData = await apiCall('/chat', {
      sessionId,
      message: 'Show me the best options and tradeoffs.',
    });

    addMessage('assistant', chatData.assistant, {
      source: chatData.source,
      citations: chatData.citations,
    });
    handleChatMeta(chatData);
    if (chatData.options && chatData.options.length > 0) {
      renderOptions(chatData.options);
    }

  } catch (err) {
    btnDisruption.disabled = false;
    console.error('createDisruption error:', err);
  }
}

// ── Sentiment & AI metadata handler ──────────────────────

function handleChatMeta(data) {
  // Sentiment indicator (dot on chat nav bar)
  if (data.sentiment && data.sentiment.current) {
    const s = data.sentiment.current;
    sentimentDot.className = `chat-nav-sentiment ${s}`;

    // Metrics drawer sentiment detail
    let sentimentHtml = `<span style="font-weight:600;color:#fff;">${s}</span>`;
    if (data.sentiment.scores) {
      const sc = data.sentiment.scores;
      const parts = [];
      if (sc.positive) parts.push(`pos:${(sc.positive * 100).toFixed(0)}%`);
      if (sc.negative) parts.push(`neg:${(sc.negative * 100).toFixed(0)}%`);
      if (sc.neutral) parts.push(`neu:${(sc.neutral * 100).toFixed(0)}%`);
      currentSentimentText = parts.join(' · ');
      sentimentHtml += ` <span style="color:#8E8E93;">${currentSentimentText}</span>`;
    }
    document.getElementById('metricsSentimentSection').style.display = '';
    document.getElementById('sentimentDetail').innerHTML = sentimentHtml;
    addMetric('sentiment', `${s} ${currentSentimentText}`);
  }

  // Auto-escalation alert in chat
  if (data.autoEscalation && data.autoEscalation.triggered) {
    autoEscalationAlert.classList.add('visible');
    autoEscalationDetail.textContent =
      `${data.autoEscalation.consecutiveNegative} consecutive negative — routing to agent`;
    addMessage('system', '🚨 Auto-escalation triggered. Consider speaking with an agent.');
    addMetric('SENTIMENT_AUTO_ESCALATE', `consecutive=${data.autoEscalation.consecutiveNegative}`);
  }

  // Source metric
  if (data.source) {
    addMetric('chat_source', data.source);
  }
}

async function sendChat() {
  const message = chatInput.value.trim();
  if (!message || !sessionId) return;

  chatInput.value = '';
  addMessage('user', message);

  try {
    const data = await apiCall('/chat', { sessionId, message });

    // PII: retroactively mark the user message
    if (data.piiDetected) {
      const userMsgs = chatMessages.querySelectorAll('.msg.user');
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      if (lastUserMsg && !lastUserMsg.querySelector('.msg-pii-warning')) {
        const pii = document.createElement('div');
        pii.className = 'msg-pii-warning';
        pii.textContent = '🔒 Sensitive data detected';
        lastUserMsg.appendChild(pii);
      }
      addMetric('PII_DETECTED', 'in user message');
    }

    addMessage('assistant', data.assistant, {
      source: data.source,
      citations: data.citations,
    });
    handleChatMeta(data);

    if (data.options && data.options.length > 0) {
      renderOptions(data.options);
    }
  } catch (err) {
    console.error('sendChat error:', err);
  }
}

async function selectOption(optionId) {
  if (!sessionId) return;

  // Haptic hint
  if (navigator.vibrate) navigator.vibrate(10);

  try {
    const data = await apiCall('/select-option', { sessionId, optionId });
    selectedOptionId = optionId;
    applyFiltersAndSort();
    addMessage('system', `Selected Option ${optionId}: ${data.selected.routing}`);
    addMetric('option_selected', `optionId=${optionId}`);
    btnConfirm.disabled = false;
  } catch (err) {
    console.error('selectOption error:', err);
  }
}

async function confirmSelection() {
  if (!sessionId) return;

  // Haptic hint
  if (navigator.vibrate) navigator.vibrate(10);

  try {
    const data = await apiCall('/confirm', { sessionId });
    const b = data.booking;

    // PNR
    pnrCode.textContent = b.pnr;

    // Enhanced itinerary
    if (b.itinerarySummary) {
      const it = b.itinerarySummary;
      document.getElementById('itinPassenger').textContent = it.passenger || 'Alice Anderson';
      const itinTier = document.getElementById('itinTier');
      itinTier.textContent = it.tier || 'Platinum';
      itinTier.className = `tier-badge ${it.tier || 'Platinum'}`;

      // Route
      const parts = (it.flights || []);
      if (parts.length > 0) {
        document.getElementById('itinOrigin').textContent = storedPassenger?.origin || 'FRA';
        document.getElementById('itinDest').textContent = storedPassenger?.destination || 'JFK';
      }

      // Meta
      const metaHtml = [
        it.departure ? `<div class="itin-meta-row"><span class="itin-meta-label">Departure</span><span>${it.departure}</span></div>` : '',
        it.arrival ? `<div class="itin-meta-row"><span class="itin-meta-label">Arrival</span><span>${it.arrival}</span></div>` : '',
        it.class ? `<div class="itin-meta-row"><span class="itin-meta-label">Class</span><span>${it.class}</span></div>` : '',
        parts.length > 0 ? `<div class="itin-meta-row"><span class="itin-meta-label">Flights</span><span>${parts.join(' → ')}</span></div>` : '',
      ].filter(Boolean).join('');
      document.getElementById('itinMeta').innerHTML = metaHtml;
    } else if (b.selected) {
      document.getElementById('itinMeta').innerHTML = `<div class="itin-meta-row"><span class="itin-meta-label">Route</span><span>${b.selected.routing}</span></div>`;
    }

    // Offline note
    if (b.offlineNote) {
      document.getElementById('offlineNoteText').textContent = b.offlineNote;
      offlineNote.classList.add('visible');
    }

    addMessage('system', `✅ Booking confirmed! PNR: ${b.pnr}`);
    addMetric('booking_confirmed', `pnr=${b.pnr}`);

    // Show booking screen
    showScreen('screenBooking');
    tabBar.classList.remove('visible');

    // Disable further actions
    btnConfirm.disabled = true;
    chatInput.disabled = true;
    btnSend.disabled = true;
  } catch (err) {
    console.error('confirmSelection error:', err);
  }
}

async function escalate() {
  if (!sessionId) return;

  try {
    const data = await apiCall('/escalate', { sessionId, reason: 'Customer requested live agent' });
    addMessage('system', '📞 Escalated to agent. Handoff packet created.');
    addMetric('escalated', `priority=${data.packet.priority} tier=${data.packet.passengerSummary?.tier}`);

    // Show escalation modal sheet
    escalationOverlay.classList.add('visible');

    // Log escalation packet to metrics drawer
    const p = data.packet;
    let packetDetail = `priority=${p.priority}`;
    if (p.passengerSummary) packetDetail += ` | ${p.passengerSummary.name} (${p.passengerSummary.tier})`;
    if (p.disruptionSummary) packetDetail += ` | ${p.disruptionSummary.type}: ${p.disruptionSummary.reason}`;
    if (p.optionsPresented) packetDetail += ` | ${p.optionsPresented.length} options shown`;
    if (p.selectionHistory?.selectedOption) packetDetail += ` | selected=${p.selectionHistory.selectedOption.optionId}`;
    if (p.aiRecommendation) packetDetail += ` | AI: ${p.aiRecommendation}`;
    if (p.policyNotes) packetDetail += ` | eu261=${p.policyNotes.eu261}, gdpr=${p.policyNotes.gdpr}`;
    addMetric('escalation_packet', packetDetail);

    btnEscalate.disabled = true;
  } catch (err) {
    console.error('escalate error:', err);
  }
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

async function ensureVoiceSession() {
  if (!sessionId) {
    addMessage('system', 'Create a disruption first, then tap the phone icon to start voice support.');
    return null;
  }

  if (voiceSessionId) {
    return voiceSessionId;
  }

  try {
    const startData = await apiCall('/voice/session/start', {
      sessionId,
      locale: navigator.language || 'en-US',
    });

    voiceSessionId = startData.voiceSessionId;
    voiceTurnSequence = 1;
    addMetric('voice_session_started_ui', `voiceSessionId=${voiceSessionId}`);
    addMessage('system', '📞 Voice session started. Listening...');
    return voiceSessionId;
  } catch (err) {
    if (err?.message && err.message.includes('Active voice session already exists')) {
      addMessage('system', 'An active voice session already exists. Please try again in a moment.');
      return null;
    }
    throw err;
  }
}

async function handleVoiceTranscript(transcript) {
  const cleaned = (transcript || '').trim();
  if (!cleaned || !voiceSessionId) return;

  addMessage('user', `🎙️ ${cleaned}`);

  const voiceData = await apiCall('/voice/turn', {
    voiceSessionId,
    transcriptText: cleaned,
    sequence: voiceTurnSequence,
  });
  voiceTurnSequence += 1;

  if (voiceData.transferIntentDetected) {
    addMessage('system', 'Transfer intent detected. Requesting a human agent...');
    const transferData = await apiCall('/voice/transfer', {
      voiceSessionId,
      reason: 'Voice transfer intent detected',
      trigger: 'intent_detected',
    });
    addMessage('system', `📞 ${transferData.statusMessage}`);
    addMetric('voice_transfer_requested_ui', `status=${transferData.status}`);
    return;
  }

  if (voiceData.responseText) {
    addMessage('assistant', voiceData.responseText, {
      source: voiceData.source,
      citations: voiceData.citations,
    });
    addMetric('voice_response_rendered_ui', `source=${voiceData.source || 'fallback'}`);
  }
}

async function startVoiceConversation() {
  const activeSessionId = await ensureVoiceSession();
  if (!activeSessionId) return;

  btnVoiceAgent.classList.add('active');
  setStatus('Calling agent...');

  try {
    const transferData = await apiCall('/voice/transfer', {
      voiceSessionId: activeSessionId,
      reason: 'Agent call requested from phone button',
      trigger: 'user_explicit',
    });

    voiceTransferRequestId = transferData.transferRequestId || null;
    addMessage('system', `📞 ${transferData.statusMessage}`);
    addMetric('voice_phone_call_requested_ui', `status=${transferData.status}`);

    addMessage('system', 'Agent handoff is being processed in-app.');

    if (voiceTransferRequestId) {
      const statusData = await apiCall(`/voice/transfer-status?voiceSessionId=${activeSessionId}&transferRequestId=${voiceTransferRequestId}`);
      if (statusData?.statusMessage) {
        addMessage('system', `📡 ${statusData.statusMessage}`);
      }
      addMetric('voice_transfer_status_ui', `status=${statusData.status}`);
    }
  } catch (err) {
    console.error('startVoiceConversation error:', err);
  } finally {
    btnVoiceAgent.classList.remove('active');
    setStatus('Ready');
  }
}
