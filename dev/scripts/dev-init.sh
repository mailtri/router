#!/bin/bash

# Development initialization script for mailtri-router
set -e

echo "🚀 Initializing mailtri-router development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
echo "📁 Creating development directories..."
mkdir -p dev/localstack-data
mkdir -p dev/redis-data
mkdir -p dev/postgres-data
mkdir -p dev/fixtures

# Start services
echo "🐳 Starting development services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if LocalStack is ready
echo "🔍 Checking LocalStack health..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
        echo "✅ LocalStack is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ LocalStack failed to start after $max_attempts attempts"
        exit 1
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts - waiting for LocalStack..."
    sleep 2
    attempt=$((attempt + 1))
done

# Check if Mailpit is ready
echo "🔍 Checking Mailpit health..."
if curl -s http://localhost:8025 > /dev/null 2>&1; then
    echo "✅ Mailpit is ready!"
else
    echo "⚠️  Mailpit may not be ready yet, but continuing..."
fi

# Set up AWS CLI for LocalStack
echo "🔧 Configuring AWS CLI for LocalStack..."
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set default.region us-east-1
aws configure set default.output json

# Create S3 bucket for email storage
echo "📦 Creating S3 bucket for email storage..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://mailtri-emails || echo "Bucket may already exist"

# Create SQS queue for processed emails
echo "📬 Creating SQS queue for processed emails..."
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name mailtri-processed-emails || echo "Queue may already exist"

# Create SES configuration
echo "📧 Setting up SES configuration..."
aws --endpoint-url=http://localhost:4566 ses verify-email-identity --email-address test@example.com || echo "Email may already be verified"

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📋 Service URLs:"
echo "  • LocalStack: http://localhost:4566"
echo "  • Mailpit SMTP: localhost:1025"
echo "  • Mailpit Web UI: http://localhost:8025"
echo "  • Redis: localhost:6379"
echo "  • PostgreSQL: localhost:5432"
echo ""
echo "🔧 Next steps:"
echo "  1. Run 'npm install' to install dependencies"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Send test emails to localhost:1025"
echo ""
echo "📚 Documentation:"
echo "  • LocalStack: https://docs.localstack.cloud/"
echo "  • Mailpit: https://github.com/axllent/mailpit"

