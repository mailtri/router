import { simpleParser } from 'mailparser';
import { Attachment, ParsedEmail, EmailAddress } from './types';

export interface ProcessedAttachment extends Attachment {
  processed: boolean;
  metadata?: any;
  error?: string;
}

export class EmailParsingError extends Error {
  constructor(message: string, public override cause?: Error, public context?: any) {
    super(message);
    this.name = 'EmailParsingError';
  }
}

export class EmailParser {
  constructor() {
    // No need to initialize mailparser instance
  }

  async parseEmail(rawEmail: Buffer): Promise<ParsedEmail> {
    try {
      const parsed = await simpleParser(rawEmail);

      // Validate that we have at least some basic email structure
      const hasFrom = (parsed.from as any)?.value?.[0]?.address;
      const hasTo = (parsed.to as any)?.value?.[0]?.address;
      const hasSubject = parsed.subject;
      const hasBody = parsed.text || parsed.html;

      // If none of the basic email components are present, consider it malformed
      if (!hasFrom && !hasTo && !hasSubject && !hasBody) {
        throw new Error('Email appears to be completely malformed - no recognizable email structure found');
      }

      return {
        messageId: this.extractMessageId(parsed),
        from: this.normalizeEmailAddress((parsed.from as any)?.value?.[0] || {}),
        to: this.normalizeEmailAddresses((parsed.to as any)?.value || []),
        cc: this.normalizeEmailAddresses((parsed.cc as any)?.value || []),
        bcc: this.normalizeEmailAddresses((parsed.bcc as any)?.value || []),
        subject: this.normalizeSubject(parsed.subject || ''),
        body: this.normalizeBody(parsed),
        attachments: this.processAttachments(parsed.attachments || []),
        headers: this.normalizeHeaders(parsed.headers),
        date: parsed.date || new Date(),
        size: rawEmail.length,
      };
    } catch (error) {
      throw new EmailParsingError('Failed to parse email', error as Error);
    }
  }

  private extractMessageId(parsed: any): string {
    // Try to extract from headers first
    if (parsed.headers && parsed.headers.get('message-id')) {
      return parsed.headers.get('message-id');
    }

    // Fallback to generated ID
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }


  private normalizeEmailAddress(address: any): EmailAddress {
    if (!address || !address.address) return { address: '', name: '', original: '' };

    // Preserve the most faithful original representation if available
    const original: string =
      (typeof address.original === 'string' && address.original) ||
      (typeof address.text === 'string' && address.text) ||
      (address.name ? `${address.name} <${address.address}` + '>' : address.address);

    return {
      address: address.address.toLowerCase(),
      name: address.name || '',
      original,
    };
  }

  private normalizeEmailAddresses(addresses: any[]): EmailAddress[] {
    if (!addresses) return [];

    return addresses.map(addr => this.normalizeEmailAddress(addr));
  }

  private normalizeSubject(subject: string): string {
    if (!subject) return '';

    // Remove common prefixes and normalize
    return subject
      .replace(/^(re:|fwd?:|fw:)\s*/i, '')
      .trim()
      .normalize('NFC');
  }

  private normalizeBody(parsed: any): { text?: string; html?: string; normalized: string } {
    const text = parsed.text || '';
    const html = parsed.html || '';

    // Create normalized version (prefer text, fallback to HTML)
    let normalized = text;
    if (!normalized && html) {
      normalized = this.stripHtmlTags(html);
    }

    // Normalize line endings and whitespace
    normalized = normalized
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text: text || undefined,
      html: html || undefined,
      normalized,
    };
  }

  private processAttachments(attachments: any[]): Attachment[] {
    if (!attachments) return [];

    return attachments.map(attachment => ({
      filename: attachment.filename || 'unknown',
      contentType: attachment.contentType || 'application/octet-stream',
      size: attachment.size || 0,
      content: attachment.content,
      cid: attachment.cid,
      isInline: attachment.contentDisposition === 'inline',
    }));
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (headers) {
      for (const [key, value] of headers) {
        normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
      }
    }

    return normalized;
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .trim();
  }


}
