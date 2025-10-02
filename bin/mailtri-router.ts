#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MailtriRouterStack } from '../lib/mailtri-router-stack';

const app = new cdk.App();

// Get environment variables
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '123456789012';
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

// Warn if using default account ID
if (account === '123456789012') {
  console.warn('⚠️  Using default account ID. Set CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID for production.');
}

// Create the stack
new MailtriRouterStack(app, 'MailtriRouterStack', {
  env: {
    account,
    region,
  },
  description: 'Mailtri Router - Email processing infrastructure for AWS',
  tags: {
    Project: 'mailtri-router',
    Environment: 'production',
    ManagedBy: 'cdk',
  },
});

// Add version information
app.node.addMetadata('version', '1.0.0');
app.node.addMetadata('description', 'Mailtri Router CDK Infrastructure');
