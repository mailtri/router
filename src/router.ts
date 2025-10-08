#!/usr/bin/env ts-node

/**
 * Email Router for mailtri-router
 * Works for both local development and production environments
 * Uses environment variables to determine configuration
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import { createServer } from 'http';
import { parse } from 'url';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import {
  SQSClient,
  SendMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import { EmailParser } from './email-parser';
import { AttachmentProcessor } from './attachment-processor';
import { Attachment } from './types';
import logger from './logger';

// Winston logger is working correctly

// Type definitions
interface EmailData {
  messageId: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body?: string;
  html?: string;
}

interface ProcessResult {
  success: boolean;
  error?: string;
}

interface ProcessedEmail {
  messageId: string;
  timestamp: string;
  email: {
    from: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    html?: string;
    attachments: unknown[];
  };
}

// Environment-based configuration
const config = {
  // Server configuration
  port: process.env.PORT || 3030,
  isLocal:
    process.env.NODE_ENV === 'development' || process.env.IS_LOCAL === 'true',

  // AWS configuration
  awsEndpoint:
    process.env.AWS_ENDPOINT_URL ||
    (process.env.IS_LOCAL === 'true' ? 'http://localhost:4566' : undefined),
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId:
    process.env.AWS_ACCESS_KEY_ID ||
    (process.env.IS_LOCAL === 'true' ? 'test' : undefined),
  awsSecretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY ||
    (process.env.IS_LOCAL === 'true' ? 'test' : undefined),

  // Resource configuration
  s3Bucket: process.env.S3_BUCKET || 'mailtri-emails',
  sqsQueueName: process.env.SQS_QUEUE_NAME || 'mailtri-processed-emails',
  sqsQueueUrl: process.env.SQS_QUEUE_URL,

  // Optional webhook
  webhookUrl: process.env.WEBHOOK_URL,
};

// Initialize AWS clients
const s3ClientConfig: any = {
  region: config.awsRegion,
};

if (config.awsEndpoint) {
  s3ClientConfig.endpoint = config.awsEndpoint;
}

if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  s3ClientConfig.credentials = {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  };
}

if (config.isLocal) {
  s3ClientConfig.forcePathStyle = true;
}

const s3Client = new S3Client(s3ClientConfig);

const sqsClientConfig: any = {
  region: config.awsRegion,
};

if (config.awsEndpoint) {
  sqsClientConfig.endpoint = config.awsEndpoint;
}

if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  sqsClientConfig.credentials = {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  };
}

const sqsClient = new SQSClient(sqsClientConfig);

/**
 * Ensure required AWS resources exist (local development only)
 */
async function ensureResourcesExist(): Promise<void> {
  if (!config.isLocal) {
    return; // Skip resource creation in production
  }

  try {
    // Check if S3 bucket exists, create if not
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: config.s3Bucket }));
      logger.debug('S3 bucket exists', { bucket: config.s3Bucket });
    } catch (error) {
      logger.info('Creating S3 bucket', { bucket: config.s3Bucket });
      await s3Client.send(new CreateBucketCommand({ Bucket: config.s3Bucket }));
      logger.info('S3 bucket created', { bucket: config.s3Bucket });
    }

    // Check if SQS queue exists, create if not
    try {
      await sqsClient.send(
        new GetQueueUrlCommand({ QueueName: config.sqsQueueName }),
      );
      logger.debug('SQS queue exists', { queue: config.sqsQueueName });
    } catch (error) {
      logger.info('Creating SQS queue', { queue: config.sqsQueueName });
      await sqsClient.send(
        new CreateQueueCommand({ QueueName: config.sqsQueueName }),
      );
      logger.info('SQS queue created', { queue: config.sqsQueueName });
    }
  } catch (error) {
    logger.error('Error ensuring resources exist', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Get SQS queue URL
 */
async function getSqsQueueUrl(): Promise<string> {
  if (config.sqsQueueUrl) {
    return config.sqsQueueUrl;
  }

  try {
    const response = await sqsClient.send(
      new GetQueueUrlCommand({ QueueName: config.sqsQueueName }),
    );
    return response.QueueUrl!;
  } catch (error) {
    throw new Error(
      `Failed to get SQS queue URL for ${config.sqsQueueName}: ${error}`,
    );
  }
}

/**
 * Send receipt webhook (immediate notification when email is received)
 */
async function sendReceiptWebhook(emailData: EmailData): Promise<void> {
  if (!config.webhookUrl) {
    return; // No webhook configured
  }

  try {
    const receiptPayload = {
      type: 'email_received',
      messageId: emailData.messageId,
      timestamp: new Date().toISOString(),
      source: config.isLocal ? 'local' : 'production',
      email: {
        from: emailData.from,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        hasBody: !!emailData.body,
        hasHtml: !!emailData.html,
      },
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'mailtri-router/1.0',
      },
      body: JSON.stringify(receiptPayload),
    });

    if (response.ok) {
      logger.info('Receipt webhook sent successfully');
    } else {
      logger.warn('Receipt webhook failed', { status: response.status, statusText: response.statusText });
    }
  } catch (error) {
    logger.error('Receipt webhook error', { error: error instanceof Error ? error.message : 'Unknown error' });
    // Don't throw - receipt webhook failure shouldn't stop processing
  }
}

