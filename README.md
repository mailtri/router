# mailtri-router

**Open Source Email Router for AWS** - The core email processing engine that handles incoming emails, parses commands, and routes them to appropriate workflow handlers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AWS CDK](https://img.shields.io/badge/AWS-CDK-orange.svg)](https://aws.amazon.com/cdk/)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)

## 🚀 Overview

The `mailtri-router` is the foundational component of Mailtri's email automation platform. It provides a complete AWS infrastructure stack (SES → S3 → Lambda → SQS) for processing inbound emails and routing them to workflow handlers.

### ✨ What This Repository Provides

- **🏗️ Complete AWS Infrastructure**: CDK stack with S3, SQS, Lambda, SES, and Route 53
- **📧 Email Command Parsing**: Intelligent parsing of recipient, subject, and body commands
- **🔄 Queue-Based Processing**: Reliable email processing with SQS and dead letter queues
- **🏠 Local Development**: Full LocalStack + Mailpit environment for testing
- **📚 Comprehensive Documentation**: Step-by-step guides for setup, deployment, and troubleshooting
- **🧪 Testing Suite**: Unit, integration, and startup tests with Jest
- **🔧 Development Tools**: ESLint, Prettier, Husky, and pre-commit hooks
- **🚀 CI/CD Pipeline**: GitHub Actions for testing, building, and deployment

## 🚀 Quick Start

### 📋 Prerequisites

- **Node.js 20+** (see `.nvmrc` file)
- **npm 10+**
- AWS CLI configured with credentials
- Docker and Docker Compose (for local development)

### 🔧 Node Version Management

This project uses Node.js 20. Use the included `.nvmrc` file:

```bash
# Using nvm
nvm use

# Or install Node.js 20
nvm install 20
nvm use 20
```

📖 **See [Node.js Setup Guide](docs/NODE-SETUP.md) for detailed instructions.**

**Quick version check:**

```bash
npm run check:node
```

### ☁️ AWS Setup

1. **Configure AWS credentials** (see [AWS Setup Guide](docs/AWS-SETUP.md)):

   ```bash
   aws configure
   ```

2. **Bootstrap CDK** (first time only):
   ```bash
   npx cdk bootstrap
   ```

### 🚀 Deploy to AWS

#### Option 1: Using the Deployment Script (Recommended)

```bash
# Install dependencies
npm install

# Deploy with your domain (handles everything automatically)
npm run deploy:domain yourdomain.com
```

#### Option 2: Manual Deployment

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Build Lambda package
npm run build-lambda-package

# Deploy infrastructure with your domain
npx cdk deploy --context domainName=yourdomain.com

# Configure SES domain (see email verification guide)
aws ses verify-domain-identity --domain yourdomain.com
```

📖 **See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.**

## 🌐 Route 53 DNS Records

The deployment automatically creates these DNS records in your Route 53 hosted zone:

### ✅ SPF Record

```
Name: yourdomain.com
Type: TXT
Value: v=spf1 include:amazonses.com ~all
```

### ✅ DMARC Record

```
Name: _dmarc.yourdomain.com
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### ✅ SES Domain Verification

```
Name: _amazonses.yourdomain.com
Type: TXT
Value: [Updated after SES verification]
```

### ✅ DKIM Records

```
Name: dkim1._domainkey.yourdomain.com
Name: dkim2._domainkey.yourdomain.com
Name: dkim3._domainkey.yourdomain.com
Type: TXT
Value: [Updated after DKIM setup]
```

📖 **See [Route 53 Setup Guide](docs/ROUTE53-SETUP.md) and [Email Verification Guide](docs/EMAIL-VERIFICATION.md) for detailed instructions.**

## 🏠 Local Development

### 🐳 Start Local Services

```bash
# Start local services (LocalStack + Mailpit)
docker-compose up -d

# Initialize services (creates S3 buckets, SQS queues)
npm run dev:init

# Run email router in local mode
npm run dev
```

### 📧 Test Email Processing

```bash
# Send test email to local server
curl -X POST http://localhost:3030/webhook \
  -H "Content-Type: application/json" \
  -d '{"messageId": "test-123", "from": "test@example.com", "to": "task+notion@example.com", "subject": "Create task", "body": "New feature request"}'

# Check health status
curl http://localhost:3030/health

# View emails in Mailpit Web UI
open http://localhost:8025
```

### 🔧 Environment Configuration

The router automatically detects the environment and configures itself via `.env` files:

**Environment File Loading Order (highest to lowest precedence):**

1. System environment variables
2. `.env.local` (local overrides)
3. `.env` (default configuration)

**Setup Environment File:**

```bash
# Copy the example environment file
cp env.example .env

# Edit the configuration as needed
nano .env
```

**Local Development Configuration:**

```bash
# .env file for local development
IS_LOCAL=true
PORT=3030
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET=mailtri-emails
SQS_QUEUE_NAME=mailtri-processed-emails
```

**Production Configuration:**

```bash
# .env file for production
IS_LOCAL=false
S3_BUCKET=mailtri-emails-{account}-{region}
SQS_QUEUE_NAME=mailtri-processed-emails
WEBHOOK_URL=https://your-webhook-endpoint.com/email-notifications
```

### 📝 Logging Configuration

The router uses Winston for structured logging with different levels and outputs:

#### **Log Levels**

- `error`: Error messages only
- `warn`: Warning and error messages
- `info`: Info, warning, and error messages (default for production)
- `http`: HTTP requests, info, warning, and error messages
- `debug`: All messages including debug information (default for local development)

#### **Environment Configuration**

```bash
# Set log level via environment variable
LOG_LEVEL=info  # Production: info, warn, error
LOG_LEVEL=debug # Development: all messages
```

#### **Log Outputs**

- **Local Development**: Colored console output with timestamps
- **Production**: JSON formatted logs (perfect for CloudWatch)
- **Lambda**: Automatically sends logs to CloudWatch Logs

#### **CloudWatch Integration**

In production (AWS Lambda), logs are automatically sent to CloudWatch Logs with:

- **Log Group**: `/aws/lambda/mailtri-router`
- **Structured JSON**: Easy to query and filter
- **Log Retention**: Configurable via CDK

#### **Example Log Output**

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "Processing email",
  "subject": "Create new task",
  "messageId": "test-123"
}
```

### 🔗 Unified Webhook System

The system uses a single webhook URL that receives different types of notifications based on the `type` parameter:

#### 📥 **Receipt Notification** (`type: "email_received"`)

- **When**: Sent immediately when email is received (before any processing)
- **Purpose**: Real-time email receipt notifications
- **Payload**: Basic email info (from, to, subject, hasBody, hasHtml)
- **Use Case**: Show users that their email was received

#### ✅ **Processing Notification** (`type: "email_processed"`)

- **When**: Sent after successful processing and storage
- **Purpose**: Confirm email was fully processed
- **Payload**: Complete email data including parsed content, CC/BCC, attachments
- **Use Case**: Trigger downstream workflows, update databases

**Example Webhook Payloads:**

**Receipt Notification:**

```json
{
  "type": "email_received",
  "messageId": "test-123",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "local",
  "email": {
    "from": "user@example.com",
    "to": "task+notion@example.com",
    "cc": "cc1@example.com",
    "bcc": "bcc1@example.com",
    "subject": "Create new task",
    "hasBody": true,
    "hasHtml": false
  }
}
```

**Processing Notification:**

```json
{
  "type": "email_processed",
  "messageId": "test-123",
  "s3Key": "emails/1704067200000/test-123.json",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "local",
  "email": {
    "from": "user@example.com",
    "to": "task+notion@example.com",
    "cc": "cc1@example.com, cc2@example.com",
    "bcc": "bcc1@example.com",
    "subject": "Create new task",
    "body": "Please create a new task for project X",
    "html": "<p>Please create a new task for project X</p>",
    "attachmentsCount": 2
  }
}
```

**Webhook Handler Example:**

```javascript
app.post('/email-notifications', (req, res) => {
  const { type, messageId, email } = req.body;

  switch (type) {
    case 'email_received':
      // Show user their email was received
      notifyUser(email.from, 'Email received successfully');
      break;

    case 'email_processed':
      // Trigger downstream processing
      processEmail(email);
      break;
  }

  res.status(200).json({ success: true });
});
```

### 🎛️ Production Log Control

#### **Setting Log Levels in Production**

**Via Environment Variables (Recommended):**

```bash
# Set in your deployment configuration
LOG_LEVEL=info  # Show info, warn, error logs
LOG_LEVEL=warn  # Show only warn and error logs
LOG_LEVEL=error # Show only error logs
```

**Via AWS Lambda Environment Variables:**

```bash
# In your CDK deployment or AWS Console
aws lambda update-function-configuration \
  --function-name mailtri-router \
  --environment Variables='{LOG_LEVEL=info}'
