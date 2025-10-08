# AWS Setup Guide

This guide will help you set up AWS credentials and deploy the Mailtri Router infrastructure.

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured
- [Node.js](https://nodejs.org/) 20+ installed
- [Docker](https://www.docker.com/) installed (for local development)
- AWS Account with appropriate permissions

## AWS Credentials Setup

### Option 1: AWS CLI Configuration (Recommended)

1. **Install AWS CLI** (if not already installed):

   ```bash
   # macOS
   brew install awscli

   # Ubuntu/Debian
   sudo apt-get install awscli

   # Windows
   # Download from https://aws.amazon.com/cli/
   ```

2. **Configure AWS credentials**:

   ```bash
   aws configure
   ```

   Enter the following information when prompted:
   - **AWS Access Key ID**: Your access key
   - **AWS Secret Access Key**: Your secret key
   - **Default region name**: `us-east-1` (or your preferred region)
   - **Default output format**: `json`

3. **Verify configuration**:
   ```bash
   aws sts get-caller-identity
   ```

### Option 2: Environment Variables

Set the following environment variables:

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="us-east-1"
export CDK_DEFAULT_ACCOUNT="your-account-id"
export CDK_DEFAULT_REGION="us-east-1"
```

### Option 3: AWS Profiles

Create a named profile for the project:

```bash
aws configure --profile mailtri
```

Then set the profile:

```bash
export AWS_PROFILE=mailtri
```

## Required AWS Permissions

Your AWS user/role needs the following permissions:

### CDK Bootstrap Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cloudformation:*", "s3:*", "iam:*", "ssm:*"],
      "Resource": "*"
    }
  ]
}
```

### Runtime Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "lambda:InvokeFunction",
        "ses:SendEmail",
        "ses:SendRawEmail",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

## CDK Bootstrap

Before deploying, you need to bootstrap CDK in your AWS account:

```bash
# Bootstrap CDK (only needed once per account/region)
npx cdk bootstrap

# Or for a specific account/region
npx cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

## Deployment

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Build the project**:

   ```bash
   npm run build
   ```

3. **Synthesize the CloudFormation template** (optional):

   ```bash
   npm run cdk:synth
   ```

4. **Review changes**:

   ```bash
   npm run cdk:diff
   ```

5. **Deploy the infrastructure**:
   ```bash
   npm run deploy
   ```

## Environment-Specific Deployment

### Development Environment

```bash
# Set environment variables
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"

# Deploy with development context
npx cdk deploy --context environment=development
```

### Production Environment

```bash
# Set environment variables
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"

# Deploy with production context
npx cdk deploy --context environment=production
```

## Verification

After deployment, verify the resources:

```bash
# Check S3 bucket
aws s3 ls s3://mailtri-emails-ACCOUNT-REGION/

# Check SQS queue
aws sqs list-queues --queue-name-prefix mailtri

# Check Lambda function
aws lambda list-functions --query 'Functions[?contains(FunctionName, `mailtri`)]'
```

## SES Configuration

1. **Verify email addresses** (for testing):

   ```bash
   aws ses verify-email-identity --email-address your-email@example.com
   ```

2. **Verify domain** (for production):

   ```bash
   aws ses verify-domain-identity --domain example.com
   ```

3. **Create SES rule set**:

   ```bash
   aws ses create-receipt-rule-set --rule-set-name mailtri-router
   ```

4. **Create receipt rule**:
   ```bash
   aws ses create-receipt-rule \
     --rule-set-name mailtri-router \
     --rule-name process-emails \
     --enabled \
     --recipients your-domain.com \
     --actions Type=LambdaFunction,FunctionArn=arn:aws:lambda:REGION:ACCOUNT:function:mailtri-email-processor
   ```

## Troubleshooting

### Common Issues

1. **"No credentials found"**:

   ```bash
   aws configure list
   aws sts get-caller-identity
   ```

2. **"CDK not bootstrapped"**:

   ```bash
   npx cdk bootstrap
   ```

3. **"Insufficient permissions"**:
   - Check IAM permissions
   - Ensure CDK bootstrap completed successfully
   - Verify AWS credentials are correct

4. **"Bucket already exists"**:
   - S3 bucket names must be globally unique
   - The CDK stack uses account and region in the bucket name
   - If you get this error, the bucket name is already taken

### Debug Commands

```bash
# Check CDK context
npx cdk context

# List all stacks
npx cdk list

# Destroy stack (be careful!)
npx cdk destroy

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name MailtriRouterStack
```

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible
2. **Enable MFA** on your AWS account
3. **Use least privilege** principle for permissions
4. **Rotate access keys** regularly
5. **Enable CloudTrail** for audit logging
6. **Use AWS Secrets Manager** for sensitive data

## Cost Optimization

1. **S3 Lifecycle Policies**: Automatically transition old emails to cheaper storage
2. **Lambda Provisioned Concurrency**: Only if you have consistent traffic
3. **SQS Visibility Timeout**: Optimize based on processing time
4. **CloudWatch Logs Retention**: Set appropriate retention periods

## Monitoring

1. **CloudWatch Metrics**: Monitor Lambda invocations, errors, duration
2. **S3 Metrics**: Monitor bucket size and request count
3. **SQS Metrics**: Monitor queue depth and message age
4. **SES Metrics**: Monitor bounce and complaint rates

## Support

- 📖 [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- 📖 [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
