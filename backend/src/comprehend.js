/**
 * Amazon Comprehend Integration — Sentiment Analysis
 *
 * Analyzes passenger chat messages for sentiment to enable:
 * - Auto-escalation when passenger frustration is detected
 * - Sentiment metrics per session for quality tracking
 * - Priority adjustment based on emotional state
 *
 * When USE_COMPREHEND is false (default for local dev), returns neutral sentiment.
 */

const USE_COMPREHEND = (process.env.USE_COMPREHEND || 'false').toLowerCase() === 'true';

let comprehendClient = null;

function getComprehendClient() {
  if (!comprehendClient) {
    const { ComprehendClient } = require('@aws-sdk/client-comprehend');
    comprehendClient = new ComprehendClient({});
  }
  return comprehendClient;
}

/**
 * Analyze sentiment of a text message.
 *
 * @param {string} text - The message to analyze
 * @param {string} [languageCode='en'] - ISO language code
 * @returns {Promise<Object>} { sentiment, scores, shouldEscalate }
 */
async function analyzeSentiment(text, languageCode = 'en') {
  if (!USE_COMPREHEND || !text || text.trim().length === 0) {
    return buildNeutralResult();
  }

  try {
    const { DetectSentimentCommand } = require('@aws-sdk/client-comprehend');
    const command = new DetectSentimentCommand({
      Text: text,
      LanguageCode: languageCode,
    });

    const response = await getComprehendClient().send(command);

    const result = {
      sentiment: response.Sentiment, // POSITIVE | NEGATIVE | NEUTRAL | MIXED
      scores: {
        positive: response.SentimentScore?.Positive || 0,
        negative: response.SentimentScore?.Negative || 0,
        neutral: response.SentimentScore?.Neutral || 0,
        mixed: response.SentimentScore?.Mixed || 0,
      },
      shouldEscalate: false,
    };

    console.log(`METRIC: SENTIMENT_ANALYZED | sentiment=${result.sentiment} | negative=${result.scores.negative.toFixed(3)}`);
    return result;
  } catch (err) {
    console.error('METRIC: COMPREHEND_ERROR | value=1 |', err.message);
    return buildNeutralResult();
  }
}

/**
 * Detect PII entities in text using Comprehend.
 *
 * @param {string} text - The text to scan for PII
 * @param {string} [languageCode='en'] - ISO language code
 * @returns {Promise<Array>} Array of PII entities found
 */
async function detectPII(text, languageCode = 'en') {
  if (!USE_COMPREHEND || !text || text.trim().length === 0) {
    return [];
  }

  try {
    const { DetectPiiEntitiesCommand } = require('@aws-sdk/client-comprehend');
    const command = new DetectPiiEntitiesCommand({
      Text: text,
      LanguageCode: languageCode,
    });

    const response = await getComprehendClient().send(command);
    const entities = (response.Entities || []).map((e) => ({
      type: e.Type,        // e.g., 'SSN', 'CREDIT_DEBIT_NUMBER', 'PASSPORT_NUMBER'
      score: e.Score,
      beginOffset: e.BeginOffset,
      endOffset: e.EndOffset,
    }));

    if (entities.length > 0) {
      console.log(`METRIC: PII_DETECTED | count=${entities.length} | types=${entities.map((e) => e.type).join(',')}`);
    }

    return entities;
  } catch (err) {
    console.error('METRIC: COMPREHEND_PII_ERROR | value=1 |', err.message);
    return [];
  }
}

/**
 * Evaluate whether a session's sentiment history warrants auto-escalation.
 *
 * Rule: If the last 2+ user messages have NEGATIVE sentiment with >0.7 confidence,
 * trigger automatic escalation.
 *
 * @param {Array} sentimentHistory - Array of { sentiment, scores } from recent turns
 * @returns {{ shouldEscalate: boolean, reason: string|null, consecutiveNegative: number }}
 */
function evaluateEscalationTrigger(sentimentHistory) {
  if (!sentimentHistory || sentimentHistory.length === 0) {
    return { shouldEscalate: false, reason: null, consecutiveNegative: 0 };
  }

  // Count consecutive negative sentiments from the most recent message backwards
  let consecutiveNegative = 0;
  for (let i = sentimentHistory.length - 1; i >= 0; i--) {
    const entry = sentimentHistory[i];
    if (entry.sentiment === 'NEGATIVE' && entry.scores.negative > 0.7) {
      consecutiveNegative++;
    } else {
      break;
    }
  }

  const shouldEscalate = consecutiveNegative >= 2;
  const reason = shouldEscalate
    ? `Passenger sentiment detected as NEGATIVE for ${consecutiveNegative} consecutive messages (auto-escalation triggered)`
    : null;

  if (shouldEscalate) {
    console.log(`METRIC: SENTIMENT_AUTO_ESCALATION | consecutiveNegative=${consecutiveNegative}`);
  }

  return { shouldEscalate, reason, consecutiveNegative };
}

/**
 * Build a neutral sentiment result (used when Comprehend is disabled).
 */
function buildNeutralResult() {
  return {
    sentiment: 'NEUTRAL',
    scores: { positive: 0, negative: 0, neutral: 1, mixed: 0 },
    shouldEscalate: false,
  };
}

module.exports = { analyzeSentiment, detectPII, evaluateEscalationTrigger };
