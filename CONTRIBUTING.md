# Contributing to mailtri-router

Thank you for your interest in contributing to mailtri-router! This document provides guidelines and information for contributors.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured
- Docker and Docker Compose
- Git

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/mailtri-router.git
   cd mailtri-router
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start local development environment**

   ```bash
   docker-compose up -d
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/email-parsing-improvements`
- `fix/sqs-message-handling`
- `docs/update-readme`

### Commit Messages

Follow conventional commit format:

```
type(scope): description

feat(parser): add support for plus-addressing patterns
fix(lambda): handle malformed email headers
docs(readme): update quickstart instructions
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, focused commits
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Run the test suite** and ensure all tests pass
6. **Create a pull request** with a clear description

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### AWS CDK Guidelines

- Use meaningful construct IDs
- Follow AWS naming conventions
- Add comments for complex infrastructure
- Use environment-specific configurations

### Testing Guidelines

- Write unit tests for business logic
- Add integration tests for AWS services
- Mock external dependencies
- Aim for >80% code coverage

## Project Structure

```
mailtri-router/
├─ cdk/                 # AWS CDK infrastructure
├─ lambda/              # Lambda function code
├─ worker/              # SQS consumer workers
├─ dev/                 # Local development tools
├─ docs/                # Documentation
└─ .github/workflows/   # CI/CD pipelines
```

## Areas for Contribution

### High Priority

- Email parsing improvements
- Error handling and retry logic
- Local development experience
- Documentation and examples

### Medium Priority

- Performance optimizations
- Additional command patterns
- Monitoring and logging
- Security enhancements

### Low Priority

- UI improvements for local dev
- Additional test coverage
- Code refactoring
- Dependency updates

## Reporting Issues

### Bug Reports

Use the GitHub issue template and include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

### Feature Requests

Include:

- Use case description
- Proposed solution
- Alternative approaches considered
- Additional context

## Getting Help

- 📖 [Documentation](https://docs.mailtri.com)
- 💬 [Discord Community](https://discord.gg/mailtri)
- 🐛 [GitHub Issues](https://github.com/mailtri/mailtri-router/issues)
- 📧 [Email](mailto:dev@mailtri.com)

## Release Process

1. **Version bumping** follows semantic versioning
2. **Changelog** is automatically generated from conventional commits
3. **Releases** are created from the `main` branch
4. **AWS deployment** happens automatically via GitHub Actions

## License

By contributing to mailtri-router, you agree that your contributions will be licensed under the MIT License.
