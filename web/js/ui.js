// ── UI Helpers ────────────────────────────────────────────

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
      badge.textContent = '🤖 AI Assistant';
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


// ── Trip Card Management ──────────────────────────────────

function updateTripCard(passenger, disruptionType) {
  const tripCard = document.getElementById('currentTripCard');
  const statusBadge = document.getElementById('tripStatusBadge');
  const viewRebookingBtn = document.getElementById('btnViewRebookingOptions');
  
  // Update trip details
  document.getElementById('tripFlightNumber').textContent = passenger.flightNumber || 'UA891';
  document.getElementById('tripOriginCode').textContent = passenger.origin || 'FRA';
  document.getElementById('tripDestCode').textContent = passenger.destination || 'JFK';
  document.getElementById('tripDate').textContent = passenger.date || 'Feb 25, 2026';
  
  // Update status based on disruption
  if (disruptionType === 'CANCELLATION') {
    statusBadge.textContent = 'Cancelled';
    statusBadge.className = 'trip-status-badge cancelled';
    viewRebookingBtn.classList.remove('hidden');
  } else if (disruptionType === 'DELAY') {
    statusBadge.textContent = 'Delayed';
    statusBadge.className = 'trip-status-badge cancelled';
    viewRebookingBtn.classList.remove('hidden');
  } else {
    statusBadge.textContent = 'Scheduled';
    statusBadge.className = 'trip-status-badge';
    viewRebookingBtn.classList.add('hidden');
  }
}

function showRebookingOptions() {
  document.getElementById('currentTripContainer').style.display = 'none';
  document.getElementById('rebookingSection').classList.remove('hidden');
  
  // Re-render options to ensure they're visible
  if (allOptions && allOptions.length > 0) {
    applyFiltersAndSort();
  }
}

function hideRebookingOptions() {
  document.getElementById('currentTripContainer').style.display = 'block';
  document.getElementById('rebookingSection').classList.add('hidden');
}


function updateTripCardWithConfirmedBooking(booking) {
  const statusBadge = document.getElementById('tripStatusBadge');
  const viewRebookingBtn = document.getElementById('btnViewRebookingOptions');
  
  // Update trip details with new booking
  document.getElementById('tripFlightNumber').textContent = booking.flightNumber || 'UA891';
  document.getElementById('tripOriginCode').textContent = booking.origin || 'FRA';
  document.getElementById('tripDestCode').textContent = booking.destination || 'JFK';
  document.getElementById('tripDate').textContent = booking.date || 'Feb 25, 2026';
  
  // Update status to Confirmed
  statusBadge.textContent = 'Confirmed';
  statusBadge.className = 'trip-status-badge confirmed';
  
  // Hide rebooking button
  viewRebookingBtn.classList.add('hidden');
  
  // Make sure we're showing the trip card, not rebooking section
  hideRebookingOptions();
}

function updateNotificationToResolved() {
  // Update the alert banner on detail screen
  const alertBanner = document.getElementById('alertBanner');
  const alertType = document.getElementById('alertType');
  const alertCause = document.getElementById('alertCause');
  
  alertType.textContent = 'RESOLVED';
  alertCause.textContent = 'Your new flight has been confirmed';
  alertBanner.style.borderLeftColor = 'var(--success)';
  alertBanner.style.background = '#ecfdf5';
  
  // Update flight status pill
  const statusPill = document.getElementById('flightStatus');
  statusPill.textContent = 'CONFIRMED';
  statusPill.className = 'status-pill confirmed';
  
  // Update notification body
  const notifBody = document.getElementById('notifBodyCard');
  if (storedConfirmedBooking) {
    notifBody.textContent = `Your rebooking has been confirmed. Your new flight ${storedConfirmedBooking.flightNumber} departs at ${storedConfirmedBooking.departure}. Confirmation code: ${storedConfirmedBooking.pnr}`;
  } else {
    notifBody.textContent = 'Your rebooking has been confirmed. Check your email for details.';
  }
  
  // Update lock screen notification
  document.getElementById('lockNotifTitle').textContent = 'Rebooking Confirmed';
  document.getElementById('lockNotifBody').textContent = 'Your new flight has been confirmed. Tap for details.';
}
