// ── Configuration ──────────────────────────────────────────
const API_BASE_URL = 'https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod';

// ── State ─────────────────────────────────────────────────
let sessionId = null;
let selectedOptionId = null;
let currentOptions = [];
let allOptions = []; // unfiltered copy
let showRecommendedOnly = false;
let currentSort = 'time';
let metricsEntries = [];

// ── DOM refs ──────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnDisruption = document.getElementById('btnDisruption');
const btnConfirm = document.getElementById('btnConfirm');
const btnEscalate = document.getElementById('btnEscalate');
const optionsList = document.getElementById('optionsList');
const bookingPanel = document.getElementById('bookingPanel');
const pnrCode = document.getElementById('pnrCode');
const bookingDetails = document.getElementById('bookingDetails');
const bookingItinerary = document.getElementById('bookingItinerary');
const offlineNote = document.getElementById('offlineNote');
const statusText = document.getElementById('statusText');
const notificationCenter = document.getElementById('notificationCenter');
const manifestBar = document.getElementById('manifestBar');
const sortFilterRow = document.getElementById('sortFilterRow');
const escalationPanel = document.getElementById('escalationPanel');
const escalationContent = document.getElementById('escalationContent');
const metricsPanel = document.getElementById('metricsPanel');
const metricsLog = document.getElementById('metricsLog');
const sentimentBar = document.getElementById('sentimentBar');
const sentimentBadge = document.getElementById('sentimentBadge');
const sentimentScores = document.getElementById('sentimentScores');
const autoEscalationAlert = document.getElementById('autoEscalationAlert');
const autoEscalationDetail = document.getElementById('autoEscalationDetail');

// ── Helpers ───────────────────────────────────────────────

function setStatus(text) {
  statusText.textContent = text;
}

