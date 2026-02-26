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

// Initialize sample data for dashboard testing
async function initializeSampleData() {
  try {
    // Create sample sessions with escalations and bookings spread across different time periods
    const now = Date.now();
    const MINUTE = 60 * 1000;
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;
    
    const sampleSessions = [
      // ===== LAST 1 HOUR (2 escalations, 2 bookings) =====
      {
        sessionId: 'SES-000A',
        disruptionId: 'DIS-001',
        escalation: {
          passengerSummary: { tier: 'Gold', name: 'Jennifer Davis' },
          escalationReason: 'Customer requested agent assistance',
          priority: 'MEDIUM',
          escalatedAt: new Date(now - 15 * MINUTE).toISOString(),
        },
        booking: {
          pnr: 'PNR000A',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 15 * MINUTE).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      {
        sessionId: 'SES-000B',
        disruptionId: 'DIS-001',
        booking: {
          pnr: 'PNR000B',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 30 * MINUTE).toISOString(),
          itinerarySummary: { tier: 'Platinum' },
        },
      },
      {
        sessionId: 'SES-000C',
        disruptionId: 'DIS-001',
        escalation: {
          passengerSummary: { tier: 'Silver', name: 'Robert Taylor' },
          escalationReason: 'Sentiment auto-escalation (negative)',
          priority: 'NORMAL',
          escalatedAt: new Date(now - 45 * MINUTE).toISOString(),
        },
      },
      
      // ===== LAST 24 HOURS (3 escalations, 4 bookings) =====
      {
        sessionId: 'SES-001',
        disruptionId: 'DIS-001',
        escalation: {
          passengerSummary: { tier: 'Platinum', name: 'John Smith' },
          escalationReason: 'Customer requested agent assistance',
          priority: 'HIGH',
          escalatedAt: new Date(now - 2 * HOUR).toISOString(),
        },
        booking: {
          pnr: 'PNR001',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 2 * HOUR).toISOString(),
          itinerarySummary: { tier: 'Platinum' },
        },
      },
      {
        sessionId: 'SES-002',
        disruptionId: 'DIS-001',
        escalation: {
          passengerSummary: { tier: 'Gold', name: 'Sarah Johnson' },
          escalationReason: 'Sentiment auto-escalation (negative)',
          priority: 'MEDIUM',
          escalatedAt: new Date(now - 5 * HOUR).toISOString(),
        },
        booking: {
          pnr: 'PNR002',
          status: 'FAILED',
          bookedAt: new Date(now - 5 * HOUR).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      {
        sessionId: 'SES-003',
        disruptionId: 'DIS-001',
        booking: {
          pnr: 'PNR003',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 8 * HOUR).toISOString(),
          itinerarySummary: { tier: 'Silver' },
        },
      },
      {
        sessionId: 'SES-004',
        disruptionId: 'DIS-001',
        escalation: {
          passengerSummary: { tier: 'Platinum', name: 'Mike Chen' },
          escalationReason: 'Wheelchair assistance needed',
          priority: 'HIGH',
          escalatedAt: new Date(now - 12 * HOUR).toISOString(),
        },
        booking: {
          pnr: 'PNR004',
          status: 'FAILED',
          bookedAt: new Date(now - 12 * HOUR).toISOString(),
          itinerarySummary: { tier: 'Platinum' },
        },
      },
      {
        sessionId: 'SES-005',
        disruptionId: 'DIS-001',
        booking: {
          pnr: 'PNR005',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 18 * HOUR).toISOString(),
          itinerarySummary: { tier: 'General' },
        },
      },
      {
        sessionId: 'SES-006',
        disruptionId: 'DIS-002',
        booking: {
          pnr: 'PNR006',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 20 * HOUR).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      
      // ===== LAST 7 DAYS (but older than 24h) (4 escalations, 3 bookings) =====
      {
        sessionId: 'SES-007',
        disruptionId: 'DIS-002',
        escalation: {
          passengerSummary: { tier: 'Gold', name: 'Emma Wilson' },
          escalationReason: 'Complex rebooking scenario',
          priority: 'MEDIUM',
          escalatedAt: new Date(now - 2 * DAY).toISOString(),
        },
        booking: {
          pnr: 'PNR007',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 2 * DAY).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      {
        sessionId: 'SES-008',
        disruptionId: 'DIS-002',
        booking: {
          pnr: 'PNR008',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 3 * DAY).toISOString(),
          itinerarySummary: { tier: 'Silver' },
        },
      },
      {
        sessionId: 'SES-008B',
        disruptionId: 'DIS-002',
        booking: {
          pnr: 'PNR008B',
          status: 'FAILED',
          bookedAt: new Date(now - 3.5 * DAY).toISOString(),
          itinerarySummary: { tier: 'General' },
        },
      },
      {
        sessionId: 'SES-009',
        disruptionId: 'DIS-002',
        escalation: {
          passengerSummary: { tier: 'General', name: 'Alex Rodriguez' },
          escalationReason: 'Compensation inquiry',
          priority: 'NORMAL',
          escalatedAt: new Date(now - 4 * DAY).toISOString(),
        },
      },
      {
        sessionId: 'SES-010',
        disruptionId: 'DIS-003',
        booking: {
          pnr: 'PNR010',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 5 * DAY).toISOString(),
          itinerarySummary: { tier: 'Platinum' },
        },
      },
      {
        sessionId: 'SES-011',
        disruptionId: 'DIS-003',
        escalation: {
          passengerSummary: { tier: 'Silver', name: 'Maria Garcia' },
          escalationReason: 'Customer requested agent assistance',
          priority: 'NORMAL',
          escalatedAt: new Date(now - 6 * DAY).toISOString(),
        },
      },
      {
        sessionId: 'SES-012',
        disruptionId: 'DIS-003',
        escalation: {
          passengerSummary: { tier: 'Platinum', name: 'James Lee' },
          escalationReason: 'Special meal request',
          priority: 'HIGH',
          escalatedAt: new Date(now - 6.5 * DAY).toISOString(),
        },
      },
      
      // ===== LAST 30 DAYS (but older than 7d) (5 escalations, 6 bookings) =====
      {
        sessionId: 'SES-013',
        disruptionId: 'DIS-004',
        escalation: {
          passengerSummary: { tier: 'Gold', name: 'Lisa Brown' },
          escalationReason: 'Sentiment auto-escalation (negative)',
          priority: 'MEDIUM',
          escalatedAt: new Date(now - 10 * DAY).toISOString(),
        },
        booking: {
          pnr: 'PNR013',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 10 * DAY).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      {
        sessionId: 'SES-014',
        disruptionId: 'DIS-004',
        booking: {
          pnr: 'PNR014',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 12 * DAY).toISOString(),
          itinerarySummary: { tier: 'Silver' },
        },
      },
      {
        sessionId: 'SES-014B',
        disruptionId: 'DIS-004',
        booking: {
          pnr: 'PNR014B',
          status: 'CANCELLED',
          bookedAt: new Date(now - 13 * DAY).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      {
        sessionId: 'SES-015',
        disruptionId: 'DIS-004',
        escalation: {
          passengerSummary: { tier: 'General', name: 'David Kim' },
          escalationReason: 'Baggage assistance needed',
          priority: 'NORMAL',
          escalatedAt: new Date(now - 15 * DAY).toISOString(),
        },
        booking: {
          pnr: 'PNR015',
          status: 'FAILED',
          bookedAt: new Date(now - 15 * DAY).toISOString(),
          itinerarySummary: { tier: 'General' },
        },
      },
      {
        sessionId: 'SES-016',
        disruptionId: 'DIS-005',
        booking: {
          pnr: 'PNR016',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 18 * DAY).toISOString(),
          itinerarySummary: { tier: 'Platinum' },
        },
      },
      {
        sessionId: 'SES-017',
        disruptionId: 'DIS-005',
        escalation: {
          passengerSummary: { tier: 'Platinum', name: 'Rachel White' },
          escalationReason: 'Customer requested agent assistance',
          priority: 'HIGH',
          escalatedAt: new Date(now - 20 * DAY).toISOString(),
        },
        booking: {
          pnr: 'PNR017',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 20 * DAY).toISOString(),
          itinerarySummary: { tier: 'Platinum' },
        },
      },
      {
        sessionId: 'SES-018',
        disruptionId: 'DIS-005',
        booking: {
          pnr: 'PNR018',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 22 * DAY).toISOString(),
          itinerarySummary: { tier: 'General' },
        },
      },
      {
        sessionId: 'SES-019',
        disruptionId: 'DIS-006',
        escalation: {
          passengerSummary: { tier: 'Silver', name: 'Tom Anderson' },
          escalationReason: 'Complex rebooking scenario',
          priority: 'NORMAL',
          escalatedAt: new Date(now - 25 * DAY).toISOString(),
        },
        booking: {
          pnr: 'PNR019',
          status: 'FAILED',
          bookedAt: new Date(now - 25 * DAY).toISOString(),
          itinerarySummary: { tier: 'Silver' },
        },
      },
      {
        sessionId: 'SES-020',
        disruptionId: 'DIS-006',
        booking: {
          pnr: 'PNR020',
          status: 'CONFIRMED',
          bookedAt: new Date(now - 28 * DAY).toISOString(),
          itinerarySummary: { tier: 'Gold' },
        },
      },
      {
        sessionId: 'SES-021',
        disruptionId: 'DIS-006',
        escalation: {
          passengerSummary: { tier: 'Gold', name: 'Nina Patel' },
          escalationReason: 'Compensation inquiry',
          priority: 'MEDIUM',
          escalatedAt: new Date(now - 29 * DAY).toISOString(),
        },
      },
    ];

    // Store sample data
    for (const session of sampleSessions) {
      await store.upsertJson(`SESSION#${session.sessionId}`, 'META', {
        sessionId: session.sessionId,
        disruptionId: session.disruptionId,
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 240000).toISOString(),
      });

      if (session.escalation) {
        await store.upsertJson(`SESSION#${session.sessionId}`, 'ESCALATION', session.escalation);
      }

      if (session.booking) {
        await store.upsertJson(`SESSION#${session.sessionId}`, 'BOOKING', session.booking);
      }
    }

    // Create sample disruptions
    await store.upsertJson('DISRUPTION#DIS-001', 'META', {
      type: 'cancellation',
      reason: 'mechanical',
      airport: 'ORD',
      createdAt: new Date(Date.now() - 240000).toISOString(),
    });

    await store.upsertJson('DISRUPTION#DIS-002', 'META', {
      type: 'delay',
      reason: 'weather',
      airport: 'SFO',
      createdAt: new Date(Date.now() - 180000).toISOString(),
    });

    console.log('✓ Sample data loaded for dashboard testing');
  } catch (err) {
    console.error('Error initializing sample data:', err);
  }
}

