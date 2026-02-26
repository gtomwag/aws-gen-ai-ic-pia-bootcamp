// ── Actions ───────────────────────────────────────────────

async function createDisruption() {
  btnDisruption.disabled = true;
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
        firstName: 'Mark',
        lastName: 'Scout',
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
    addMetric('disruption_detected', `disruptionId=${data.disruptionId} passengers=${data.manifestSummary?.totalPassengers}`);

    // Update trip card with disruption status
    if (data.passenger) {
      updateTripCard(data.passenger, storedDisruptionType);
    }

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

    // Show suggested prompts instead of auto-chat
    showSuggestedPrompts();

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
  
  // Remove suggested prompts if they exist
  const suggestedPrompts = document.getElementById('suggestedPrompts');
  if (suggestedPrompts) {
    suggestedPrompts.remove();
  }
  
  addMessage('user', message);

  try {
    const data = await apiCall('/chatv2', { sessionId, message });

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
      document.getElementById('itinPassenger').textContent = it.passenger || 'Mark Scout';
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

    // Store confirmed booking data for trip card update
    if (b.itinerarySummary) {
      storedConfirmedBooking = {
        pnr: b.pnr,
        flightNumber: b.itinerarySummary.flights?.[0] || b.selected?.flights?.[0] || storedPassenger?.flightNumber,
        origin: storedPassenger?.origin,
        destination: storedPassenger?.destination,
        departure: b.itinerarySummary.departure,
        arrival: b.itinerarySummary.arrival,
        class: b.itinerarySummary.class,
        date: storedPassenger?.date
      };
    }

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

function setVoiceCallUiActive(active) {
  btnVoiceAgent.classList.toggle('active', active);
  if (btnVoiceTab) btnVoiceTab.classList.toggle('active', active);

  const voiceTabLabel = btnVoiceTab ? btnVoiceTab.querySelector('.tab-label') : null;
  if (voiceTabLabel) {
    voiceTabLabel.textContent = active ? 'End' : 'Call';
  }

  btnVoiceAgent.setAttribute('aria-label', active ? 'End call' : 'Call Agent');
  btnVoiceAgent.setAttribute('title', active ? 'End call' : 'Call Agent');
  if (btnVoiceTab) {
    btnVoiceTab.setAttribute('aria-label', active ? 'End call' : 'Call agent');
  }
}

function stopVoiceConversation(reason) {
  isVoiceCallActive = false;
  isVoiceListening = false;
  isVoiceTurnInFlight = false;

  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch (_) { /* no-op */ }
    activeSpeechRecognition = null;
  }

  setVoiceCallUiActive(false);
  setStatus('Ready');
  if (reason) addMessage('system', reason);
}

function startVoiceListeningLoop() {
  if (!isVoiceCallActive || isVoiceTurnInFlight) return;

  const SpeechRecognition = getSpeechRecognitionCtor();
  if (!SpeechRecognition) {
    stopVoiceConversation('Voice is not supported in this browser. Try Chrome or Edge.');
    return;
  }

  const recognition = new SpeechRecognition();
  activeSpeechRecognition = recognition;
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    isVoiceListening = true;
    setStatus('Listening...');
  };

  recognition.onresult = async (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcript) return;

    isVoiceTurnInFlight = true;
    setStatus('Thinking...');
    try {
      await handleVoiceTranscript(transcript);
    } catch (err) {
      console.error('handleVoiceTranscript error:', err);
    } finally {
      isVoiceTurnInFlight = false;
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted') return;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopVoiceConversation('Microphone permission denied. Please allow microphone access to use voice call.');
      return;
    }
    addMessage('system', `Voice error: ${event.error}`);
  };

  recognition.onend = () => {
    isVoiceListening = false;
    activeSpeechRecognition = null;

    if (isVoiceCallActive) {
      setTimeout(startVoiceListeningLoop, 250);
    } else {
      setStatus('Ready');
    }
  };

  recognition.start();
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
    addMessage('system', 'Transfer intent detected. Ending call and requesting a human agent...');
    const transferData = await apiCall('/voice/transfer', {
      voiceSessionId,
      reason: 'Voice transfer intent detected',
      trigger: 'intent_detected',
    });
    voiceTransferRequestId = transferData.transferRequestId || null;
    const initialTransferStatusMessage = transferData.statusMessage || '';
    if (initialTransferStatusMessage) {
      addMessage('system', `📞 ${initialTransferStatusMessage}`);
    }
    addMetric('voice_transfer_requested_ui', `status=${transferData.status}`);

    if (voiceTransferRequestId) {
      const statusData = await apiCall(`/voice/transfer-status?voiceSessionId=${voiceSessionId}&transferRequestId=${voiceTransferRequestId}`);
      if (statusData?.statusMessage && statusData.statusMessage !== initialTransferStatusMessage) {
        addMessage('system', `📡 ${statusData.statusMessage}`);
      }
      addMetric('voice_transfer_status_ui', `status=${statusData.status}`);
    }

    stopVoiceConversation('📴 Voice call ended. Transferring to a human agent now.');
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
  if (isVoiceCallActive) {
    stopVoiceConversation('📴 Voice call ended.');
    return;
  }

  const SpeechRecognition = getSpeechRecognitionCtor();
  if (!SpeechRecognition) {
    addMessage('system', 'Voice is not supported in this browser. Try Chrome or Edge.');
    return;
  }

  const activeSessionId = await ensureVoiceSession();
  if (!activeSessionId) return;

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream.getTracks().forEach((track) => track.stop());

    isVoiceCallActive = true;
    voiceTransferRequestId = null;
    setVoiceCallUiActive(true);
    addMetric('voice_phone_call_started_ui', `voiceSessionId=${activeSessionId}`);
    addMessage('system', '📞 Connected to Nova Sonic II. Speak now. Say "escalate to a human" any time to transfer.');
    startVoiceListeningLoop();
  } catch (err) {
    console.error('startVoiceConversation error:', err);
    if (err?.name === 'NotAllowedError') {
      addMessage('system', 'Microphone permission is required to start a voice call.');
    }
    stopVoiceConversation();
  }
}


// ── Suggested Prompts ─────────────────────────────────────

function showSuggestedPrompts() {
  const promptsContainer = document.createElement('div');
  promptsContainer.className = 'suggested-prompts';
  promptsContainer.id = 'suggestedPrompts';
  
  const prompts = [
    'I need to rebook my flight',
    'What are my EU261 rights?',
    'Show me the fastest route',
    'What compensation am I entitled to?'
  ];
  
  prompts.forEach(prompt => {
    const button = document.createElement('button');
    button.className = 'prompt-card';
    button.textContent = prompt;
    button.onclick = () => {
      // Remove suggested prompts
      const container = document.getElementById('suggestedPrompts');
      if (container) container.remove();
      
      // Send the selected prompt
      chatInput.value = prompt;
      sendChat();
    };
    promptsContainer.appendChild(button);
  });
  
  chatMessages.appendChild(promptsContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
