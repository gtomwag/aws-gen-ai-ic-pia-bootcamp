# Local Development Runbook

## Prerequisites

| Tool | Version | Installation |
|---|---|---|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Comes with Node.js |
| **Git** | 2.x | [git-scm.com](https://git-scm.com/) |
| **AWS SAM CLI** | (optional) | [AWS docs](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) |
| **Docker** | (optional, for SAM local) | [docker.com](https://www.docker.com/) |

> **Note:** For the quickest local setup, you only need Node.js. SAM CLI and Docker are only needed for `sam local start-api` mode.

---

## Quick Start (No Docker Required)

```bash
# 1. Clone the repo
git clone <repo-url>
cd aws-gen-ai-ic-pia-bootcamp

# 2. Install backend dependencies
cd backend
npm install

# 3. Start the local dev server
node server-local.js
```

You should see:
```
  Local dev server running at http://127.0.0.1:3000

  Routes:
    GET  /health
    POST /disruption
    GET  /disruption
    POST /chat
    POST /select-option
    POST /confirm
    POST /escalate
    GET  /notification
```

```bash
# 4. Open the frontend
#    Open web/index.html directly in your browser
#    (File → Open File → navigate to web/index.html)
```

The default `API_BASE_URL` in `web/app.js` is `http://127.0.0.1:3000` — no changes needed for local dev.

---

## Alternative: SAM Local (Requires Docker)

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. (Optional) Start local DynamoDB
docker run -d -p 8000:8000 amazon/dynamodb-local

# 3. Start SAM local API
sam local start-api

# 4. Open web/index.html in browser
```

> When using SAM local, set `DYNAMODB_ENDPOINT=http://host.docker.internal:8000` in `template.yaml` environment variables and set `USE_LOCAL_STORE` to `"false"` to use the local DynamoDB container.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `USE_LOCAL_STORE` | `"true"` | Use in-memory store (`true`) or DynamoDB (`false`) |
| `USE_BEDROCK` | `"false"` | Enable Amazon Bedrock chat (`true` requires AWS credentials) |
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-haiku-20240307-v1:0` | Bedrock model to use |
| `TABLE_NAME` | `disruption-table` | DynamoDB table name |
| `DYNAMODB_ENDPOINT` | (none) | Override DynamoDB endpoint for local container |
| `PORT` | `3000` | Local server port |

---

## Verify Setup

```bash
# Health check
curl http://127.0.0.1:3000/health
# Expected: {"ok":true,"time":"..."}

# Create a test disruption
curl -X POST http://127.0.0.1:3000/disruption \
  -H "Content-Type: application/json" \
  -d '{"type":"CANCELLATION","reason":"Test","airport":"FRA","passenger":{"firstName":"Test","lastName":"User","tier":"Platinum","origin":"FRA","destination":"JFK","flightNumber":"UA891","date":"2026-02-25","hasApp":true,"consentForProactive":true}}'
# Expected: 200 with disruptionId, sessionId, options, notification
```

---

## Demo Run Order

For a complete demo walkthrough:

1. Start backend: `cd backend && node server-local.js`
2. Open `web/index.html` in browser
3. Click **"Create Disruption"** — observe notification center, manifest bar, options
4. Review option cards — sort by time/cost, filter recommended
5. Select an option (click a card)
6. Click **"Confirm Selected"** — see PNR, itinerary, offline note
7. Click **"Escalate"** — see full agent context packet
8. Review metrics log at bottom of side panel

For additional scenarios, see [../demo/sample-scenarios.md](../demo/sample-scenarios.md).

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `EADDRINUSE` on port 3000 | Kill existing process: `npx kill-port 3000` or use `PORT=3001 node server-local.js` |
| CORS errors in browser | Make sure you're opening `index.html` as a file (or serve it); the backend sets `Access-Control-Allow-Origin: *` |
| `MODULE_NOT_FOUND` | Run `npm install` in the `backend/` directory |
| Bedrock errors | Set `USE_BEDROCK=false` (default) or ensure AWS credentials are configured |
| Options not loading | Check browser console for errors; ensure the backend is running on port 3000 |