```

**Via CDK (Infrastructure as Code):**

```typescript
// In your CDK stack
const lambdaFunction = new Function(this, 'MailtriRouter', {
  // ... other config
  environment: {
    LOG_LEVEL: 'info', // or 'warn', 'error'
  },
});
```

#### **CloudWatch Log Queries**

With structured JSON logging, you can easily query logs in CloudWatch:

```sql
-- Find all error logs
fields @timestamp, level, message, error
| filter level = "error"

-- Find logs for specific email processing
fields @timestamp, message, messageId, subject
| filter message = "Processing email"

-- Find webhook failures
fields @timestamp, level, message, status
| filter message = "Processing webhook failed"
```

#### **Log Retention and Costs**

Configure log retention in your CDK stack to control costs:

```typescript
// Set log retention (default is "never expire")
const logGroup = new LogGroup(this, 'MailtriRouterLogs', {
  logGroupName: '/aws/lambda/mailtri-router',
  retention: RetentionDays.ONE_WEEK, // or ONE_MONTH, THREE_MONTHS, etc.
});
```

### 🛠️ Development Commands

```bash
# Stop local services
npm run dev:stop

# Clean up local environment
npm run dev:clean

# Run tests
npm test

# Run linting
npm run lint
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check

# Run development with auto-formatting
npm run dev:format

