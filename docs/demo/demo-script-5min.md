# 🎬 7-Minute Demo Script — DuHast Airlines AI Disruption Management

> **Total runtime:** 7:00  
> **Format:** Screen recording with voiceover  
> **Setup:** Local dev server running (`node backend/server-local.js`), browser open to `web/index.html`  
> **AI Services:** For full AI demo, set `USE_BEDROCK=true`, `USE_KNOWLEDGE_BASE=true`, `USE_COMPREHEND=true` in `.env`

---

## Minute 0:00 – 0:45 | Problem Statement & PRD Goals

**Screen:** Title slide or README open in editor.

**Script:**

> "Welcome to the DuHast Airlines AI Disruption Management POC. When a DuHast Airlines flight is cancelled or delayed, the current process is reactive — passengers flood call centers, wait times spike to hours, and premium customers get the same experience as everyone else.
>
> Our PRD defines a proactive, AI-driven approach: detect a disruption, instantly assess all 200+ affected passengers, generate personalized rebooking options — with premium tier prioritization — send proactive notifications before passengers even know there's a problem, and handle confirmations automatically. Only complex cases escalate to human agents, with full AI-prepared context.
>
> We've integrated **six** AWS AI services: **Amazon Bedrock** for intelligent chat, **Bedrock Knowledge Bases** for policy/rights RAG lookups, **Bedrock Guardrails** for content safety, **Amazon Comprehend** for real-time sentiment analysis, **Amazon Translate** for multi-language support, and **Amazon Bedrock Nova Sonic** for voice-based customer interaction with human transfer capability.
>
> Let's see this in action."

---

## Minute 0:45 – 1:30 | Create Disruption & Passenger Assessment

**Screen:** Browser with GenAI Disruption Management UI.

**Action:** Click **"Create Disruption"** button.

**Script:**

> "I'm creating a weather-related cancellation at Frankfurt Airport affecting 200 passengers on DuHast Airlines flight DH891 to JFK.
>
> Notice the system immediately does three things:
> 1. **Detects the disruption** and creates a disruption record
> 2. **Assesses all 200 passengers** — look at the manifest summary bar: we can see the tier breakdown — about 16 Platinum members, 30 Gold, and the rest Silver and General. 40 passengers have connection risks.
> 3. **Generates personalized rebooking options** — our demo passenger Alice Anderson is Platinum tier, so she gets 6 options including premium perks.
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
> In production, DuHast's mobile app would deliver this as a real push notification via APNS/FCM. Here it's simulated, but the copy and channel logic are real."

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

## Minute 3:45 – 5:00 | AI Chat — Knowledge Base vs General Chat

**Screen:** Chat input area. Start a new disruption session first if needed.

**Script:**

> "Now let me show the AI intelligence behind the chat. The system uses **two different AI pathways** depending on what the passenger asks — and it routes automatically.
>
> First, a general question."

**Action:** Type in chat: `Which option has the fewest stops?`

> "This is a general rebooking question. The system routes it to **Amazon Bedrock** (Claude) which has context about Alice's specific options and compares them intelligently.
>
> **Look at the UI** — notice the 🤖 **Bedrock AI** source badge (blue) on the assistant's message. This tells us the response came from the general Bedrock chat path, not the Knowledge Base."

**Action:** Now type: `What are my EU261 rights for this cancellation?`

> "This is a **policy question**. The system detects keywords like 'EU261' and 'rights' and automatically routes to the **Bedrock Knowledge Base** — our RAG pipeline. Instead of the AI guessing, it retrieves information from our curated policy documents: EU Regulation 261/2004, airline compensation policies, and passenger rights FAQs.
>
> **Look at two things in the UI:**
> 1. The source badge changed to 📚 **Knowledge Base** (green) — immediately tells the user this answer is grounded in curated documents
> 2. Below the response, you can see **citation footnotes** — numbered references to the specific KB documents the answer was retrieved from
>
> The response includes specific compensation amounts — €250 to €600 depending on distance — and mentions extraordinary circumstances. This comes directly from the knowledge base documents, not from the model's training data."

**Action:** Type: `Am I entitled to a hotel and meals during the delay?`

> "Another policy question — routed to the Knowledge Base again. Notice the 📚 **Knowledge Base** badge and citation footnotes appear once more. It correctly explains the EU261 duty-of-care provisions: meals after 2 hours for short-haul, hotel for overnight delays, transport included. This is grounded in our actual policy documents."

**Action:** Type: `What about my personal data? Is this GDPR compliant?`

> "Even data privacy questions route through the Knowledge Base. The 📚 badge and citations confirm it. The system retrieves our GDPR data handling policy and explains retention periods, data subject rights, and how to request erasure. This demonstrates that _any_ curated knowledge domain can be added to the KB."

> "Notice what's happening under the hood: the system is making **three parallel AI calls** — Bedrock for the response, Comprehend for sentiment analysis, and Comprehend again for PII detection. Plus Guardrails are filtering the output. Four AWS AI services working together on every single message."

