// ── Lightweight local Express server ────────────────────────
// Runs the Lambda handler directly via Express so you don't need Docker/SAM locally.
// Usage:  node server-local.js   (or: npm run backend)

const http = require('http');
const fs = require('fs');
const path = require('path');
const handler = require('./src/handler');
const store = require('./src/store');

const PORT = process.env.PORT || 3000;

// Force in-memory store for local dev
process.env.USE_LOCAL_STORE = 'true';
process.env.USE_BEDROCK = process.env.USE_BEDROCK || 'false';

const server = http.createServer(async (req, res) => {
  // ── Static file serving for web/ assets ──
  const urlPath = req.url.split('?')[0];
  if (urlPath.match(/\.(html|css|js|pdf)$/) || urlPath === '/') {
    const filePath = path.join(__dirname, '..', 'web', urlPath === '/' ? 'index.html' : urlPath);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).slice(1);
      const mimeTypes = { 
        html: 'text/html', 
        css: 'text/css', 
        js: 'application/javascript',
        pdf: 'application/pdf'
      };
      const contentType = mimeTypes[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      
      // Stream file for text-based files, read binary for PDFs
      if (ext === 'pdf') {
        const fileContent = fs.readFileSync(filePath);
        res.end(fileContent);
      } else {
        fs.createReadStream(filePath).pipe(res);
      }
      return;
    }
  }

  // Collect body
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    // Build a minimal API Gateway-like event
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || '';
    const queryParams = queryString
      ? Object.fromEntries(new URLSearchParams(queryString).entries())
      : null;

    const event = {
      httpMethod: req.method,
      path: urlParts[0],
      headers: req.headers,
      body: body || null,
      queryStringParameters: queryParams,
      pathParameters: null,
    };

    try {
      const result = await handler.handler(event);
      // Set response headers
      const headers = result.headers || {};
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      res.writeHead(result.statusCode);
      
      // Handle base64-encoded responses (e.g., PDFs)
      if (result.isBase64Encoded) {
        res.end(Buffer.from(result.body, 'base64'));
      } else {
        res.end(result.body);
      }
    } catch (err) {
      console.error('Server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  Local dev server running at http://127.0.0.1:${PORT}\n`);
  console.log('  Routes:');
  console.log('    GET  /health');
  console.log('    POST /disruption');
  console.log('    POST /chat');
  console.log('    POST /select-option');
  console.log('    POST /confirm');
  console.log('    POST /escalate');
  console.log('    GET  /dashboard');
  console.log('');
  console.log('  AI Capabilities:');
  console.log(`    Bedrock Chat:      ${process.env.USE_BEDROCK === 'true' ? '✅ ON' : '⬚ OFF (fallback)'}`);
  console.log(`    Knowledge Base:    ${process.env.USE_KNOWLEDGE_BASE === 'true' ? '✅ ON' : '⬚ OFF (fallback)'}`);
  console.log(`    Guardrails:        ${process.env.USE_GUARDRAILS === 'true' ? '✅ ON' : '⬚ OFF'}`);
  console.log(`    Comprehend:        ${process.env.USE_COMPREHEND === 'true' ? '✅ ON' : '⬚ OFF (neutral)'}`);
  console.log(`    Translate:         ${process.env.USE_TRANSLATE === 'true' ? '✅ ON' : '⬚ OFF (English)'}`);
  console.log('');
  console.log('  📊 Dashboard: http://127.0.0.1:' + PORT + '/dashboard.html');
  console.log('');

  // Seed sample data for dashboard testing
  initializeSampleData();
});

// ── Sample data seeding for dashboard ─────────────────────

function initializeSampleData() {
  const SEED_PASSENGERS = [
    { firstName: 'Alice', lastName: 'Anderson', tier: 'Platinum', passengerId: 'PAX-0001' },
    { firstName: 'Bob', lastName: 'Bauer', tier: 'Gold', passengerId: 'PAX-0015' },
    { firstName: 'Carlos', lastName: 'Chen', tier: 'Silver', passengerId: 'PAX-0042' },
    { firstName: 'Diana', lastName: 'Diaz', tier: 'General', passengerId: 'PAX-0118' },
    { firstName: 'Erik', lastName: 'Evans', tier: 'Platinum', passengerId: 'PAX-0003' },
    { firstName: 'Fatima', lastName: 'Fischer', tier: 'Gold', passengerId: 'PAX-0022' },
    { firstName: 'George', lastName: 'Garcia', tier: 'Silver', passengerId: 'PAX-0055' },
    { firstName: 'Hannah', lastName: 'Hoffman', tier: 'General', passengerId: 'PAX-0130' },
    { firstName: 'Ivan', lastName: 'Ibrahim', tier: 'Gold', passengerId: 'PAX-0019' },
    { firstName: 'Julia', lastName: 'Jensen', tier: 'Platinum', passengerId: 'PAX-0005' },
    { firstName: 'Kenji', lastName: 'Kim', tier: 'Silver', passengerId: 'PAX-0061' },
    { firstName: 'Lina', lastName: 'Lee', tier: 'General', passengerId: 'PAX-0145' },
    { firstName: 'Marcus', lastName: 'Martinez', tier: 'Gold', passengerId: 'PAX-0028' },
    { firstName: 'Nadia', lastName: 'Nguyen', tier: 'Silver', passengerId: 'PAX-0070' },
    { firstName: 'Omar', lastName: 'Olsson', tier: 'General', passengerId: 'PAX-0155' },
    { firstName: 'Priya', lastName: 'Patel', tier: 'Platinum', passengerId: 'PAX-0007' },
    { firstName: 'Quinn', lastName: 'Quinn', tier: 'Gold', passengerId: 'PAX-0031' },
    { firstName: 'Rosa', lastName: 'Rivera', tier: 'General', passengerId: 'PAX-0160' },
    { firstName: 'Stefan', lastName: 'Singh', tier: 'Silver', passengerId: 'PAX-0078' },
    { firstName: 'Tanya', lastName: 'Torres', tier: 'General', passengerId: 'PAX-0170' },
  ];

  const SEED_DISRUPTIONS = [
    { id: 'DIS-d001a1b2', type: 'CANCELLATION', reason: 'Mechanical issue', airport: 'FRA' },
    { id: 'DIS-d002c3d4', type: 'DELAY', reason: 'Weather conditions', airport: 'ORD' },
    { id: 'DIS-d003e5f6', type: 'CANCELLATION', reason: 'Crew availability', airport: 'JFK' },
    { id: 'DIS-d004a7b8', type: 'DELAY', reason: 'Air traffic control', airport: 'LAX' },
    { id: 'DIS-d005c9d0', type: 'CANCELLATION', reason: 'Technical inspection required', airport: 'MUC' },
  ];

  const ESCALATION_REASONS = [
    'Customer requested agent assistance',
    'Sentiment auto-escalation (negative)',
    'Wheelchair assistance needed',
    'Complex rebooking scenario',
    'Compensation inquiry',
    'Baggage assistance needed',
  ];

  const FLIGHT_NUMBERS = ['UA2041', 'UA3122', 'UA4587', 'UA2899', 'UA5004', 'UA1877', 'UA1200', 'UA891', 'UA1234'];
  const AIRPORTS = ['FRA', 'ORD', 'JFK', 'LAX', 'MUC', 'LHR', 'SFO', 'ATL'];
  const CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  // Time offsets for each session bucket
  const timeOffsets = [
    // Last 1 hour: 3 sessions
    15 * 60 * 1000, 30 * 60 * 1000, 50 * 60 * 1000,
    // Last 24 hours: 5 sessions
    3 * HOUR, 6 * HOUR, 10 * HOUR, 16 * HOUR, 22 * HOUR,
    // Last 7 days: 6 sessions
    2 * DAY, 3 * DAY, 4 * DAY, 5 * DAY, 5.5 * DAY, 6 * DAY,
    // Last 30 days: 6 sessions
    10 * DAY, 14 * DAY, 18 * DAY, 22 * DAY, 26 * DAY, 29 * DAY,
  ];

  // Seed disruptions
  for (const d of SEED_DISRUPTIONS) {
    store.putItem({
      pk: `DISRUPTION#${d.id}`,
      sk: 'META',
      type: d.type,
      reason: d.reason,
      airport: d.airport,
      createdAt: new Date(now - 2 * DAY).toISOString(),
    });
  }

  // Seed sessions
  for (let i = 0; i < SEED_PASSENGERS.length; i++) {
    const pax = SEED_PASSENGERS[i];
    const offset = timeOffsets[i];
    const sessionTime = new Date(now - offset);
    const sessionId = `SES-${(0x10000000 + i * 0x1111).toString(16).slice(0, 8)}`;
    const disruption = SEED_DISRUPTIONS[i % SEED_DISRUPTIONS.length];
    const origin = disruption.airport;
    const dest = AIRPORTS[(AIRPORTS.indexOf(origin) + 3) % AIRPORTS.length];
    const flight = FLIGHT_NUMBERS[i % FLIGHT_NUMBERS.length];

    // SESSION META
    store.putItem({
      pk: `SESSION#${sessionId}`,
      sk: 'META',
      sessionId,
      disruptionId: disruption.id,
      passenger: {
        firstName: pax.firstName,
        lastName: pax.lastName,
        tier: pax.tier,
        passengerId: pax.passengerId,
        origin,
        destination: dest,
        flightNumber: flight,
      },
      status: 'COMPLETED',
      createdAt: sessionTime.toISOString(),
    });

    // ~60% get escalation (indices 0..11)
    if (i < 12) {
      const priority = pax.tier === 'Platinum' ? 'HIGH' : pax.tier === 'Gold' ? 'MEDIUM' : 'NORMAL';
      store.putItem({
        pk: `SESSION#${sessionId}`,
        sk: 'ESCALATION',
        passengerSummary: {
          name: `${pax.firstName} ${pax.lastName}`,
          tier: pax.tier,
          passengerId: pax.passengerId,
        },
        escalationReason: ESCALATION_REASONS[i % ESCALATION_REASONS.length],
        priority,
        escalatedAt: new Date(sessionTime.getTime() + 5 * 60 * 1000).toISOString(),
      });
    }

    // ~70% get booking (indices 0..13)
    if (i < 14) {
      const pnrNum = 10000 + i * 1111;
      const isPremium = pax.tier === 'Platinum' || pax.tier === 'Gold';
      // Mix of confirmed and failed: indices 2, 7, 11 are failed/cancelled
      let status;
      if (i === 2 || i === 7 || i === 11) {
        status = i === 11 ? 'CANCELLED' : 'FAILED';
      } else {
        status = 'CONFIRMED (MOCK)';
      }

      store.putItem({
        pk: `SESSION#${sessionId}`,
        sk: 'BOOKING',
        pnr: `PNR-DEMO-${pnrNum}`,
        status,
        bookedAt: new Date(sessionTime.getTime() + 10 * 60 * 1000).toISOString(),
        itinerarySummary: {
          flights: [`${flight} ${origin}→${dest}`],
          class: isPremium ? 'Business' : 'Economy',
          departure: '14:30',
          arrival: '17:45',
          passenger: `${pax.firstName} ${pax.lastName}`,
          tier: pax.tier,
        },
      });
    }
  }

  console.log('  ✅ Sample data loaded for dashboard testing');
  console.log(`     ${SEED_PASSENGERS.length} sessions, ${SEED_DISRUPTIONS.length} disruptions seeded\n`);
}
