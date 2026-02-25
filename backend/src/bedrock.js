const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const USE_BEDROCK = (process.env.USE_BEDROCK || 'false').toLowerCase() === 'true';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

const bedrockClient = new BedrockRuntimeClient({});

/**
 * Attempt a Bedrock chat completion; fallback to deterministic response on failure or when disabled.
 *
 * @param {Object} params
 * @param {Object} params.passenger - Passenger info
 * @param {string} params.disruptionId - Disruption identifier
 * @param {string} params.message - User's current message
 * @param {Array}  params.options - Available rebooking options
 * @param {Array}  params.history - Prior chat turns [{role,content}]
 * @returns {Promise<string>} Assistant response text
 */
async function maybeBedrockChat({ passenger, disruptionId, message, options, history }) {
  if (!USE_BEDROCK) {
    return buildFallbackResponse(passenger, options);
  }

  try {
    const systemPrompt = buildSystemPrompt(passenger, disruptionId, options);
    const messages = [
      ...(history || []).map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: message },
    ];

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    };

    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (responseBody.content && responseBody.content.length > 0) {
      return responseBody.content[0].text;
    }

    console.warn('METRIC: BEDROCK_EMPTY_RESPONSE | value=1');
    return buildFallbackResponse(passenger, options);
  } catch (err) {
    console.error('METRIC: BEDROCK_ERROR | value=1 |', err.message);
    return buildFallbackResponse(passenger, options);
  }
}

function buildSystemPrompt(passenger, disruptionId, options) {
  const optionList = options
    .map(
      (o) =>
        `  ${o.optionId}: ${o.routing} | Depart ${o.depart} → Arrive ${o.arrive} | Stops: ${o.stops} | ${o.notes}`
    )
    .join('\n');

  return `You are a helpful airline rebooking assistant for disruption ${disruptionId}.
Passenger: ${passenger.firstName}, tier: ${passenger.tier}, route: ${passenger.origin}→${passenger.destination}.

Available rebooking options (ONLY recommend from this list):
${optionList}

GUARDRAILS:
- Do NOT invent new flights; recommend ONLY from the provided list above.
- Booking is simulated; do NOT claim a booking is confirmed.
- Help the passenger compare options based on their preferences.
- Be concise, friendly, and professional.`;
}

function buildFallbackResponse(passenger, options) {
  const name = passenger?.firstName || 'there';
  const topOptions = (options || []).slice(0, 4);

  if (topOptions.length === 0) {
    return `Hi ${name}, I'm looking into rebooking options for you. Please hold on while I check availability.`;
  }

  const optionSummary = topOptions
    .map((o) => `• **${o.optionId}**: ${o.routing} (depart ${o.depart}, arrive ${o.arrive}, ${o.stops} stop(s)) – ${o.notes}`)
    .join('\n');

  return `Hi ${name}, here are your best rebooking options:\n\n${optionSummary}\n\nPlease review these and select the one that works best for you using the option cards below. Once selected, hit **Confirm** to complete the mock booking.`;
}

module.exports = { maybeBedrockChat };
