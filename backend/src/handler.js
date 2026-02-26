const { generateId, generatePNR, respond, parseBody, logMetric } = require('./util');
const store = require('./store');
const { maybeBedrockChat, queryKnowledgeBase, isPolicyQuestion } = require('./bedrock');
const { generateManifest, getDemoFocusPassengers } = require('./passengers');
const { analyzeSentiment, detectPII, evaluateEscalationTrigger } = require('./comprehend');
const { translateText, translateNotification } = require('./translate');

// ──────────────────────────────────────────────
// Option generation (PRD-aligned)
// ──────────────────────────────────────────────

function generateCandidateOptions(passenger, disruption) {
  const isPremium = passenger.tier === 'Platinum' || passenger.tier === 'Gold';
  const startT = Date.now();

  const base = [
    {
      optionId: 'A',
      rank: 1,
      depart: '14:30',
      arrive: '17:45',
      flights: [`UA2041 ${passenger.origin}→${passenger.destination}`],
      routing: `${passenger.origin}→${passenger.destination} (direct)`,
      stops: 0,
      class: isPremium ? 'Business' : 'Economy',
      costDelta: isPremium ? 0 : 0,
      rationale: 'Earliest direct flight with confirmed availability',
      compatibility: 0.95,
      notes: 'Next available direct flight',
      confidence: 0.95,
      premiumPerks: isPremium ? ['Lounge access at origin', 'Priority boarding'] : [],
    },
    {
      optionId: 'B',
      rank: 2,
      depart: '15:15',
      arrive: '20:30',
      flights: [`UA3122 ${passenger.origin}→DEN`, `UA4587 DEN→${passenger.destination}`],
      routing: `${passenger.origin}→DEN→${passenger.destination}`,
      stops: 1,
      class: isPremium ? 'Premium Economy' : 'Economy',
      costDelta: isPremium ? 0 : -25,
      rationale: 'Good connection, extra legroom on second segment',
      compatibility: 0.85,
      notes: 'One stop via Denver, extra legroom available',
      confidence: 0.85,
      premiumPerks: isPremium ? ['Lounge access at DEN'] : [],
    },
    {
      optionId: 'C',
      rank: 3,
      depart: '16:00',
      arrive: '22:15',
      flights: [`UA2899 ${passenger.origin}→DFW`, `UA5004 DFW→${passenger.destination}`],
      routing: `${passenger.origin}→DFW→${passenger.destination}`,
      stops: 1,
      class: 'Economy',
      costDelta: -40,
      rationale: 'Later departure, meal service included',
      compatibility: 0.75,
      notes: 'One stop via Dallas, meal service',
      confidence: 0.75,
      premiumPerks: isPremium ? ['Meal upgrade to premium menu'] : [],
    },
    {
      optionId: 'D',
      rank: 4,
      depart: '17:30',
      arrive: '20:00',
      flights: [`UA1877 ${passenger.origin}→${passenger.destination}`],
      routing: `${passenger.origin}→${passenger.destination} (direct)`,
      stops: 0,
      class: isPremium ? 'First' : 'Economy',
      costDelta: isPremium ? 0 : 120,
      rationale: 'Evening direct, premium cabin available',
      compatibility: 0.90,
      notes: 'Evening direct, first class upgrade possible',
      confidence: 0.90,
      premiumPerks: isPremium ? ['Complimentary first-class upgrade', 'Lounge access'] : [],
    },
  ];

  // Platinum/Gold get extra options
  if (isPremium) {
    base.push({
      optionId: 'E',
      rank: 5,
      depart: '09:00',
      arrive: '12:15',
      flights: [`UA1200 ${passenger.origin}→${passenger.destination}`],
      routing: `${passenger.origin}→${passenger.destination} (direct, next day)`,
      stops: 0,
      class: 'Business',
      costDelta: 0,
      rationale: 'Next morning direct with hotel voucher – best for rest',
      compatibility: 0.70,
      notes: 'Next morning direct, hotel voucher + lounge included',
      confidence: 0.70,
      premiumPerks: ['Hotel voucher (4-star)', 'Lounge access', '$50 meal credit', 'Late checkout'],
    });
    base.push({
      optionId: 'F',
      rank: 6,
      depart: '15:00',
      arrive: '21:30',
      flights: ['ICE Rail 9042 FRA→MUC (mock)'],
      routing: `${passenger.origin}→${passenger.destination} (rail alternative, mock)`,
      stops: 0,
      class: 'First',
      costDelta: 0,
      rationale: 'Rail alternative – premium cabin, city-center arrival (mock)',
      compatibility: 0.60,
      notes: 'Rail alternative (mock) – demonstrates multi-modal option per PRD',
      confidence: 0.60,
      premiumPerks: ['First-class rail cabin', 'City-center arrival'],
    });
  }

  // Constraint: tight connections (<45m disallowed per PRD)
  const filtered = base.filter((o) => {
    if (o.stops > 0 && passenger.connectionRisk && passenger.connectionRisk.connectionTime < 45) {
      return false; // Skip options with tight connections
    }
    return true;
  });

  // Preference filtering: arrive_before_21_00
  const constraints = passenger.constraints || [];
  if (constraints.includes('arrive_before_21_00')) {
    const timeFiltered = filtered.filter((o) => {
      const [h] = o.arrive.split(':').map(Number);
      return h < 21;
    });
    if (timeFiltered.length > 0) {
      logMetric('OPTIONS_FILTERED', timeFiltered.length, { constraint: 'arrive_before_21_00' });
      const elapsed = Date.now() - startT;
      logMetric('options_generated_ms', elapsed, { passengerId: passenger.passengerId || 'demo', count: timeFiltered.length });
      return timeFiltered;
    }
  }

  const elapsed = Date.now() - startT;
  logMetric('options_generated_ms', elapsed, { passengerId: passenger.passengerId || 'demo', count: filtered.length });
  return filtered;
}

