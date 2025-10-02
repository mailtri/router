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

# Run local development server
npm run dev
```

### 📧 Test Email Processing
```bash
# Send test email to local server
curl -X POST http://localhost:3030/webhook \
  -H "Content-Type: application/json" \
  -d '{"to": "task+notion@your-domain.com", "subject": "Create task", "body": "New feature request"}'

# View emails in Mailpit Web UI
open http://localhost:8025
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
```

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
- **Development Server**: http://localhost:3030
- **Mailpit Web UI**: http://localhost:8025
- **LocalStack**: http://localhost:4566
- **Health Check**: http://localhost:3030/health

## 🔒 Security

Please report security issues to security@mailtri.com. See [SECURITY.md](SECURITY.md) for more information.

## 📞 Support

- 📖 [Documentation](https://docs.mailtri.com)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
- 📧 [Email Support](mailto:support@mailtri.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
