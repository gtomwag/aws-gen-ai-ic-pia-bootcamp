# Voice Agent Contract (MVP)

## Scope

Public interfaces for starting a voice session, streaming voice turns, retrieving transfer status, and requesting human transfer.

## HTTP Endpoints

### `POST /voice/session/start`

Starts a voice session for an existing disruption support session.

**Request**
```json
{
  "sessionId": "SES-123",
  "locale": "en-US"
}
```

**Response 200**
```json
{
  "voiceSessionId": "VCS-001",
  "status": "active",
  "streamUrl": "wss://<api>/voice/stream/VCS-001",
  "message": "Voice session started. You can speak now."
}
```

**Errors**
- `400` missing/invalid payload
- `404` session not found
- `409` active voice session already exists
- `500` internal error

### `POST /voice/transfer`

Requests transfer to a human agent during active voice interaction.

**Request**
```json
{
  "voiceSessionId": "VCS-001",
  "reason": "Need wheelchair assistance",
  "trigger": "user_explicit"
}
```

**Response 200**
```json
{
  "transferRequestId": "TRF-100",
  "status": "in_progress",
  "statusMessage": "Transfer requested. Connecting you to a human agent."
}
```

**Response 200 (unavailable fallback)**
```json
{
  "transferRequestId": "TRF-100",
  "status": "unavailable",
  "statusMessage": "Human routing is currently unavailable. We can continue here or offer callback support.",
  "fallbackOption": "callback"
}
```

### `GET /voice/transfer-status?transferRequestId=<id>`

Returns the latest transfer lifecycle state.

**Response 200**
```json
{
  "transferRequestId": "TRF-100",
  "status": "completed",
  "updatedAt": "2026-02-25T10:00:00.000Z",
  "resolutionDetail": "Handoff to live queue complete"
}
```

## WebSocket Stream

### `wss://<api>/voice/stream/{voiceSessionId}`

Bidirectional event stream for audio/text turn handling.

## Client → Server Events

### `voice.audio.chunk`
```json
{
  "type": "voice.audio.chunk",
  "voiceSessionId": "VCS-001",
  "sequence": 12,
  "audioBase64": "<chunk>",
  "contentType": "audio/pcm"
}
```

### `voice.transfer.request`
```json
{
  "type": "voice.transfer.request",
  "voiceSessionId": "VCS-001",
  "reason": "I want a human agent"
}
```

## Server → Client Events

### `voice.session.ready`
```json
{
  "type": "voice.session.ready",
  "voiceSessionId": "VCS-001",
  "message": "You are connected. Start speaking."
}
```

### `voice.response`
```json
{
  "type": "voice.response",
  "voiceSessionId": "VCS-001",
  "responseText": "I can help with your rebooking options.",
  "source": "knowledge-base",
  "citations": [
    "knowledge-base/airline-policy.md"
  ],
  "audioBase64": "<optional synthesized audio>"
}
```

### `voice.transfer.status`
```json
{
  "type": "voice.transfer.status",
  "transferRequestId": "TRF-100",
  "status": "in_progress",
  "statusMessage": "Please hold while we connect you."
}
```

### `voice.fallback`
```json
{
  "type": "voice.fallback",
  "reason": "no_grounded_answer",
  "message": "I couldn't find a grounded answer. I can connect you to an agent."
}
```

## Non-Functional Contract Rules

- Transfer status update target: first status within 10 seconds of request.
- All transfer and voice lifecycle transitions must produce `METRIC:` log events.
- No raw PII payloads in metrics.
- Repeated transfer requests during `in_progress` return current state (idempotent behavior).
