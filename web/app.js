// ── Configuration ──────────────────────────────────────────
const API_BASE_URL = 'http://127.0.0.1:3000';

// ── State ─────────────────────────────────────────────────
let sessionId = null;
let selectedOptionId = null;
let currentOptions = [];

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
const statusText = document.getElementById('statusText');

// ── Helpers ───────────────────────────────────────────────

function setStatus(text) {
  statusText.textContent = text;
}

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function apiCall(path, body) {
  setStatus(`Calling ${path}...`);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
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

function renderOptions(options) {
  currentOptions = options || [];
  if (currentOptions.length === 0) {
    optionsList.innerHTML = '<p style="color:#565f89; font-size:13px;">No options available.</p>';
    return;
  }

  optionsList.innerHTML = currentOptions
    .map(
      (o) => `
    <div class="option-card ${selectedOptionId === o.optionId ? 'selected' : ''}"
         id="opt-${o.optionId}"
         onclick="selectOption('${o.optionId}')">
      <div class="opt-header">
        <span class="opt-id">Option ${o.optionId}</span>
        <span class="opt-time">${o.depart} → ${o.arrive}</span>
      </div>
      <div class="opt-route">${o.routing}</div>
      <div class="opt-notes">${o.stops} stop(s) · ${o.notes}</div>
    </div>
  `
    )
    .join('');
}

// ── Actions ───────────────────────────────────────────────

async function createDisruption() {
  btnDisruption.disabled = true;
  addMessage('system', 'Creating disruption event...');

  try {
    const data = await apiCall('/disruption', {
      type: 'CANCELLATION',
      reason: 'Mechanical issue – aircraft grounded',
      airport: 'ORD',
      passenger: {
        firstName: 'Alice',
        tier: 'Gold',
        origin: 'ORD',
        destination: 'SFO',
        flightNumber: 'UA1234',
        date: '2026-02-25',
        constraints: ['arrive_before_21_00'],
      },
    });

    sessionId = data.sessionId;
    addMessage('system', data.message);

    // Enable controls
    chatInput.disabled = false;
    btnSend.disabled = false;
    btnConfirm.disabled = false;
    btnEscalate.disabled = false;

    // Auto-chat to get options
    addMessage('user', 'Show me the best options and tradeoffs.');
    const chatData = await apiCall('/chat', {
      sessionId,
      message: 'Show me the best options and tradeoffs.',
    });

    addMessage('assistant', chatData.assistant);
    renderOptions(chatData.options);
  } catch (err) {
    btnDisruption.disabled = false;
    console.error('createDisruption error:', err);
  }
}

async function sendChat() {
  const message = chatInput.value.trim();
  if (!message || !sessionId) return;

  chatInput.value = '';
  addMessage('user', message);

  try {
    const data = await apiCall('/chat', { sessionId, message });
    addMessage('assistant', data.assistant);
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
    renderOptions(currentOptions);
    addMessage('system', `Selected Option ${optionId}: ${data.selected.routing}`);
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
    bookingDetails.textContent = `Status: ${b.status} | Booked: ${b.bookedAt} | Flight: ${b.selected.routing}`;

    addMessage('system', `✅ Booking confirmed! PNR: ${b.pnr}`);

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
    console.log('Escalation packet:', data.packet);

    btnEscalate.disabled = true;
  } catch (err) {
    console.error('escalate error:', err);
  }
}

// ── Event listeners ───────────────────────────────────────

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});