function addMessage(role, text, meta) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  // ── Source badge for assistant messages ──
  if (role === 'assistant' && meta && meta.source) {
    const badge = document.createElement('div');
    const src = meta.source;
    if (src === 'knowledge-base') {
      badge.className = 'msg-source-badge source-kb';
      badge.textContent = '📚 Knowledge Base';
    } else if (src === 'bedrock') {
      badge.className = 'msg-source-badge source-bedrock';
      badge.textContent = '🤖 Bedrock AI';
    } else {
      badge.className = 'msg-source-badge source-fallback';
      badge.textContent = '💬 Fallback';
    }
    div.appendChild(badge);
  }

  // ── Message body ──
  const body = document.createElement('div');
  body.style.whiteSpace = 'pre-wrap';
  body.textContent = text;
  div.appendChild(body);

  // ── Citation footnotes (KB responses) ──
  if (role === 'assistant' && meta && meta.citations && meta.citations.length > 0) {
    const citDiv = document.createElement('div');
    citDiv.className = 'msg-citations';
    citDiv.innerHTML = '<div class="citation-label">📎 Sources:</div>' +
      meta.citations.map((c, i) =>
        `<span class="citation-item">[${i + 1}] ${typeof c === 'string' ? c : (c.title || c.uri || c.text || JSON.stringify(c))}</span>`
      ).join('');
    div.appendChild(citDiv);
  }

  // ── PII detection warning on user messages ──
  if (role === 'user' && meta && meta.piiDetected) {
    const pii = document.createElement('div');
    pii.className = 'msg-pii-warning';
    pii.textContent = '🔒 Sensitive data detected';
    div.appendChild(pii);
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMetric(name, detail) {
  const ts = new Date().toISOString().slice(11, 19);
  metricsEntries.push({ ts, name, detail });
  metricsPanel.classList.add('visible');
  metricsLog.innerHTML = metricsEntries.map((m) =>
    `<div class="metric-line"><span class="metric-name">METRIC: ${m.name}</span> | <span class="metric-val">${m.detail || ''}</span> <span style="color:#3b3f54">[${m.ts}]</span></div>`
  ).join('');
  metricsLog.scrollTop = metricsLog.scrollHeight;
}

async function apiCall(path, body) {
  setStatus(`Calling ${path}...`);
  try {
    const isGet = !body && (path.includes('?') || path === '/health' || path.startsWith('/notification') || (path === '/disruption' && !body));
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: isGet ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    setStatus('Ready');
    return data;
  } catch (err) {
    setStatus(`Error: ${err.message}`);
    addMessage('system', `⚠ Error: ${err.message}`);
    throw err;
  }
}

// ── Notification Center ───────────────────────────────────

function showNotification(notification, passenger) {
  notificationCenter.classList.add('visible');

  const name = passenger.firstName + (passenger.lastName ? ' ' + passenger.lastName : '');
  document.getElementById('notifPassenger').textContent = name;
  document.getElementById('notifFlight').textContent = `✈ ${notification.affectedFlight || passenger.flightNumber || 'N/A'}`;
  document.getElementById('notifCause').textContent = `⚠ ${notification.cause || 'Disruption'}`;
  document.getElementById('notifTierBadge').innerHTML = `<span class="tier-badge ${passenger.tier}">${passenger.tier}</span>`;
  document.getElementById('notifCopy').textContent = notification.body || '';
  document.getElementById('notifChannel').textContent = `Channel: ${notification.primaryChannel || 'push'} | Sent at: ${notification.notificationSentAt || 'N/A'}`;
}

function showManifestSummary(summary) {
  if (!summary) return;
  manifestBar.classList.add('visible');
  document.getElementById('mTotal').textContent = summary.totalPassengers;
  document.getElementById('mPlatinum').textContent = summary.tierBreakdown.Platinum;
  document.getElementById('mGold').textContent = summary.tierBreakdown.Gold;
  document.getElementById('mConnRisk').textContent = summary.connectionAtRisk;
  document.getElementById('mProactive').textContent = summary.proactiveEligible;
}

// ── Option rendering with rank, class, cost, rationale ────

function formatCostDelta(delta) {
  if (delta === 0 || delta === undefined) return { text: '$0', cls: 'cost-delta-zero' };
  if (delta > 0) return { text: `+$${delta}`, cls: 'cost-delta-positive' };
  return { text: `-$${Math.abs(delta)}`, cls: 'cost-delta-negative' };
}

function renderOptions(options) {
  allOptions = options || [];
  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  let opts = [...allOptions];

  if (showRecommendedOnly) {
    opts = opts.filter((o) => o.compatibility >= 0.85 || o.confidence >= 0.85);
  }

  if (currentSort === 'time') {
    opts.sort((a, b) => a.depart.localeCompare(b.depart));
  } else if (currentSort === 'cost') {
    opts.sort((a, b) => (a.costDelta || 0) - (b.costDelta || 0));
  }

  currentOptions = opts;

  if (currentOptions.length === 0) {
    optionsList.innerHTML = '<p style="color:#565f89; font-size:13px;">No matching options.</p>';
    return;
  }

  optionsList.innerHTML = currentOptions
    .map((o) => {
      const cost = formatCostDelta(o.costDelta);
      const perks = (o.premiumPerks && o.premiumPerks.length > 0)
        ? `<div class="opt-perks">✨ ${o.premiumPerks.join(' · ')}</div>`
        : '';
      return `
    <div class="option-card ${selectedOptionId === o.optionId ? 'selected' : ''}"
         id="opt-${o.optionId}"
         onclick="selectOption('${o.optionId}')">
      <div class="opt-header">
        <span class="opt-id">#${o.rank || o.optionId} Option ${o.optionId}</span>
        <span class="opt-time">${o.depart} → ${o.arrive}</span>
      </div>
      <div class="opt-route">${o.routing}</div>
      <div class="opt-meta">
        <span>${o.class || 'Economy'}</span>
        <span class="${cost.cls}">${cost.text}</span>
        <span>${o.stops} stop(s)</span>
      </div>
      ${o.rationale ? `<div class="opt-rationale">${o.rationale}</div>` : ''}
      ${perks}
      <div class="opt-notes">${o.notes}</div>
    </div>
  `;
    })
    .join('');
}

function sortOptions(by) {
  currentSort = by;
  document.getElementById('sortTime').classList.toggle('active', by === 'time');
  document.getElementById('sortCost').classList.toggle('active', by === 'cost');
  applyFiltersAndSort();
}

function toggleRecommendedFilter() {
  showRecommendedOnly = !showRecommendedOnly;
  document.getElementById('filterRecommended').classList.toggle('active', showRecommendedOnly);
  applyFiltersAndSort();
}

// ── Actions ───────────────────────────────────────────────

async function createDisruption() {
  btnDisruption.disabled = true;
  addMessage('system', 'Creating disruption event...');
  addMetric('disruption_request', 'type=CANCELLATION airport=FRA');

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

    // Show notification center
    if (data.notification) {
      showNotification(data.notification, data.passenger);
      addMetric('notification_prepared', `channel=${data.notification.primaryChannel} tier=${data.passenger.tier}`);
    }

    // Show manifest summary
    if (data.manifestSummary) {
      showManifestSummary(data.manifestSummary);
      addMetric('passengers_assessed', `total=${data.manifestSummary.totalPassengers} platinum=${data.manifestSummary.tierBreakdown.Platinum}`);
    }

    // Enable controls
    chatInput.disabled = false;
    btnSend.disabled = false;
    btnConfirm.disabled = false;
    btnEscalate.disabled = false;
    sortFilterRow.classList.add('visible');

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
  // Sentiment indicator
  if (data.sentiment && data.sentiment.current) {
    sentimentBar.classList.add('visible');
    const s = data.sentiment.current;
    sentimentBadge.textContent = s;
    sentimentBadge.className = `sentiment-badge ${s}`;
    if (data.sentiment.scores) {
      const sc = data.sentiment.scores;
      const parts = [];
      if (sc.positive) parts.push(`pos:${(sc.positive * 100).toFixed(0)}%`);
      if (sc.negative) parts.push(`neg:${(sc.negative * 100).toFixed(0)}%`);
      if (sc.neutral) parts.push(`neu:${(sc.neutral * 100).toFixed(0)}%`);
      sentimentScores.textContent = parts.join(' · ');
    }
    addMetric('sentiment', `${s} ${sentimentScores.textContent}`);
  }

  // Auto-escalation alert
  if (data.autoEscalation && data.autoEscalation.triggered) {
    autoEscalationAlert.classList.add('visible');
    autoEscalationDetail.textContent =
      `${data.autoEscalation.consecutiveNegative} consecutive negative messages detected — ${data.autoEscalation.reason || 'auto-routing to agent'}`;
    addMessage('system', '🚨 Auto-escalation triggered: consecutive negative sentiment detected. Consider speaking with an agent.');
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

  try {
    const data = await apiCall('/select-option', { sessionId, optionId });
    selectedOptionId = optionId;
    applyFiltersAndSort();
    addMessage('system', `Selected Option ${optionId}: ${data.selected.routing}`);
    addMetric('option_selected', `optionId=${optionId}`);
  } catch (err) {
    console.error('selectOption error:', err);
  }
}

async function confirmSelection() {
  if (!sessionId) return;

  try {
    const data = await apiCall('/confirm', { sessionId });
    const b = data.booking;

    bookingPanel.classList.add('visible');
    pnrCode.textContent = b.pnr;
    bookingDetails.textContent = `Status: ${b.status} | Booked: ${b.bookedAt}`;

    // Enhanced itinerary
    if (b.itinerarySummary) {
      const it = b.itinerarySummary;
      bookingItinerary.innerHTML = `
        <strong>New Itinerary</strong><br>
        Passenger: ${it.passenger} (${it.tier})<br>
        Flights: ${(it.flights || []).join(' → ')}<br>
        Class: ${it.class} | Depart: ${it.departure} | Arrive: ${it.arrival}
      `;
    } else {
      bookingItinerary.textContent = `Flight: ${b.selected.routing}`;
    }

    // Offline note
    if (b.offlineNote) {
      offlineNote.textContent = `📱 ${b.offlineNote}`;
    }

    addMessage('system', `✅ Booking confirmed! PNR: ${b.pnr}`);
    addMetric('booking_confirmed', `pnr=${b.pnr}`);

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

    // Show escalation panel
    const p = data.packet;
    escalationPanel.classList.add('visible');

    let html = '';

    // Priority badge
    html += `<div class="esc-section"><h4>Priority</h4><span class="esc-priority ${p.priority || 'NORMAL'}">${p.priority || 'NORMAL'}</span></div>`;

    // Passenger summary
    if (p.passengerSummary) {
      html += `<div class="esc-section"><h4>Passenger</h4><p>${p.passengerSummary.name} | ${p.passengerSummary.tier} | ${p.passengerSummary.origin}→${p.passengerSummary.destination} | ${p.passengerSummary.flightNumber}</p></div>`;
    }

    // Disruption summary
    if (p.disruptionSummary) {
      html += `<div class="esc-section"><h4>Disruption</h4><p>${p.disruptionSummary.type}: ${p.disruptionSummary.reason}</p></div>`;
    }

    // Options presented
    if (p.optionsPresented && p.optionsPresented.length > 0) {
      const optList = p.optionsPresented.map((o) => `${o.optionId}: ${o.routing} (${o.depart}→${o.arrive}) ${o.class}`).join('\n');
      html += `<div class="esc-section"><h4>Options Presented (${p.optionsPresented.length})</h4><pre>${optList}</pre></div>`;
    }

    // Selection
    html += `<div class="esc-section"><h4>Selection</h4><p>${p.selectionHistory?.declined ? 'No option selected' : `Option ${p.selectionHistory?.selectedOption?.optionId || '?'} selected`}</p></div>`;

    // AI Recommendation
    if (p.aiRecommendation) {
      html += `<div class="esc-section"><h4>AI Recommendation</h4><p>${p.aiRecommendation}</p></div>`;
    }

    // Policy notes
    if (p.policyNotes) {
      html += `<div class="esc-section"><h4>Policy Notes</h4><pre>${p.policyNotes.eu261}\n${p.policyNotes.gdpr}\n${p.policyNotes.consentStatus}</pre></div>`;
    }

    escalationContent.innerHTML = html;

    btnEscalate.disabled = true;
  } catch (err) {
    console.error('escalate error:', err);
  }
}

// ── Event listeners ───────────────────────────────────────

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});
