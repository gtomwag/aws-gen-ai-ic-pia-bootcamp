# AWS AI Services Integration Guide

This document describes the AWS AI services integrated into the GenAI Disruption Management system and how to enable each one.

---

## Architecture Overview

```
┌─────────────┐        ┌──────────────┐        ┌───────────┐
│  Static Web │  HTTP  │ API Gateway  │        │ DynamoDB  │
│  (web/)     │ ────►  │  + Lambda    │ ────►  │ (single   │
│  HTML/JS    │        │  (backend/)  │        │  table)   │
└─────────────┘        └──────────────┘        └───────────┘
                              │
                    ┌─────────┼─────────────────────┐
                    │         │                     │
              ┌─────▼─────┐  ┌▼──────────┐   ┌─────▼──────┐
              │ Bedrock   │  │ Comprehend │   │ Translate  │
              │ Chat +    │  │ Sentiment  │   │ Multi-lang │
              │ KB + Guard│  │ + PII      │   │ Notifs     │
              └───────────┘  └────────────┘   └────────────┘
```

## Services Summary

| Service | Module | Purpose | Config Flag |
|---|---|---|---|
| **Amazon Bedrock (InvokeModel)** | `bedrock.js` | Natural-language chat assistant (Claude 3 Haiku) | `USE_BEDROCK` |
| **Bedrock Knowledge Base (RAG)** | `bedrock.js` | Policy-aware answers grounded in EU261, airline policy, GDPR docs | `USE_KNOWLEDGE_BASE` |
| **Bedrock Guardrails** | `bedrock.js` | PII filtering, denied topics, content safety on all AI output | `USE_GUARDRAILS` |
| **Amazon Comprehend** | `comprehend.js` | Sentiment analysis per chat message + PII detection | `USE_COMPREHEND` |
| **Amazon Translate** | `translate.js` | Multi-language notification translation (75+ languages) | `USE_TRANSLATE` |
| **Voice Session Orchestration** | `voice.js` + `handler.js` | Starts voice sessions, processes voice turns, handles human transfer lifecycle | `USE_VOICE` |

All services are **optional** — when disabled, deterministic fallbacks ensure full functionality.

---

## 1. Amazon Bedrock — Chat (Existing, Enhanced)

**What it does:** Powers the `/chat` endpoint with Claude 3 Haiku for natural-language option comparison and rebooking assistance.

**Enhancements:**
- System prompt now includes EU261 guidance and anti-hallucination guardrails
- Response includes `source` field ("bedrock", "knowledge-base", or "fallback") for transparency
- Guardrails can be attached to filter PII and block unsafe content

