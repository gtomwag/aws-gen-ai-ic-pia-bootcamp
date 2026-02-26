# Data Model: Voice Agent Transfer

## Entity: VoiceSession

Represents one active or completed voice conversation tied to an existing disruption support session.

**Fields**
- `voiceSessionId` (string, required, unique)
- `sessionId` (string, required, FK to existing support session)
- `status` (enum: `starting`, `active`, `ended`, `disconnected`, `failed`)
- `startedAt` (ISO timestamp, required)
- `endedAt` (ISO timestamp, optional)
- `lastActivityAt` (ISO timestamp, required)
- `transport` (enum: `websocket`)
- `locale` (string, default `en-US`)

**Validation rules**
- `sessionId` must reference an existing session record.
- Only one `active` voice session per `sessionId`.
- `endedAt` is required when `status` transitions to terminal states.

## Entity: UserUtterance

Captured user speech input for a voice session turn.

**Fields**
- `utteranceId` (string, required, unique)
- `voiceSessionId` (string, required, FK)
- `sequence` (integer, required, monotonic per session)
- `transcriptText` (string, optional until transcription complete)
- `audioChunkRef` (string, optional, implementation-specific)
- `capturedAt` (ISO timestamp, required)
- `piiDetected` (boolean, default `false`)

**Validation rules**
- `sequence` must increment by 1 within the same `voiceSessionId`.
- At least one of `transcriptText` or `audioChunkRef` must be present.

## Entity: GroundedResponse

Assistant response generated for an utterance with grounding metadata.

**Fields**
- `responseId` (string, required, unique)
- `voiceSessionId` (string, required, FK)
- `source` (enum: `knowledge-base`, `bedrock`, `fallback`)
- `responseText` (string, required)
- `audioResponseRef` (string, optional)
- `citations` (array, optional)
- `fallbackReason` (string, optional)
- `generatedAt` (ISO timestamp, required)

**Validation rules**
- `responseText` required even on fallback.
- `citations` should be included when `source=knowledge-base`.

## Entity: TransferRequest

User-triggered or system-triggered request to hand off to human support.

**Fields**
- `transferRequestId` (string, required, unique)
- `voiceSessionId` (string, required, FK)
- `sessionId` (string, required, FK)
- `trigger` (enum: `user_explicit`, `intent_detected`, `auto_escalation`)
- `reason` (string, optional)
- `status` (enum: `requested`, `in_progress`, `completed`, `unavailable`)
- `requestedAt` (ISO timestamp, required)
- `updatedAt` (ISO timestamp, required)
- `fallbackMessage` (string, optional)

**Validation rules**
- `status` must follow allowed transitions only.
- Repeated requests while `in_progress` are idempotent (no duplicate active transfer).

## Entity: TransferOutcome

Final recorded handoff outcome for transfer tracking and operations.

**Fields**
- `transferRequestId` (string, required, FK)
- `outcome` (enum: `completed`, `unavailable`, `alternate_path_offered`)
- `resolutionDetail` (string, required)
- `resolvedAt` (ISO timestamp, required)

**Validation rules**
- Exactly one terminal outcome per transfer request.

## Relationships

- One `Session` → zero or one active `VoiceSession`.
- One `VoiceSession` → many `UserUtterance`.
- One `VoiceSession` → many `GroundedResponse`.
- One `VoiceSession` → zero or many `TransferRequest`.
- One `TransferRequest` → zero or one `TransferOutcome`.

## State Transitions

### VoiceSession
- `starting` → `active`
- `active` → `ended`
- `active` → `disconnected`
- `starting|active` → `failed`

### TransferRequest
- `requested` → `in_progress`
- `in_progress` → `completed`
- `in_progress` → `unavailable`
- `unavailable` → `alternate_path_offered`
