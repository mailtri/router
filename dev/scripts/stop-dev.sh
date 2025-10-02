#!/bin/bash

# Stop development environment
set -e

echo "🛑 Stopping mailtri-router development environment..."

# Stop Docker Compose services
docker-compose down

echo "✅ Development environment stopped!"
echo ""
echo "💡 To start again, run: ./dev/scripts/dev-init.sh"