**Key demo talking points:**
- The routing is **automatic** — no user action needed to pick KB vs chat
- **Source badges** make the routing visible: 📚 Knowledge Base (green), 🤖 Bedrock AI (blue), 💬 Fallback (amber)
- **Citation footnotes** appear below KB responses, showing which documents were used — proof of RAG grounding
- Policy keywords like `rights`, `compensation`, `EU261`, `refund`, `hotel`, `meal`, `GDPR`, `privacy` trigger KB routing
- General rebooking questions go to Bedrock chat with full session context
- When KB is disabled or unavailable, the system has built-in **policy fallbacks** (💬 badge) so it never returns "I don't know"

---

## Minute 5:00 – 5:30 | Sentiment Analysis & Auto-Escalation

**Screen:** Chat input. Continue in same session.

**Script:**

> "The system also analyzes passenger **sentiment in real time** using Amazon Comprehend. Watch what happens when a passenger gets frustrated."

**Action:** Type: `This is unacceptable, I've been waiting for hours`

> "**Look at the side panel** — the **Sentiment Indicator Bar** has appeared, showing **NEGATIVE** with the confidence scores broken down: Positive, Negative, Neutral, Mixed percentages. Amazon Comprehend detected this in real time."

**Action:** Type: `I'm extremely frustrated, this is the worst airline experience ever`

> "Two consecutive negative messages with high confidence. Now look at what just happened in the UI:
>
> 1. The **Sentiment Bar** updated again — still NEGATIVE with even higher confidence
> 2. A pulsing red 🚨 **Auto-Escalation Alert** banner appeared at the top of the side panel — this is the system automatically flagging the session for human agent intervention
>
> No human had to make that judgment call. The auto-escalation rule fired: 2+ consecutive NEGATIVE messages with >70% confidence. In the metrics panel, you can also see `SENTIMENT_AUTO_ESCALATE` logged."

---

## Minute 5:30 – 5:50 | Voice Agent with Nova Sonic

**Screen:** Click "Speak to Agent" voice button.

**Script:**

> "DuHast Airlines also integrates **Amazon Bedrock Nova Sonic** for voice-based AI interaction. When a passenger presses 'Speak to Agent', a voice session starts.
>
> The voice agent reuses the same AI pipelines — policy questions route to the Knowledge Base, general questions go to Bedrock Claude. But it adds **transfer intent detection**: if the passenger says 'connect me to a human', the system uses NLU pattern matching (5 intent patterns with negation handling) to detect the request and initiate a human handoff with full context.
>
> This is our **sixth AWS AI service** — layered on top of the existing five to provide a multi-modal customer experience."

---

## Minute 5:50 – 6:00 | Escalation Packet with Sentiment Context

## Minute 6:00 – 6:00 | Escalation with AI Context

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

**Screen:** Scroll to metrics log panel at bottom.

**Script:**

> "Throughout the flow, the system emits structured metrics. Look at how rich these are now:
> - `disruption_detected`, `passengers_assessed`, `options_generated_ms` — the core flow
> - `notification_prepared` — proactive outreach
> - `CHAT_KB_ROUTED` — tracks when a question was sent to the Knowledge Base
> - `CHAT_TURN` with `source: knowledge-base` vs `source: bedrock` — shows which AI path answered
> - `CHAT_PII_DETECTED` — flagged if sensitive data appeared in chat (also visible as a 🔒 badge on the user's message in the UI)
> - `SENTIMENT_AUTO_ESCALATE` — triggered when consecutive negative sentiment exceeded the threshold
> - `option_selected`, `booking_confirmed`, `escalated`
>
> Notice how the UI surfaces these insights directly:
> - **Source badges** (📚/🤖/💬) on each assistant message
> - **Citation footnotes** below KB-sourced responses
> - **Sentiment indicator bar** in the side panel with real-time confidence scores
> - **Auto-escalation alert** (pulsing red 🚨 banner) when the threshold is exceeded
> - **PII detection badge** (🔒) on user messages containing sensitive data
>
> In production, the backend metrics feed CloudWatch dashboards. You could build KPIs like: 'What % of chat turns are KB-answered vs Bedrock vs fallback?' or 'How often does sentiment auto-escalation fire?'"

---

## Minute 6:30 – 7:00 | Path to Production

**Screen:** Architecture doc or closing slide.

**Script:**

> "This POC demonstrates the core disruption management flow integrated with six AWS AI services — all deployed as a single SAM stack.
>
> What you've seen working:
> - **Bedrock Claude** for intelligent, context-aware chat
> - **Bedrock Knowledge Bases** for RAG-powered policy lookups (EU261, airline policy, GDPR)
> - **Amazon Comprehend** for real-time sentiment analysis and auto-escalation
> - **Bedrock Guardrails** for content safety and PII protection
> - **Amazon Translate** ready for multi-language notifications (75+ languages)
> - **Bedrock Nova Sonic** for voice-based AI interaction with human transfer capability
>
> The path to production for DuHast Airlines involves:
> - Replacing synthetic data with real ops feeds and PSS integration
> - Adding Step Functions for orchestrated workflows
> - Expanding the Knowledge Base with real airline SOPs and policy documents
> - Full observability with X-Ray, CloudWatch alarms, and QuickSight dashboards
> - Security hardening: Cognito auth, KMS encryption, WAF
>
> Every AI service is feature-flagged — you can enable them individually. All documented in our architecture and next-steps docs. Thank you."

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
