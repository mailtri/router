#!/bin/bash

# Automated Email Authentication Setup for Mailtri Router
# This script handles SES domain verification and DKIM setup automatically
# Usage: ./scripts/setup-email-authentication.sh yourdomain.com

set -e

DOMAIN_NAME=${1:-"example.com"}

if [ "$DOMAIN_NAME" = "example.com" ]; then
  echo "⚠️  Using example.com. Provide your actual domain as the first argument."
  echo "Usage: ./scripts/setup-email-authentication.sh yourdomain.com"
  exit 1
fi

echo "🔐 Setting up email authentication for domain: $DOMAIN_NAME"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "❌ AWS CLI not configured. Please run 'aws configure' first."
  exit 1
fi

# Get hosted zone ID from CloudFormation stack
echo "🔍 Getting hosted zone ID from CloudFormation stack..."
HOSTED_ZONE_ID=$(aws cloudformation describe-stacks \
  --stack-name MailtriRouterStack \
  --query 'Stacks[0].Outputs[?OutputKey==`HostedZoneId`].OutputValue' \
  --output text)

if [ -z "$HOSTED_ZONE_ID" ] || [ "$HOSTED_ZONE_ID" = "None" ]; then
  echo "❌ Could not find hosted zone ID in CloudFormation stack outputs."
  echo "Make sure the stack was deployed with a domain context."
  exit 1
fi

echo "✅ Found hosted zone ID: $HOSTED_ZONE_ID"

# Step 1: Verify domain in SES
echo "📧 Verifying domain in SES..."
aws ses verify-domain-identity --domain "$DOMAIN_NAME" --region us-east-1

# Step 2: Get SES verification token
echo "🔑 Getting SES verification token..."
TOKEN=$(aws ses get-identity-verification-attributes \
  --identities "$DOMAIN_NAME" \
  --region us-east-1 \
  --query "VerificationAttributes.$DOMAIN_NAME.VerificationToken" \
  --output text)

echo "✅ SES verification token: $TOKEN"

# Step 3: Update SES domain verification record
echo "🌐 Updating SES domain verification record..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"_amazonses.$DOMAIN_NAME\",
        \"Type\": \"TXT\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"\\\"$TOKEN\\\"\"}]
      }
    }]
  }"

echo "✅ SES domain verification record updated"

# Step 4: Enable DKIM
echo "🔐 Enabling DKIM for domain..."
aws ses set-identity-dkim-enabled \
  --identity "$DOMAIN_NAME" \
  --dkim-enabled \
  --region us-east-1

echo "✅ DKIM enabled"

# Step 5: Get DKIM tokens
echo "🔑 Getting DKIM tokens..."
DKIM_TOKENS=$(aws ses get-identity-dkim-attributes \
  --identities "$DOMAIN_NAME" \
  --region us-east-1 \
  --query "DkimAttributes.$DOMAIN_NAME.DkimTokens" \
  --output text)

echo "✅ DKIM tokens: $DKIM_TOKENS"

# Step 6: Update DKIM records with proper format
echo "🌐 Updating DKIM records..."

# Convert tokens to array
TOKENS_ARRAY=($DKIM_TOKENS)

for i in 1 2 3; do
  TOKEN_INDEX=$((i-1))
  TOKEN="${TOKENS_ARRAY[$TOKEN_INDEX]}"
  
  echo "  Updating dkim$i._domainkey.$DOMAIN_NAME with token: $TOKEN"
  
  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "{
      \"Changes\": [{
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"dkim$i._domainkey.$DOMAIN_NAME\",
          \"Type\": \"TXT\",
          \"TTL\": 300,
          \"ResourceRecords\": [{\"Value\": \"\\\"v=DKIM1; k=rsa; p=$TOKEN\\\"\"}]
        }
      }]
    }"
done

echo "✅ All DKIM records updated"

# Step 7: Wait for propagation and verify
echo "⏳ Waiting for DNS propagation (30 seconds)..."
sleep 30

echo "🔍 Verifying setup..."

# Check SES domain verification status
VERIFICATION_STATUS=$(aws ses get-identity-verification-attributes \
  --identities "$DOMAIN_NAME" \
  --region us-east-1 \
  --query "VerificationAttributes.$DOMAIN_NAME.VerificationStatus" \
  --output text)

echo "📧 SES Domain Verification Status: $VERIFICATION_STATUS"

# Check DKIM status
DKIM_STATUS=$(aws ses get-identity-dkim-attributes \
  --identities "$DOMAIN_NAME" \
  --region us-east-1 \
  --query "DkimAttributes.$DOMAIN_NAME.DkimVerificationStatus" \
  --output text)

echo "🔐 DKIM Verification Status: $DKIM_STATUS"

# Summary
echo ""
echo "🎉 Email authentication setup complete!"
echo ""
echo "📊 Summary:"
echo "✅ Domain: $DOMAIN_NAME"
echo "✅ Hosted Zone ID: $HOSTED_ZONE_ID"
echo "✅ SES Domain Verification: $VERIFICATION_STATUS"
echo "✅ DKIM Verification: $DKIM_STATUS"
echo ""
echo "📋 DNS Records Created:"
echo "✅ SPF Record: $DOMAIN_NAME"
echo "   Value: v=spf1 include:amazonses.com ~all"
echo ""
echo "✅ DMARC Record: _dmarc.$DOMAIN_NAME"
echo "   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@$DOMAIN_NAME"
echo ""
echo "✅ SES Domain Verification: _amazonses.$DOMAIN_NAME"
echo "   Value: $TOKEN"
echo ""
echo "✅ DKIM Records:"
for i in 1 2 3; do
  TOKEN_INDEX=$((i-1))
  TOKEN="${TOKENS_ARRAY[$TOKEN_INDEX]}"
  echo "   dkim$i._domainkey.$DOMAIN_NAME: v=DKIM1; k=rsa; p=$TOKEN"
done
echo ""
echo "⏳ Note: DKIM verification may take up to 24 hours to complete."
echo "   You can check status with:"
echo "   aws ses get-identity-dkim-attributes --identities $DOMAIN_NAME --region us-east-1"
