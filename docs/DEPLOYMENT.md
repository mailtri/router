# Deployment Guide

This guide covers deploying the Mailtri Router infrastructure to AWS using CDK.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (see [AWS-SETUP.md](AWS-SETUP.md))
- Node.js 20+ installed
- CDK bootstrapped in your account

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
export CDK_DEFAULT_ACCOUNT="your-account-id"
export CDK_DEFAULT_REGION="us-east-1"
```

### 3. Bootstrap CDK (First Time Only)

```bash
npx cdk bootstrap
```

### 4. Build the Project

```bash
npm run build
```

### 5. Review the Infrastructure

```bash
# Synthesize CloudFormation template
npm run cdk:synth

# Show what will be deployed
npm run cdk:diff
```

### 6. Deploy the Infrastructure

```bash
npm run deploy
```

## Post-Deployment Configuration

### 1. Configure SES Domain

```bash
# Verify your domain
aws ses verify-domain-identity --domain your-domain.com

# Create DNS record (copy the TXT record to your DNS)
aws ses get-identity-verification-attributes --identities your-domain.com
```

### 2. Create SES Rule Set

```bash
# Create rule set
aws ses create-receipt-rule-set --rule-set-name mailtri-router

# Create receipt rule
aws ses create-receipt-rule \
  --rule-set-name mailtri-router \
  --rule-name process-emails \
  --enabled \
  --recipients your-domain.com \
  --actions Type=LambdaFunction,FunctionArn=arn:aws:lambda:REGION:ACCOUNT:function:mailtri-email-processor
```

### 3. Set Active Rule Set

```bash
aws ses set-active-receipt-rule-set --rule-set-name mailtri-router
```

## Environment-Specific Deployments

### Development Environment

```bash
# Deploy with development context
npx cdk deploy --context environment=development
```

### Production Environment

```bash
# Deploy with production context
npx cdk deploy --context environment=production
```

## Verification

### 1. Check Deployed Resources

```bash
# List S3 buckets
aws s3 ls | grep mailtri

# List SQS queues
aws sqs list-queues --queue-name-prefix mailtri

# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `mailtri`)]'
```

### 2. Test Email Processing

```bash
# Send test email to your domain
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "to": "task+notion@your-domain.com",
    "subject": "Test Task",
    "body": "#task Test email processing"
  }'
```

### 3. Check CloudWatch Logs

```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/mailtri

# Get recent logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/mailtri-email-processor \
  --start-time $(date -d '1 hour ago' +%s)000
```

## Monitoring and Alerting

### 1. CloudWatch Metrics

Monitor these key metrics:

- **Lambda**: Invocations, errors, duration
- **S3**: Bucket size, request count
- **SQS**: Queue depth, message age
- **SES**: Bounce rate, complaint rate

### 2. Set Up Alerts

```bash
# Create CloudWatch alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name "mailtri-lambda-errors" \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1
```

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Failed**
   ```bash
   # Check permissions
   aws sts get-caller-identity
   
   # Re-run bootstrap
   npx cdk bootstrap --force
   ```

2. **S3 Bucket Already Exists**
   - Bucket names must be globally unique
   - The CDK uses account and region in the name
   - If taken, modify the bucket name in the stack

3. **Lambda Function Not Invoked**
   - Check SES rule configuration
   - Verify Lambda function permissions
   - Check CloudWatch logs for errors

4. **SES Domain Verification Failed**
   - Ensure DNS TXT record is correct
   - Wait for DNS propagation
   - Check domain ownership

### Debug Commands

```bash
# Check CDK context
npx cdk context

# List all stacks
npx cdk list

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name MailtriRouterStack

# View stack events
aws cloudformation describe-stack-events --stack-name MailtriRouterStack
```

## Cleanup

### Destroy Infrastructure

```bash
# Destroy the stack
npm run cdk:destroy

# Or manually
npx cdk destroy
```

### Clean Up Resources

```bash
# Delete S3 bucket contents
aws s3 rm s3://mailtri-emails-ACCOUNT-REGION --recursive

# Delete SES rule set
aws ses delete-receipt-rule-set --rule-set-name mailtri-router

# Delete SES configuration set
aws ses delete-configuration-set --configuration-set-name mailtri-router
```

## Security Considerations

1. **IAM Permissions**: Use least privilege principle
2. **S3 Bucket**: Enable encryption and versioning
3. **Lambda**: Use VPC if needed for additional security
4. **SES**: Configure SPF, DKIM, and DMARC records
5. **CloudTrail**: Enable for audit logging

## Cost Optimization

1. **S3 Lifecycle**: Automatically transition old emails
2. **Lambda**: Optimize memory and timeout settings
3. **SQS**: Set appropriate visibility timeout
4. **CloudWatch**: Set log retention periods

## Support

- 📖 [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- 📖 [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
