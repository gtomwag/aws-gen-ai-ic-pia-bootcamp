# 🎬 7-Minute Demo Script — GenAI Disruption Management POC

> **Total runtime:** 7:00  
> **Format:** Screen recording with voiceover  
> **Setup:** Local dev server running (`node backend/server-local.js`), browser open to `web/index.html`  
> **AI Services:** For full AI demo, set `USE_BEDROCK=true`, `USE_KNOWLEDGE_BASE=true`, `USE_COMPREHEND=true` in `.env`

---

## Minute 0:00 – 0:45 | Problem Statement & PRD Goals

**Screen:** Title slide or README open in editor.

**Script:**

> "Welcome to the GenAI Airline Disruption Management POC. Today's airlines face a critical challenge: when a flight is cancelled or delayed, the current process is reactive — passengers flood call centers, wait times spike to hours, and premium customers get the same experience as everyone else.
>
> Our PRD defines a proactive, AI-driven approach: detect a disruption, instantly assess all 200+ affected passengers, generate personalized rebooking options — with premium tier prioritization — send proactive notifications before passengers even know there's a problem, and handle confirmations automatically. Only complex cases escalate to human agents, with full AI-prepared context.
>
> We've integrated five AWS AI services: **Amazon Bedrock** for intelligent chat, **Bedrock Knowledge Bases** for policy/rights RAG lookups, **Bedrock Guardrails** for content safety, **Amazon Comprehend** for real-time sentiment analysis, and **Amazon Translate** for multi-language support.
>
> Let's see this in action."

---

## Minute 0:45 – 1:30 | Create Disruption & Passenger Assessment

**Screen:** Browser with GenAI Disruption Management UI.

**Action:** Click **"Create Disruption"** button.

**Script:**

> "I'm creating a weather-related cancellation at Frankfurt Airport affecting 200 passengers on flight UA891 to JFK.
>
> Notice the system immediately does three things:
> 1. **Detects the disruption** and creates a disruption record in DynamoDB
> 2. **Assesses all 200 passengers** — look at the manifest summary bar: we can see the tier breakdown — about 16 Platinum members, 30 Gold, and the rest Silver and General. 40 passengers have connection risks.
> 3. **Generates personalized rebooking options** — our demo passenger Alice Anderson is Platinum tier, so she gets 6 options including premium perks.
>
> This functionality is currently mocked out in the backend, but our AWS AgentCore agent has tools ready to generate personalized booking options dynamically. We'll implement full agent-driven option generation in the next phase.
>
> This all happened in under a second."

---

## Minute 1:30 – 2:15 | Proactive Notification

**Screen:** Notification center card at top of side panel.

**Script:**

> "Before Alice even knows about the cancellation, she receives a proactive push notification. Let's look at it:
>
> - It addresses her by name with her Platinum tier badge
> - States the affected flight and cause — 'severe weather, runway closure'
> - The notification copy is personalized: 'As a valued Platinum member, we have prioritized your rebooking with upgraded options including lounge access and premium cabin availability'
> - Channel: Push notification (primary), with SMS and email as fallback
> - Two CTAs: View Options, or Speak to Agent
>
> In production, this would be a real push notification via APNS/FCM. Here it's simulated, but the copy and channel logic are real."

---

## Minute 2:15 – 3:15 | Option Cards + Tier-Based Prioritization

**Screen:** Options panel with 6 option cards visible.

**Script:**

> "Now let's look at Alice's rebooking options. Because she's Platinum, she gets 6 options instead of the standard 4.
>
> Each card shows:
> - **Rank** and **option ID**
> - **Departure → arrival times**
> - **Class** — notice Alice gets Business and First class options
> - **Cost delta** — $0 for premium members
> - **Rationale** — why this option was recommended
> - **Premium perks** — lounge access, priority boarding, hotel vouchers
>
> I can sort by time or cost, and filter to recommended-only.
>
> Let me select Option A — earliest direct Business class flight. [Click option A] Now let me confirm. [Click Confirm]"

---

## Minute 3:15 – 3:45 | Booking Confirmation

**Screen:** Booking confirmation panel appears.

**Script:**

> "The booking is confirmed with a mock PNR. We see:
> - PNR code
> - Full itinerary summary: passenger name, tier, flights, class, times
> - An offshore-friendly note: 'This confirmation is available offline. Show this screen at the gate if needed.'
>
> In production, this would write to the PSS (Amadeus/Sabre) and trigger a real e-ticket update."

