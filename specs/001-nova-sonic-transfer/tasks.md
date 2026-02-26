---

description: "Task list for Voice Agent Transfer feature implementation"
---

# Tasks: Voice Agent Transfer

**Input**: Design documents from `/specs/001-nova-sonic-transfer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Test tasks are not explicitly requested as TDD in the feature spec; this plan focuses on implementation tasks plus independent manual validation criteria per story.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare baseline files and UI scaffolding for voice support.

- [x] T001 Add voice feature environment variables in `backend/template.yaml`
- [x] T002 Add local voice feature defaults in `backend/server-local.js`
- [x] T003 Add "Speak to an agent" control shell in `web/index.html`
- [x] T004 Add frontend voice-session state scaffolding in `web/app.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared backend primitives required by all user stories.

**⚠️ CRITICAL**: Complete this phase before starting user story work.

- [x] T005 Add voice session persistence helpers in `backend/src/store.js`
- [x] T006 [P] Add voice status and transfer constants in `backend/src/util.js`
- [x] T007 Create voice orchestration module in `backend/src/voice.js`
- [x] T008 Extend Bedrock integration wrapper for Nova Sonic voice path in `backend/src/bedrock.js`
- [x] T009 Add base routing entries for voice endpoints in `backend/src/handler.js`

**Checkpoint**: Foundation complete; user stories can now be implemented.

---

## Phase 3: User Story 1 - Start Voice Help Session (Priority: P1) 🎯 MVP

**Goal**: User can press "Speak to an agent" and begin an active two-way voice session.

**Independent Test**: Launch app, click "Speak to an agent," verify session activation and at least one voice request/response turn.

### Implementation for User Story 1

- [x] T010 [US1] Implement `POST /voice/session/start` handler in `backend/src/handler.js`
- [x] T011 [US1] Implement voice session lifecycle state updates in `backend/src/store.js`
- [x] T012 [P] [US1] Implement browser microphone capture and stream bootstrap in `web/app.js`
- [x] T013 [P] [US1] Implement session status messaging UI states in `web/index.html`
- [x] T014 [US1] Wire local voice stream endpoint behavior in `backend/server-local.js`
- [x] T015 [US1] Add `VOICE_SESSION_STARTED` and session-end metric logs in `backend/src/handler.js`

**Checkpoint**: User Story 1 is independently functional and demoable.

---

## Phase 4: User Story 2 - Knowledge-Based Answers (Priority: P2)

**Goal**: Voice responses are grounded in existing knowledge base content and keep conversational context.

**Independent Test**: Ask policy/disruption questions by voice and verify grounded, context-consistent responses with fallback when needed.

### Implementation for User Story 2

- [x] T016 [US2] Implement voice utterance ingestion and turn mapping in `backend/src/voice.js`
- [x] T017 [US2] Reuse policy-question routing for voice turns in `backend/src/handler.js`
- [x] T018 [P] [US2] Add grounded source/citation rendering for voice responses in `web/app.js`
- [x] T019 [US2] Persist `UserUtterance` and `GroundedResponse` records in `backend/src/store.js`
- [x] T020 [US2] Implement no-grounded-answer fallback path in `backend/src/handler.js`
- [x] T021 [US2] Add `VOICE_RESPONSE_SENT` and `VOICE_FALLBACK_USED` metric logs in `backend/src/handler.js`

**Checkpoint**: User Story 2 is independently functional and policy-grounded.

---

## Phase 5: User Story 3 - Transfer to Human Agent (Priority: P3)

**Goal**: User can request human transfer during voice interaction and receive clear transfer status/fallback.

**Independent Test**: Request transfer during active voice session and verify status transitions and unavailable fallback behavior.

### Implementation for User Story 3

- [x] T022 [US3] Implement transfer-intent detection from voice turns in `backend/src/voice.js`
- [x] T023 [US3] Implement `POST /voice/transfer` lifecycle handling in `backend/src/handler.js`
- [x] T024 [US3] Implement `GET /voice/transfer-status` endpoint in `backend/src/handler.js`
- [x] T025 [P] [US3] Add transfer request/status UI handling in `web/app.js`
- [x] T026 [US3] Persist `TransferRequest` and `TransferOutcome` entities in `backend/src/store.js`
- [x] T027 [US3] Add `TRANSFER_REQUESTED` and `TRANSFER_STATUS_UPDATED` metric logs in `backend/src/handler.js`

**Checkpoint**: User Story 3 is independently functional with clear transfer outcomes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, validation, and operational readiness.

- [x] T028 [P] Update local voice run instructions in `docs/runbook/local-dev.md`
- [x] T029 Update implementation checklist and validation notes in `specs/001-nova-sonic-transfer/quickstart.md`
- [x] T030 [P] Document voice/transfer metrics in `docs/architecture/ai-services-guide.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → required before Foundational (Phase 2)
- Foundational (Phase 2) → blocks all user stories
- User Stories (Phases 3-5) → execute in priority order for MVP delivery, or in parallel after Phase 2 if staffing allows
- Polish (Phase 6) → after desired stories complete

### User Story Dependencies

- **US1 (P1)**: Depends only on foundational phase completion
- **US2 (P2)**: Depends on foundational phase; can reuse US1 stream/session behavior but remains independently testable
- **US3 (P3)**: Depends on foundational phase; can execute after US1 for practical transfer flow validation

### Within-Story Ordering Rules

- Backend route/state tasks before UI integration tasks when they share the same story flow
- Persistence and metric logging tasks complete before story checkpoint

---

## Parallel Execution Examples

### User Story 1

Run in parallel after T010/T011 start:

- T012 in `web/app.js`
- T013 in `web/index.html`

### User Story 2

Run in parallel after T016/T017:

- T018 in `web/app.js`
- T019 in `backend/src/store.js`

### User Story 3

Run in parallel after T023/T024:

- T025 in `web/app.js`
- T026 in `backend/src/store.js`

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate US1 independently before expanding scope

### Incremental Delivery

1. Deliver US1 (voice start)
2. Add US2 (grounded answers)
3. Add US3 (human transfer)
4. Finish polish and documentation updates

### Team Parallelism

After foundational completion:

- Engineer A: backend handler/voice modules (`backend/src/handler.js`, `backend/src/voice.js`)
- Engineer B: frontend voice/transfer UX (`web/app.js`, `web/index.html`)
- Engineer C: persistence/logging/docs (`backend/src/store.js`, docs files)