const server = http.createServer(async (req, res) => {
  // Serve static files first
  if (req.method === 'GET' && (req.url === '/' || req.url.endsWith('.html') || req.url.endsWith('.js') || req.url.endsWith('.css'))) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, '../web', filePath);
    
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        let contentType = 'text/html';
        if (filePath.endsWith('.js')) contentType = 'application/javascript';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }
    } catch (err) {
      console.error('File serve error:', err);
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
      res.end(result.body);
    } catch (err) {
      console.error('Server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, async () => {
  // Initialize sample data
  await initializeSampleData();

  console.log(`\n  Local dev server running at http://127.0.0.1:${PORT}\n`);
  console.log('  Routes:');
  console.log('    GET  /health');
  console.log('    GET  /dashboard');
  console.log('    POST /disruption');
  console.log('    POST /chat');
  console.log('    POST /select-option');
  console.log('    POST /confirm');
  console.log('    POST /escalate');
  console.log('');
  console.log('  AI Capabilities:');
  console.log(`    Bedrock Chat:      ${process.env.USE_BEDROCK === 'true' ? '✅ ON' : '⬚ OFF (fallback)'}`);
  console.log(`    Knowledge Base:    ${process.env.USE_KNOWLEDGE_BASE === 'true' ? '✅ ON' : '⬚ OFF (fallback)'}`);
  console.log(`    Guardrails:        ${process.env.USE_GUARDRAILS === 'true' ? '✅ ON' : '⬚ OFF'}`);
  console.log(`    Comprehend:        ${process.env.USE_COMPREHEND === 'true' ? '✅ ON' : '⬚ OFF (neutral)'}`);
  console.log(`    Translate:         ${process.env.USE_TRANSLATE === 'true' ? '✅ ON' : '⬚ OFF (English)'}`);
  console.log('');
  console.log('  📊 Dashboard ready at http://127.0.0.1:3000/dashboard.html');
  console.log('');
});
