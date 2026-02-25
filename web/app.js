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
let currentSentimentText = '';
let storedPassenger = null;
let storedNotification = null;
let storedDisruptionType = '';
let storedDisruptionCause = '';

// ── DOM refs ──────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnDisruption = document.getElementById('btnDisruption');
const btnConfirm = document.getElementById('btnConfirm');
const btnEscalate = document.getElementById('btnEscalate');
const optionsList = document.getElementById('optionsList');
const pnrCode = document.getElementById('pnrCode');
const offlineNote = document.getElementById('offlineNote');
const statusText = document.getElementById('statusText');
const metricsLog = document.getElementById('metricsLog');
const autoEscalationAlert = document.getElementById('autoEscalationAlert');
const autoEscalationDetail = document.getElementById('autoEscalationDetail');
const sentimentDot = document.getElementById('sentimentDot');

// Screens
const screenLock = document.getElementById('screenLock');
const screenDetail = document.getElementById('screenDetail');
const screenOptions = document.getElementById('screenOptions');
const screenChat = document.getElementById('screenChat');
const screenBooking = document.getElementById('screenBooking');
const tabBar = document.getElementById('tabBar');
const metricsOverlay = document.getElementById('metricsOverlay');
const escalationOverlay = document.getElementById('escalationOverlay');

// ── Lock screen clock ─────────────────────────────────────
function updateLockClock() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('lockTime').textContent = `${h}:${m}`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('lockDate').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}
updateLockClock();
setInterval(updateLockClock, 30000);

// ── Screen Navigation ─────────────────────────────────────
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  // Show tab bar on tab screens only
  const tabScreens = ['screenOptions', 'screenChat', 'screenDetail'];
  if (tabScreens.includes(screenId)) {
    tabBar.classList.add('visible');
  }

  // Update active tab
  const tabMap = { screenDetail: 'notifications', screenChat: 'chat', screenOptions: 'options' };
  if (tabMap[screenId]) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    const tabBtn = document.querySelector(`.tab-item[data-tab="${tabMap[screenId]}"]`);
    if (tabBtn) tabBtn.classList.add('active');
  }
}

// Tab bar click
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    const screenMap = { notifications: 'screenDetail', chat: 'screenChat', options: 'screenOptions' };
    if (screenMap[tabName]) showScreen(screenMap[tabName]);
  });
});

// Back button on detail
document.getElementById('detailBack').addEventListener('click', () => {
  showScreen('screenLock');
  tabBar.classList.remove('visible');
});

// CTA buttons on detail screen
document.getElementById('ctaViewOptions').addEventListener('click', () => showScreen('screenOptions'));
document.getElementById('ctaChatAssistant').addEventListener('click', () => showScreen('screenChat'));

// Lock screen notification card tap
document.getElementById('lockNotifCard').addEventListener('click', () => {
  showScreen('screenDetail');
});

// Done button on booking
document.getElementById('btnDone').addEventListener('click', () => {
  location.reload();
});

// Dismiss escalation
document.getElementById('btnDismissEscalation').addEventListener('click', () => {
  escalationOverlay.classList.remove('visible');
});

// Close escalation overlay on background click
escalationOverlay.addEventListener('click', (e) => {
  if (e.target === escalationOverlay) escalationOverlay.classList.remove('visible');
});

// Close metrics overlay on background click
metricsOverlay.addEventListener('click', (e) => {
  if (e.target === metricsOverlay) metricsOverlay.classList.remove('visible');
});

