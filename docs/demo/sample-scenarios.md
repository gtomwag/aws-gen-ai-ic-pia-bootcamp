# 🧪 Sample Demo Scenarios

> **Note:** All scenarios use DuHast Airlines (DH) flight numbers and branding.

These scenarios can be run live against the local dev server or the deployed API. Each modifies the `POST /disruption` request body.

> **Frontend App (deployed):** http://genai-disruption-poc-web-484907484851.s3-website-us-east-1.amazonaws.com  
> **Dashboard (deployed):** http://genai-disruption-poc-web-484907484851.s3-website-us-east-1.amazonaws.com/dashboard.html  
> **API Base URL (deployed):** `https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod`  
> **API Base URL (local):** `http://127.0.0.1:3000`

---

## Scenario 1: Weather Cancellation at FRA — Platinum Focus

**Story:** Severe thunderstorm causes runway closure at Frankfurt. DH891 FRA→JFK cancelled. 200 passengers affected, including ~16 Platinum members. Alice Anderson (Platinum) is the demo focus passenger.

**Request:**

```json
{
  "type": "CANCELLATION",
  "reason": "Severe weather – thunderstorm at FRA, runway closure",
  "airport": "FRA",
  "passengerCount": 200,
  "passenger": {
    "firstName": "Alice",
    "lastName": "Anderson",
    "tier": "Platinum",
    "origin": "FRA",
    "destination": "JFK",
    "flightNumber": "DH891",
    "date": "2026-02-25",
    "hasApp": true,
    "consentForProactive": true,
    "passengerId": "PAX-0001",
    "constraints": [],
    "specialRequirements": null,
    "connectionRisk": null
  }
}
```

**What to show:**
- Manifest summary: ~16 Platinum, ~30 Gold, ~40 connection risks
- Notification card with Platinum badge and premium copy
- 6 options including Business/First class, lounge access, hotel voucher
- Select Option A (earliest direct) → Confirm → PNR
- Escalate → Full agent context with HIGH priority

**Key talking points:**
- Proactive vs reactive
- Tier-based prioritization
- Premium perks differentiation

---

## Scenario 2: 45-Minute Delay — Connection Risk

**Story:** DH452 ORD→DEN delayed 45 minutes due to ATC flow control. Carlos (Gold tier) has a connecting flight with only 50 minutes connection time — at risk of missing it.

**Request (modify in app.js or via curl):**

```json
{
  "type": "DELAY",
  "reason": "ATC flow control – 45 minute departure delay",
  "airport": "ORD",
  "passengerCount": 150,
  "passenger": {
    "firstName": "Carlos",
    "lastName": "Chen",
    "tier": "Gold",
    "origin": "ORD",
    "destination": "SFO",
    "flightNumber": "DH452",
    "date": "2026-02-25",
    "hasApp": true,
    "consentForProactive": true,
    "passengerId": "PAX-0042",
    "constraints": ["arrive_before_21_00"],
    "specialRequirements": null,
    "connectionRisk": {
      "connectingFlight": "DH1789",
      "connectionAirport": "DEN",
      "connectionTime": 50,
      "atRisk": true
    }
  }
}
```

**What to show:**
- Manifest shows connection-at-risk passengers highlighted
- Options filtered — tight connections (<45 min) automatically excluded
- Gold tier gets 4-5 options with some premium perks
- `arrive_before_21_00` constraint applied
- Chat: "What if I need to arrive by 6pm?" → assistant filters further

**Key talking points:**
- Connection risk detection
- Constraint-based filtering
- Time-sensitive rebooking

**curl command for direct API test:**

```bash
curl -X POST http://127.0.0.1:3000/disruption \
  -H "Content-Type: application/json" \
  -d '{"type":"DELAY","reason":"ATC flow control \u2013 45 minute departure delay","airport":"ORD","passengerCount":150,"passenger":{"firstName":"Carlos","lastName":"Chen","tier":"Gold","origin":"ORD","destination":"SFO","flightNumber":"DH452","date":"2026-02-25","hasApp":true,"consentForProactive":true,"passengerId":"PAX-0042","constraints":["arrive_before_21_00"],"specialRequirements":null,"connectionRisk":{"connectingFlight":"DH1789","connectionAirport":"DEN","connectionTime":50,"atRisk":true}}}'
```

