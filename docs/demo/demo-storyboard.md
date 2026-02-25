# 🎬 Demo Storyboard — Shot List

Each row = one "shot" in the 5-minute demo recording.

| # | Time | Screen | Action | Expected Outcome | Voiceover Focus |
|---|---|---|---|---|---|
| 1 | 0:00–0:20 | README or title slide | Show project name, architecture diagram | Viewer understands context | Problem statement: reactive vs proactive |
| 2 | 0:20–0:45 | README / PRD summary | Scroll through key PRD goals | Viewer understands scope | PRD goals: detect → assess → notify → rebook → escalate |
| 3 | 0:45–1:00 | Browser: `web/index.html` | Show initial UI state — empty chat, "Create Disruption" button visible | Clean starting state | "Let's see this in action" |
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
| 16 | 3:45–4:00 | Browser: escalate button | Click **Escalate** | Escalation panel appears with full context | "Let's see the agent escalation view" |
| 17 | 4:00–4:15 | Browser: escalation panel | Point at priority badge, passenger summary | HIGH priority badge, name, tier, route shown | "Priority: HIGH — Platinum member context pre-loaded" |
| 18 | 4:15–4:25 | Browser: escalation panel | Scroll to AI recommendation | Rule-based recommendation text visible | "AI recommendation: ensure premium resolution" |
| 19 | 4:25–4:35 | Browser: escalation panel | Scroll to policy notes | EU261 + GDPR notes visible | "EU261 compensation guidance and GDPR consent status included" |
| 20 | 4:35–4:50 | Browser: metrics panel | Scroll to metrics log at bottom | All METRIC: entries visible with timestamps | "Structured metrics for CloudWatch dashboards" |
| 21 | 4:50–5:00 | Architecture doc or closing slide | Switch to architecture doc or summary | Target architecture visible | "Path to production: Step Functions, Bedrock Agents, real integrations" |