// ──────────────────────────────────────────────
// Notification generation (PRD: proactive notification)
// ──────────────────────────────────────────────

function generateNotificationCopy(passenger, disruption, optionCount) {
  const name = passenger.firstName || passenger.name || 'Valued Passenger';
  const tier = passenger.tier || 'General';
  const flight = passenger.flightNumber || 'your flight';
  const reason = disruption.reason || disruption.type || 'operational issue';

  let greeting = tier === 'Platinum'
    ? `Dear ${name} (Platinum member),`
    : tier === 'Gold'
      ? `Dear ${name} (Gold member),`
      : `Dear ${name},`;

  let body = `We regret to inform you that ${flight} has been affected by: ${reason}. `;
  body += `We have identified ${optionCount} rebooking option${optionCount !== 1 ? 's' : ''} for you. `;

  if (tier === 'Platinum' || tier === 'Gold') {
    body += 'As a valued premium member, we have prioritized your rebooking with upgraded options including lounge access and premium cabin availability. ';
  }

  body += 'Please open the app to review your options, or reply AGENT to speak with a representative.';

  const channels = [];
  if (passenger.hasApp && passenger.consentForProactive) {
    channels.push('push');
  }
  channels.push('sms', 'email'); // fallback always available

  return {
    greeting,
    body: `${greeting}\n\n${body}`,
    channels,
    primaryChannel: channels[0],
    tierBadge: tier,
    affectedFlight: flight,
    cause: reason,
    ctaOptions: ['View Options', 'Speak to Agent'],
    language: passenger.preferredLanguage || 'en',
  };
}

// ──────────────────────────────────────────────
// Route handlers
// ──────────────────────────────────────────────

async function handleHealth() {
  logMetric('HEALTH_CHECK');
  return respond(200, { ok: true, time: new Date().toISOString() });
}

