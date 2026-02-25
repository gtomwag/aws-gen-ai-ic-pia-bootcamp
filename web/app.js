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
let latestOptionsMessage = null;
let showingSuggestedOnly = false;
let suggestedOptionId = null;

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
const lockScreen = document.getElementById('lockScreen');
const appScreen = document.getElementById('appScreen');
const pushNotificationCard = document.getElementById('pushNotificationCard');
const lockNotifTitle = document.getElementById('lockNotifTitle');
const lockNotifBody = document.getElementById('lockNotifBody');
const lockNotifTime = document.getElementById('lockNotifTime');
const flowStep1 = document.getElementById('flowStep1');
const flowStep2 = document.getElementById('flowStep2');
const flowStep3 = document.getElementById('flowStep3');
const typingIndicator = document.getElementById('typingIndicator');
const quickReplies = document.getElementById('quickReplies');
const quickReplyButtons = quickReplies ? Array.from(quickReplies.querySelectorAll('button')) : [];

// ── Helpers ───────────────────────────────────────────────

function messageTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shortThinkingPause(ms = 700) {
  setTypingIndicator(true);
  await wait(ms);
  setTypingIndicator(false);
}

function setActiveFlowStep(step) {
  const steps = [flowStep1, flowStep2, flowStep3];
  steps.forEach((el, i) => {
    if (el) {
      el.classList.toggle('active', i + 1 === step);
    }
  });
}

function setMobileScreen(screen) {
  if (!lockScreen || !appScreen) return;
  lockScreen.classList.toggle('visible', screen === 'lock');
  appScreen.classList.toggle('visible', screen === 'app');
}

function updateLockNotificationPreview({ title, body, time }) {
  if (lockNotifTitle && title) lockNotifTitle.textContent = title;
  if (lockNotifBody && body) lockNotifBody.textContent = body;
  if (lockNotifTime && time) lockNotifTime.textContent = time;
}

function simulatePushNotification() {
  updateLockNotificationPreview({
    title: 'Flight UA891 canceled',
    body: 'Tap to open your rebooking assistant and review alternatives.',
    time: 'now',
  });

  if (pushNotificationCard) {
    pushNotificationCard.classList.add('visible');
  }

  setMobileScreen('lock');
  setActiveFlowStep(1);
  setTypingIndicator(false);
  setQuickReplySuggestions(getDefaultQuickReplySuggestions());
  setQuickRepliesEnabled(false);
  setStatus('Notification sent');
}

async function openFromNotification() {
  setMobileScreen('app');
  setActiveFlowStep(2);
  if (pushNotificationCard) {
    pushNotificationCard.classList.remove('visible');
  }

  if (!sessionId) {
    await createDisruption();
  }

  setActiveFlowStep(3);
}

function setStatus(text) {
  statusText.textContent = text;
}

function setTypingIndicator(isVisible, text) {
  if (!typingIndicator) return;
  typingIndicator.textContent = text || '🤖 AI assistant is typing...';
  typingIndicator.classList.toggle('visible', isVisible);
}

function setQuickRepliesEnabled(enabled) {
  if (!quickReplyButtons.length) return;
  quickReplyButtons.forEach((button) => {
    if (button.style.display !== 'none') {
      button.disabled = !enabled;
    }
  });
}

function setQuickReplySuggestions(suggestions) {
  if (!quickReplyButtons.length) return;

  quickReplyButtons.forEach((button, index) => {
    const suggestion = suggestions[index];
    if (!suggestion) {
      button.style.display = 'none';
      button.disabled = true;
      button.dataset.action = 'chat';
      button.dataset.value = '';
      return;
    }

    button.style.display = '';
    button.textContent = suggestion.label;
    button.dataset.action = suggestion.action || 'chat';
    button.dataset.value = suggestion.value || '';
    button.disabled = !sessionId;
  });
}

function getDefaultQuickReplySuggestions() {
  return [
    { label: 'Show other options', action: 'chat', value: 'Can you show me other rebooking options?' },
    { label: 'Best for Platinum', action: 'chat', value: 'What is the best option for me as a Platinum customer?' },
    { label: 'Compare options', action: 'chat', value: 'Explain the tradeoffs between top 2 options.' },
    { label: 'Talk to a human', action: 'escalate', value: '' },
  ];
}

