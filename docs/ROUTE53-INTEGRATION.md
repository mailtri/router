# Route 53 Integration

This document explains how the Mailtri Router integrates with your existing Route 53 setup.

## Overview

The CDK stack automatically configures DNS records in your existing Route 53 hosted zone to support email authentication and delivery.

## What Gets Created

### 1. DNS Records

The following DNS records are automatically created in your hosted zone:

- **SPF Record**: Authorizes Amazon SES to send emails
- **DMARC Record**: Provides email authentication policy
- **SES Domain Verification**: TXT record for domain ownership
- **DKIM Records**: Three DKIM records for email signing

### 2. Route 53 Integration

- **Hosted Zone Lookup**: Automatically finds your existing hosted zone
- **Record Management**: Creates and manages DNS records
- **Domain Context**: Uses your domain name throughout the stack

## Deployment Options

### Option 1: CDK Deploy with Context

```bash
# Deploy with domain context
npx cdk deploy --context domainName=yourdomain.com
```

### Option 2: Deployment Script

```bash
# Use the deployment script (recommended)
npm run deploy:domain yourdomain.com
```

### Option 3: Environment Variable

```bash
# Set domain as environment variable
export CDK_DOMAIN_NAME=yourdomain.com
npx cdk deploy
```

## Prerequisites

### 1. Route 53 Hosted Zone

Your domain must have a hosted zone in Route 53:

```bash
# Check if hosted zone exists
aws route53 list-hosted-zones --query "HostedZones[?Name=='yourdomain.com.']"
```

### 2. AWS Permissions

Your AWS credentials need these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListHostedZones",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange",
        "ses:VerifyDomainIdentity",
        "ses:GetIdentityVerificationAttributes",
        "ses:PutIdentityDkimAttributes",
        "ses:GetIdentityDkimAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

## DNS Records Created

### SPF Record
```
Type: TXT
Name: yourdomain.com
Value: v=spf1 include:amazonses.com ~all
```

### DMARC Record
```
Type: TXT
Name: _dmarc.yourdomain.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### SES Domain Verification
```
Type: TXT
Name: _amazonses.yourdomain.com
Value: [SES verification token]
```

### DKIM Records
```
Type: TXT
Name: dkim1._domainkey.yourdomain.com
Name: dkim2._domainkey.yourdomain.com
Name: dkim3._domainkey.yourdomain.com
Value: [DKIM tokens from SES]
```

## Post-Deployment Steps

### 1. Verify Domain in SES

```bash
# Start domain verification
aws ses verify-domain-identity --domain yourdomain.com

# Get verification token
aws ses get-identity-verification-attributes --identities yourdomain.com
```

### 2. Update SES Domain Verification Record

The CDK creates a placeholder record. Update it with the actual verification token:

```bash
# Get the verification token from SES
TOKEN=$(aws ses get-identity-verification-attributes --identities yourdomain.com --query 'VerificationAttributes.yourdomain.com.VerificationToken' --output text)

# Update the TXT record
aws route53 change-resource-record-sets --hosted-zone-id YOUR_HOSTED_ZONE_ID --change-batch "{
  \"Changes\": [{
    \"Action\": \"UPSERT\",
    \"ResourceRecordSet\": {
      \"Name\": \"_amazonses.yourdomain.com\",
      \"Type\": \"TXT\",
      \"TTL\": 300,
      \"ResourceRecords\": [{\"Value\": \"\\\"$TOKEN\\\"\"}]
    }
  }]
}"
```

### 3. Enable DKIM

```bash
# Enable DKIM for the domain
aws ses put-identity-dkim-attributes --identity yourdomain.com --dkim-enabled

# Get DKIM tokens
aws ses get-identity-dkim-attributes --identities yourdomain.com
```

### 4. Update DKIM Records

Update the three DKIM records with the actual tokens from SES.

## Monitoring and Troubleshooting

### 1. Check DNS Records

```bash
# Check SPF record
dig TXT yourdomain.com

# Check DMARC record
dig TXT _dmarc.yourdomain.com

# Check DKIM records
dig TXT dkim1._domainkey.yourdomain.com
```

### 2. Verify SES Configuration

```bash
# Check domain verification status
aws ses get-identity-verification-attributes --identities yourdomain.com

# Check DKIM status
aws ses get-identity-dkim-attributes --identities yourdomain.com
```

### 3. Test Email Sending

```bash
# Send test email
aws ses send-email \
  --source "noreply@yourdomain.com" \
  --destination "ToAddresses=test@example.com" \
  --message "Subject={Data='Test Email'},Body={Text={Data='This is a test email'}}"
```

## Customization

### 1. Custom DMARC Policy

You can customize the DMARC policy by modifying the CDK stack:

```typescript
const dmarcRecord = new route53.TxtRecord(this, 'DMARCRecord', {
  zone: hostedZone,
  recordName: `_dmarc.${domainName}`,
  values: ['v=DMARC1; p=reject; rua=mailto:dmarc@' + domainName],
});
```

### 2. Additional SPF Records

If you send from other services, add them to the SPF record:

```typescript
const spfRecord = new route53.TxtRecord(this, 'SPFRecord', {
  zone: hostedZone,
  recordName: domainName,
  values: ['v=spf1 include:amazonses.com include:_spf.google.com ~all'],
});
```

### 3. Subdomain Configuration

For subdomains, create additional records:

```typescript
const subdomainRecord = new route53.TxtRecord(this, 'SubdomainSPF', {
  zone: hostedZone,
  recordName: 'mail.' + domainName,
  values: ['v=spf1 include:amazonses.com ~all'],
});
```

## Security Considerations

1. **DMARC Policy**: Start with `p=quarantine`, then move to `p=reject`
2. **DKIM Rotation**: Rotate DKIM keys periodically
3. **SPF Record Maintenance**: Keep SPF record updated with all sending services
4. **Monitoring**: Set up monitoring for DMARC reports

## Cost Impact

- **Route 53 Hosted Zone**: $0.50/month (if not already present)
- **DNS Queries**: $0.40 per million queries
- **No additional costs** for the DNS records themselves

## Support

- 📖 [Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- 📖 [SES Documentation](https://docs.aws.amazon.com/ses/)
- 💬 [Slack Community](https://slack.mailtri.com)
- 🐛 [Issue Tracker](https://github.com/mailtri/router/issues)