/**
 * Process incoming email
 */
async function processEmail(emailData: EmailData): Promise<ProcessResult> {
  try {
    logger.info('Processing email', { emailData });

    // Send receipt webhook immediately (before any processing)
    await sendReceiptWebhook(emailData);

    // Handle both email format and simple JSON input
    const emailContent = emailData.body || '';
    let parsedText = emailContent;
    let parsedHtml = emailData.html || '';
    let attachments: Attachment[] = [];
    let ccRecipients: string[] = [];
    let bccRecipients: string[] = [];

    // Check if this is a raw email format (contains headers)
    if (
      emailContent.includes('From:') ||
      emailContent.includes('To:') ||
      emailContent.includes('Subject:')
    ) {
      try {
        const emailParser = new EmailParser();
        const parsed = await emailParser.parseEmail(Buffer.from(emailContent));
        parsedText = parsed.body.normalized || parsed.body.text || '';
        parsedHtml = parsed.body.html || '';
        attachments = parsed.attachments || [];

        // Extract CC and BCC recipients from parsed email
        ccRecipients = parsed.cc?.map(addr => addr.address) || [];
        bccRecipients = parsed.bcc?.map(addr => addr.address) || [];

        logger.debug('Email recipients parsed', {
          to: parsed.to?.map(addr => addr.address) || [],
          cc: ccRecipients,
          bcc: bccRecipients,
        });
      } catch (error) {
        logger.warn('Could not parse as email, treating as plain text', { error: error instanceof Error ? error.message : 'Unknown error' });
        // Keep original content as plain text
      }
    }

    // Use provided CC/BCC from JSON input if not already set from email parsing
    logger.debug('CC/BCC processing', {
      ccRecipientsLength: ccRecipients.length,
      bccRecipientsLength: bccRecipients.length,
      emailDataCc: emailData.cc,
      emailDataBcc: emailData.bcc,
    });

    if (ccRecipients.length === 0 && emailData.cc) {
      ccRecipients = emailData.cc.split(',').map(addr => addr.trim());
      logger.debug('Set CC from JSON input', { ccRecipients });
    }
    if (bccRecipients.length === 0 && emailData.bcc) {
      bccRecipients = emailData.bcc.split(',').map(addr => addr.trim());
      logger.debug('Set BCC from JSON input', { bccRecipients });
    }

    // Process attachments if any
    let processedAttachments: any[] = [];
    if (attachments.length > 0) {
      logger.info('Processing attachments', { count: attachments.length });
      try {
        const attachmentProcessor = new AttachmentProcessor();
        processedAttachments = await attachmentProcessor.processAttachments(attachments as Attachment[]);
        logger.info('Attachments processed successfully', { count: processedAttachments.length });
      } catch (error) {
        logger.error('Failed to process attachments', { error: error instanceof Error ? error.message : 'Unknown error' });
        // Continue without attachments
      }
    }

    // Create processed email object
    const processedEmail: ProcessedEmail = {
      messageId: emailData.messageId,
      timestamp: new Date().toISOString(),
      email: {
        from: emailData.from,
        to: emailData.to,
        cc: ccRecipients.join(', '),
        bcc: bccRecipients.join(', '),
        subject: emailData.subject,
        body: parsedText,
        html: parsedHtml,
        attachments: processedAttachments,
      },
    };

    // Create S3 key for email storage
    const s3Key = `emails/${Date.now()}/${emailData.messageId}.json`;

    // Store email in S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: s3Key,
        Body: JSON.stringify(processedEmail, null, 2),
        ContentType: 'application/json',
        Metadata: {
          messageId: emailData.messageId,
        },
      }),
    );

    // Get SQS queue URL
    const queueUrl = await getSqsQueueUrl();

    // Send to SQS for downstream processing
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          messageId: emailData.messageId,
          s3Key,
          timestamp: new Date().toISOString(),
          source: config.isLocal ? 'local' : 'production',
        }),
        MessageAttributes: {
          from: {
            DataType: 'String',
            StringValue: emailData.from,
          },
          to: {
            DataType: 'String',
            StringValue: emailData.to,
          },
        },
      }),
    );

    // Send processing webhook if configured
    if (config.webhookUrl) {
      try {
        const processingPayload = {
          type: 'email_processed',
          messageId: emailData.messageId,
          s3Key,
          timestamp: new Date().toISOString(),
          source: config.isLocal ? 'local' : 'production',
          email: {
            from: emailData.from,
            to: emailData.to,
            cc: ccRecipients.join(', '),
            bcc: bccRecipients.join(', '),
            subject: emailData.subject,
            body: parsedText,
            html: parsedHtml,
            attachmentsCount: processedAttachments.length,
          },
        };

        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'mailtri-router/1.0',
          },
          body: JSON.stringify(processingPayload),
        });

        if (response.ok) {
          logger.info('Processing webhook sent successfully');
        } else {
          logger.warn('Processing webhook failed', { status: response.status, statusText: response.statusText });
        }
      } catch (error) {
        logger.error('Processing webhook error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    logger.info('Email processed successfully', { messageId: emailData.messageId, s3Key });
    logger.debug('Processed email data', { processedEmail });
    return { success: true };
  } catch (error) {
    logger.error('Error processing email', { error: error instanceof Error ? error.message : 'Unknown error', messageId: emailData.messageId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create HTTP server for webhook endpoint (local development only)
 */
function createHttpServer() {
  if (!config.isLocal) {
    return null; // No HTTP server in production
  }

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
          const result = await processEmailData(emailData);

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
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: config.isLocal ? 'local' : 'production',
          s3Bucket: config.s3Bucket,
          sqsQueueName: config.sqsQueueName,
        }),
      );
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  return server;
}

/**
 * Main function for local development server
 */
async function startLocalServer() {
  const server = createHttpServer();
  if (!server) {
    throw new Error(
      'HTTP server can only be created in local development mode',
    );
  }

  // Ensure required AWS resources exist
  try {
    await ensureResourcesExist();
  } catch (error) {
    logger.error('Failed to ensure AWS resources exist', { error: error instanceof Error ? error.message : 'Unknown error' });
    logger.info('Make sure LocalStack is running: docker-compose up -d');
    process.exit(1);
  }

  // Start server
  server.listen(config.port, () => {
    console.log('🚀 mailtri-router started!');
    console.log(`📡 Server running on http://localhost:${config.port}`);
    console.log(`📧 Webhook endpoint: http://localhost:${config.port}/webhook`);
    console.log(`❤️  Health check: http://localhost:${config.port}/health`);
    console.log('');
    console.log('🔧 Test with curl:');
    console.log(`curl -X POST http://localhost:${config.port}/webhook \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log(
      '  -d \'{"messageId": "test-123", "from": "test@example.com", "to": "task+notion@example.com", "subject": "Create task", "body": "New feature request"}\'',
    );
    console.log('');
    console.log('📚 Service URLs:');
    console.log('  • Mailpit Web UI: http://localhost:8025');
    console.log('  • LocalStack: http://localhost:4566');
    console.log('');
    console.log('🔧 Configuration:');
    console.log(`  • S3 Bucket: ${config.s3Bucket}`);
    console.log(`  • SQS Queue: ${config.sqsQueueName}`);
    console.log(`  • AWS Endpoint: ${config.awsEndpoint || 'default'}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down router...');
    server.close(() => {
      logger.info('Server stopped');
      process.exit(0);
    });
  });
}

/**
 * Lambda handler for production
 */
export const handler = async(event: any): Promise<any> => {
  logger.info('Processing email event', { eventType: 'Records' in event ? 'SES/SNS' : 'Direct', recordCount: 'Records' in event ? event.Records?.length : 1 });

  try {
    // Handle different event types
    if ('Records' in event && Array.isArray(event.Records)) {
      // SES/SNS event
      for (const record of event.Records) {
        await processEmailRecord(record);
      }
    } else if ('messageId' in event) {
      // Direct email object
      await processDirectEmail(event);
    } else {
      throw new Error('Unknown event format');
    }
  } catch (error) {
    logger.error('Error processing email event', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

/**
 * Process a single email record (SES/SNS)
 */
interface EmailRecord {
  Sns?: {
    Message: string;
  };
  ses?: {
    mail: {
      messageId: string;
      source: string;
      destination: string[];
      commonHeaders: {
        from: string[];
        to: string[];
        subject: string;
      };
    };
  };
}

// interface EmailData {
//   content?: string;
//   mail: {
//     messageId: string;
//     source: string;
//     destination: string[];
//     commonHeaders: {
//       from: string[];
//       to: string[];
//       subject: string;
//     };
//   };
// }

async function processEmailRecord(record: EmailRecord): Promise<void> {
  try {
    let emailData: any;

    // Handle SNS notification
    if (record.Sns && record.Sns.Message) {
      emailData = JSON.parse(record.Sns.Message);
    } else if (record.ses) {
      // Direct SES event
      emailData = record.ses;
    } else {
      throw new Error('Unknown record format');
    }

    await processEmailData(emailData);
  } catch (error) {
    logger.error('Error processing email record', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Process direct email data
 */
async function processDirectEmail(emailData: EmailData): Promise<void> {
  try {
    await processEmailData(emailData);
  } catch (error) {
    logger.error('Error processing direct email', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Process email data (unified for both SES and direct)
 */
async function processEmailData(emailData: any): Promise<void> {
  try {
    logger.debug('Processing email data', { messageId: emailData.messageId, from: emailData.from, to: emailData.to, subject: emailData.subject });

    // Extract email content based on data type
    let emailContent: string;
    let messageId: string;
    let from: string;
    let to: string;
    let subject: string;
    let html: string | undefined;
    let cc: string | undefined;
    let bcc: string | undefined;

    if ('mail' in emailData) {
      // EmailData type (SES)
      emailContent = emailData.content || '';
      messageId = emailData.mail.messageId || `msg-${Date.now()}`;
      from = emailData.mail.source || 'unknown@example.com';
      to = emailData.mail.destination?.[0] || 'unknown@example.com';
      subject = emailData.mail.commonHeaders?.subject || '';
    } else {
      // DirectEmailEvent type
      emailContent = emailData.body || '';
      messageId = emailData.messageId || `msg-${Date.now()}`;
      from = emailData.from || 'unknown@example.com';
      to = emailData.to || 'unknown@example.com';
      subject = emailData.subject || '';
      html = emailData.html;
      cc = emailData.cc;
      bcc = emailData.bcc;
    }

    // Process the email using the router
    const result = await processEmail({
      messageId,
      from,
      to,
      subject,
      body: emailContent,
      html,
      cc,
      bcc,
    } as EmailData);

    if (!result.success) {
      throw new Error(result.error || 'Failed to process email');
    }
  } catch (error) {
    logger.error('Error processing email data', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

// Start local server if running directly
if (require.main === module) {
  startLocalServer().catch((error) => {
    logger.error('Failed to start local server', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  });
}