async function handleDisruption(body) {
  const { type, reason, airport, passenger, passengerCount } = body;
  if (!type || !passenger) {
    return respond(400, { error: 'Missing required fields: type, passenger' });
  }

  const disruptionId = generateId('DIS');
  const sessionId = generateId('SES');

  const disruption = { type, reason, airport, createdAt: new Date().toISOString() };
  logMetric('disruption_detected', 1, { disruptionId, type, airport });

  // Store disruption meta
  await store.upsertJson(`DISRUPTION#${disruptionId}`, 'META', disruption);

  // Generate synthetic passenger manifest (PRD: passenger impact assessment)
  const manifestCount = passengerCount || 200;
  const manifest = generateManifest({
    origin: passenger.origin || airport || 'FRA',
    destination: passenger.destination || 'JFK',
    flightNumber: passenger.flightNumber || 'UA1234',
    date: passenger.date || new Date().toISOString().slice(0, 10),
    count: manifestCount,
  });

  // Store manifest summary (don't store all 200 individually for POC)
  const tierBreakdown = {
    Platinum: manifest.filter((p) => p.tier === 'Platinum').length,
    Gold: manifest.filter((p) => p.tier === 'Gold').length,
    Silver: manifest.filter((p) => p.tier === 'Silver').length,
    General: manifest.filter((p) => p.tier === 'General').length,
  };
  const connectionAtRisk = manifest.filter((p) => p.connectionRisk).length;
  const proactiveEligible = manifest.filter((p) => p.consentForProactive).length;

  await store.upsertJson(`DISRUPTION#${disruptionId}`, 'MANIFEST_SUMMARY', {
    totalPassengers: manifest.length,
    tierBreakdown,
    connectionAtRisk,
    proactiveEligible,
    focusPassengers: getDemoFocusPassengers(manifest),
  });

  logMetric('passengers_assessed', manifest.length, { disruptionId, tierBreakdown: JSON.stringify(tierBreakdown) });

  // Ensure request passenger has tier for demo (default to Platinum for demo impact)
  const enrichedPassenger = {
    ...passenger,
    tier: passenger.tier || 'Platinum',
    hasApp: passenger.hasApp !== undefined ? passenger.hasApp : true,
    consentForProactive: passenger.consentForProactive !== undefined ? passenger.consentForProactive : true,
    passengerId: passenger.passengerId || 'PAX-DEMO',
  };

  // Store session meta
  await store.upsertJson(`SESSION#${sessionId}`, 'META', {
    sessionId,
    disruptionId,
    passenger: enrichedPassenger,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  // Generate and store options (PRD: option generation with tiering)
  const options = generateCandidateOptions(enrichedPassenger, disruption);
  await store.upsertJson(`SESSION#${sessionId}`, 'OPTIONS', { options });

  // Generate proactive notification (PRD: proactive notification)
  let notification = generateNotificationCopy(enrichedPassenger, disruption, options.length);

  // Translate notification if passenger has a preferred language
  const passengerLang = enrichedPassenger.preferredLanguage || 'en';
  if (passengerLang !== 'en') {
    notification = await translateNotification(notification, passengerLang);
    logMetric('NOTIFICATION_TRANSLATED', 1, { sessionId, language: passengerLang });
  }

  const notificationRecord = {
    ...notification,
    notificationSentAt: new Date().toISOString(),
    status: 'SIMULATED_SENT',
  };
  await store.upsertJson(`SESSION#${sessionId}`, 'NOTIFICATION', notificationRecord);

  logMetric('notification_prepared', 1, { sessionId, channel: notification.primaryChannel, tier: enrichedPassenger.tier });
  logMetric('DISRUPTION_CREATED', 1, { disruptionId, sessionId, type });

  return respond(200, {
    disruptionId,
    sessionId,
    passenger: enrichedPassenger,
    notification: notificationRecord,
    manifestSummary: {
      totalPassengers: manifest.length,
      tierBreakdown,
      connectionAtRisk,
      proactiveEligible,
    },
    options,
    message: `Disruption ${disruptionId} created. ${manifest.length} passengers assessed. Session ${sessionId} initialized with ${options.length} rebooking options. Proactive notification prepared via ${notification.primaryChannel}.`,
  });
}

async function handleChat(body) {
  const { sessionId, message } = body;
  if (!sessionId || !message) {
    return respond(400, { error: 'Missing required fields: sessionId, message' });
  }

  // Load session
  const sessionMeta = await store.getJson(`SESSION#${sessionId}`, 'META');
  if (!sessionMeta) {
    return respond(404, { error: 'Session not found' });
  }

  // Load options
  const optionsDoc = await store.getJson(`SESSION#${sessionId}`, 'OPTIONS');
  const options = optionsDoc?.options || [];

  // Load recent turns
  const turns = await store.queryByPk(`SESSION#${sessionId}`, 'TURN#');
  const history = turns.map((t) => ({ role: t.role, content: t.content }));

  // ── Sentiment Analysis (Comprehend) ──
  const sentiment = await analyzeSentiment(message);

  // ── PII Detection (Comprehend) ──
  const piiEntities = await detectPII(message);
  if (piiEntities.length > 0) {
    logMetric('CHAT_PII_DETECTED', piiEntities.length, { sessionId, types: piiEntities.map((e) => e.type).join(',') });
  }

  // Store the user turn (with sentiment metadata)
  const epoch = Date.now();
  const turnCount = turns.length;
  await store.upsertJson(`SESSION#${sessionId}`, `TURN#${epoch}#${turnCount}`, {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    sentiment: sentiment.sentiment,
    sentimentScores: sentiment.scores,
  });

  // ── Check for auto-escalation based on sentiment history ──
  const userTurnSentiments = turns
    .filter((t) => t.role === 'user' && t.sentiment)
    .map((t) => ({ sentiment: t.sentiment, scores: t.sentimentScores || { negative: 0 } }));
  userTurnSentiments.push({ sentiment: sentiment.sentiment, scores: sentiment.scores });

  const escalationCheck = evaluateEscalationTrigger(userTurnSentiments);
  if (escalationCheck.shouldEscalate) {
    logMetric('SENTIMENT_AUTO_ESCALATE', 1, { sessionId, consecutiveNegative: escalationCheck.consecutiveNegative });
  }

  // ── Route to Knowledge Base or Chat ──
  let assistantResponse;
  if (isPolicyQuestion(message)) {
    // Policy/rights question → Knowledge Base (RAG)
    const kbResult = await queryKnowledgeBase(message, {
      tier: sessionMeta.passenger.tier,
      disruptionType: sessionMeta.disruptionId,
    });
    assistantResponse = { text: kbResult.text, source: kbResult.source, citations: kbResult.citations };
    logMetric('CHAT_KB_ROUTED', 1, { sessionId });
  } else {
    // General chat → Bedrock InvokeModel / fallback
    const chatResult = await maybeBedrockChat({
      passenger: sessionMeta.passenger,
      disruptionId: sessionMeta.disruptionId,
      message,
      options,
      history,
    });
    assistantResponse = { text: chatResult.text, source: chatResult.source, citations: [] };
  }

  // Store the assistant turn
  await store.upsertJson(`SESSION#${sessionId}`, `TURN#${Date.now()}#${turnCount + 1}`, {
    role: 'assistant',
    content: assistantResponse.text,
    timestamp: new Date().toISOString(),
    source: assistantResponse.source,
  });

  logMetric('CHAT_TURN', 1, { sessionId, source: assistantResponse.source, sentiment: sentiment.sentiment });

  return respond(200, {
    sessionId,
    assistant: assistantResponse.text,
    options: options.slice(0, 4),
    sentiment: {
      current: sentiment.sentiment,
      scores: sentiment.scores,
    },
    source: assistantResponse.source,
    citations: assistantResponse.citations || [],
    autoEscalation: escalationCheck.shouldEscalate ? {
      triggered: true,
      reason: escalationCheck.reason,
      consecutiveNegative: escalationCheck.consecutiveNegative,
    } : null,
    piiDetected: piiEntities.length > 0,
  });
}

async function handleSelectOption(body) {
  const { sessionId, optionId } = body;
  if (!sessionId || !optionId) {
    return respond(400, { error: 'Missing required fields: sessionId, optionId' });
  }

  // Load options
  const optionsDoc = await store.getJson(`SESSION#${sessionId}`, 'OPTIONS');
  if (!optionsDoc) {
    return respond(404, { error: 'Session options not found' });
  }

  const selected = (optionsDoc.options || []).find((o) => o.optionId === optionId);
  if (!selected) {
    return respond(400, { error: `Option ${optionId} not found in session options` });
  }

  // Store selection
  await store.upsertJson(`SESSION#${sessionId}`, 'SELECTION', {
    optionId,
    selected,
    selectedAt: new Date().toISOString(),
  });

  logMetric('option_selected', 1, { sessionId, optionId });

  return respond(200, { sessionId, selected });
}

async function handleConfirm(body) {
  const { sessionId } = body;
  if (!sessionId) {
    return respond(400, { error: 'Missing required field: sessionId' });
  }

  const startT = Date.now();

  // Load session meta for passenger info
  const sessionMeta = await store.getJson(`SESSION#${sessionId}`, 'META');

  // Load selection
  const selectionDoc = await store.getJson(`SESSION#${sessionId}`, 'SELECTION');
  if (!selectionDoc) {
    return respond(400, { error: 'No option selected yet. Please select an option first.' });
  }

  const pnr = generatePNR();
  const selected = selectionDoc.selected;
  const booking = {
    pnr,
    status: 'CONFIRMED (MOCK)',
    bookedAt: new Date().toISOString(),
    selected,
    itinerarySummary: {
      flights: selected.flights || [selected.routing],
      class: selected.class || 'Economy',
      departure: selected.depart,
      arrival: selected.arrive,
      passenger: sessionMeta ? `${sessionMeta.passenger.firstName} ${sessionMeta.passenger.lastName || ''}`.trim() : 'Demo Passenger',
      tier: sessionMeta ? sessionMeta.passenger.tier : 'General',
    },
    offlineFriendly: true,
    offlineNote: 'This confirmation is available offline. Show this screen at the gate if needed.',
  };

  // Store booking
  await store.upsertJson(`SESSION#${sessionId}`, 'BOOKING', booking);

  const elapsed = Date.now() - startT;
  logMetric('booking_confirmed_ms', elapsed, { sessionId, pnr });

  return respond(200, { sessionId, booking });
}

async function handleEscalate(body) {
  const { sessionId, reason } = body;
  if (!sessionId) {
    return respond(400, { error: 'Missing required field: sessionId' });
  }

  // Load session meta
  const sessionMeta = await store.getJson(`SESSION#${sessionId}`, 'META');
  if (!sessionMeta) {
    return respond(404, { error: 'Session not found' });
  }

  // Load all related data
  const optionsDoc = await store.getJson(`SESSION#${sessionId}`, 'OPTIONS');
  const selectionDoc = await store.getJson(`SESSION#${sessionId}`, 'SELECTION');
  const bookingDoc = await store.getJson(`SESSION#${sessionId}`, 'BOOKING');
  const notificationDoc = await store.getJson(`SESSION#${sessionId}`, 'NOTIFICATION');
  const turns = await store.queryByPk(`SESSION#${sessionId}`, 'TURN#');

  // Load disruption details
  const disruptionMeta = await store.getJson(`DISRUPTION#${sessionMeta.disruptionId}`, 'META');

  // Build enhanced escalation packet per PRD
  const passenger = sessionMeta.passenger;
  const packet = {
    // Passenger summary
    passengerSummary: {
      name: `${passenger.firstName} ${passenger.lastName || ''}`.trim(),
      tier: passenger.tier,
      passengerId: passenger.passengerId || 'PAX-DEMO',
      origin: passenger.origin,
      destination: passenger.destination,
      flightNumber: passenger.flightNumber,
      specialRequirements: passenger.specialRequirements || null,
      connectionRisk: passenger.connectionRisk || null,
    },
    // Disruption summary
    disruptionSummary: {
      disruptionId: sessionMeta.disruptionId,
      type: disruptionMeta?.type || 'UNKNOWN',
      reason: disruptionMeta?.reason || 'Not specified',
      airport: disruptionMeta?.airport || null,
      createdAt: disruptionMeta?.createdAt || null,
    },
    // Options presented
    optionsPresented: (optionsDoc?.options || []).map((o) => ({
      optionId: o.optionId,
      routing: o.routing,
      depart: o.depart,
      arrive: o.arrive,
      class: o.class || 'Economy',
      rationale: o.rationale,
    })),
    // Selections/declines
    selectionHistory: {
      selectedOption: selectionDoc?.selected || null,
      selectedAt: selectionDoc?.selectedAt || null,
      declined: selectionDoc ? false : true,
    },
    // Chat transcript
    transcript: turns.map((t) => ({ role: t.role, content: t.content, timestamp: t.timestamp })),
    // Booking (if any)
    booking: bookingDoc || null,
    // AI recommendation (rule-based)
    aiRecommendation: generateEscalationRecommendation(passenger, optionsDoc?.options, selectionDoc, reason),
    // Policy notes (EU261/GDPR doc-only placeholders per PRD)
    policyNotes: {
      eu261: passenger.tier === 'Platinum'
        ? 'EU261: Passenger may be entitled to compensation (€250-€600) depending on distance and delay. Priority handling recommended for premium tier.'
        : 'EU261: Passenger may be entitled to compensation (€250-€600) depending on distance and delay. Standard process applies.',
      gdpr: 'GDPR: Ensure PII is handled per retention policy. Passenger data should not be shared with third parties without consent. Audit trail maintained.',
      consentStatus: passenger.consentForProactive ? 'Proactive notification consent: YES' : 'Proactive notification consent: NOT GIVEN',
    },
    // Notification history
    notificationHistory: notificationDoc ? {
      sentAt: notificationDoc.notificationSentAt,
      channel: notificationDoc.primaryChannel,
      status: notificationDoc.status,
    } : null,
    // Sentiment analysis summary
    sentimentSummary: (() => {
      const userTurns = turns.filter((t) => t.role === 'user' && t.sentiment);
      if (userTurns.length === 0) return { available: false };
      const negCount = userTurns.filter((t) => t.sentiment === 'NEGATIVE').length;
      const posCount = userTurns.filter((t) => t.sentiment === 'POSITIVE').length;
      return {
        available: true,
        totalUserMessages: userTurns.length,
        positiveCount: posCount,
        negativeCount: negCount,
        trend: negCount > posCount ? 'DECLINING' : posCount > negCount ? 'POSITIVE' : 'NEUTRAL',
        lastSentiment: userTurns[userTurns.length - 1]?.sentiment || 'UNKNOWN',
      };
    })(),
    // Escalation metadata
    escalationReason: reason || 'Customer requested agent assistance',
    escalatedAt: new Date().toISOString(),
    priority: passenger.tier === 'Platinum' ? 'HIGH' : passenger.tier === 'Gold' ? 'MEDIUM' : 'NORMAL',
  };

  // Store escalation
  await store.upsertJson(`SESSION#${sessionId}`, 'ESCALATION', packet);

  logMetric('escalated', 1, { sessionId, disruptionId: sessionMeta.disruptionId, tier: passenger.tier, priority: packet.priority });

  return respond(200, { sessionId, escalated: true, packet });
}

/**
 * Handle dashboard metrics request
 */
async function handleDashboard(event) {
  try {
    // Get time filter from query params (default to 7 days)
    const timeRange = event?.queryStringParameters?.timeRange || '7d';
    const now = Date.now();
    let cutoffTime;
    
    switch(timeRange) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
    }

    // Scan for all escalations (queries all sessions)
    const allSessions = await store.scanByPkPrefix('SESSION#');
    
    let escalationCount = 0;
    let escalationsByTier = { Platinum: 0, Gold: 0, Silver: 0, General: 0 };
    let escalationsByReason = {};
    
    for (const session of allSessions) {
      if (session.sk === 'ESCALATION') {
        // Filter by time
        const escalatedAt = new Date(session.escalatedAt).getTime();
        if (escalatedAt < cutoffTime) continue;
        
        escalationCount++;
        const tier = session.priority === 'HIGH' ? 'Platinum' : session.priority === 'MEDIUM' ? 'Gold' : 'General';
        if (tier in escalationsByTier) {
          escalationsByTier[tier]++;
        }
        const reason = session.escalationReason || 'Unknown';
        escalationsByReason[reason] = (escalationsByReason[reason] || 0) + 1;
      }
    }

    // Count successful rebookings (confirmed bookings)
    let bookingCount = 0;
    let failedBookingCount = 0;
    let bookingsByTier = { Platinum: 0, Gold: 0, Silver: 0, General: 0 };
    let failedBookingsByTier = { Platinum: 0, Gold: 0, Silver: 0, General: 0 };
    let bookingsByChannel = { chat: 0, voice: 0, web: 0 };

    for (const session of allSessions) {
      if (session.sk === 'BOOKING') {
        // Filter by time
        const bookedAt = new Date(session.bookedAt).getTime();
        if (bookedAt < cutoffTime) continue;
        
        const tier = session.itinerarySummary?.tier || 'General';
        const status = session.status || 'CONFIRMED';
        
        if (status === 'CONFIRMED') {
          bookingCount++;
          if (tier in bookingsByTier) {
            bookingsByTier[tier]++;
          }
          // Simulate channel - in real system, this would be tracked separately
          bookingsByChannel.chat++;
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          failedBookingCount++;
          if (tier in failedBookingsByTier) {
            failedBookingsByTier[tier]++;
          }
        }
      }
    }

    // Get disruption statistics
    const allDisruptions = await store.scanByPkPrefix('DISRUPTION#');
    let disruptionStats = { total: 0, byType: {} };
    
    for (const disruption of allDisruptions) {
      if (disruption.sk === 'META') {
        // Filter by time
        const createdAt = new Date(disruption.createdAt).getTime();
        if (createdAt < cutoffTime) continue;
        
        disruptionStats.total++;
        const type = disruption.type || 'Unknown';
        disruptionStats.byType[type] = (disruptionStats.byType[type] || 0) + 1;
      }
    }

    const dashboardData = {
      timestamp: new Date().toISOString(),
      escalations: {
        total: escalationCount,
        byTier: escalationsByTier,
        byReason: escalationsByReason,
        avgResponseTime: 45, // Mock value
      },
      rebookings: {
        total: bookingCount,
        byTier: bookingsByTier,
        byChannel: bookingsByChannel,
        successRate: bookingCount > 0 ? ((bookingCount / Math.max(escalationCount + bookingCount, 1)) * 100).toFixed(2) : '0.00',
      },
      failedRebookings: {
        total: failedBookingCount,
        byTier: failedBookingsByTier,
        failureRate: (bookingCount + failedBookingCount) > 0 ? ((failedBookingCount / (bookingCount + failedBookingCount)) * 100).toFixed(2) : '0.00',
      },
      disruptions: disruptionStats,
      summary: {
        totalSessions: allSessions.filter(s => s.sk === 'META').length,
        agentRequestsPercentage: escalationCount > 0 ? ((escalationCount / Math.max(allSessions.filter(s => s.sk === 'META').length, 1)) * 100).toFixed(2) : '0.00',
      },
    };

    logMetric('DASHBOARD_VIEW', 1, { escalations: escalationCount, bookings: bookingCount });

    return respond(200, dashboardData);
  } catch (err) {
    console.error('Dashboard error:', err);
    return respond(500, { error: 'Failed to generate dashboard', detail: err.message });
  }
}

/**
 * Generate a rule-based AI recommendation for escalation agents.
 */
function generateEscalationRecommendation(passenger, options, selection, reason) {
  const lines = [];

  if (passenger.tier === 'Platinum') {
    lines.push('PRIORITY: High-value Platinum member. Ensure premium resolution.');
  }

  if (!selection) {
    lines.push('Passenger has NOT selected any option. Re-present options with additional flexibility.');
    if (options && options.length > 0) {
      lines.push(`${options.length} options were shown but none accepted.`);
    }
  } else {
    lines.push(`Passenger selected option ${selection.selected?.optionId || 'unknown'}.`);
  }

  if (passenger.connectionRisk) {
    lines.push(`CONNECTION AT RISK: Connecting flight ${passenger.connectionRisk.connectingFlight} with ${passenger.connectionRisk.connectionTime}min connection.`);
  }

  if (passenger.specialRequirements) {
    lines.push(`SPECIAL REQUIREMENTS: ${passenger.specialRequirements}`);
  }

  if (reason && reason.toLowerCase().includes('no viable')) {
    lines.push('ESCALATION REASON: No viable automated options. Consider manual inventory search or partner airline coordination.');
  }

  lines.push('Recommended: Offer goodwill gesture (miles/voucher) per tier policy.');

  return lines.join(' ');
}

async function handleGetDisruptions() {
  // Find all disruption meta items
  const disruptions = await store.scanByPkPrefix('DISRUPTION#');

  // For each disruption, find related sessions
  const sessions = await store.scanByPkPrefix('SESSION#');
  const sessionMetas = sessions.filter((s) => s.sk === 'META');

  const results = disruptions.map((d) => {
    const disruptionId = d.pk.replace('DISRUPTION#', '');
    const related = sessionMetas.filter((s) => s.disruptionId === disruptionId);
    return {
      disruptionId,
      ...d,
      sessions: related.map((s) => ({
        sessionId: s.sessionId,
        status: s.status,
        passenger: s.passenger,
      })),
    };
  });

  logMetric('GET_DISRUPTIONS', results.length);
  return respond(200, { disruptions: results });
}

// ──────────────────────────────────────────────
// GET /notification?sessionId=... — retrieve notification for a session
// ──────────────────────────────────────────────

async function handleGetNotification(event) {
  const sessionId = (event.queryStringParameters || {}).sessionId;
  if (!sessionId) {
    return respond(400, { error: 'Missing query parameter: sessionId' });
  }

  const notification = await store.getJson(`SESSION#${sessionId}`, 'NOTIFICATION');
  if (!notification) {
    return respond(404, { error: 'No notification found for this session' });
  }

  return respond(200, { sessionId, notification });
}

// ──────────────────────────────────────────────
// Lambda entry point
// ──────────────────────────────────────────────

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path;

  console.log(`METRIC: REQUEST | method=${method} | path=${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return respond(200, {});
  }

  try {
    if (method === 'GET' && path === '/health') {
      return await handleHealth();
    }
    if (method === 'GET' && path === '/disruption') {
      return await handleGetDisruptions();
    }
    if (method === 'GET' && path === '/notification') {
      return await handleGetNotification(event);
    }
    if (method === 'GET' && path === '/dashboard') {
      return await handleDashboard(event);
    }

    const body = parseBody(event);

    if (method === 'POST' && path === '/disruption') {
      return await handleDisruption(body);
    }
    if (method === 'POST' && path === '/chat') {
      return await handleChat(body);
    }
    if (method === 'POST' && path === '/select-option') {
      return await handleSelectOption(body);
    }
    if (method === 'POST' && path === '/confirm') {
      return await handleConfirm(body);
    }
    if (method === 'POST' && path === '/escalate') {
      return await handleEscalate(body);
    }

    return respond(404, { error: `Not found: ${method} ${path}` });
  } catch (err) {
    console.error('METRIC: UNHANDLED_ERROR | value=1 |', err);
    return respond(500, { error: 'Internal server error', detail: err.message });
  }
};
