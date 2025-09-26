# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public GitHub issue

Security vulnerabilities should be reported privately to prevent exploitation.

### 2. Email us directly

Send an email to **security@mailtri.com** with the following information:

- **Subject**: `[SECURITY] mailtri-router vulnerability report`
- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact and affected components
- **Steps to reproduce**: Detailed steps to reproduce the issue
- **Environment**: OS, Node.js version, AWS region, etc.
- **Proof of concept**: If applicable, include a minimal PoC
- **Suggested fix**: If you have ideas for remediation

### 3. What to expect

- **Acknowledgment**: We'll acknowledge receipt within 24 hours
- **Initial assessment**: We'll provide an initial assessment within 72 hours
- **Updates**: We'll keep you informed of our progress
- **Resolution**: We'll work with you to resolve the issue
- **Credit**: We'll credit you in our security advisories (unless you prefer anonymity)

## Security Best Practices

### For Users

- **Keep dependencies updated**: Regularly update npm packages
- **Use environment variables**: Never hardcode secrets in your code
- **Enable AWS CloudTrail**: Monitor API calls and changes
- **Use IAM least privilege**: Grant minimal required permissions
- **Enable encryption**: Use S3 server-side encryption for email storage
- **Monitor logs**: Set up CloudWatch alarms for error rates

### For Developers

- **Input validation**: Always validate and sanitize email content
- **Error handling**: Don't expose sensitive information in error messages
- **Dependency scanning**: Use tools like `npm audit` and `snyk`
- **Code review**: Security-focused code reviews for all changes
- **Testing**: Include security tests in your test suite

## Security Features

### Email Processing Security

- **Content sanitization**: HTML and script tags are stripped from email content
- **Attachment scanning**: Attachments are scanned for malicious content
- **Rate limiting**: Built-in rate limiting to prevent abuse
- **Input validation**: Strict validation of email headers and content

### AWS Security

- **IAM roles**: Least privilege access for Lambda functions
- **VPC configuration**: Optional VPC deployment for network isolation
- **Encryption**: S3 objects encrypted at rest
- **Access logging**: CloudTrail logging for all API calls

### Data Protection

- **PII handling**: Personal information is handled according to privacy requirements
- **Data retention**: Configurable retention policies for email storage
- **Audit trails**: Comprehensive logging of all email processing activities

## Known Security Considerations

### Email Spoofing

- **SPF/DKIM/DMARC**: Configure proper email authentication
- **Sender verification**: Validate sender addresses against known domains
- **Rate limiting**: Implement rate limiting to prevent abuse

### AWS Security

- **Cross-account access**: Be cautious with cross-account S3 access
- **Lambda permissions**: Review and minimize Lambda execution roles
- **SQS visibility**: Configure appropriate SQS message visibility timeouts

### Network Security

- **HTTPS only**: All API endpoints use HTTPS
- **CORS configuration**: Proper CORS settings for webhook endpoints
- **IP whitelisting**: Optional IP whitelisting for webhook endpoints

## Security Updates

We regularly release security updates. To stay informed:

- **Watch the repository**: Get notified of new releases
- **Subscribe to security advisories**: GitHub security advisories
- **Follow our blog**: Security updates and best practices
- **Join our Discord**: Real-time security discussions

## Security Contact

- **Email**: security@mailtri.com
- **Response time**: 24-72 hours for initial response
- **PGP key**: Available upon request for encrypted communications

## Security Hall of Fame

We maintain a security hall of fame to recognize security researchers who help improve mailtri-router security:

- [Your name could be here!]

## Legal

By reporting security vulnerabilities, you agree to:

- Allow reasonable time for us to address the issue
- Not publicly disclose the vulnerability until we've had a chance to fix it
- Not use the vulnerability for malicious purposes
- Comply with applicable laws and regulations

## Bug Bounty

We're considering a bug bounty program for critical security vulnerabilities. Details will be announced separately.

---

**Thank you for helping keep mailtri-router secure!**
