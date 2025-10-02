#!/bin/bash

# Deploy Mailtri Router with Route 53 domain configuration
# Usage: ./scripts/deploy-with-domain.sh yourdomain.com

set -e

DOMAIN_NAME=${1:-"example.com"}

if [ "$DOMAIN_NAME" = "example.com" ]; then
  echo "⚠️  Using example.com. Provide your actual domain as the first argument."
  echo "Usage: ./scripts/deploy-with-domain.sh yourdomain.com"
  exit 1
fi

echo "🚀 Deploying Mailtri Router for domain: $DOMAIN_NAME"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "❌ AWS CLI not configured. Please run 'aws configure' first."
  exit 1
fi

# Check if domain exists in Route 53
echo "🔍 Checking if domain $DOMAIN_NAME exists in Route 53..."
if ! aws route53 list-hosted-zones --query "HostedZones[?Name=='$DOMAIN_NAME.']" --output text | grep -q "$DOMAIN_NAME"; then
  echo "❌ Domain $DOMAIN_NAME not found in Route 53."
  echo "Please ensure your domain is managed by Route 53."
  exit 1
fi

echo "✅ Domain $DOMAIN_NAME found in Route 53"

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy with domain context
echo "🚀 Deploying CDK stack with domain: $DOMAIN_NAME"
npx cdk deploy --context domainName="$DOMAIN_NAME"

echo "✅ Deployment complete!"

# Get outputs
echo "📋 Getting deployment outputs..."
DOMAIN_NAME_OUTPUT=$(aws cloudformation describe-stacks --stack-name MailtriRouterStack --query 'Stacks[0].Outputs[?OutputKey==`DomainName`].OutputValue' --output text)
HOSTED_ZONE_ID=$(aws cloudformation describe-stacks --stack-name MailtriRouterStack --query 'Stacks[0].Outputs[?OutputKey==`HostedZoneId`].OutputValue' --output text)

echo ""
echo "🎉 Deployment successful!"
echo "📧 Domain: $DOMAIN_NAME_OUTPUT"
echo "🌐 Hosted Zone ID: $HOSTED_ZONE_ID"
echo ""
echo "📋 DNS Records Created in Route 53:"
echo "✅ SPF Record: $DOMAIN_NAME"
echo "   Type: TXT"
echo "   Value: v=spf1 include:amazonses.com ~all"
echo ""
echo "✅ DMARC Record: _dmarc.$DOMAIN_NAME"
echo "   Type: TXT"
echo "   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@$DOMAIN_NAME"
echo ""
echo "✅ SES Domain Verification: _amazonses.$DOMAIN_NAME"
echo "   Type: TXT"
echo "   Value: [Will be updated after SES verification]"
echo ""
echo "✅ DKIM Records: dkim1._domainkey.$DOMAIN_NAME"
echo "   Type: TXT"
echo "   Value: [Will be updated after DKIM setup]"
echo ""
echo "📚 Next steps:"
echo "1. Verify domain in SES:"
echo "   aws ses verify-domain-identity --domain $DOMAIN_NAME"
echo ""
echo "2. Get SES verification token and update DNS:"
echo "   TOKEN=\$(aws ses get-identity-verification-attributes --identities $DOMAIN_NAME --query 'VerificationAttributes.$DOMAIN_NAME.VerificationToken' --output text)"
echo "   aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch '{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"_amazonses.$DOMAIN_NAME\",\"Type\":\"TXT\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"\\\"\$TOKEN\\\"\"}]}}]}'"
echo ""
echo "3. Enable DKIM:"
echo "   aws ses put-identity-dkim-attributes --identity $DOMAIN_NAME --dkim-enabled"
echo ""
echo "4. Get DKIM tokens and update DNS:"
echo "   aws ses get-identity-dkim-attributes --identities $DOMAIN_NAME"
echo ""
echo "📖 See docs/ROUTE53-SETUP.md for detailed instructions"
