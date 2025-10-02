#!/usr/bin/env ts-node

/**
 * Local development server for mailtri-router
 * Runs the email processing pipeline locally using LocalStack and Mailpit
 */

import { createServer } from 'http';
import { parse } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { simpleParser } from 'mailparser';
import { parseEmailIntent } from './email-parser';

// Type definitions
interface EmailData {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  body?: string;
}

interface ProcessResult {
  success: boolean;
  intent?: {
    action: string;
    target: string;
    parameters: Record<string, unknown>;
  };
  error?: string;
}

// Local development configuration
const config = {
  port: process.env.PORT || 3030,
  localstackEndpoint: 'http://localhost:4566',
  mailpitEndpoint: 'http://localhost:8025',
  s3Bucket: 'mailtri-emails',
  sqsQueueUrl: 'http://localhost:4566/000000000000/mailtri-processed-emails',
  region: 'us-east-1',
};

// Initialize AWS clients for LocalStack
const s3Client = new S3Client({
  endpoint: config.localstackEndpoint,
  region: config.region,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  forcePathStyle: true,
});

const sqsClient = new SQSClient({
  endpoint: config.localstackEndpoint,
  region: config.region,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

/**
 * Process incoming email
 */
async function processEmail(emailData: EmailData): Promise<ProcessResult> {
  try {
    console.log('📧 Processing email:', emailData.subject);

    // Handle both email format and simple JSON input
    const emailContent = emailData.body || '';
    let parsedText = emailContent;
    let parsedHtml = '';
    let attachments: unknown[] = [];

    // Check if this is a raw email format (contains headers)
    if (
      emailContent.includes('From:') ||
      emailContent.includes('To:') ||
      emailContent.includes('Subject:')
    ) {
      try {
        const parsed = await simpleParser(emailContent);
        parsedText = parsed.text || '';
        parsedHtml = parsed.html || '';
        attachments = parsed.attachments || [];
      } catch (error) {
        console.log('⚠️  Could not parse as email, treating as plain text');
        // Keep original content as plain text
      }
    }

    // Extract intent
    console.log('📝 Parsed text:', parsedText);
    const intent = await parseEmailIntent(
      parsedText,
      emailData.from,
      emailData.to,
      emailData.subject,
    );

    // Create S3 key for email storage
    const s3Key = `emails/${Date.now()}/${emailData.messageId}.json`;

    // Store email in S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: s3Key,
        Body: JSON.stringify({
          messageId: emailData.messageId,
          timestamp: new Date().toISOString(),
          email: {
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            body: parsedText,
            html: parsedHtml,
            attachments,
          },
          intent,
        }),
        ContentType: 'application/json',
      }),
    );

    // Send to SQS for downstream processing
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: config.sqsQueueUrl,
        MessageBody: JSON.stringify({
          messageId: emailData.messageId,
          s3Key,
          intent,
          timestamp: new Date().toISOString(),
        }),
      }),
    );

    console.log('✅ Email processed successfully:', intent);
    return { success: true, intent };
  } catch (error) {
    console.error('❌ Error processing email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create HTTP server for webhook endpoint
 */
const server = createServer(async(req, res) => {
  const { pathname } = parse(req.url || '', true);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async() => {
      try {
        const emailData = JSON.parse(body);
        const result = await processEmail(emailData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
    );
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(config.port, () => {
  console.log('🚀 mailtri-router development server started!');
  console.log(`📡 Server running on http://localhost:${config.port}`);
  console.log(`📧 Webhook endpoint: http://localhost:${config.port}/webhook`);
  console.log(`❤️  Health check: http://localhost:${config.port}/health`);
  console.log('');
  console.log('🔧 Test with curl:');
  console.log(`curl -X POST http://localhost:${config.port}/webhook \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log(
    '  -d \'{"to": "task+notion@example.com", "subject": "Create task", "body": "New feature request"}\'',
  );
  console.log('');
  console.log('📚 Service URLs:');
  console.log('  • Mailpit Web UI: http://localhost:8025');
  console.log('  • LocalStack: http://localhost:4566');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
