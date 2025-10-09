export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  cid?: string;
  isInline?: boolean;
}

export interface EmailAddress {
  address: string;
  name: string;
  original: string;
}

export interface ParsedEmail {
  messageId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: {
    text?: string;
    html?: string;
    normalized: string;
  };
  attachments: Attachment[];
  headers: Record<string, string>;
  date: Date;
  size: number;
}

export interface ProcessedAttachment extends Attachment {
  processed: boolean;
  metadata?: any;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: any[];
  data: any;
}

export interface EmailData {
  messageId: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body?: string;
  html?: string;
}

export interface ProcessResult {
  success: boolean;
  error?: string;
}

export interface ProcessedEmail {
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

export interface Config {
  // Server configuration
  port: string | number;
  isLocal: boolean;

  // AWS configuration
  awsEndpoint: string | null;
  awsRegion: string;
  awsAccessKeyId: string | null;
  awsSecretAccessKey: string | null;

  // Resource configuration
  s3Bucket: string;
  sqsQueueName: string;
  sqsQueueUrl: string | null;

  // Optional webhook
  webhookUrl: string | null;
}

export interface S3ClientConfig {
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle?: boolean;
}

export interface SQSClientConfig {
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}
