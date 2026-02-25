const { v4: uuidv4 } = require('uuid');

/**
 * Generate a short unique ID
 */
function generateId(prefix = '') {
  const short = uuidv4().split('-')[0];
  return prefix ? `${prefix}-${short}` : short;
}

/**
 * Generate a mock PNR code
 */
function generatePNR() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `PNR-DEMO-${num}`;
}

/**
 * Build a standard CORS-enabled API Gateway response
 */
function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Parse the JSON body from an API Gateway event
 */
function parseBody(event) {
  try {
    if (!event.body) return {};
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

/**
 * Log a metric to CloudWatch via structured console.log
 */
function logMetric(name, value = 1, dimensions = {}) {
  console.log(`METRIC: ${name} | value=${value} | ${JSON.stringify(dimensions)}`);
}

module.exports = { generateId, generatePNR, respond, parseBody, logMetric };