---

## Scenario 3: No Viable Options — Forced Escalation

**Story:** DH220 LAX→NRT (Los Angeles to Tokyo Narita) cancelled due to mechanical issue. Only one daily flight on this route; no partner availability. Priya (General tier) has no good automated options — system must escalate.

**Request (via curl):**

```json
{
  "type": "CANCELLATION",
  "reason": "Mechanical issue – engine inspection required, aircraft grounded",
  "airport": "LAX",
  "passengerCount": 280,
  "passenger": {
    "firstName": "Priya",
    "lastName": "Patel",
    "tier": "General",
    "origin": "LAX",
    "destination": "NRT",
    "flightNumber": "DH220",
    "date": "2026-02-25",
    "hasApp": false,
    "consentForProactive": false,
    "passengerId": "PAX-0199",
    "constraints": [],
    "specialRequirements": "Wheelchair assistance",
    "connectionRisk": null
  }
}
```

**What to show:**
- Notification channel: SMS/email (no app, no push consent)
- 4 options generated (General tier), but all are connecting flights >6h longer
- Do NOT select any option → go directly to **Escalate**
- Escalation packet shows:
  - NORMAL priority (General tier)
  - "Passenger has NOT selected any option"
  - "SPECIAL REQUIREMENTS: Wheelchair assistance"
  - AI recommendation: "No viable automated options. Consider manual inventory search or partner airline coordination."
  - EU261 and GDPR notes

**Key talking points:**
- Not every case can be auto-resolved
- System recognizes its limits and escalates gracefully
- Agent gets full context + AI recommendation
- Special requirements flagged for agent
- Demonstrates the "last mile" human handoff

**curl command:**

```bash
curl -X POST http://127.0.0.1:3000/disruption \
  -H "Content-Type: application/json" \
  -d '{"type":"CANCELLATION","reason":"Mechanical issue \u2013 engine inspection required","airport":"LAX","passengerCount":280,"passenger":{"firstName":"Priya","lastName":"Patel","tier":"General","origin":"LAX","destination":"NRT","flightNumber":"DH220","date":"2026-02-25","hasApp":false,"consentForProactive":false,"passengerId":"PAX-0199","constraints":[],"specialRequirements":"Wheelchair assistance","connectionRisk":null}}'
```

After creating the disruption (note the `sessionId` from the response), escalate:

```bash
curl -X POST http://127.0.0.1:3000/escalate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID_FROM_ABOVE>","reason":"No viable automated options for LAX-NRT route"}'
```

---

## Scenario 4: Knowledge Base — Policy & Rights Chat Demo

**Story:** After creating any disruption (use Scenario 1), demonstrate how different chat messages route to the Knowledge Base vs general Bedrock chat. This showcases the RAG pipeline.

**Setup:** Create a disruption first (Scenario 1) and note the `sessionId`.

**Chat sequence — General question (→ Bedrock chat):**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"Which option has the fewest stops?"}'
```

Expected: Response references Alice's specific options. Backend metric: `CHAT_TURN source=bedrock` (or `source=fallback` if Bedrock is OFF).

**Chat sequence — EU261 rights (→ Knowledge Base):**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"What are my EU261 rights for this cancellation?"}'
```

Expected: Response mentions compensation of €250–€600, distance-based tiers, extraordinary circumstances. Backend metric: `CHAT_KB_ROUTED`. Response field `source: "knowledge-base"`.

**Chat sequence — Hotel & meals (→ Knowledge Base):**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"Am I entitled to a hotel and meals during the delay?"}'
```

Expected: EU261 duty-of-care: meals after 2h (short-haul), 3h (medium), 4h (long). Hotel for overnight. Transport included.

**Chat sequence — Refund process (→ Knowledge Base):**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"How long does a refund take to process?"}'
```

