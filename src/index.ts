import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { simpleParser } from 'mailparser';
// Email parser logic (copied from dev/email-parser.ts)
interface EmailIntent {
  action: string;
  target: string;
  parameters: Record<string, unknown>;
}

async function parseEmailIntent(emailContent: string, from: string, to: string, subject: string): Promise<EmailIntent> {
  const intent: EmailIntent = {
    action: 'unknown',
    target: 'unknown',
    parameters: {},
  };

  // Parse recipient commands (e.g., task+notion@domain.com)
  const recipientMatch = to.match(/(\w+)\+(\w+)@/);
  if (recipientMatch && recipientMatch[1] && recipientMatch[2]) {
    intent.action = `create_${recipientMatch[1]}`;
    intent.target = recipientMatch[2];
  }

  // Parse subject line commands
  const subjectMatch = subject.match(/(\w+)\s+(.+)/);
  if (subjectMatch && subjectMatch[1] && subjectMatch[2]) {
    intent.action = `process_${subjectMatch[1]}`;
    intent.parameters.description = subjectMatch[2];
  }

  // Parse body content commands
  const bodyMatch = emailContent.match(/#(\w+)\s+(.+)/);
  if (bodyMatch?.[1] && bodyMatch?.[2]) {
    intent.action = `create_${bodyMatch[1]}`;
    intent.parameters.description = bodyMatch[2];
  }

  return intent;
}

// Initialize AWS clients
const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

if (!S3_BUCKET || !SQS_QUEUE_URL) {
  throw new Error('Missing required environment variables: S3_BUCKET, SQS_QUEUE_URL');
}
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Optional webhook URL

interface ProcessedEmail {
  messageId: string;
  timestamp: string;
  email: {
    from: string;
    to: string;
    subject: string;
    body: string;
    html?: string;
    attachments: unknown[];
  };
  intent: {
    action: string;
    target: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Main Lambda handler for processing email events
 * This function can be triggered by SES, SNS, or direct invocation
 */
interface SESEvent {
  Records: Array<{
    eventSource: string;
    ses: {
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
  }>;
}

interface DirectEmailEvent {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export const handler = async(event: SESEvent | DirectEmailEvent): Promise<void> => {
  console.log('📧 Processing email event:', JSON.stringify(event, null, 2));

  try {
    // Handle different event types
    if (event.Records && Array.isArray(event.Records)) {
      // SES/SNS event
      for (const record of event.Records) {
        await processEmailRecord(record);
      }
    } else if (event.messageId) {
      // Direct email object
      await processDirectEmail(event);
    } else {
      throw new Error('Unknown event format');
    }
  } catch (error) {
    console.error('❌ Error processing email event:', error);
    throw error;
  }
};

/**
 * Process a single email record
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

interface EmailData {
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
}

async function processEmailRecord(record: EmailRecord): Promise<void> {
  try {
    let emailData: EmailData;

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
    console.error('❌ Error processing email record:', error);
    throw error;
  }
}

/**
 * Process direct email data
 */
async function processDirectEmail(emailData: DirectEmailEvent): Promise<void> {
  try {
    await processEmailData(emailData);
  } catch (error) {
    console.error('❌ Error processing direct email:', error);
    throw error;
  }
}

/**
 * Process email data
 */
async function processEmailData(emailData: EmailData | DirectEmailEvent): Promise<void> {
  try {
    console.log('📨 Processing email data:', emailData);

    // Extract email content
    const emailContent = emailData.content || emailData.body || '';
    const messageId = emailData.mail?.messageId || emailData.messageId || `msg-${Date.now()}`;
    const from = emailData.mail?.source || emailData.from || 'unknown@example.com';
    const to = emailData.mail?.destination?.[0] || emailData.to || 'unknown@example.com';
    const subject = emailData.mail?.commonHeaders?.subject || emailData.subject || '';

    // Parse email content
    let parsedText = emailContent;
    let parsedHtml = '';
    let attachments: unknown[] = [];

    try {
      const parsed = await simpleParser(emailContent);
      parsedText = parsed.text || '';
      parsedHtml = parsed.html || '';
      attachments = parsed.attachments || [];
    } catch (error) {
      console.log('⚠️  Could not parse email content, treating as plain text');
    }

    // Extract intent from email
    const intent = await parseEmailIntent(parsedText, from, to, subject);

    // Create processed email object
    const processedEmail: ProcessedEmail = {
      messageId,
      timestamp: new Date().toISOString(),
      email: {
        from,
        to,
        subject,
        body: parsedText,
        html: parsedHtml,
        attachments,
      },
      intent,
    };

    // Store in S3
    const s3Key = `emails/${Date.now()}/${messageId}.json`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: JSON.stringify(processedEmail, null, 2),
        ContentType: 'application/json',
        Metadata: {
          messageId,
          from,
          to,
          subject,
          intentAction: intent.action,
          intentTarget: intent.target,
        },
      }),
    );

    // Send to SQS for downstream processing
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          messageId,
          s3Key,
          intent,
          timestamp: new Date().toISOString(),
          source: 'lambda',
        }),
        MessageAttributes: {
          intentAction: {
            DataType: 'String',
            StringValue: intent.action,
          },
          intentTarget: {
            DataType: 'String',
            StringValue: intent.target,
          },
          from: {
            DataType: 'String',
            StringValue: from,
          },
          to: {
            DataType: 'String',
            StringValue: to,
          },
        },
      }),
    );

    // Send webhook if configured
    if (WEBHOOK_URL) {
      try {
        const webhookPayload = {
          messageId,
          s3Key,
          intent,
          timestamp: new Date().toISOString(),
          source: 'lambda',
          email: {
            from,
            to,
            subject,
            body: parsedText,
            html: parsedHtml,
          },
        };

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'mailtri-router/1.0',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (response.ok) {
          console.log('✅ Webhook sent successfully');
        } else {
          console.warn('⚠️ Webhook failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Webhook error:', error);
      }
    }

    console.log('✅ Email processed successfully:', {
      messageId,
      intent,
      s3Key,
    });
  } catch (error) {
    console.error('❌ Error processing email data:', error);
    throw error;
  }
}
