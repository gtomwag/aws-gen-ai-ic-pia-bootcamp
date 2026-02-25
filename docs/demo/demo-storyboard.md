# 🎬 Demo Storyboard — Shot List

Each row = one "shot" in the 7-minute demo recording.

## Act 1 — Problem & Setup (0:00–1:00)

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 1 | 0:00–0:20 | README or title slide | Show project name, architecture diagram | Viewer understands context | Problem statement: reactive vs proactive |
| 2 | 0:20–0:45 | README / PRD summary | Scroll through key PRD goals + AI services list | Viewer sees 5 AWS AI services | PRD goals + "Bedrock, Knowledge Bases, Comprehend, Guardrails, Translate" |
| 3 | 0:45–1:00 | Browser: `web/index.html` | Show initial UI state — empty chat, "Create Disruption" button visible | Clean starting state | "Let's see this in action" |

## Act 2 — Core Flow: Disrupt → Notify → Rebook (1:00–3:45)

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 4 | 1:00–1:15 | Browser | Click **Create Disruption** | System message appears, manifest bar populates, notification card appears, options load | "200 passengers assessed — Platinum, Gold, General breakdown" |
| 5 | 1:15–1:30 | Browser: manifest bar | Hover/point at manifest summary stats | Platinum count, connection-at-risk count, proactive-eligible count visible | "16 Platinum members prioritized, 40 connection risks identified" |
| 6 | 1:30–1:50 | Browser: notification center | Point at notification card | Passenger name, Platinum badge, flight, cause, notification copy visible | "Proactive push notification before Alice even knows" |
| 7 | 1:50–2:05 | Browser: notification copy | Read notification text | Full notification body with tier-personalized messaging | "Personalized copy — premium options, lounge access" |
| 8 | 2:05–2:15 | Browser: notification channels | Point at channel info | "push" primary, sms/email fallback shown | "Push primary, SMS and email fallback" |
| 9 | 2:15–2:35 | Browser: options panel | Scroll through 6 option cards | All cards visible with rank, time, class, cost, rationale, perks | "6 options for Platinum — Business, First, hotel voucher" |
| 10 | 2:35–2:50 | Browser: sort/filter | Click **Sort: Cost**, then **Recommended Only** | Options re-sort; filter shows subset | "Sort and filter for passenger preference" |
| 11 | 2:50–3:00 | Browser: sort/filter | Click **Sort: Time** to reset, click **Recommended Only** to toggle off | Full list returns | "Back to full view" |
| 12 | 3:00–3:10 | Browser: option card | Click **Option A** | Option A highlighted green, system message "Selected Option A" | "Alice picks the earliest direct Business flight" |
| 13 | 3:10–3:20 | Browser: chat | Look at assistant response in chat showing option details | Chat message with option comparison | "AI assistant helped compare tradeoffs" |
| 14 | 3:20–3:35 | Browser: confirm button | Click **Confirm Selected** | Booking panel appears with PNR, itinerary, offline note | "Mock PNR confirmed — itinerary summary with offline access" |
| 15 | 3:35–3:45 | Browser: booking panel | Point at offline note | "Available offline — show at gate" text visible | "Offline-friendly for international travel" |

## Act 3 — Knowledge Base: Policy & Rights via RAG (3:45–5:00)

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 16 | 3:45–4:00 | Browser: chat input | Type: `Which option has the fewest stops?` | Response from **Bedrock chat** with 🤖 **Bedrock AI** source badge (blue) on message | "General question → Bedrock AI with session context" |
| 17 | 4:00–4:15 | Browser: chat | Read response, point at blue source badge | Bedrock compares Alice's options intelligently; badge confirms Bedrock path | "Blue badge = general Bedrock AI with her specific flights" |
| 18 | 4:15–4:30 | Browser: chat input | Type: `What are my EU261 rights for this cancellation?` | Response from **Knowledge Base** with 📚 **Knowledge Base** source badge (green) + citation footnotes below | "Policy question → auto-routed to Knowledge Base (RAG)" |
| 19 | 4:30–4:40 | Browser: chat | Read response — point at green badge + citation footnotes (EU261 €250–€600) | Green badge + numbered citations prove RAG grounding, not hallucination | "Green badge = KB-sourced. Citations prove document grounding" |
| 20 | 4:40–4:50 | Browser: chat input | Type: `Am I entitled to a hotel and meals during the delay?` | KB response with green badge + citations (EU261 duty-of-care thresholds) | "Another KB hit — green badge, citations for meals, hotel, transport" |
| 21 | 4:50–5:00 | Browser: chat input | Type: `What about my personal data? Is this GDPR compliant?` | KB response with green badge + citations (GDPR rights, retention) | "Even GDPR — green badge, citations. Any knowledge domain can be added" |

## Act 4 — Sentiment Analysis & Auto-Escalation (5:00–5:30)

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 22 | 5:00–5:10 | Browser: chat input | Type: `This is unacceptable, I've been waiting for hours` | Response continues normally; **Sentiment Bar** appears in side panel showing **NEGATIVE** with confidence percentages | "Amazon Comprehend detects negative sentiment — look at the Sentiment Bar" |
| 23 | 5:10–5:20 | Browser: chat input | Type: `I'm extremely frustrated, this is the worst experience ever` | 2nd consecutive NEGATIVE → pulsing red 🚨 **Auto-Escalation Alert** banner appears at top of side panel | "2 consecutive negative → red alert banner fires. No human judgment needed" |
| 24 | 5:20–5:30 | Browser: side panel | Point at Sentiment Bar scores + Auto-Escalation Alert banner | Sentiment Bar shows NEGATIVE percentages; red 🚨 banner visible with pulsing animation | "System proactively routes frustrated passengers — visible right in the UI" |

## Act 5 — Escalation with Full AI Context (5:30–6:00)

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 25 | 5:30–5:40 | Browser: escalate button | Click **Escalate** | Escalation panel appears with full context | "Let's see the agent handoff packet" |
| 26 | 5:40–5:50 | Browser: escalation panel | Point at priority badge, passenger summary, sentiment summary | HIGH priority badge, name, tier, sentiment trajectory visible | "Priority: HIGH — plus emotional context: started neutral, turned negative" |
| 27 | 5:50–6:00 | Browser: escalation panel | Scroll to AI recommendation + policy notes | Rule-based recommendation + EU261/GDPR notes visible | "AI recommendation + EU261 guidance + GDPR consent — all pre-loaded" |

## Act 6 — Metrics & Wrap-Up (6:00–7:00)

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 28 | 6:00–6:15 | Browser: metrics panel | Scroll through full metrics log | All metrics visible: CHAT_KB_ROUTED, CHAT_TURN (source), SENTIMENT_AUTO_ESCALATE, CHAT_PII_DETECTED | "Rich telemetry — KB routing %, sentiment trends, PII detection" |
| 29 | 6:15–6:30 | Browser: chat + side panel | Point at UI indicators: source badges (📚/🤖), citations, Sentiment Bar, Auto-Escalation Alert | All 5 visual AI indicators visible simultaneously in the UI | "Every AI service is surfaced visually — badges, citations, sentiment, escalation, PII" |
| 30 | 6:30–6:45 | Architecture doc or closing slide | Switch to architecture doc or summary | Target architecture + 5 AI services visible | "5 AWS AI services, single SAM stack, feature-flagged" |
| 31 | 6:45–7:00 | Closing slide | Show next steps | Viewer understands production path | "Path to production: real data, Step Functions, expanded KB, full observability" |