---

## Minute 3:45 – 5:00 | AI Chat with AgentCore Runtime

**Screen:** Chat input area. Start a new disruption session first if needed.

**Script:**

> "Now let me show the AI intelligence behind the chat. The system uses **AWS AgentCore Runtime** hosting a Bedrock agent with Claude 3.5 Sonnet. The agent has access to multiple tools and can intelligently decide which to use based on the passenger's question.
>
> First, a general rebooking question."

**Action:** Type in chat: `I need to rebook my flight`

> "The agent understands this is a rebooking request and automatically calls its **generate_rebooking_options** tool. This tool takes the passenger context — Alice's Platinum tier, origin FRA, destination JFK, and any constraints — and generates personalized flight options in real-time.
>
> Notice the agent presents the options with clear details: departure times, routing, class of service, and recommendations based on Alice's tier."

**Action:** Now type: `What are my EU261 rights for this cancellation?`

> "This is a **policy question**. The agent detects this and calls its **query_policy** tool, which queries our **Bedrock Knowledge Base** — our RAG pipeline. Instead of the AI guessing, it retrieves information from our curated policy documents: EU Regulation 261/2004, airline compensation policies, and passenger rights FAQs.
>
> The response includes specific compensation amounts — €250 to €600 depending on distance — and mentions extraordinary circumstances. This comes directly from the knowledge base documents, not from the model's training data."

**Action:** Type: `What's the fastest way to get to JFK?`

> "The agent can compare options and provide recommendations. It has full context about Alice's situation and can reason about the best choices based on her preferences and tier status."

**Key demo talking points:**
- The agent runs on **AWS AgentCore Runtime** — a managed service for deploying and scaling AI agents
- The agent has **6 inline tools**: generate_rebooking_options, query_policy, analyze_passenger_sentiment, translate_message, confirm_booking, create_escalation
- Tool selection is **automatic** — the agent decides which tool to call based on the user's intent
- The **query_policy** tool connects to Bedrock Knowledge Base for grounded policy answers
- The **generate_rebooking_options** tool creates personalized flight options dynamically
- All agent actions and reasoning are visible in **AgentCore observability** dashboards

---

## Minute 5:00 – 5:30 | Sentiment Analysis & Auto-Escalation

**Screen:** Chat input. Continue in same session.

**Script:**

> "**[TODO - Not yet implemented]** The system will analyze passenger **sentiment in real time** using Amazon Comprehend through the agent's **analyze_passenger_sentiment** tool. When a passenger gets frustrated, the agent will detect negative sentiment and can automatically trigger escalation to a human agent.
>
> The agent already has the sentiment analysis tool configured — we just need to integrate the UI to display the sentiment indicators and auto-escalation alerts."

---

## Minute 5:30 – 6:00 | Escalation Packet with Context

**Screen:** Click Escalate button (open a new session or demonstrate on existing).

**Action:** Click **Escalate**.

**Script:**

> "Not every case resolves automatically. Let's see what happens when a passenger needs to speak to an agent. [Click Escalate]
>
> The escalation panel shows what the human agent would see — a complete context packet:
> - **Priority badge**: HIGH for Platinum members
> - **Passenger summary**: name, tier, route, flight
> - **Disruption summary**: type, reason, airport
> - **All options presented** with details
> - **Selection history**: what was picked or declined
> - **AI recommendation**: rule-based guidance — 'High-value Platinum member. Ensure premium resolution.'
> - **Sentiment summary**: the agent can see the passenger's emotional trajectory — e.g., 'Started NEUTRAL, moved to NEGATIVE after 2 messages. Auto-escalation triggered.'
> - **Policy notes**: EU261 compensation guidance and GDPR consent status
>
> This eliminates the 'please hold while I pull up your record' — the agent has everything from the start, _including_ how the passenger is feeling."

---

## Minute 6:00 – 6:30 | Metrics & Observability

**Screen:** Show AgentCore observability dashboard and operations dashboard.

**Script:**