function getOptionSelectionSuggestions(options) {
  return [
    { label: 'Show other options', action: 'chat', value: 'Can you show me additional rebooking options?' },
    { label: 'Compare top options', action: 'chat', value: 'Please compare the top options for timing, comfort, and cost.' },
    { label: 'Best comfort option', action: 'chat', value: 'Which option is best for comfort and least disruption?' },
    { label: 'Talk to a human', action: 'escalate', value: '' },
  ];
}

function getSuggestedFollowupSuggestions() {
  return [
    { label: 'See more choices', action: 'show-more', value: '' },
    { label: 'Why this is best', action: 'chat', value: 'Why is this suggested booking the best option for me?' },
    { label: 'Talk to a human', action: 'escalate', value: '' },
    { label: 'Confirm booking', action: 'confirm', value: '' },
  ];
}

function updateQuickRepliesForContext(assistantText) {
  const text = (assistantText || '').toLowerCase();

  if (text.includes('more choices')) {
    setQuickReplySuggestions(getSuggestedFollowupSuggestions());
    return;
  }

  if (selectedOptionId && (text.includes('confirm') || text.includes('book'))) {
    setQuickReplySuggestions([
      { label: 'Confirm booking', action: 'confirm', value: '' },
      { label: 'Show other options', action: 'chat', value: 'Show me one more alternative before I confirm.' },
      { label: 'What is included?', action: 'chat', value: 'What is included in this rebooking option?' },
      { label: 'Talk to a human', action: 'escalate', value: '' },
    ]);
    return;
  }

  if (selectedOptionId) {
    setQuickReplySuggestions([
      { label: 'Confirm booking', action: 'confirm', value: '' },
      { label: 'Show other options', action: 'chat', value: 'Do you have an even better route for me?' },
      { label: 'Compare options', action: 'chat', value: 'Compare my selected option with the next best option.' },
      { label: 'Talk to a human', action: 'escalate', value: '' },
    ]);
    return;
  }

  if (currentOptions.length > 0) {
    setQuickReplySuggestions(getOptionSelectionSuggestions(currentOptions));
    return;
  }

  setQuickReplySuggestions(getDefaultQuickReplySuggestions());
}

function sendQuickReply(text) {
  if (!sessionId) {
    addMessage('system', 'Start the disruption session first to use quick replies.');
    return;
  }
  chatInput.value = text;
  sendChat();
}

function handleQuickReplyClick(button) {
  if (!button || button.disabled) return;

  const action = button.dataset.action || 'chat';
  const value = button.dataset.value || '';

  if (action === 'confirm') {
    confirmSelection();
    return;
  }

  if (action === 'escalate') {
    escalate();
    return;
  }

  if (action === 'show-more') {
    showMoreChoices();
    return;
  }

  if (value) {
    sendQuickReply(value);
  }
}

function formatOptionCostText(delta) {
  if (delta === undefined || delta === 0) return '$0 fare difference';
  if (delta > 0) return `+$${delta}`;
  return `-$${Math.abs(delta)}`;
}

