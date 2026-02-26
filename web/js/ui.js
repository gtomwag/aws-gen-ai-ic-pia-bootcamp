// ── UI Helpers ────────────────────────────────────────────

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
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
      badge.innerHTML = '<i data-lucide="book-open" aria-hidden="true"></i><span>Knowledge Base</span>';
    } else if (src === 'bedrock') {
      badge.className = 'msg-source-badge source-bedrock';
      badge.innerHTML = '<i data-lucide="sparkles" aria-hidden="true"></i><span>AI Assistant</span>';
    } else {
      badge.className = 'msg-source-badge source-fallback';
      badge.innerHTML = '<i data-lucide="message-circle" aria-hidden="true"></i><span>Quick Reply</span>';
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
      `<div class="citation-toggle" onclick="document.getElementById('${toggleId}').classList.toggle('expanded')"><i data-lucide="paperclip" aria-hidden="true"></i><span>Sources ›</span></div>` +
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
    pii.textContent = 'Sensitive data detected';
    div.appendChild(pii);
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  refreshIcons();
}

function addMetric(name, detail) {
  const ts = new Date().toISOString().slice(11, 19);
  metricsEntries.push({ ts, name, detail });
  metricsLog.innerHTML = metricsEntries.map((m) =>
    `<div class="metric-line"><span class="metric-name">${m.name}</span> <span class="metric-val">${m.detail || ''}</span> <span class="metric-ts">[${m.ts}]</span></div>`
  ).join('');
  metricsLog.scrollTop = metricsLog.scrollHeight;
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

  // Home landing summary
  if (homePassengerName) homePassengerName.textContent = name;
  if (homePassengerTier) homePassengerTier.textContent = `DuHast Signature ${passenger.tier || 'General'}`;
  if (homeTripFlight) homeTripFlight.textContent = passenger.flightNumber || notification.affectedFlight || 'UA891';
  if (homeTripStatus) {
    const status = (storedDisruptionType || 'CANCELLATION').toUpperCase();
    homeTripStatus.textContent = status;
    homeTripStatus.classList.toggle('cancelled', status === 'CANCELLATION' || status === 'CANCELLED');
  }
  if (homeTripTime) homeTripTime.textContent = 'Departs Fri, 6:00 AM';
  if (homeTripRoute) homeTripRoute.textContent = `${passenger.origin || 'FRA'} → ${passenger.destination || 'JFK'}`;
  if (homeTripDeparts) homeTripDeparts.textContent = '6:00 AM';
  if (homeTripGate) homeTripGate.textContent = '--';
  if (homeTripTerminal) homeTripTerminal.textContent = '--';
  if (homeTripSeat) homeTripSeat.textContent = '3A';
  if (homeTripCause) homeTripCause.textContent = storedDisruptionCause || notification.cause || 'Operational disruption';
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

refreshIcons();
