const { generateId, generatePNR, respond, parseBody, logMetric } = require('./util');
const store = require('./store');
const { maybeBedrockChat } = require('./bedrock');

// ──────────────────────────────────────────────
// Option generation
// ──────────────────────────────────────────────

function generateCandidateOptions(passenger, disruption) {
  const base = [
    {
      optionId: 'A',
      depart: '14:30',
      arrive: '17:45',
      routing: `${passenger.origin}→${passenger.destination} (direct)`,
      stops: 0,
      notes: 'Next available direct flight',
      confidence: 0.95,
    },
    {
      optionId: 'B',
      depart: '15:15',
      arrive: '20:30',
      routing: `${passenger.origin}→DEN→${passenger.destination}`,
      stops: 1,
      notes: 'One stop via Denver, extra legroom available',
      confidence: 0.85,
    },
    {
      optionId: 'C',
      depart: '16:00',
      arrive: '22:15',
      routing: `${passenger.origin}→DFW→${passenger.destination}`,
      stops: 1,
      notes: 'One stop via Dallas, meal service',
      confidence: 0.75,
    },
    {
      optionId: 'D',
      depart: '17:30',
      arrive: '20:00',
      routing: `${passenger.origin}→${passenger.destination} (direct)`,
      stops: 0,
      notes: 'Evening direct, first class upgrade possible',
      confidence: 0.90,
    },
    {
      optionId: 'E',
      depart: '09:00',
      arrive: '12:15',
      routing: `${passenger.origin}→${passenger.destination} (direct, next day)`,
      stops: 0,
      notes: 'Next morning direct, hotel voucher included',
      confidence: 0.70,
    },
    {
      optionId: 'F',
      depart: '13:00',
      arrive: '19:30',
      routing: `${passenger.origin}→PHX→${passenger.destination}`,
      stops: 1,
      notes: 'One stop via Phoenix, partner airline',
      confidence: 0.65,
    },
  ];

  // Preference filtering: arrive_before_21_00
  const constraints = passenger.constraints || [];
  if (constraints.includes('arrive_before_21_00')) {
    const filtered = base.filter((o) => {
      const [h] = o.arrive.split(':').map(Number);
      return h < 21;
    });
    if (filtered.length > 0) {
      logMetric('OPTIONS_FILTERED', filtered.length, { constraint: 'arrive_before_21_00' });
      return filtered;
    }
  }

  return base;
}

// ──────────────────────────────────────────────
// Route handlers
// ──────────────────────────────────────────────

async function handleHealth() {
  logMetric('HEALTH_CHECK');
  return respond(200, { ok: true, time: new Date().toISOString() });
}

async function handleDisruption(body) {
  const { type, reason, airport, passenger } = body;
  if (!type || !passenger) {
    return respond(400, { error: 'Missing required fields: type, passenger' });
  }

  const disruptionId = generateId('DIS');
  const sessionId = generateId('SES');

  const disruption = { type, reason, airport, createdAt: new Date().toISOString() };

  // Store disruption meta
  await store.upsertJson(`DISRUPTION#${disruptionId}`, 'META', disruption);

  // Store session meta
  await store.upsertJson(`SESSION#${sessionId}`, 'META', {
    sessionId,
    disruptionId,
    passenger,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  // Generate and store options
  const options = generateCandidateOptions(passenger, disruption);
  await store.upsertJson(`SESSION#${sessionId}`, 'OPTIONS', { options });

  logMetric('DISRUPTION_CREATED', 1, { disruptionId, sessionId, type });

  return respond(200, {
    disruptionId,
    sessionId,
    passenger,
    message: `Disruption ${disruptionId} created. Session ${sessionId} initialized with ${options.length} rebooking options.`,
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

  // Store the user turn
  const epoch = Date.now();
  const turnCount = turns.length;
  await store.upsertJson(`SESSION#${sessionId}`, `TURN#${epoch}#${turnCount}`, {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Get assistant response (Bedrock or fallback)
  const assistantMessage = await maybeBedrockChat({
    passenger: sessionMeta.passenger,
    disruptionId: sessionMeta.disruptionId,
    message,
    options,
    history,
  });

  // Store the assistant turn
  await store.upsertJson(`SESSION#${sessionId}`, `TURN#${Date.now()}#${turnCount + 1}`, {
    role: 'assistant',
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  logMetric('CHAT_TURN', 1, { sessionId });

  return respond(200, {
    sessionId,
    assistant: assistantMessage,
    options: options.slice(0, 4),
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

  logMetric('OPTION_SELECTED', 1, { sessionId, optionId });

  return respond(200, { sessionId, selected });
}

async function handleConfirm(body) {
  const { sessionId } = body;
  if (!sessionId) {
    return respond(400, { error: 'Missing required field: sessionId' });
  }

  // Load selection
  const selectionDoc = await store.getJson(`SESSION#${sessionId}`, 'SELECTION');
  if (!selectionDoc) {
    return respond(400, { error: 'No option selected yet. Please select an option first.' });
  }

  const pnr = generatePNR();
  const booking = {
    pnr,
    status: 'CONFIRMED (MOCK)',
    bookedAt: new Date().toISOString(),
    selected: selectionDoc.selected,
  };

  // Store booking
  await store.upsertJson(`SESSION#${sessionId}`, 'BOOKING', booking);

  logMetric('BOOKING_CONFIRMED', 1, { sessionId, pnr });

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
  const turns = await store.queryByPk(`SESSION#${sessionId}`, 'TURN#');

  const packet = {
    passenger: sessionMeta.passenger,
    disruptionId: sessionMeta.disruptionId,
    escalationReason: reason || 'Customer requested agent assistance',
    optionsShown: (optionsDoc?.options || []).slice(0, 6),
    transcript: turns.map((t) => ({ role: t.role, content: t.content, timestamp: t.timestamp })),
    selection: selectionDoc?.selected || null,
    booking: bookingDoc || null,
    escalatedAt: new Date().toISOString(),
  };

  // Store escalation
  await store.upsertJson(`SESSION#${sessionId}`, 'ESCALATION', packet);

  logMetric('ESCALATION', 1, { sessionId, disruptionId: sessionMeta.disruptionId });

  return respond(200, { sessionId, escalated: true, packet });
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