function toNumberOrFallback(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function chooseSuggestedOption(options) {
  if (!options || options.length === 0) return null;

  const sorted = [...options].sort((a, b) => {
    const rankDelta = toNumberOrFallback(a.rank, Number.MAX_SAFE_INTEGER) - toNumberOrFallback(b.rank, Number.MAX_SAFE_INTEGER);
    if (rankDelta !== 0) return rankDelta;

    const compatDelta = toNumberOrFallback(b.compatibility, -1) - toNumberOrFallback(a.compatibility, -1);
    if (compatDelta !== 0) return compatDelta;

    const confidenceDelta = toNumberOrFallback(b.confidence, -1) - toNumberOrFallback(a.confidence, -1);
    if (confidenceDelta !== 0) return confidenceDelta;

    const stopsDelta = toNumberOrFallback(a.stops, Number.MAX_SAFE_INTEGER) - toNumberOrFallback(b.stops, Number.MAX_SAFE_INTEGER);
    if (stopsDelta !== 0) return stopsDelta;

    return toNumberOrFallback(a.costDelta, Number.MAX_SAFE_INTEGER) - toNumberOrFallback(b.costDelta, Number.MAX_SAFE_INTEGER);
  });

  return sorted[0];
}

function buildSimpleOptionDescription(option) {
  const stops = option.stops || 0;
  const costDelta = option.costDelta || 0;

  const stopSummary = stops === 0
    ? 'Nonstop for the smoothest trip.'
    : stops === 1
      ? 'One stop with a balanced schedule.'
      : `${stops} stops with added flexibility.`;

  const costSummary = costDelta > 0
    ? `Small fare increase of $${costDelta}.`
    : costDelta < 0
      ? `Saves $${Math.abs(costDelta)} versus your original fare.`
      : 'No fare difference.';

  const cabinSummary = option.class ? `Keeps you in ${option.class}.` : 'Cabin details available.';

  return `${stopSummary} ${costSummary} ${cabinSummary}`;
}

function buildSuggestedReasonLine(option) {
  const stops = option.stops || 0;
  const stopPart = stops === 0 ? 'nonstop for the smoothest trip' : `${stops} stop${stops > 1 ? 's' : ''} with reliable connections`;

  const costDelta = option.costDelta || 0;
  const costPart = costDelta === 0
    ? 'no fare difference'
    : costDelta > 0
      ? `a small fare increase of $${costDelta}`
      : `a savings of $${Math.abs(costDelta)}`;

  const cabin = option.class || 'your current cabin';
  const cabinPart = `we keep you in ${cabin}`;

  return `This new booking is ${stopPart}, ${costPart}, and ${cabinPart}.`;
}

function clearOptionsMessage() {
  if (latestOptionsMessage && latestOptionsMessage.parentNode) {
    latestOptionsMessage.parentNode.removeChild(latestOptionsMessage);
  }
  latestOptionsMessage = null;
}

function showMoreChoices() {
  if (!currentOptions || currentOptions.length === 0) return;
  showingSuggestedOnly = false;
  addMessage('assistant', 'Absolutely — here are more choices for you to review.');
  renderOptionsInChat(currentOptions, {
    introText: 'Additional options are below. Tap any option to select it:',
    highlightedOptionId: selectedOptionId || suggestedOptionId,
  });
}

function highlightSelectedChatOptionCards() {
  chatMessages.querySelectorAll('.chat-option-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.optionId === selectedOptionId);
  });
}