# Pre-commit checks (format + lint + test)
npm run pre-commit
```

### 🎨 Code Quality Tools

The project uses several tools to maintain code quality:

- **Prettier**: Code formatting with consistent style
- **ESLint**: Code linting and best practices
- **Jest**: Unit and integration testing
- **TypeScript**: Type safety and better development experience

**Configuration Files:**

- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to ignore during formatting
- `.eslintrc.js` - ESLint configuration
- `jest.config.js` - Jest testing configuration

## 🏗️ Architecture

### ☁️ AWS Infrastructure Stack (CDK)

```
SES → S3 → Lambda → SQS
```

- **SES**: Receives inbound emails with configuration set
- **S3**: Stores email content and attachments with lifecycle policies
- **Lambda**: Parses email commands and creates JSON payloads
- **SQS**: Queues processed emails for downstream handlers
- **CloudWatch**: Logging and monitoring

### 🏗️ CDK Infrastructure

The project includes a complete AWS CDK stack (`lib/mailtri-router-stack.ts`) that creates:

- **S3 Bucket**: `mailtri-emails-{account}-{region}` with versioning and lifecycle policies
- **SQS Queue**: `mailtri-processed-emails` with DLQ for error handling
- **Lambda Function**: `mailtri-email-processor` with proper IAM permissions
- **SES Configuration Set**: For tracking email events
- **Route 53 Records**: SPF, DMARC, DKIM, and SES domain verification
- **IAM Roles**: Least-privilege access for all services

📖 **See [CDK Infrastructure Guide](docs/CDK-INFRASTRUCTURE.md) for detailed architecture documentation.**

### 🏠 Local Development Stack

```
Mailpit → LocalStack → Local Lambda → Local SQS
```

- **Mailpit**: Local SMTP server for testing
- **LocalStack**: AWS service emulation
- **Local Lambda**: Development email processor
- **Local SQS**: Queue for testing

## 📧 Command Patterns

### 📬 Email Recipient Commands

```
task+notion@domain.com          # Create Notion task
invoice+quickbooks@domain.com   # Process invoice
recruit+ats@domain.com          # Add to ATS
```

### 📝 Subject Line Commands

```
Send Invoice: Q1                # Process invoice for Q1
Schedule Meeting: Tomorrow      # Create calendar event
Update Project: Status          # Update project status
```

### 📄 Body Content Commands

```
#task Create new feature        # Create task with description
#meeting Schedule standup       # Schedule recurring meeting
#report Generate monthly        # Generate monthly report
```

## 📦 JSON Payload Format

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
  }
}
```

## 🛠️ Available Scripts

### 🏠 Development

