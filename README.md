# mailtri-router

**Open Source Email Router for AWS** - The core email processing engine that handles incoming emails, parses commands, and routes them to appropriate workflow handlers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AWS CDK](https://img.shields.io/badge/AWS-CDK-orange.svg)](https://aws.amazon.com/cdk/)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)

## Overview

The `mailtri-router` is the foundational component of Mailtri's email automation platform. It provides a complete AWS infrastructure stack (SES → S3 → Lambda → SQS) for processing inbound emails and routing them to workflow handlers.

This repository contains everything needed to:

- Deploy email processing infrastructure to AWS
- Parse email commands and extract intent
- Queue email payloads for downstream processing
- Run locally with LocalStack and Mailpit for development

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- AWS CLI configured
- Docker and Docker Compose (for local development)

### Deploy to AWS

```bash
# Install dependencies
npm install

# Deploy infrastructure
npm run deploy

# Configure SES domain
aws ses verify-domain-identity --domain your-domain.com
```

### Local Development

```bash
# Start local services (LocalStack + Mailpit)
docker-compose up -d

# Init services
npm run dev:init

# Run local development server
npm run dev

# Send test email
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"to": "task+notion@your-domain.com", "subject": "Create task", "body": "New feature request"}'
```

## Architecture

### AWS Infrastructure Stack

```
SES → S3 → Lambda → SQS
```

- **SES**: Receives inbound emails
- **S3**: Stores email content and attachments
- **Lambda**: Parses email commands and creates JSON payloads
- **SQS**: Queues processed emails for downstream handlers

### Local Development Stack

```
Mailpit → LocalStack → Local Lambda → Local SQS
```

- **Mailpit**: Local SMTP server for testing
- **LocalStack**: AWS service emulation
- **Local Lambda**: Development email processor
- **Local SQS**: Queue for testing

## Command Patterns

### Email Recipient Commands

```
task+notion@domain.com          # Create Notion task
invoice+quickbooks@domain.com   # Process invoice
recruit+ats@domain.com          # Add to ATS
```

### Subject Line Commands

```
Send Invoice: Q1                # Process invoice for Q1
Schedule Meeting: Tomorrow      # Create calendar event
Update Project: Status          # Update project status
```

### Body Content Commands

```
#task Create new feature        # Create task with description
#meeting Schedule standup       # Schedule recurring meeting
#report Generate monthly        # Generate monthly report
```

## JSON Payload Format

The router outputs standardized JSON payloads to SQS:

```json
{
  "messageId": "unique-message-id",
  "timestamp": "2024-01-15T10:30:00Z",
  "email": {
    "from": "user@example.com",
    "to": "task+notion@domain.com",
    "subject": "Create task: New feature",
    "body": "Please implement user authentication",
    "attachments": [
      {
        "filename": "requirements.pdf",
        "s3Key": "emails/123/requirements.pdf",
        "contentType": "application/pdf"
      }
    ]
  },
  "intent": {
    "action": "create_task",
    "target": "notion",
    "parameters": {
      "title": "New feature",
      "description": "Please implement user authentication"
    }
  }
}
```

### Scripts

```bash
npm run build          # Build TypeScript
npm run deploy         # Deploy to AWS
npm run dev            # Start local development
npm run test           # Run tests
npm run lint           # Lint code
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## Security

Please report security issues to security@mailtri.com. See [SECURITY.md](SECURITY.md) for more information.

## Support

- 📖 [Documentation](https://docs.mailtri.com)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
- 📧 [Email Support](mailto:support@mailtri.com)
