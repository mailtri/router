#!/bin/bash

echo "🔨 Building Lambda package with dependencies..."

# Clean and create lambda-package directory
rm -rf lambda-package
mkdir -p lambda-package

# Copy the compiled JavaScript
cp -r dist/src/* lambda-package/

# Copy package.json and install production dependencies
cp package.json lambda-package/
cd lambda-package

# Install only production dependencies
npm install --production --no-optional

# Remove dev dependencies and unnecessary files
rm -rf node_modules/.cache
rm -rf node_modules/@types
rm -rf node_modules/typescript
rm -rf node_modules/ts-node
rm -rf node_modules/jest
rm -rf node_modules/eslint
rm -rf node_modules/prettier
rm -rf node_modules/husky
rm -rf node_modules/lint-staged

# Fix symlink issues in .bin directory
rm -rf node_modules/.bin
mkdir -p node_modules/.bin

# Remove any broken symlinks or problematic files
find node_modules -type l -exec test ! -e {} \; -delete
find node_modules -name "*.map" -delete
find node_modules -name "*.d.ts" -delete

echo "✅ Lambda package built successfully!"
echo "📦 Package size: $(du -sh lambda-package | cut -f1)"
echo "📁 Contents:"
ls -la lambda-package/