```bash
npm run dev            # Start local development server
npm run dev:init       # Initialize local services
npm run dev:stop       # Stop local services
npm run dev:clean      # Clean up local environment
```

### 🧪 Testing & Quality

```bash
npm run test           # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
npm run test:ci        # Run tests for CI
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests only
npm run lint           # Lint code
npm run lint:fix       # Fix linting issues
```

### 🏗️ Building & Deployment

```bash
npm run build          # Build TypeScript
npm run deploy         # Deploy to AWS
npm run deploy:domain  # Deploy with domain (uses script)
npm run cdk:synth      # Synthesize CloudFormation
npm run cdk:diff       # Show deployment diff
npm run cdk:destroy    # Destroy infrastructure
```

### 🔧 Utilities

```bash
npm run check:node     # Check Node.js version
```

### 📦 Lambda Package Building

```bash
# Build Lambda deployment package
./scripts/build-lambda-package.sh

# Deploy with domain (includes Lambda package building)
./scripts/deploy-with-domain.sh yourdomain.com
```

## 📚 Documentation

### 🚀 Getting Started

- 📖 [AWS Setup Guide](docs/AWS-SETUP.md) - Configure AWS credentials and permissions
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Deploy infrastructure to AWS
- 📦 [Node.js Setup](docs/NODE-SETUP.md) - Install and manage Node.js versions

### 🌐 Domain & Email Setup

- 🌐 [Route 53 Setup](docs/ROUTE53-SETUP.md) - Configure DNS for email routing
- 🌐 [Route 53 Integration](docs/ROUTE53-INTEGRATION.md) - CDK Route 53 integration details
- ✉️ [Email Verification](docs/EMAIL-VERIFICATION.md) - Verify domains and set up DKIM

### 🏗️ Architecture & Development

- 🏗️ [CDK Infrastructure](docs/CDK-INFRASTRUCTURE.md) - Detailed infrastructure documentation
- 🧪 [Testing Guide](docs/TESTING.md) - Running tests and test coverage
- 🔧 [Development Guide](docs/DEVELOPMENT.md) - Local development setup

### 📦 Scripts & Utilities

- `./scripts/deploy-with-domain.sh` - Deploy with domain configuration
- `./scripts/build-lambda-package.sh` - Build Lambda deployment package
- `./scripts/check-node-version.sh` - Verify Node.js version compatibility

### 🚀 CI/CD Pipeline

- **`.github/workflows/ci.yml`** - Main CI pipeline (tests, build, lint, security)
- **`.github/workflows/release.yml`** - Automated releases
- **`.github/workflows/dependencies.yml`** - Dependency management
- **`.github/workflows/quality.yml`** - Code quality checks
- **`.github/workflows/status.yml`** - CI status badges

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

### 🧪 Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Submit a pull request

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# If port 3000 is in use, the dev server will use 3030
npm run dev
```

#### LocalStack Services Not Ready

```bash
# Ensure services are initialized
npm run dev:init

# Check service health
docker-compose ps
```

#### Node.js Version Issues

```bash
# Check current version
npm run check:node

# Switch to correct version
nvm use
```

#### CDK Deployment Issues

```bash
# Check AWS credentials
aws sts get-caller-identity

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Check CDK context
npx cdk context
```

### 🚨 Quick Reference

#### Essential Commands

```bash
# Start development
npm run dev:init && npm run dev

# Deploy to AWS
npm run deploy:domain yourdomain.com

# Run tests
npm test

# Check everything
npm run check:node && npm run lint && npm test
```

#### Service URLs (Local Development)

- **Development Server**: http://localhost:3030 (auto-reloads on code changes)
- **Mailpit Web UI**: http://localhost:8025
- **LocalStack**: http://localhost:4566
- **Health Check**: http://localhost:3030/health

#### Auto-Reload Development

The development server uses `nodemon` to automatically restart when you make changes to the code:

```bash
npm run dev  # Starts with auto-reload enabled
```

The server will automatically restart when you modify files in the `src/` directory. You can also manually restart by typing `rs` in the terminal.

## 🔒 Security

Please report security issues to security@mailtri.com. See [SECURITY.md](SECURITY.md) for more information.

## 📞 Support

- 📖 [Documentation](https://docs.mailtri.com)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
- 📧 [Email Support](mailto:support@mailtri.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
