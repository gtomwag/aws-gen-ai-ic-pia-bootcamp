# GDPR Data Handling Guide — Disruption Management System

## Overview

This document outlines how personal data is handled within the GenAI Disruption Management system in compliance with the General Data Protection Regulation (EU) 2016/679 (GDPR).

## Lawful Basis for Processing

| Data Processing Activity | Lawful Basis | GDPR Article |
|---|---|---|
| Passenger rebooking during disruption | **Contractual necessity** — performance of the transport contract | Article 6(1)(b) |
| Proactive notification (push/SMS/email) | **Legitimate interest** + **Consent** — consent required for push/SMS | Article 6(1)(a) and (f) |
| AI-assisted chat and option recommendation | **Contractual necessity** — assisting with rebooking | Article 6(1)(b) |
| Sentiment analysis of chat messages | **Legitimate interest** — improving service quality | Article 6(1)(f) |
| Escalation packet creation | **Contractual necessity** — resolving the transport disruption | Article 6(1)(b) |
| Metrics and analytics (anonymized) | **Legitimate interest** — operational improvement | Article 6(1)(f) |

## Personal Data Categories

### Data Collected

| Category | Data Fields | Sensitivity | Retention |
|---|---|---|---|
| **Identity** | First name, last name, passenger ID | Standard | Duration of journey + 90 days |
| **Contact** | Email, phone number, app user ID | Standard | Duration of journey + 90 days |
| **Travel** | Booking reference (PNR), flight numbers, route, seat class | Standard | 7 years (regulatory) |
| **Loyalty** | Tier status, miles balance | Standard | As per loyalty program terms |
| **Preferences** | Language, notification channel, constraints | Standard | Duration of journey + 90 days |
| **Accessibility** | Reduced mobility status, special requirements | Special category (health) | Duration of journey + 30 days |
| **Communication** | Chat transcripts, notification history | Standard | 90 days |
| **Behavioral** | Sentiment scores, option selection history | Standard | 90 days (anonymized after) |

### Data NOT Collected or Stored

- Payment card details (handled by separate PCI-DSS compliant system)
- Passport/ID document numbers (referenced by booking system only)
- Biometric data
- Racial/ethnic origin, political opinions, religious beliefs

## Data Subject Rights

### Right to Access (Article 15)

Passengers can request a copy of all personal data held about them. The system should be able to export:
- Session data (chat transcripts, options shown, selections)
- Notification history
- Escalation records
- Sentiment analysis scores

**Response time**: Within 30 days of request.

### Right to Rectification (Article 16)

Passengers can correct inaccurate personal data. In the disruption system:
- Name corrections → update via booking system
- Contact details → update via customer profile
- Tier status corrections → loyalty program team

### Right to Erasure / Right to be Forgotten (Article 17)

Passengers can request deletion of their personal data when:
- The data is no longer necessary for the purpose it was collected
- Consent is withdrawn (for notification consent)
- The passenger objects to processing and no overriding legitimate interest exists

**Exceptions**: Data required for regulatory compliance (booking records, EU261 claims) cannot be erased during the mandatory retention period.

**Implementation**: The system must support a DELETE request that:
1. Removes chat transcripts and sentiment scores
2. Removes notification history
3. Anonymizes escalation records (replace names with "ANONYMIZED")
4. Retains booking records in anonymized form for regulatory compliance

### Right to Data Portability (Article 20)

Passengers can request their data in a structured, machine-readable format (JSON/CSV).

### Right to Object (Article 21)

Passengers can object to:
- Proactive notifications → update consent status to OPT_OUT
- Sentiment analysis → flag account to skip sentiment processing
- AI-assisted processing → route to human agent only

## Consent Management

### Proactive Notification Consent

| Status | Meaning | Channels Affected |
|---|---|---|
| `OPTED_IN` | Full consent given | Push, SMS, email all available |
| `PUSH_ONLY` | Consent for push notifications only | Push only; email as passive fallback |
| `EMAIL_ONLY` | Consent for email only | Email only |
| `OPTED_OUT` | No proactive notification consent | Email as passive informational only; no marketing |

### How Consent is Captured

1. App onboarding flow → push/SMS opt-in
2. Booking confirmation → email notification opt-in
3. Loyalty program enrollment → marketing communication opt-in
4. Any channel: passenger can text STOP, reply UNSUBSCRIBE, or update in app settings

### Consent Withdrawal

- **Immediate effect**: No further proactive notifications on withdrawn channels
- **Retained data**: Consent history is retained for audit (with timestamp of withdrawal)
- **Impact on service**: Passenger is informed that opting out may delay their awareness of future disruptions

## AI-Specific Data Handling

### Chat Messages Sent to AI (Bedrock)

- Messages are sent to Amazon Bedrock for processing
- Bedrock does **not retain** input/output data for model training (per AWS data processing terms)
- System prompts include passenger context (name, tier, route) — minimized to what's necessary
- Full chat history is stored in DynamoDB (encrypted at rest in production)

### Sentiment Analysis

- Sentiment scores (POSITIVE/NEGATIVE/NEUTRAL/MIXED + confidence) are derived per message
- Scores are used for:
  - Auto-escalation (2+ consecutive NEGATIVE → route to human agent)
  - Quality metrics (anonymized aggregate sentiment per disruption)
- Individual sentiment scores are retained for 90 days, then deleted
- Aggregate/anonymized metrics retained indefinitely

### Knowledge Base / RAG

- Knowledge Base queries send the passenger's question + flight context to the retrieval system
- Retrieved policy documents are public/internal policy text — no PII
- The AI response is grounded in policy documents, reducing hallucination risk

## Security Measures

| Measure | Implementation |
|---|---|
| **Encryption at rest** | DynamoDB encryption with AWS KMS (customer-managed key in production) |
| **Encryption in transit** | TLS 1.2+ on all API endpoints |
| **Access control** | IAM least-privilege roles; Cognito user authentication (production) |
| **Audit logging** | CloudTrail for API calls; DynamoDB Streams for data change audit |
| **PII masking** | Bedrock Guardrails PII filter on all AI interactions |
| **Data minimization** | Only necessary fields sent to AI models; no payment data ever sent |

## Breach Notification

In the event of a personal data breach:
1. **72-hour notification** to the relevant Data Protection Authority (DPA)
2. **Without undue delay** notification to affected passengers if the breach is likely to result in high risk
3. Incident response team documents: scope, affected data, containment actions, remediation
