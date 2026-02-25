# 🎬 5-Minute Demo Script — GenAI Disruption Management POC

> **Total runtime:** 5:00  
> **Format:** Screen recording with voiceover  
> **Setup:** Local dev server running (`node backend/server-local.js`), browser open to `web/index.html`

---

## Minute 0:00 – 0:45 | Problem Statement & PRD Goals

**Screen:** Title slide or README open in editor.

**Script:**

> "Welcome to the GenAI Airline Disruption Management POC. Today's airlines face a critical challenge: when a flight is cancelled or delayed, the current process is reactive — passengers flood call centers, wait times spike to hours, and premium customers get the same experience as everyone else.
>
> Our PRD defines a proactive, AI-driven approach: detect a disruption, instantly assess all 200+ affected passengers, generate personalized rebooking options — with premium tier prioritization — send proactive notifications before passengers even know there's a problem, and handle confirmations automatically. Only complex cases escalate to human agents, with full AI-prepared context.
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

## Minute 3:45 – 4:30 | Escalation Packet

**Screen:** Click Escalate button (open a new session or demonstrate on existing).

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
> - **Policy notes**: EU261 compensation guidance and GDPR consent status
>
> This eliminates the 'please hold while I pull up your record' — the agent has everything from the start."

---

## Minute 4:30 – 4:50 | Metrics & Observability

**Screen:** Scroll to metrics log panel at bottom.

**Script:**

> "Throughout the flow, the system emits structured metrics:
> - `disruption_detected`, `passengers_assessed`, `options_generated_ms`, `notification_prepared`, `option_selected`, `booking_confirmed`, `escalated`
>
> In production, these feed CloudWatch dashboards for real-time KPIs: call deflection rate, average resolution time, passenger satisfaction.
>
> The metrics log you see here maps directly to what would appear in a QuickSight dashboard."

---

## Minute 4:50 – 5:00 | Path to Production

**Screen:** Architecture doc or closing slide.

**Script:**

> "This 1-day POC demonstrates the core flow with synthetic data and rule-based logic. The path to production involves:
> - Replacing synthetic data with real ops feeds and PSS integration
> - Adding Step Functions for orchestrated workflows
> - Bedrock Agents with Guardrails for smarter option ranking
> - Full observability with X-Ray, CloudWatch alarms, and QuickSight dashboards
> - Security hardening: Cognito auth, KMS encryption, WAF
>
> All documented in our architecture and next-steps docs. Thank you."

---

## Setup Checklist Before Recording

- [ ] `node backend/server-local.js` running (port 3000)
- [ ] Browser open to `web/index.html`
- [ ] Screen recording tool ready (OBS / Loom / QuickTime)
- [ ] Microphone tested
- [ ] Browser window sized at 1280×800 or similar
- [ ] No sensitive tabs/notifications visible
