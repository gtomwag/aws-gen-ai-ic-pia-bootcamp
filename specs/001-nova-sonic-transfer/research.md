# Phase 0 Research: Voice Agent Transfer

## 1) Voice Transport Between Browser and Backend

**Decision**: Use browser Web Audio capture/playback with WebSocket bidirectional streaming for near-real-time audio exchange.

**Rationale**:
- Supports low-latency full-duplex interaction needed for a natural voice conversation.
- Fits existing web app model (plain JS) without introducing heavy frontend frameworks.
- Keeps backend in control of session state and transfer events.

**Alternatives considered**:
- HTTP polling/chunk upload: simpler but too high-latency for conversational UX.
- MediaRecorder batch upload: easier implementation but not interactive enough.
- Third-party voice SDK: faster prototyping but adds external dependency and integration lock-in.

## 2) Nova Sonic 2 + Knowledge Base Grounding

**Decision**: Add a backend voice orchestration layer that invokes Bedrock Nova Sonic 2 for speech interaction and reuses the existing Knowledge Base routing logic for policy/disruption grounding.

**Rationale**:
- Preserves current Bedrock + KB investment and citation behavior.
- Avoids splitting logic into a new service, minimizing architecture drift.
- Keeps fallback behavior consistent with existing `USE_BEDROCK` and `USE_KNOWLEDGE_BASE` toggles.

**Alternatives considered**:
- Separate voice microservice: cleaner separation but unnecessary complexity for MVP.
- Replace existing chat pipeline entirely: high regression risk and poor scope fit.
- Frontend-direct Bedrock calls: security and credential-management concerns.

## 3) Human Transfer Detection and State Model

**Decision**: Treat transfer as a first-class session state transition (`requested` → `in_progress` → `completed|unavailable`) triggered by explicit user request or transfer intent detection.

**Rationale**:
- Directly maps to FR-007/FR-008 and measurable status updates (SC-003).
- Aligns with existing escalation endpoint semantics and session metadata storage.
- Enables idempotent handling for repeated transfer requests.

**Alternatives considered**:
- Stateless transfer call only: cannot provide robust status lifecycle.
- Client-only transfer tracking: weak auditability and inconsistent state.

## 4) Observability and Logging

**Decision**: Extend existing `METRIC:` backend logging with voice/transfer event names and persist transfer event records per session.

**Rationale**:
- Matches current operational pattern used in `handler.js`.
- Satisfies FR-010 with minimal additional platform requirements.
- Enables clear pilot analytics for session starts, failures, and handoff outcomes.

**Alternatives considered**:
- New external telemetry stack: useful later but out of MVP scope.
- Frontend-only logs: insufficient for trusted operational review.

## 5) MVP Testing Strategy

**Decision**: Use focused backend unit tests for state transitions and fallback logic plus end-to-end manual validation in local dev for voice start, grounded responses, and transfer flows.

**Rationale**:
- Covers highest-risk behaviors quickly in this PoC codebase.
- Avoids over-investing in browser audio automation before interface stabilizes.
- Keeps test scope aligned to acceptance scenarios.

**Alternatives considered**:
- Full browser automation for audio path: high setup overhead for early MVP.
- Manual-only testing: too fragile for transfer state/fallback regressions.
