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
  console.log('  AI Capabilities:');
  console.log(`    Bedrock Chat:      ${process.env.USE_BEDROCK === 'true' ? '✅ ON' : '⬚ OFF (fallback)'}`);
  console.log(`    Knowledge Base:    ${process.env.USE_KNOWLEDGE_BASE === 'true' ? '✅ ON' : '⬚ OFF (fallback)'}`);
  console.log(`    Guardrails:        ${process.env.USE_GUARDRAILS === 'true' ? '✅ ON' : '⬚ OFF'}`);
  console.log(`    Comprehend:        ${process.env.USE_COMPREHEND === 'true' ? '✅ ON' : '⬚ OFF (neutral)'}`);
  console.log(`    Translate:         ${process.env.USE_TRANSLATE === 'true' ? '✅ ON' : '⬚ OFF (English)'}`);
  console.log('');
});