Expected: 7 business days for credit card, 72h for goodwill miles.

**Chat sequence — GDPR data (→ Knowledge Base):**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"What about my personal data? Is this GDPR compliant?"}'
```

Expected: GDPR rights (access, rectify, delete), 90-day chat retention, data protection contact.

**What to show:**
- Same chat UI, different AI pathways under the hood
- Policy questions get accurate, document-grounded answers
- General questions get context-aware Bedrock responses
- Check the API response JSON for `source` field: `"knowledge-base"` vs `"bedrock"` vs `"fallback"`
- Check metrics log for `CHAT_KB_ROUTED` entries

**What to see in the UI:**
- 🤖 **Bedrock AI** source badge (blue) on general chat responses (e.g., "Which option has the fewest stops?")
- 📚 **Knowledge Base** source badge (green) on policy responses (e.g., EU261 rights, hotel/meals, GDPR)
- **Citation footnotes** appear below every KB-sourced response — numbered references to the specific policy documents used
- 💬 **Fallback** source badge (amber) when AI services are disabled — system still answers from built-in rules
- Badges switch automatically as routing changes — no user action required

**Key talking points:**
- Automatic routing — no user action needed to select KB vs chat
- RAG prevents hallucination on policy questions
- Knowledge Base can be expanded with any airline's SOPs, training manuals, policy docs
- Built-in fallbacks work even when KB is disabled (feature flag `USE_KNOWLEDGE_BASE=false`)

**Full keyword list that triggers KB routing:** `eu261`, `regulation`, `compensation`, `entitled`, `rights`, `refund`, `claim`, `gdpr`, `data`, `privacy`, `personal data`, `how much`, `am i entitled`, `can i get`, `what are my rights`, `policy`, `rule`, `law`, `legal`, `obligation`, `hotel`, `meal`, `voucher`, `care`, `assistance`, `extraordinary`, `weather`, `mechanical`, `how long`, `when will`, `processing time`, `complaint`, `escalate`, `supervisor`

---

## Scenario 5: Sentiment Analysis & Auto-Escalation

**Story:** Demonstrate how Amazon Comprehend tracks passenger sentiment per chat message, and how consecutive negative sentiment triggers automatic escalation to a human agent.

**Setup:** Create a disruption (Scenario 1) and note the `sessionId`.

**Chat sequence — Neutral start:**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"Can you show me the available options?"}'
```

Expected: Response field `sentiment.current: "NEUTRAL"` (or `"POSITIVE"`). No escalation.

**Chat sequence — First negative message:**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"This is unacceptable, I have been waiting for hours and nobody is helping me"}'
```

Expected: Response field `sentiment.current: "NEGATIVE"`. `autoEscalation: null` (only 1 negative so far).

**Chat sequence — Second negative message (triggers auto-escalation):**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"I am extremely frustrated, this is the worst airline experience I have ever had"}'
```

Expected: Response field `sentiment.current: "NEGATIVE"`. `autoEscalation: { triggered: true, reason: "...", consecutiveNegative: 2 }`. Backend metric: `SENTIMENT_AUTO_ESCALATE`.

**Then escalate to see sentiment in the handoff packet:**

```bash
curl -X POST http://127.0.0.1:3000/escalate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","reason":"Auto-escalation: consecutive negative sentiment"}'
```

Expected: Escalation packet includes `sentimentSummary` with the emotional trajectory.

**What to show:**
- `sentiment` object in every chat response — `current` + `scores` (positive/negative/neutral/mixed confidence)
- `autoEscalation` field goes from `null` to `{triggered: true}` after 2+ consecutive negatives
- Metrics panel shows `SENTIMENT_AUTO_ESCALATE` event
- Escalation packet includes sentiment context for the human agent

