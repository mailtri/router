# Local Development Setup

This directory contains all the necessary files and scripts for local development of the mailtri-router.

## Quick Start

1. **Initialize development environment:**

   ```bash
   npm run dev:init
   ```

2. **Run local components:**

   ```bash
   docker compose up
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start development server:**

   ```bash
   npm run dev
   ```

5. **Test the system:**
   ```bash
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"to": "task+notion@example.com", "subject": "Create task", "body": "New feature request"}'
   ```

## Services

### LocalStack (AWS Emulation)

- **Endpoint:** http://localhost:4566
- **Services:** SES, S3, Lambda, SQS, IAM, CloudWatch Logs
- **Purpose:** Emulates AWS services for local development

### Mailpit (SMTP Testing)

- **SMTP Server:** localhost:1025
- **Web UI:** http://localhost:8025
- **Purpose:** Local SMTP server for testing email sending/receiving

### Redis (Caching)

- **Endpoint:** localhost:6379
- **Purpose:** Optional caching layer for development

### PostgreSQL (Database)

- **Endpoint:** localhost:5432
- **Database:** mailtri
- **User:** mailtri
- **Password:** mailtri123
- **Purpose:** Optional database for development

## Scripts

- `dev/scripts/dev-init.sh` - Initialize development environment
- `dev/scripts/stop-dev.sh` - Stop development environment
- `dev/fixtures/test.eml` - Sample email for testing

## Configuration

The development environment uses the following configuration:

- **Port:** 3000 (configurable via PORT environment variable)
- **LocalStack Endpoint:** http://localhost:4566
- **Mailpit Endpoint:** http://localhost:8025
- **S3 Bucket:** mailtri-emails
- **SQS Queue:** mailtri-processed-emails

## Testing

### Manual Testing

1. Send emails to localhost:1025
2. Check Mailpit web UI at http://localhost:8025
3. Verify S3 bucket contents in LocalStack
4. Check SQS queue messages

### Automated Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Services not starting

```bash
# Check Docker is running
docker info

# Restart services
docker-compose restart

# View logs
docker-compose logs
```

### LocalStack issues

```bash
# Check LocalStack health
curl http://localhost:4566/_localstack/health

# Reset LocalStack data
docker-compose down -v
npm run dev:init
```

### Port conflicts

If you have port conflicts, modify the ports in `docker-compose.yml`:

- LocalStack: 4566
- Mailpit SMTP: 1025
- Mailpit Web: 8025
- Redis: 6379
- PostgreSQL: 5432

## Development Workflow

1. **Start services:** `npm run dev:init`
2. **Make code changes**
3. **Test locally:** `npm run dev`
4. **Send test emails**
5. **Check results in Mailpit/LocalStack**
6. **Stop services:** `npm run dev:stop`

## Cleanup

```bash
# Stop and remove all containers/volumes
npm run dev:clean

# Remove only containers (keep volumes)
docker-compose down
```
