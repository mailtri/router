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

// Metadata types for different attachment types
export interface ImageMetadata {
  type: 'image';
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface CalendarEventMetadata {
  summary?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
}

export interface CalendarMetadata {
  type: 'calendar';
  events: CalendarEventMetadata[];
}

export interface DocumentMetadata {
  type: 'document' | 'pdf' | 'docx';
  pages: number;
  author: string;
  title: string;
  size: number;
}

export interface ArchiveMetadata {
  type: 'archive';
  fileCount: number;
  compressedSize: number;
  uncompressedSize: number;
  format: string;
}

export type AttachmentMetadata =
  | ImageMetadata
  | CalendarMetadata
  | DocumentMetadata
  | ArchiveMetadata
  | Record<string, unknown>;

export interface ProcessedAttachment extends Attachment {
  processed: boolean;
  metadata?: AttachmentMetadata;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: ValidationError[];
  data: T;
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

// Mailparser types
export interface MailparserAddress {
  address: string;
  name?: string;
  original?: string;
  text?: string;
}

export interface MailparserAddressObject {
  value?: MailparserAddress[];
  text?: string;
}

// AWS Lambda event types
export interface LambdaEvent {
  Records?: EmailRecord[];
  messageId?: string;
}

export interface LambdaResponse {
  statusCode: number;
  body: string;
}

export interface EmailRecord {
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

export interface SESEmailData {
  content?: string;
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

// Email intent parsing types
export interface EmailIntent {
  action: string;
  target: string;
  parameters: Record<string, unknown>;
}