**Enable:**
```env
USE_BEDROCK=true
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

**Prerequisites:**
- Model access enabled in Bedrock console for your region
- Lambda role has `bedrock:InvokeModel` permission (already in template.yaml)

---

## 2. Bedrock Knowledge Base (RAG)

**What it does:** Answers policy and rights questions by retrieving relevant content from indexed documents (EU261 regulation, airline policy, GDPR guidelines, FAQs) and generating grounded responses.

**How it works:**
1. When a chat message is detected as a policy question (via keyword matching in `isPolicyQuestion()`), it's routed to the Knowledge Base instead of general chat
2. The KB uses `RetrieveAndGenerate` to find relevant document chunks and synthesize an answer
3. Citations from source documents are included in the response

**Policy questions detected:** Contains keywords like "compensation", "EU261", "rights", "refund", "GDPR", "hotel", "meal voucher", etc.

**Source documents** (in `/knowledge-base/`):
| Document | Content |
|---|---|
| `eu261-regulation.md` | Full EU261 passenger rights — compensation amounts, delay thresholds, extraordinary circumstances |
| `airline-policy.md` | Tier-based rebooking priority, goodwill compensation, notification policy, escalation policy |
| `disruption-faq.md` | Common passenger and agent FAQs with detailed answers |
| `gdpr-data-handling.md` | GDPR compliance — lawful basis, data subject rights, consent management, AI data handling |

**Enable:**
```env
USE_BEDROCK=true
USE_KNOWLEDGE_BASE=true
KNOWLEDGE_BASE_ID=<your-kb-id>
```

**Setup:**
```bash
cd backend
node setup-kb.js          # Creates S3 bucket + uploads docs + prints console instructions
```
Then complete the Knowledge Base creation in the AWS Console (Bedrock → Knowledge bases → Create).

---

## 3. Bedrock Guardrails

**What it does:** Applies safety filters to all Bedrock interactions:

| Policy | What it blocks/filters |
|---|---|
| **PII Filtering** | Anonymizes SSN, passport numbers, credit card numbers in AI output |
| **Denied Topics** | Legal advice, competitor comparisons, unauthorized compensation promises |
| **Content Filters** | Hate, violence, sexual content, misconduct |
| **Word Filters** | "guaranteed", "we admit fault", "lawsuit" |
| **Grounding Check** | Ensures KB responses are grounded in source documents |

**Enable:**
```env
USE_GUARDRAILS=true
GUARDRAIL_ID=<your-guardrail-id>
GUARDRAIL_VERSION=1
```

**Setup:** Create via AWS Console → Bedrock → Guardrails → Create. See `setup-kb.js` output for recommended configuration.

---

## 4. Amazon Comprehend — Sentiment & PII Detection

**What it does:**

### Sentiment Analysis
- Every user chat message is analyzed for sentiment (POSITIVE / NEGATIVE / NEUTRAL / MIXED)
- Sentiment scores and classification are stored with each chat turn
- **Auto-escalation:** If 2+ consecutive user messages are NEGATIVE with >0.7 confidence, the system triggers automatic escalation to a human agent
- Escalation packets include a sentiment summary (trend, counts, last sentiment)

### PII Detection
- Chat messages are scanned for PII entities (SSN, credit card, passport, etc.)
- PII detection results are logged as metrics
- Flagged in the chat response (`piiDetected: true`)

**Chat response now includes:**
```json
{
  "assistant": "...",
  "sentiment": { "current": "NEUTRAL", "scores": { "positive": 0.1, "negative": 0.05, "neutral": 0.8, "mixed": 0.05 } },
  "autoEscalation": null,
  "piiDetected": false,
  "source": "bedrock"
}
```

**Auto-escalation response (when triggered):**
```json
{
  "autoEscalation": {
    "triggered": true,
    "reason": "Passenger sentiment detected as NEGATIVE for 3 consecutive messages",
    "consecutiveNegative": 3
  }
}
```

**Enable:**
```env
USE_COMPREHEND=true
```

**Prerequisites:** No setup needed — Comprehend is a fully managed API. Lambda role has `comprehend:DetectSentiment` and `comprehend:DetectPiiEntities` permissions.

---

## 5. Amazon Translate — Multi-Language Notifications

**What it does:** Translates proactive notification copy into the passenger's preferred language.

**How it works:**
1. When a disruption is created, if the passenger has a `preferredLanguage` field set to a non-English code (e.g., `"es"`, `"fr"`, `"de"`), the notification body and CTA buttons are translated
2. The original English text is preserved as `originalBody` for audit
3. Supports 75+ languages via Amazon Translate

**Usage — set passenger language in disruption request:**
```json
{
  "type": "cancellation",
  "passenger": {
    "firstName": "Maria",
    "preferredLanguage": "es",
    ...
  }
}
```

**Notification response includes:**
```json
{
  "body": "Estimada Maria (miembro Platinum)...",
  "originalBody": "Dear Maria (Platinum member)...",
  "language": "es",
  "translatedFrom": "en"
}
```

**Enable:**
```env
USE_TRANSLATE=true
```

**Prerequisites:** No setup needed — Translate is a fully managed API.

---

## Local Development

All AI services default to **OFF** for frictionless local development:

```
  AI Capabilities:
    Bedrock Chat:      ⬚ OFF (fallback)
    Knowledge Base:    ⬚ OFF (fallback)
    Guardrails:        ⬚ OFF
    Comprehend:        ⬚ OFF (neutral)
    Translate:         ⬚ OFF (English)
    Voice Sessions:    ✅ ON
    Voice Transport:   simulated-stream
```

**Fallback behavior:**
| Service | When OFF |
|---|---|
| Bedrock Chat | Deterministic option summary response |
| Knowledge Base | Policy-specific fallback text (hardcoded EU261/GDPR summaries) |
| Guardrails | No filtering applied |
| Comprehend | Returns `NEUTRAL` sentiment, no PII detected |
| Translate | Returns original English text |

---

## Voice Session Metrics

Voice interactions emit operational `METRIC:` logs for review and pilot tracking:

| Metric | Description |
|---|---|
| `VOICE_SESSION_STARTED` | Voice session created successfully |
| `VOICE_RESPONSE_SENT` | Voice turn response returned to user |
| `VOICE_FALLBACK_USED` | Fallback response path used for voice turn |
| `TRANSFER_REQUESTED` | Human transfer request accepted |
| `TRANSFER_STATUS_UPDATED` | Transfer status transitioned (in progress/completed/unavailable) |

To enable services locally, set the flags in `.env` and ensure valid AWS credentials.

---

## Deployment

All new services are configured via SAM parameters in `template.yaml`:

```bash
sam deploy \
  --parameter-overrides \
    ParameterKey=UseBedrock,ParameterValue=true \
    ParameterKey=UseKnowledgeBase,ParameterValue=true \
    ParameterKey=KnowledgeBaseId,ParameterValue=YOUR_KB_ID \
    ParameterKey=UseGuardrails,ParameterValue=true \
    ParameterKey=GuardrailId,ParameterValue=YOUR_GUARDRAIL_ID \
    ParameterKey=GuardrailVersion,ParameterValue=1 \
    ParameterKey=UseComprehend,ParameterValue=true \
    ParameterKey=UseTranslate,ParameterValue=true
```

---

## Cost Estimates (per 1,000 disruption events)

| Service | Estimated Cost | Basis |
|---|---|---|
| Bedrock (Claude 3 Haiku) | ~$0.50 | ~3 chat turns × 500 tokens avg |
| Bedrock Knowledge Base | ~$5/month | OpenSearch Serverless minimum |
| Bedrock Guardrails | ~$0.75 | Per-assessment pricing |
| Comprehend Sentiment | ~$0.30 | $0.0001 per unit (100 chars) |
| Comprehend PII | ~$0.30 | $0.0001 per unit |
| Translate | ~$0.15 | $15 per million chars |

All services are pay-per-use with no minimum commitment (except OpenSearch Serverless for KB).
