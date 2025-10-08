# Node.js Setup Guide

This guide covers setting up Node.js 20 for the Mailtri Router project.

## Prerequisites

- Node.js 20+ (see `.nvmrc` file)
- npm 10+
- nvm (Node Version Manager) - recommended

## Installation

### Option 1: Using nvm (Recommended)

1. **Install nvm** (if not already installed):

   **macOS/Linux:**

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

   **Windows:**

   ```bash
   # Use nvm-windows
   # Download from: https://github.com/coreybutler/nvm-windows
   ```

2. **Install and use Node.js 20:**

   ```bash
   # Install Node.js 20
   nvm install 20

   # Use Node.js 20
   nvm use 20

   # Set as default
   nvm alias default 20
   ```

3. **Use project's Node version:**

   ```bash
   # Navigate to project directory
   cd mailtri-router

   # Use the Node version specified in .nvmrc
   nvm use
   ```

### Option 2: Direct Installation

1. **Download Node.js 20:**
   - Visit [nodejs.org](https://nodejs.org/)
   - Download Node.js 20 LTS
   - Follow installation instructions

2. **Verify installation:**
   ```bash
   node --version  # Should show v20.x.x
   npm --version   # Should show 10.x.x or higher
   ```

## Project Setup

### 1. Install Dependencies

```bash
# Install project dependencies
npm install
```

### 2. Verify Node Version

```bash
# Check Node version matches .nvmrc
node --version

# Should output: v20.x.x
```

### 3. Run Development Server

```bash
# Start local development
npm run dev
```

## Node Version Management

### Using .nvmrc

The project includes a `.nvmrc` file that specifies Node.js 20:

```bash
# Use the exact Node version specified in .nvmrc
nvm use

# Install the Node version if not available
nvm install
```

### Automatic Node Version Switching

You can configure your shell to automatically switch Node versions:

**Bash/Zsh:**

```bash
# Add to your ~/.bashrc or ~/.zshrc
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

## Docker Setup

If using Docker, the Node version is specified in the Dockerfile:

```dockerfile
FROM node:20-alpine
```

## CI/CD Integration

The GitHub Actions workflow uses Node.js 20:

```yaml
strategy:
  matrix:
    node-version: [20.x]
```

## Troubleshooting

### Common Issues

1. **Node version mismatch:**

   ```bash
   # Check current Node version
   node --version

   # Use correct version
   nvm use 20
   ```

2. **npm version issues:**

   ```bash
   # Update npm to latest
   npm install -g npm@latest
   ```

3. **Permission issues:**

   ```bash
   # Fix npm permissions (Linux/macOS)
   sudo chown -R $(whoami) ~/.npm
   ```

4. **Cache issues:**

   ```bash
   # Clear npm cache
   npm cache clean --force

   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Version Verification

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check nvm version
nvm --version

# List installed Node versions
nvm list

# List available Node versions
nvm list-remote --lts
```

## Performance Considerations

### Node.js 20 Features

Node.js 20 includes several performance improvements:

- **V8 Engine 11.3**: Better JavaScript performance
- **HTTP/2 Server**: Improved HTTP performance
- **ES Modules**: Better module loading
- **Worker Threads**: Enhanced concurrency

### Memory Usage

For the Lambda function, we use:

- **Memory**: 512MB
- **Timeout**: 5 minutes
- **Runtime**: Node.js 20.x

## Development Tools

### Recommended VS Code Extensions

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Node.js Extension Pack**: Node.js development

### Debugging

```bash
# Debug with Node.js
node --inspect dev/run-local.ts

# Debug with VS Code
# Use the built-in debugger with launch.json
```

## Support

- 📖 [Node.js Documentation](https://nodejs.org/docs/)
- 📖 [nvm Documentation](https://github.com/nvm-sh/nvm)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
