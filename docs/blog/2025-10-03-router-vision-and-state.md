---
title: "Mailtri Router — Vision and Current State (Q4 2025)"
date: 2025-10-03
slug: router-vision-and-state-q4-2025
---

### TL;DR

The Mailtri Router is an open, AWS-native email intent router that turns inbound emails into structured events. Today it ships a production-ready SES → S3 → Lambda → SQS pipeline with local dev tooling, solid docs, and a simple intent parser. Next up: a richer intent DSL, a pluggable handler ecosystem, stronger observability, and a more opinionated developer experience.

### Why a router?

Email remains the most universal interface. Our vision is to make email programmable and dependable: a message to an address like `task+notion@your-domain.com` or a subject like `Send Invoice: Q1` should deterministically produce structured events that downstream systems can trust.

### Vision

- **Composable, event-first core**: Normalize inbound email into a predictable JSON envelope and push to durable queues for any downstream consumer.
- **AWS-native by default**: Lean on managed services (SES, S3, Lambda, SQS, CloudWatch) for reliability, scale, and cost controls.
- **Extensible intent model**: Support recipient-, subject-, and body-based commands, evolving into a small but expressive intent DSL.
- **Local-first DX**: One-command local environment using Mailpit + LocalStack, fast feedback loops, and clear, copy-pastable docs.
- **Security as a default**: Least-privilege IAM, encrypted storage, and out-of-the-box SPF/DMARC/DKIM guidance.
- **Observability you can act on**: Clear logs, metrics, and eventual tracing so teams can debug without guesswork.

### What’s shipping today

The current state focuses on a sturdy backbone and a straightforward intent parser, so teams can stand up the router quickly and route real email.

- **Infrastructure (CDK)**
  - S3 bucket for persisted email artifacts (versioning + lifecycle rules)
  - SQS queue with DLQ for reliable downstream processing
  - Lambda function that parses, normalizes, stores, and emits events
  - SES configuration set scaffolding and Route 53 records (SPF/DMARC/DKIM)

- **Email processing runtime**
  - Parses recipient, subject, and body for intents (e.g., `task+notion@…`, `Send Invoice: Q1`, `#task …`)
  - Writes a normalized JSON payload to S3 with metadata
  - Publishes a compact event to SQS with message attributes for easy routing
  - Optional webhook for real-time integrations

- **Developer experience**
  - Local dev via Docker Compose: Mailpit, LocalStack, and a local Lambda
  - Helpful npm scripts for init, dev, build, deploy, and testing
  - Clear docs: AWS setup, deployment, Route 53, and verification guides
  - Jest tests (unit + integration) to keep the core stable

### Representative payload (current)

```json
{
  "messageId": "unique-id",
  "timestamp": "2025-10-03T00:00:00Z",
  "email": {
    "from": "user@example.com",
    "to": "task+notion@your-domain.com",
    "subject": "Create task: New feature",
    "body": "#task Implement authentication",
    "attachments": []
  },
  "intent": {
    "action": "create_task",
    "target": "notion",
    "parameters": {
      "description": "Implement authentication"
    }
  }
}
```

### What’s not done (yet)

- **SES event wiring**: SES rule-set/event-destination configuration is documented post-deploy due to CDK gaps.
- **Intent parsing depth**: The parser is intentionally simple; we plan a richer, testable DSL and conflict resolution rules.
- **Pluggable handlers**: Downstream integrations are currently out-of-repo; the queue/webhook are the contract.
- **Observability**: Logs and basic metrics are present; tracing and dashboards are on the roadmap.
- **Schema governance**: The JSON envelope is stable but not yet versioned/formally specified.

### Near-term roadmap

- **Intent DSL v1**: Extensible, testable rules with clear precedence and schema’d parameters.
- **Handler ecosystem**: Reference handlers (Notion, GitHub, Slack, accounting) with examples and contracts.
- **Reliability & safety**: Idempotency keys, replay tooling, and stronger failure semantics around parsing and delivery.
- **Observability**: Structured logs, metrics, optional traces, and default CloudWatch dashboards.
- **Schema & SDKs**: Versioned payload schema plus light clients/CLIs for Node/Python to consume events.
- **DX polish**: More examples, copy‑paste recipes, and a quickstart that goes from zero to routed event in minutes.

### How to try it today

1) Deploy to AWS with your domain:

```bash
npm install
npm run deploy:domain yourdomain.com
```

2) Or run locally with Mailpit + LocalStack:

```bash
docker-compose up -d
npm run dev:init
npm run dev
```

3) Send a test event locally:

```bash
curl -X POST http://localhost:3030/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "to": "task+notion@your-domain.com",
    "subject": "Create task",
    "body": "#task Implement authentication"
  }'
```

### Get involved

- Open issues and feature requests for the intent DSL and handler contracts
- Contribute examples for real-world workflows
- Share feedback on DX, docs, and local dev ergonomics

If email is your team's universal interface, we want the router to be your most dependable bridge.

