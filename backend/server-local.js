// ── Lightweight local Express server ────────────────────────
// Runs the Lambda handler directly via Express so you don't need Docker/SAM locally.
// Usage:  node server-local.js   (or: npm run backend)

const http = require('http');
const handler = require('./src/handler');

const PORT = process.env.PORT || 3000;

// Force in-memory store for local dev
process.env.USE_LOCAL_STORE = 'true';
process.env.USE_BEDROCK = process.env.USE_BEDROCK || 'false';

const server = http.createServer(async (req, res) => {
  // Collect body
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    // Build a minimal API Gateway-like event
    const event = {
      httpMethod: req.method,
      path: req.url.split('?')[0],
      headers: req.headers,
      body: body || null,
      queryStringParameters: null,
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

server.listen(PORT, () => {
  console.log(`\n  Local dev server running at http://127.0.0.1:${PORT}\n`);
  console.log('  Routes:');
  console.log('    GET  /health');
  console.log('    POST /disruption');
  console.log('    POST /chat');
  console.log('    POST /select-option');
  console.log('    POST /confirm');
  console.log('    POST /escalate');
  console.log('');
});
