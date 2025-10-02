#!/bin/bash

# Check Node.js version compatibility
# Usage: ./scripts/check-node-version.sh

set -e

echo "🔍 Checking Node.js version compatibility..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi

# Get current Node version
CURRENT_NODE_VERSION=$(node --version)
echo "📦 Current Node.js version: $CURRENT_NODE_VERSION"

# Check if .nvmrc exists
if [ ! -f ".nvmrc" ]; then
  echo "❌ .nvmrc file not found"
  exit 1
fi

# Get required Node version from .nvmrc
REQUIRED_NODE_VERSION=$(cat .nvmrc)
echo "📋 Required Node.js version: $REQUIRED_NODE_VERSION"

# Extract major version numbers
CURRENT_MAJOR=$(echo $CURRENT_NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
REQUIRED_MAJOR=$(echo $REQUIRED_NODE_VERSION | cut -d'.' -f1)

echo "🔍 Current major version: $CURRENT_MAJOR"
echo "🔍 Required major version: $REQUIRED_MAJOR"

# Check if versions match
if [ "$CURRENT_MAJOR" -eq "$REQUIRED_MAJOR" ]; then
  echo "✅ Node.js version is compatible"
else
  echo "❌ Node.js version mismatch"
  echo "   Current: $CURRENT_NODE_VERSION"
  echo "   Required: $REQUIRED_NODE_VERSION"
  echo ""
  echo "💡 To fix this:"
  echo "   nvm use"
  echo "   # or"
  echo "   nvm install $REQUIRED_NODE_VERSION"
  echo "   nvm use $REQUIRED_NODE_VERSION"
  exit 1
fi

# Check npm version
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed"
  exit 1
fi

CURRENT_NPM_VERSION=$(npm --version)
echo "📦 Current npm version: $CURRENT_NPM_VERSION"

# Check if npm version is >= 10
NPM_MAJOR=$(echo $CURRENT_NPM_VERSION | cut -d'.' -f1)
if [ "$NPM_MAJOR" -ge 10 ]; then
  echo "✅ npm version is compatible"
else
  echo "❌ npm version too old"
  echo "   Current: $CURRENT_NPM_VERSION"
  echo "   Required: >= 10.0.0"
  echo ""
  echo "💡 To fix this:"
  echo "   npm install -g npm@latest"
  exit 1
fi

echo ""
echo "🎉 All version checks passed!"
echo "✅ Node.js: $CURRENT_NODE_VERSION"
echo "✅ npm: $CURRENT_NPM_VERSION"
echo "✅ Ready to develop!"