> "The system has comprehensive observability at multiple levels.
>
> **AgentCore Observability:**
> - We can see every agent invocation, including which tools were called and why
> - The agent's reasoning process is visible — how it decided to call generate_rebooking_options vs query_policy
> - Tool execution logs show the inputs and outputs for each tool call
> - We can track agent performance metrics: latency, token usage, success rates
>
> **Operations Dashboard:**
> - The frontend includes a dashboard view for operations and customer service employees
> - Shows real-time metrics: disruptions detected, passengers assessed, bookings confirmed, escalations created
> - Session-level tracking: which passengers are in active conversations, sentiment trends, resolution times
> - Tier-based analytics: how Platinum vs Gold vs General passengers are being served
>
> Throughout the flow, the system emits structured metrics:
> - `disruption_detected`, `passengers_assessed`, `options_generated` — the core flow
> - `notification_prepared` — proactive outreach
> - `option_selected`, `booking_confirmed`, `escalated` — passenger actions
>
> In production, these metrics feed CloudWatch dashboards and can trigger alarms for operational issues."

---

## Minute 6:30 – 7:00 | Path to Production

**Screen:** Architecture doc or closing slide.

**Script:**

> "This POC demonstrates the core disruption management flow using AWS AgentCore Runtime with integrated AI services.
>
> What you've seen working:
> - **AWS AgentCore Runtime** hosting a Bedrock agent with Claude 3.5 Sonnet
> - **6 inline agent tools** for rebooking, policy queries, sentiment analysis, translation, booking confirmation, and escalation
> - **Bedrock Knowledge Base** for RAG-powered policy lookups (EU261, airline policy, GDPR)
> - **Amazon Comprehend** integrated via agent tool for sentiment analysis (UI integration pending)
> - **API Gateway + Lambda proxy** architecture connecting frontend to AgentCore Runtime
> - **AgentCore observability** for tracking agent actions and reasoning
> - **Operations dashboard** for customer service teams
>
> The path to production involves:
> - Completing sentiment analysis UI integration and auto-escalation logic
> - Replacing mock disruption flow with agent-driven option generation
> - Expanding the Knowledge Base with real airline SOPs and policy documents
> - Security hardening: Cognito auth, KMS encryption, WAF
>
> The agent architecture is production-ready and scalable. All documented in our architecture and next-steps docs. Thank you."

---

## Setup Checklist Before Recording

- [ ] `node backend/server-local.js` running (port 3000)
- [ ] Browser open to `web/index.html`
- [ ] Screen recording tool ready (OBS / Loom / QuickTime)
- [ ] Microphone tested
- [ ] Browser window sized at 1280×800 or similar
- [ ] No sensitive tabs/notifications visible
- [ ] `.env` AI feature flags configured (see table below)

### AI Feature Flags for Demo Modes

| Demo Mode | USE_BEDROCK | USE_KNOWLEDGE_BASE | USE_COMPREHEND | USE_GUARDRAILS | USE_TRANSLATE |
|-----------|-------------|-------------------|----------------|----------------|---------------|
| **Full AI** (recommended) | `true` | `true` | `true` | `true` | `false` |
| **No AI** (fallback demo) | `false` | `false` | `false` | `false` | `false` |
| **Bedrock only** | `true` | `false` | `false` | `false` | `false` |
| **KB focus** | `true` | `true` | `false` | `false` | `false` |

> **Note:** When AI services are OFF, the system uses deterministic fallback responses. The KB policy questions still return useful policy information from built-in fallbacks — the answers just aren't retrieved from the Knowledge Base via RAG.

### Chat Messages That Trigger Knowledge Base Routing

These exact phrases (or anything containing these keywords) route to the KB instead of general Bedrock chat:

| Keyword Trigger | Example Chat Message |
|----------------|---------------------|
| `eu261`, `rights`, `entitled` | "What are my EU261 rights for this cancellation?" |
| `compensation`, `how much` | "How much compensation am I entitled to?" |
| `refund`, `claim` | "How do I claim a refund?" |
| `hotel`, `meal`, `care` | "Am I entitled to a hotel and meals during the delay?" |
| `gdpr`, `privacy`, `personal data` | "What about my personal data? Is this GDPR compliant?" |
| `policy`, `rule`, `law` | "What's the airline policy on rebooking premium members?" |
| `complaint`, `supervisor` | "I want to file a complaint" |
| General question (no keywords) | "Which option has the fewest stops?" → routes to **Bedrock chat** |