function renderOptionsInChat(options, config = {}) {
  clearOptionsMessage();

  if (!options || options.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'msg assistant';

  const metaRow = document.createElement('div');
  metaRow.className = 'msg-meta';
  const sender = document.createElement('span');
  sender.className = 'sender';
  sender.textContent = 'AI Assistant';
  const time = document.createElement('span');
  time.textContent = messageTimeLabel();
  metaRow.appendChild(sender);
  metaRow.appendChild(time);
  wrapper.appendChild(metaRow);

  const intro = document.createElement('div');
  intro.textContent = config.introText || 'Here are your best rebooking options. Tap one to choose it:';
  wrapper.appendChild(intro);

  if (config.titleText) {
    const title = document.createElement('div');
    title.className = 'chat-options-title';
    title.textContent = config.titleText;
    wrapper.appendChild(title);
  }

  const list = document.createElement('div');
  list.className = 'chat-options-list';

  options.forEach((o) => {
    const isSuggested = config.suggestedOptionId && o.optionId === config.suggestedOptionId;
    const isHighlighted = config.highlightedOptionId && o.optionId === config.highlightedOptionId;
    const card = document.createElement('div');
    card.className = `chat-option-card ${(selectedOptionId === o.optionId || isHighlighted) ? 'selected' : ''}`;
    card.dataset.optionId = o.optionId;
    card.onclick = () => selectOption(o.optionId);

    const titleWithBadge = isSuggested
      ? `Option ${o.optionId}<span class="chat-option-badge">Suggested booking</span>`
      : `Option ${o.optionId}`;

    card.innerHTML = `
      <div class="chat-option-top">
        <span class="chat-option-id">${titleWithBadge}</span>
        <span class="chat-option-time">${o.depart} → ${o.arrive}</span>
      </div>
      <div class="chat-option-route">${o.routing}</div>
      <div class="chat-option-meta">
        <span>${o.class || 'Economy'}</span>
        <span>${formatOptionCostText(o.costDelta)}</span>
        <span>${o.stops} stop(s)</span>
      </div>
      <div class="chat-option-notes">${o.notes || 'Tap to select this itinerary.'}</div>
    `;
    list.appendChild(card);
  });

  wrapper.appendChild(list);
  chatMessages.appendChild(wrapper);
  requestAnimationFrame(() => {
    wrapper.classList.add('msg-visible');
  });
  latestOptionsMessage = wrapper;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(role, text, meta) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  if (role === 'assistant' || role === 'user') {
    const metaRow = document.createElement('div');
    metaRow.className = 'msg-meta';
    const sender = document.createElement('span');
    sender.className = 'sender';
    sender.textContent = role === 'assistant' ? 'AI Assistant' : 'You';
    const time = document.createElement('span');
    time.textContent = messageTimeLabel();
    metaRow.appendChild(sender);
    metaRow.appendChild(time);
    div.appendChild(metaRow);
  }

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
  requestAnimationFrame(() => {
    div.classList.add('msg-visible');
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (role === 'assistant') {
    updateQuickRepliesForContext(text);
  }
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
  updateLockNotificationPreview({
    title: `Flight ${notification.affectedFlight || passenger.flightNumber || 'update'}`,
    body: notification.body || 'Tap to open your rebooking assistant and review alternatives.',
    time: 'now',
  });
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
  if (showingSuggestedOnly) {
    const suggested = chooseSuggestedOption(currentOptions);
    if (suggested) {
      suggestedOptionId = suggested.optionId;
      const reason = buildSuggestedReasonLine(suggested);
      addMessage('assistant', `We found the best rebooking option below based on your travel habits. ${reason}`);
      renderOptionsInChat([suggested], {
        introText: 'This is our top recommendation right now.',
        titleText: `Suggested booking: Option ${suggested.optionId}`,
        suggestedOptionId,
        highlightedOptionId: suggestedOptionId,
      });
      updateQuickRepliesForContext('more choices');
      return;
    }
  }

  renderOptionsInChat(currentOptions, {
    highlightedOptionId: selectedOptionId || suggestedOptionId,
  });
  updateQuickRepliesForContext('select an option');
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
  setMobileScreen('app');
  setActiveFlowStep(2);
  clearOptionsMessage();
  chatMessages.innerHTML = '';
  selectedOptionId = null;
  suggestedOptionId = null;
  showingSuggestedOnly = true;
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
    addMetric('disruption_detected', `disruptionId=${data.disruptionId} passengers=${data.manifestSummary?.totalPassengers}`);

    // Show notification data
    if (data.notification) {
      showNotification(data.notification, data.passenger);
      addMetric('notification_prepared', `channel=${data.notification.primaryChannel} tier=${data.passenger.tier}`);

      const cancelNotice = `Hi ${data.passenger.firstName} — we see you're a ${data.passenger.tier} customer. Your flight ${data.notification.affectedFlight || data.passenger.flightNumber || ''} was canceled due to ${data.notification.cause || 'operational disruption'}. I’ve prepared your best rebooking options below.`;
      addMessage('assistant', cancelNotice, { source: 'bedrock' });
    } else {
      addMessage('assistant', 'Hi Alice — as a Platinum customer, I’ve prioritized your best rebooking options below.', { source: 'bedrock' });
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
    setQuickRepliesEnabled(true);
    sortFilterRow.classList.add('visible');

    // Staged conversational flow: think, then return options
    if (data.options && data.options.length > 0) {
      await wait(450);
      setTypingIndicator(true, '🤖 Reviewing routes and prioritizing your best rebooking options...');
      await wait(2800);
      setTypingIndicator(false);
      await wait(180);
      addMessage('assistant', 'Thanks for waiting — I found the best rebooking options for you. Please tap one to continue.');
      await wait(260);
      renderOptions(data.options);
      addMetric('options_generated', `count=${data.options.length}`);

      await wait(1100);
      addMessage('assistant', 'Would you like to see more choices, or talk to a human agent?');
    }

    setActiveFlowStep(3);
  } catch (err) {
    setTypingIndicator(false);
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
  setTypingIndicator(true);

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

    await shortThinkingPause(520);

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
  } finally {
    setTypingIndicator(false);
  }
}

async function selectOption(optionId) {
  if (!sessionId) return;

  try {
    await shortThinkingPause(380);
    const data = await apiCall('/select-option', { sessionId, optionId });
    showingSuggestedOnly = false;
    selectedOptionId = optionId;
    applyFiltersAndSort();
    highlightSelectedChatOptionCards();
    addMessage('assistant', `Great choice — Option ${optionId} is selected: ${data.selected.routing}. If you'd like, I can confirm this booking now.`);
    updateQuickRepliesForContext('confirm booking now');
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
    setQuickReplySuggestions([
      { label: 'Booking confirmed', action: 'chat', value: '' },
    ]);
    setQuickRepliesEnabled(false);
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

setQuickReplySuggestions(getDefaultQuickReplySuggestions());
simulatePushNotification();
