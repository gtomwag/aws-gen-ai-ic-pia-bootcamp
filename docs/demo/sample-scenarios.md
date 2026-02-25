# 🧪 Sample Demo Scenarios

These scenarios can be run live against the local dev server. Each modifies the `POST /disruption` request body.

---

## Scenario 1: Weather Cancellation at FRA — Platinum Focus

**Story:** Severe thunderstorm causes runway closure at Frankfurt. UA891 FRA→JFK cancelled. 200 passengers affected, including ~16 Platinum members. Alice Anderson (Platinum) is the demo focus passenger.

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
    "flightNumber": "UA891",
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

**Story:** UA452 ORD→DEN delayed 45 minutes due to ATC flow control. Carlos (Gold tier) has a connecting flight with only 50 minutes connection time — at risk of missing it.

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
    "flightNumber": "UA452",
    "date": "2026-02-25",
    "hasApp": true,
    "consentForProactive": true,
    "passengerId": "PAX-0042",
    "constraints": ["arrive_before_21_00"],
    "specialRequirements": null,
    "connectionRisk": {
      "connectingFlight": "UA1789",
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
  -d '{"type":"DELAY","reason":"ATC flow control – 45 minute departure delay","airport":"ORD","passengerCount":150,"passenger":{"firstName":"Carlos","lastName":"Chen","tier":"Gold","origin":"ORD","destination":"SFO","flightNumber":"UA452","date":"2026-02-25","hasApp":true,"consentForProactive":true,"passengerId":"PAX-0042","constraints":["arrive_before_21_00"],"specialRequirements":null,"connectionRisk":{"connectingFlight":"UA1789","connectionAirport":"DEN","connectionTime":50,"atRisk":true}}}'
```

---

## Scenario 3: No Viable Options — Forced Escalation

**Story:** UA220 LAX→NRT (Los Angeles to Tokyo Narita) cancelled due to mechanical issue. Only one daily flight on this route; no partner availability. Priya (General tier) has no good automated options — system must escalate.

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
    "flightNumber": "UA220",
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
  -d '{"type":"CANCELLATION","reason":"Mechanical issue – engine inspection required","airport":"LAX","passengerCount":280,"passenger":{"firstName":"Priya","lastName":"Patel","tier":"General","origin":"LAX","destination":"NRT","flightNumber":"UA220","date":"2026-02-25","hasApp":false,"consentForProactive":false,"passengerId":"PAX-0199","constraints":[],"specialRequirements":"Wheelchair assistance","connectionRisk":null}}'
```

After creating the disruption (note the `sessionId` from the response), escalate:

```bash
curl -X POST http://127.0.0.1:3000/escalate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID_FROM_ABOVE>","reason":"No viable automated options for LAX-NRT route"}'
```