// ── Triple-tap to toggle metrics drawer ───────────────────
let tripleTapCount = 0;
let tripleTapTimer = null;
document.querySelectorAll('.nav-title').forEach(title => {
  title.addEventListener('click', () => {
    tripleTapCount++;
    clearTimeout(tripleTapTimer);
    if (tripleTapCount >= 3) {
      tripleTapCount = 0;
      metricsOverlay.classList.toggle('visible');
    } else {
      tripleTapTimer = setTimeout(() => { tripleTapCount = 0; }, 600);
    }
  });
});

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
      badge.textContent = '🤖 AI Assistant';
    } else {
      badge.className = 'msg-source-badge source-fallback';
      badge.textContent = '💬 Quick Reply';
    }
    div.appendChild(badge);
  }

  // ── Message body ──
  const body = document.createElement('div');
  body.style.whiteSpace = 'pre-wrap';
  body.textContent = text;
  div.appendChild(body);

  // ── Citation footnotes (KB responses) — iOS expandable ──
  if (role === 'assistant' && meta && meta.citations && meta.citations.length > 0) {
    const citDiv = document.createElement('div');
    citDiv.className = 'msg-citations';
    const toggleId = 'cit-' + Date.now();
    citDiv.innerHTML =
      `<div class="citation-toggle" onclick="document.getElementById('${toggleId}').classList.toggle('expanded')">📎 Sources ›</div>` +
      `<div class="citation-list" id="${toggleId}">` +
      meta.citations.map((c, i) =>
        `<span class="citation-item">[${i + 1}] ${typeof c === 'string' ? c : (c.title || c.uri || c.text || JSON.stringify(c))}</span>`
      ).join('') + '</div>';
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
  metricsLog.innerHTML = metricsEntries.map((m) =>
    `<div class="metric-line"><span class="metric-name">${m.name}</span> <span class="metric-val">${m.detail || ''}</span> <span class="metric-ts">[${m.ts}]</span></div>`
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

// ── Notification (Lock Screen Card) ───────────────────────

function showNotification(notification, passenger) {
  storedPassenger = passenger;
  storedNotification = notification;

  const name = passenger.firstName + (passenger.lastName ? ' ' + passenger.lastName : '');

  // Lock screen notification card
  const flightNum = notification.affectedFlight || passenger.flightNumber || 'Flight';
  document.getElementById('lockNotifTitle').textContent = `${flightNum} Cancelled`;
  document.getElementById('lockNotifBody').textContent = notification.body ? notification.body.substring(0, 90) + '...' : 'Your flight has been disrupted. Tap for details.';

  const lockCard = document.getElementById('lockNotifCard');
  lockCard.classList.add('visible');

  // Notification dot on tab bar
  document.getElementById('tabDotNotif').classList.add('visible');

  // Populate detail screen
  document.getElementById('alertType').textContent = storedDisruptionType || 'CANCELLATION';
  document.getElementById('alertCause').textContent = storedDisruptionCause || notification.cause || 'Flight disruption';
  document.getElementById('flightNumber').textContent = passenger.flightNumber || 'UA891';
  document.getElementById('originCode').textContent = passenger.origin || 'FRA';
  document.getElementById('destCode').textContent = passenger.destination || 'JFK';
  document.getElementById('flightDate').textContent = passenger.date || '';

  const statusPill = document.getElementById('flightStatus');
  const dtype = (storedDisruptionType || 'CANCELLATION').toUpperCase();
  statusPill.textContent = dtype;
  statusPill.className = 'status-pill ' + (dtype === 'CANCELLATION' ? 'cancelled' : 'delayed');

  // Alert banner border color
  const alertBanner = document.getElementById('alertBanner');
  alertBanner.style.borderLeftColor = dtype === 'CANCELLATION' ? 'var(--ios-red)' : 'var(--ios-orange)';

  // Passenger card
  const initials = (passenger.firstName?.[0] || '') + (passenger.lastName?.[0] || '');
  document.getElementById('passengerAvatar').textContent = initials;
  document.getElementById('passengerName').textContent = name;
  document.getElementById('passengerPnr').textContent = passenger.passengerId || 'PAX-0001';
  const tierBadge = document.getElementById('passengerTier');
  tierBadge.textContent = passenger.tier || 'General';
  tierBadge.className = `tier-badge ${passenger.tier || 'General'}`;

  // Notification body
  document.getElementById('notifBodyCard').textContent = notification.body || '';
}

function showManifestSummary(summary) {
  if (!summary) return;

  // Populate metrics drawer manifest section
  document.getElementById('metricsManifestSection').style.display = '';
  document.getElementById('mTotal').textContent = summary.totalPassengers;
  document.getElementById('mPlatinum').textContent = summary.tierBreakdown.Platinum;
  document.getElementById('mGold').textContent = summary.tierBreakdown.Gold;
  document.getElementById('mConnRisk').textContent = summary.connectionAtRisk;
  document.getElementById('mProactive').textContent = summary.proactiveEligible;
}

// ── Option rendering with iOS cards ───────────────────────

function formatCostDelta(delta) {
  if (delta === 0 || delta === undefined) return { text: '$0', cls: 'cost-zero' };
  if (delta > 0) return { text: `+$${delta}`, cls: 'cost-positive' };
  return { text: `-$${Math.abs(delta)}`, cls: 'cost-negative' };
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

  // Update tab badge
  const badge = document.getElementById('tabBadgeOptions');
  if (allOptions.length > 0) {
    badge.textContent = allOptions.length;
    badge.classList.add('visible');
  }

  if (currentOptions.length === 0) {
    optionsList.innerHTML = '<div class="options-no-items">No matching options.</div>';
    return;
  }

  optionsList.innerHTML = currentOptions
    .map((o) => {
      const cost = formatCostDelta(o.costDelta);
      const perks = (o.premiumPerks && o.premiumPerks.length > 0)
        ? `<div class="opt-perks">${o.premiumPerks.map(p => `<span class="perk-pill">${p}</span>`).join('')}</div>`
        : '';
      const compatWidth = o.compatibility ? Math.round(o.compatibility * 100) : 0;
      return `
    <div class="option-card ${selectedOptionId === o.optionId ? 'selected' : ''}"
         id="opt-${o.optionId}"
         onclick="selectOption('${o.optionId}')"
         aria-label="Option ${o.rank || o.optionId}: ${o.routing}">
      <div class="opt-rank">${o.rank || o.optionId}</div>
      <div class="opt-selected-check">✓</div>
      <div class="opt-times">
        <span class="opt-time-lg">${o.depart}</span>
        <span class="opt-arrow">→</span>
        <span class="opt-time-lg">${o.arrive}</span>
      </div>
      <div class="opt-route">${o.routing}</div>
      <div class="opt-meta-row">
        <span class="meta-pill class-pill">${o.class || 'Economy'}</span>
        <span class="meta-pill ${cost.cls}">${cost.text}</span>
        <span class="meta-pill stops-pill">${o.stops} stop${o.stops !== 1 ? 's' : ''}</span>
      </div>
      ${o.rationale ? `<div class="opt-rationale">${o.rationale}</div>` : ''}
      ${perks}
      ${compatWidth > 0 ? `<div class="opt-compat-bar"><div class="opt-compat-fill" style="width:${compatWidth}%"></div></div>` : ''}
    </div>
  `;
    })
    .join('');
}

function sortOptions(by) {
  currentSort = by;
  document.getElementById('sortTime').classList.toggle('active', by === 'time');
  document.getElementById('sortCost').classList.toggle('active', by === 'cost');
  document.getElementById('filterRecommended').classList.toggle('active', false);
  if (by !== 'recommended') showRecommendedOnly = false;
  applyFiltersAndSort();
}

function toggleRecommendedFilter() {
  showRecommendedOnly = !showRecommendedOnly;
  document.getElementById('filterRecommended').classList.toggle('active', showRecommendedOnly);
  document.getElementById('sortTime').classList.toggle('active', false);
  document.getElementById('sortCost').classList.toggle('active', false);
  if (showRecommendedOnly) currentSort = 'time';
  applyFiltersAndSort();
}

// Filter pill click handlers
document.getElementById('sortTime').addEventListener('click', () => sortOptions('time'));
document.getElementById('sortCost').addEventListener('click', () => sortOptions('cost'));
document.getElementById('filterRecommended').addEventListener('click', toggleRecommendedFilter);

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

// ── Event listeners ───────────────────────────────────────

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

btnSend.addEventListener('click', sendChat);
btnDisruption.addEventListener('click', createDisruption);
btnConfirm.addEventListener('click', confirmSelection);
btnEscalate.addEventListener('click', escalate);
