# Email Domain Verification Guide

This guide walks you through verifying your email domain with AWS SES and setting up the necessary DNS records in Route 53.

## 🎯 Overview

To send emails through AWS SES, you need to:

1. **Verify your domain** in AWS SES
2. **Set up DNS records** for email authentication (SPF, DMARC, DKIM)
3. **Configure Route 53** to manage your domain's DNS

## 📋 Prerequisites

- ✅ AWS CLI configured with appropriate permissions
- ✅ Route 53 hosted zone for your domain
- ✅ Domain deployed with CDK stack

## 🚀 Step-by-Step Process

### 1. Deploy Your Domain

```bash
# Deploy with your domain
npm run deploy:domain yourdomain.com
```

### 2. Verify Domain in SES

```bash
# Start domain verification process
aws ses verify-domain-identity --domain yourdomain.com
```

This returns a verification token that you need to add to your DNS.

### 3. Get SES Verification Token

```bash
# Get the verification token
TOKEN=$(aws ses get-identity-verification-attributes \
  --identities yourdomain.com \
  --query 'VerificationAttributes.yourdomain.com.VerificationToken' \
  --output text)

echo "Verification token: $TOKEN"
```

### 4. Update DNS with SES Token

The CDK deployment should have already created the `_amazonses.yourdomain.com` record. You need to update it with the actual token:

```bash
# Get your hosted zone ID
HOSTED_ZONE_ID=$(aws cloudformation describe-stacks \
  --stack-name MailtriRouterStack \
  --query 'Stacks[0].Outputs[?OutputKey==`HostedZoneId`].OutputValue' \
  --output text)

# Update the SES verification record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_amazonses.yourdomain.com",
        "Type": "TXT",
        "TTL": 300,
        "ResourceRecords": [{"Value": "\"'$TOKEN'\""}]
      }
    }]
  }'
```

### 5. Enable DKIM

```bash
# Enable DKIM for your domain
aws ses put-identity-dkim-attributes \
  --identity yourdomain.com \
  --dkim-enabled
```

### 6. Get DKIM Tokens

```bash
# Get DKIM tokens
aws ses get-identity-dkim-attributes --identities yourdomain.com
```

This returns 3 DKIM tokens (dkim1, dkim2, dkim3) that you need to add to your DNS.

### 7. Update DKIM Records

```bash
# Get DKIM tokens
DKIM_TOKENS=$(aws ses get-identity-dkim-attributes \
  --identities yourdomain.com \
  --query 'DkimAttributes.yourdomain.com.DkimTokens' \
  --output text)

# Update each DKIM record
for i in 1 2 3; do
  TOKEN=$(echo $DKIM_TOKENS | cut -d' ' -f$i)
  aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "dkim'$i'._domainkey.yourdomain.com",
          "Type": "TXT",
          "TTL": 300,
          "ResourceRecords": [{"Value": "'$TOKEN'"}]
        }
      }]
    }'
done
```

## 📊 DNS Records Summary

After completing all steps, you should have these DNS records:

### ✅ SPF Record

```
Name: yourdomain.com
Type: TXT
Value: v=spf1 include:amazonses.com ~all
```

### ✅ DMARC Record

```
Name: _dmarc.yourdomain.com
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### ✅ SES Domain Verification

```
Name: _amazonses.yourdomain.com
Type: TXT
Value: [Your SES verification token]
```

### ✅ DKIM Records

```
Name: dkim1._domainkey.yourdomain.com
Type: TXT
Value: [DKIM token 1]

Name: dkim2._domainkey.yourdomain.com
Type: TXT
Value: [DKIM token 2]

Name: dkim3._domainkey.yourdomain.com
Type: TXT
Value: [DKIM token 3]
```

## 🔍 Verification

### Check SES Status

```bash
# Check domain verification status
aws ses get-identity-verification-attributes --identities yourdomain.com

# Check DKIM status
aws ses get-identity-dkim-attributes --identities yourdomain.com
```

### Check DNS Propagation

```bash
# Check SPF record
dig TXT yourdomain.com

# Check DMARC record
dig TXT _dmarc.yourdomain.com

# Check SES verification
dig TXT _amazonses.yourdomain.com

# Check DKIM records
dig TXT dkim1._domainkey.yourdomain.com
dig TXT dkim2._domainkey.yourdomain.com
dig TXT dkim3._domainkey.yourdomain.com
```

## ⚠️ Important Notes

1. **DNS Propagation**: DNS changes can take up to 48 hours to propagate globally
2. **SES Verification**: SES verification typically takes 5-10 minutes after DNS is updated
3. **DKIM Verification**: DKIM verification can take up to 24 hours
4. **Testing**: Use `dig` or online DNS tools to verify records are properly set

## 🚨 Troubleshooting

### Domain Not Verified

- Check that the `_amazonses.yourdomain.com` TXT record contains the correct token
- Ensure the token is wrapped in quotes: `"your-token-here"`
- Wait for DNS propagation (up to 48 hours)

### DKIM Not Working

- Verify all 3 DKIM records are created
- Check that DKIM tokens match exactly
- Ensure DKIM is enabled in SES

### SPF/DMARC Issues

- Verify SPF record includes `include:amazonses.com`
- Check DMARC record format and email address
- Test with online SPF/DMARC validators

## 📚 Additional Resources

- [AWS SES Domain Verification](https://docs.aws.amazon.com/ses/latest/dg/verify-domains.html)
- [AWS SES DKIM Setup](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html)
- [SPF Record Generator](https://www.spf-record.com/)
- [DMARC Record Generator](https://www.dmarcanalyzer.com/)