**What to see in the UI:**
- **Sentiment Indicator Bar** appears in the side panel after each chat message — shows POSITIVE, NEGATIVE, NEUTRAL, or MIXED with confidence percentage breakdown
- Bar color changes: green (POSITIVE), red (NEGATIVE), gray (NEUTRAL), yellow (MIXED)
- After 2+ consecutive NEGATIVE messages with >70% confidence, a pulsing red 🚨 **Auto-Escalation Alert** banner appears at the top of the side panel
- Alert text says: "Auto-Escalation Triggered — Session flagged for human agent" with the specific reason
- The alert remains visible until the session changes

**Key talking points:**
- Real-time emotion tracking per message via Amazon Comprehend
- Auto-escalation rule: 2+ consecutive NEGATIVE with >0.7 confidence
- Proactive agent routing — no human judgment needed
- Agent gets emotional context: "Passenger started neutral, turned negative after message 3"
- Rule is configurable — threshold can be adjusted

---

## Scenario 6: PII Detection in Chat

**Story:** When a passenger inadvertently shares sensitive information (credit card, SSN, email) in chat, Amazon Comprehend detects it and the system flags it.

**Setup:** Create a disruption and note the `sessionId`.

**Chat message with PII:**

```bash
curl -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","message":"My credit card number is 4111-1111-1111-1111 and my email is alice@example.com, can you process my refund?"}'
```

Expected: Response field `piiDetected: true`. Backend metric: `CHAT_PII_DETECTED` with entity types. The chat still works normally — PII is flagged, not blocked (blocking would be handled by Bedrock Guardrails).

**What to show:**
- `piiDetected: true` in the API response
- `CHAT_PII_DETECTED` metric in the metrics log
- Demonstrates Comprehend's PII entity detection (CREDIT_DEBIT_NUMBER, EMAIL_ADDRESS, etc.)

**What to see in the UI:**
- A 🔒 **PII Detected** warning badge appears on the **user's own message** that contained sensitive data
- The badge is a small amber tag below the message text, alerting that personal information was identified
- The chat still functions normally — PII is flagged for awareness, not blocked (blocking would be handled by Bedrock Guardrails when enabled)
- Combined with the Sentiment Bar and source badges, this gives a complete picture of AI services in action

**Key talking points:**
- Compliance-first design — sensitive data is identified immediately
- In production: could auto-redact PII from stored transcripts, trigger compliance alerts
- Bedrock Guardrails (when enabled) can block PII from reaching the model entirely

---

## Combining Scenarios for Maximum Impact

For the most impressive demo, run through this sequence in a single session:

1. **Create disruption** (Scenario 1) → shows manifest, notification, options
2. **General chat**: "Which option is best for a tight connection?" → Bedrock AI
3. **Policy chat**: "What are my EU261 rights?" → Knowledge Base (RAG)
4. **Policy chat**: "Am I entitled to hotel and meals?" → Knowledge Base (RAG)
5. **Frustrated chat**: "This is ridiculous, nobody is helping" → NEGATIVE sentiment
6. **Frustrated chat**: "Worst experience ever, I want a supervisor" → auto-escalation triggers + KB routing (contains "supervisor")
7. **Escalate** → full packet with sentiment trajectory + policy notes

This shows all 6 AI services working together in one coherent flow.

**All 7 UI indicators visible in this combined flow:**
| UI Element | When It Appears | What It Shows |
|---|---|---|
| 🤖 **Bedrock AI** badge (blue) | Step 2 — general chat | Response came from Bedrock Claude with session context |
| 📚 **Knowledge Base** badge (green) | Steps 3–4 — policy chat | Response came from RAG pipeline with curated documents |
| **Citation footnotes** | Steps 3–4 — below KB responses | Numbered references to specific policy documents used |
| **Sentiment Indicator Bar** | Steps 5–6 — side panel | NEGATIVE sentiment with confidence scores after frustrated messages |
| 🚨 **Auto-Escalation Alert** | Step 6 — side panel top | Pulsing red banner: "Session flagged for human agent" |
| 🔒 **PII Detected** badge | If PII is typed | Amber badge on user message identifying sensitive data |
