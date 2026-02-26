# Quickstart: Voice Agent Transfer MVP

## Objective

Validate the planned voice flow end-to-end: start voice session, ask a grounded question, and request transfer to a human agent.

## Prerequisites

- Node.js 18+
- Backend dependencies installed (`npm run install:backend` from repo root)
- Local backend running (`npm run backend`)
- Frontend served/opened (`npm run frontend` or open `web/index.html`)

## Implementation Checklist

1. Add "Speak to an agent" control in `web/index.html` and wire handlers in `web/app.js`.
2. Implement voice session start endpoint in `backend/src/handler.js`.
3. Implement voice stream handling + integration with Nova Sonic 2 in backend voice flow.
4. Reuse KB routing for policy/disruption answers in voice responses.
5. Add transfer request/status endpoints and transfer lifecycle persistence.
6. Emit required `METRIC:` logs for session, response source, transfer, and fallback events.

## Manual Validation Scenarios

### Scenario A: Start Voice Session
- Open UI and press **Speak to an agent**.
- Expected: session starts, status confirms microphone-ready state.

### Scenario B: Grounded Voice Answer
- Ask: "What compensation am I entitled to under EU261?"
- Expected: spoken/text response is policy-grounded and source-marked (`knowledge-base` when available).

### Scenario C: Transfer to Human Agent
- Say: "I want a human agent."
- Expected: transfer state moves `requested` → `in_progress`; user sees status message quickly.

### Scenario D: Transfer Unavailable Fallback
- Simulate unavailable routing.
- Expected: `unavailable` status and fallback guidance (continue assistant or callback path).

### Scenario E: No Grounded Answer Fallback
- Ask outside available KB scope.
- Expected: clear fallback response and optional transfer suggestion.

## Operational Verification

- Confirm logs include: `VOICE_SESSION_STARTED`, `VOICE_RESPONSE_SENT`, `TRANSFER_REQUESTED`, `TRANSFER_STATUS_UPDATED`, `VOICE_FALLBACK_USED`.
- Confirm transfer records are persisted with status timeline and outcome.

## Implementation Notes (Current)

- Voice session start API: `POST /voice/session/start`
- Voice turn API: `POST /voice/turn` (simulated streaming in local dev)
- Voice transfer APIs: `POST /voice/transfer`, `GET /voice/transfer-status`
- UI controls: **Speak to an agent** and **Transfer in Voice** buttons in `web/index.html`
