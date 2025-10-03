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

// ExtractedCommand interface removed - AI will handle intent extraction downstream

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
