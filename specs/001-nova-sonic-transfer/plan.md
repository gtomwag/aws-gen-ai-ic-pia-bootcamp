# Implementation Plan: Voice Agent Transfer

**Branch**: `001-nova-sonic-transfer` | **Date**: 2026-02-25 | **Spec**: `/specs/001-nova-sonic-transfer/spec.md`
**Input**: Feature specification from `/specs/001-nova-sonic-transfer/spec.md`

## Summary

Add an MVP voice-assistant path that starts from a new "Speak to an agent" control in the web UI, opens a near-real-time voice session backed by Bedrock Nova Sonic 2, grounds policy answers through the existing Bedrock Knowledge Base flow, and supports explicit/intent-detected transfer to a human agent with clear state updates and fallback.

## Technical Context

**Language/Version**: JavaScript (Node.js 18 backend, Vanilla JS frontend)
**Primary Dependencies**: AWS SAM, API Gateway + Lambda, AWS SDK v3 (`@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-bedrock-agent-runtime`), browser Web Audio API, WebSocket transport
**Storage**: DynamoDB (deployed) + in-memory local store (`USE_LOCAL_STORE=true`)
**Testing**: Manual browser/API validation, targeted backend unit tests via Node test runner/Jest (to be added for new voice state logic)
**Target Platform**: Web browser frontend + AWS Lambda backend
**Project Type**: Web application (static frontend + serverless backend)
**Performance Goals**: Voice session starts within 3 seconds; transfer status update within 10 seconds (aligned to SC-003)
**Constraints**: Reuse existing architecture and session model; preserve deterministic fallback when AI or routing is unavailable; keep MVP scope to disruption support flows
**Scale/Scope**: Pilot-scale feature for existing disruption assistant sessions with one active voice session per user session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Constitution file availability**: **ERROR (waived for planning)** — `.specify/memory/constitution.md` is not present in this repository; Speckit assets are under `.github/.specify/`.
- **Interim gate used for this plan**: Limit scope to spec requirements, preserve current architecture, include explicit test/observability/privacy treatment.
- **Justification for proceeding**: Planning artifacts are still actionable and bounded; formal constitution ratification should be completed before implementation via `/speckit.constitution`.

## Project Structure

### Documentation (this feature)

```text
specs/001-nova-sonic-transfer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── voice-agent-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── handler.js
│   ├── bedrock.js
│   ├── store.js
│   └── util.js
└── server-local.js

web/
├── index.html
└── app.js

knowledge-base/
└── *.md
```

**Structure Decision**: Keep the existing static-web + Lambda backend structure and add voice-specific logic within current files/modules to minimize integration risk.

## Phase 0 Research Output

See `/specs/001-nova-sonic-transfer/research.md`.

## Phase 1 Design Output

- Data model: `/specs/001-nova-sonic-transfer/data-model.md`
- Interface contracts: `/specs/001-nova-sonic-transfer/contracts/voice-agent-contract.md`
- Validation quickstart: `/specs/001-nova-sonic-transfer/quickstart.md`

## Post-Design Constitution Check

- **Constitution file availability**: **ERROR (still waived for planning)**
- **Scope discipline**: PASS — design remains within FR-001..FR-010 and defined out-of-scope boundaries.
- **Operational readiness**: PASS — metrics and transfer-event logging are explicitly modeled.
- **Fallback and resilience**: PASS — no-answer and transfer-unavailable fallback states defined.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Missing ratified constitution file | Repository bootstrap placed Speckit under `.github/.specify` without `.specify/memory/constitution.md` | Blocking planning would prevent delivery of required plan artifacts; waiver is limited to planning stage only |

