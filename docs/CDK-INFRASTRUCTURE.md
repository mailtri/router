# CDK Infrastructure Overview

This document describes the AWS CDK infrastructure created for the Mailtri Router project.

## Architecture

The CDK stack creates a complete email processing pipeline:

```
SES → Lambda → S3 + SQS
```

### Components

1. **S3 Bucket** (`mailtri-emails-{account}-{region}`)
   - Stores processed emails and attachments
   - Versioning enabled for data protection
   - Lifecycle policies for cost optimization
   - Encryption with S3-managed keys

2. **SQS Queue** (`mailtri-processed-emails`)
   - Queues processed emails for downstream handlers
   - Dead letter queue for error handling
   - 14-day message retention

3. **Lambda Function** (`mailtri-email-processor`)
   - Processes incoming emails
   - Parses email content and extracts intent
   - Stores results in S3 and SQS
   - 5-minute timeout, 512MB memory

4. **SES Configuration Set** (`mailtri-router`)
   - Tracks email events (send, bounce, complaint, etc.)
   - Enables detailed monitoring and analytics

## Deployment

### Prerequisites

1. **AWS CLI configured**:
   ```bash
   aws configure
   ```

2. **CDK bootstrapped** (first time only):
   ```bash
   npx cdk bootstrap
   ```

### Deploy

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy infrastructure
npm run deploy
```

### Verify Deployment

```bash
# Check deployed resources
aws s3 ls | grep mailtri
aws sqs list-queues --queue-name-prefix mailtri
aws lambda list-functions --query 'Functions[?contains(FunctionName, `mailtri`)]'
```

## Configuration

### Environment Variables

The Lambda function uses these environment variables:

- `S3_BUCKET`: S3 bucket name for storing emails
- `SQS_QUEUE_URL`: SQS queue URL for processed emails
- `LOG_LEVEL`: Logging level (default: INFO)

### SES Setup

After deployment, configure SES:

1. **Verify domain**:
   ```bash
   aws ses verify-domain-identity --domain your-domain.com
   ```

2. **Create rule set**:
   ```bash
   aws ses create-receipt-rule-set --rule-set-name mailtri-router
   ```

3. **Create receipt rule**:
   ```bash
   aws ses create-receipt-rule \
     --rule-set-name mailtri-router \
     --rule-name process-emails \
     --enabled \
     --recipients your-domain.com \
     --actions Type=LambdaFunction,FunctionArn=arn:aws:lambda:REGION:ACCOUNT:function:mailtri-email-processor
   ```

4. **Set active rule set**:
   ```bash
   aws ses set-active-receipt-rule-set --rule-set-name mailtri-router
   ```

## Monitoring

### CloudWatch Metrics

Monitor these key metrics:

- **Lambda**: Invocations, errors, duration
- **S3**: Bucket size, request count
- **SQS**: Queue depth, message age
- **SES**: Bounce rate, complaint rate

### Logs

Lambda logs are available in CloudWatch:
```
/aws/lambda/mailtri-email-processor
```

## Security

### IAM Permissions

The stack creates least-privilege IAM roles:

- **Lambda execution role**: S3 read/write, SQS send
- **SES role**: S3 access for event publishing

### Data Protection

- S3 bucket encryption enabled
- No public access to S3 bucket
- SQS queue encryption in transit
- Lambda function logs encrypted

## Cost Optimization

### S3 Lifecycle Policies

- **30 days**: Transition to Infrequent Access
- **90 days**: Transition to Glacier
- **30 days**: Delete old versions

### Resource Sizing

- Lambda: 512MB memory, 5-minute timeout
- SQS: 14-day retention
- S3: Lifecycle policies for cost reduction

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Failed**
   ```bash
   aws sts get-caller-identity
   npx cdk bootstrap --force
   ```

2. **Lambda Not Invoked**
   - Check SES rule configuration
   - Verify Lambda permissions
   - Check CloudWatch logs

3. **S3 Access Denied**
   - Verify Lambda IAM role permissions
   - Check S3 bucket policy

### Debug Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name MailtriRouterStack

# View stack events
aws cloudformation describe-stack-events --stack-name MailtriRouterStack

# Check Lambda logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/mailtri-email-processor \
  --start-time $(date -d '1 hour ago' +%s)000
```

## Cleanup

### Destroy Stack

```bash
npm run cdk:destroy
```

### Manual Cleanup

```bash
# Delete S3 bucket contents
aws s3 rm s3://mailtri-emails-ACCOUNT-REGION --recursive

# Delete SES rule set
aws ses delete-receipt-rule-set --rule-set-name mailtri-router
```

## Support

- 📖 [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- 📖 [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
