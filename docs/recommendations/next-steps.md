# Next Steps — POC to PRD Roadmap

Prioritized list of steps to evolve the 1-day POC into the full PRD production system.

---

## Priority 1: Core Integrations (Weeks 1–4)

### 1.1 Real Ops Feed Integration
- Connect to airline flight status API (e.g., FlightAware, OAG, internal ops system)
- Replace synthetic disruption creation with real-time event ingestion
- EventBridge rule to trigger disruption workflow on status change
- **Effort:** 2–3 weeks | **Dependencies:** API access, credentials

### 1.2 PSS / GDS Integration
- Connect to Amadeus, Sabre, or internal PSS for real inventory
- Replace static option templates with live seat/fare queries
- Implement actual booking confirmation (PNR creation/modification)
- **Effort:** 3–4 weeks | **Dependencies:** GDS contract, certification

### 1.3 Loyalty System Integration
- Read tier status, miles balance, preferences from loyalty platform
- Enable miles-based option ranking and earn/burn calculations
- **Effort:** 1–2 weeks | **Dependencies:** Loyalty API access

---

## Priority 2: Orchestration & AI (Weeks 2–6)

### 2.1 Step Functions Workflow
- Replace single Lambda with Step Functions state machine:
  - Disruption Detection → Impact Assessment → Option Generation → Notification → Wait for Response → Booking/Escalation
- Enable parallel processing of passenger batches (100 passengers/batch)
- Add retry logic, error handling, timeout management
- **Effort:** 2–3 weeks

### 2.2 Bedrock Agents + Guardrails
- Deploy Bedrock Agent for natural language option comparison and recommendation
- Configure Guardrails:
  - PII filtering (mask SSN, passport numbers in logs)
  - Tone enforcement (empathetic, professional)
  - Policy adherence (no unauthorized compensation promises)
- Set up Knowledge Base with:
  - EU261 regulation text
  - Airline policy documents
  - FAQ/SOP for common disruption types
- **Effort:** 2–3 weeks

### 2.3 Smart Option Ranking
- Replace rule-based ranking with ML model (or Bedrock-powered ranking)
- Factors: historical acceptance rate, tier preferences, route popularity, cost optimization
- A/B test ranking strategies
- **Effort:** 3–4 weeks

---

## Priority 3: Notification & Channels (Weeks 3–5)

### 3.1 Push Notifications
- Integrate APNS (iOS) and FCM (Android) for real push
- Implement notification service with retry and delivery confirmation
- Track open rates and engagement
- **Effort:** 2 weeks

### 3.2 SMS/Email Channels
- Integrate Twilio (SMS) and Amazon SES (email) for fallback channels
- Implement channel preference management per passenger
- Template management for multi-language support
- **Effort:** 1–2 weeks

### 3.3 WhatsApp / Rich Messaging
- WhatsApp Business API for interactive rebooking (button-based option selection)
- Rich push notifications with action buttons
- **Effort:** 2–3 weeks

---

## Priority 4: Observability & Metrics (Weeks 3–6)

### 4.1 CloudWatch Dashboards
- Create operational dashboard:
  - Disruptions/hour, passengers/disruption, resolution rate
  - Average time to first option, time to booking
  - Call deflection rate (auto-resolved / total)
  - Escalation rate by tier
- Create business dashboard:
  - Revenue protected, cost of rebooking
  - CSAT scores by tier and disruption type
  - Premium member retention impact
- **Effort:** 1–2 weeks

### 4.2 X-Ray Distributed Tracing
- Enable X-Ray on all Lambda functions and API Gateway
- Trace end-to-end latency: disruption → notification → booking
- Identify bottlenecks in option generation and PSS calls
- **Effort:** 1 week

### 4.3 Alerting & SLAs
- CloudWatch Alarms for:
  - Option generation >5s (SLA target: <3s)
  - Escalation rate >20% (target: <15%)
  - Error rate >1%
- PagerDuty/Slack integration for on-call
- **Effort:** 1 week

---

## Priority 5: Security Hardening (Weeks 4–8)

### 5.1 Authentication & Authorization
- Amazon Cognito user pools for passenger authentication
- API key management for service-to-service calls
- JWT token validation on all endpoints
- **Effort:** 2 weeks

### 5.2 Encryption
- KMS customer-managed keys for DynamoDB encryption at rest
- Field-level encryption for PII fields (name, contact)
- TLS 1.2+ enforced on all endpoints
- **Effort:** 1 week

### 5.3 Network Security
- WAF rules on API Gateway (rate limiting, IP filtering, SQL injection protection)
- VPC endpoints for DynamoDB and Bedrock (no public internet)
- Security groups for any EC2/ECS components
- **Effort:** 1–2 weeks

### 5.4 Compliance & Audit
- CloudTrail enabled for all API calls
- DynamoDB Streams → Lambda → S3 for immutable audit log
- Data classification tags on all resources
- Annual penetration testing schedule
- **Effort:** 2 weeks

---

## Priority 6: Data Retention & Consent (Weeks 5–8)

### 6.1 Data Retention Policies
- DynamoDB TTL: 90 days for session data, 7 years for booking records
- S3 lifecycle: transition to Glacier after 1 year
- Automated purge jobs for expired data
- **Effort:** 1 week

### 6.2 Consent Management
- Consent service: track opt-in/opt-out for push, SMS, email, data processing
- Right to erasure endpoint (GDPR Article 17)
- Data portability export (GDPR Article 20)
- **Effort:** 2–3 weeks

---

## Priority 7: Scale & Performance (Weeks 6–10)

### 7.1 Load Testing
- Target: 5,000 passengers per disruption, 10 concurrent disruptions
- k6 or Artillery load tests against staging environment
- Identify and fix bottlenecks (DynamoDB throughput, Lambda concurrency)
- **Effort:** 2 weeks

### 7.2 Multi-Region
- DynamoDB Global Tables for multi-region active-active
- CloudFront for global web UI distribution
- Route 53 latency-based routing
- **Effort:** 3–4 weeks

### 7.3 Performance Optimization
- Lambda provisioned concurrency for <100ms cold starts
- DynamoDB DAX for read-heavy option queries
- Connection pooling for PSS/GDS calls
- **Effort:** 2 weeks

---

## What We Did Not Look At (Out of Scope for POC)

- **Multi-language support** — notification copy in 20+ languages
- **Accessibility (WCAG 2.1 AA)** — full screen-reader support, keyboard navigation
- **Crew rebooking** — separate workflow for repositioning crew
- **Revenue optimization** — dynamic pricing for rebooking options
- **Partner airline deep integration** — Star Alliance/codeshare complexity
- **Airport operations integration** — gate reassignment, ground handling
- **Refund processing** — payment gateway integration
- **Regulatory reporting** — automated EU261 compensation claim tracking
- **Mobile app native implementation** — React Native / Swift / Kotlin
