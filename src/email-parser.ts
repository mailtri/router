import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import {
  Attachment,
  ParsedEmail,
  EmailAddress,
  MailparserAddress,
  MailparserAddressObject,
} from './types';

export class EmailParsingError extends Error {
  constructor(
    message: string,
    public override cause?: Error,
    public context?: Record<string, unknown>,
  ) {
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
      const fromAddress = this.extractAddressValue(parsed.from);
      const toAddress = this.extractAddressValue(parsed.to);
      const hasFrom = fromAddress?.[0]?.address;
      const hasTo = toAddress?.[0]?.address;
      const hasSubject = parsed.subject;
      const hasBody = parsed.text || parsed.html;

      // If none of the basic email components are present, consider it malformed
      if (!hasFrom && !hasTo && !hasSubject && !hasBody) {
        throw new Error(
          'Email appears to be completely malformed - no recognizable email structure found',
        );
      }

      return {
        messageId: this.extractMessageId(parsed),
        from: this.normalizeEmailAddress(fromAddress?.[0] || {}),
        to: this.normalizeEmailAddresses(toAddress || []),
        cc: this.normalizeEmailAddresses(
          this.extractAddressValue(parsed.cc) || [],
        ),
        bcc: this.normalizeEmailAddresses(
          this.extractAddressValue(parsed.bcc) || [],
        ),
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

  private extractAddressValue(
    addressObj: AddressObject | AddressObject[] | undefined,
  ): MailparserAddress[] | undefined {
    if (!addressObj) return undefined;

    // Handle array of AddressObject
    if (Array.isArray(addressObj)) {
      const result: MailparserAddress[] = [];
      for (const obj of addressObj) {
        const value = (obj as MailparserAddressObject).value;
        if (value) result.push(...value);
      }
      return result.length > 0 ? result : undefined;
    }

    // Handle single AddressObject
    return (addressObj as MailparserAddressObject).value;
  }

  private extractMessageId(parsed: ParsedMail): string {
    // Try to extract from headers first
    if (parsed.headers && parsed.headers.get('message-id')) {
      return parsed.headers.get('message-id') as string;
    }

    // Fallback to generated ID
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private normalizeEmailAddress(
    address: Partial<MailparserAddress>,
  ): EmailAddress {
    if (!address || !address.address)
      return { address: '', name: '', original: '' };

    // Preserve the most faithful original representation if available
    const original: string =
      (typeof address.original === 'string' && address.original) ||
      (typeof address.text === 'string' && address.text) ||
      (address.name
        ? `${address.name} <${address.address}` + '>'
        : address.address);

    return {
      address: address.address.toLowerCase(),
      name: address.name || '',
      original,
    };
  }

  private normalizeEmailAddresses(
    addresses: MailparserAddress[],
  ): EmailAddress[] {
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

  private normalizeBody(parsed: ParsedMail): {
    text?: string;
    html?: string;
    normalized: string;
  } {
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

    const result: { text?: string; html?: string; normalized: string } = {
      normalized,
    };
    if (text) result.text = text;
    if (html) result.html = html;
    return result;
  }

  private processAttachments(
    attachments: ParsedMail['attachments'],
  ): Attachment[] {
    if (!attachments) return [];

    return attachments.map(attachment => {
      const result: Attachment = {
        filename: attachment.filename || 'unknown',
        contentType: attachment.contentType || 'application/octet-stream',
        size: attachment.size || 0,
        content: attachment.content,
        isInline: attachment.contentDisposition === 'inline',
      };
      if (attachment.cid) result.cid = attachment.cid;
      return result;
    });
  }

  private normalizeHeaders(
    headers: ParsedMail['headers'],
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (headers) {
      for (const [key, value] of headers) {
        if (typeof value === 'string') {
          normalized[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          normalized[key.toLowerCase()] = value.join(', ');
        } else if (value instanceof Date) {
          normalized[key.toLowerCase()] = value.toISOString();
        } else {
          normalized[key.toLowerCase()] = String(value);
        }
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
