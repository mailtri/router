import { ParsedEmail } from './types';

export class ParsingErrorHandler {
  async handleParsingError(error: Error, emailData: any): Promise<ParsedEmail> {
    // Log the error with context
    console.error('Email parsing error:', {
      error: error.message,
      stack: error.stack,
      emailSize: emailData.length,
      emailHeaders: this.extractHeaders(emailData),
    });

    // Try to extract basic information even if parsing fails
    try {
      return await this.extractBasicInfo(emailData);
    } catch (fallbackError) {
      // If even basic extraction fails, return minimal structure
      return this.createMinimalEmail(emailData);
    }
  }

  private async extractBasicInfo(emailData: any): Promise<ParsedEmail> {
    // Extract basic headers using regex
    const headers = this.extractHeaders(emailData);

    return {
      messageId: headers['message-id'] || 'unknown',
      from: this.parseEmailAddress(headers.from || ''),
      to: this.parseEmailAddresses(headers.to || ''),
      subject: headers.subject || '',
      body: { normalized: '' },
      attachments: [],
      headers,
      date: new Date(headers.date || Date.now()),
      size: emailData.length,
    };
  }

  private createMinimalEmail(emailData: any): ParsedEmail {
    return {
      messageId: `minimal-${Date.now()}`,
      from: { address: '', name: '', original: '' },
      to: [],
      subject: '',
      body: { normalized: '' },
      attachments: [],
      headers: {},
      date: new Date(),
      size: emailData.length,
    };
  }

  private extractHeaders(emailData: any): Record<string, string> {
    const headers: Record<string, string> = {};

    try {
      const content = emailData.toString('utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Stop at first empty line (end of headers)
        if (trimmed === '') break;

        // Parse header line
        if (trimmed.includes(':')) {
          const colonIndex = trimmed.indexOf(':');
          const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
          const value = trimmed.substring(colonIndex + 1).trim();

          headers[key] = value;
        }
      }
    } catch (error) {
      console.error('Failed to extract headers:', error);
    }

    return headers;
  }

  private parseEmailAddress(addressString: string): {
    address: string;
    name: string;
    original: string;
  } {
    if (!addressString) {
      return { address: '', name: '', original: '' };
    }

    try {
      // Simple email parsing - in production, use a proper library
      const match = addressString.match(
        /^\s*(.+?)\s*<\s*(.+?)\s*>\s*$|^\s*(.+?)\s*$/,
      );

      if (match) {
        if (match[2]) {
          // Format: "Name <email@domain.com>"
          return {
            address: match[2].trim().toLowerCase(),
            name: match[1]?.trim() || '',
            original: addressString,
          };
        } else if (match[3]) {
          // Format: "email@domain.com"
          return {
            address: match[3].trim().toLowerCase(),
            name: '',
            original: addressString,
          };
        }
      }
    } catch (error) {
      console.error('Failed to parse email address:', error);
    }

    return {
      address: addressString.trim().toLowerCase(),
      name: '',
      original: addressString,
    };
  }

  private parseEmailAddresses(
    addressString: string,
  ): Array<{ address: string; name: string; original: string }> {
    if (!addressString) return [];

    try {
      // Split by comma and parse each address
      const addresses = addressString.split(',').map(addr => addr.trim());
      return addresses.map(addr => this.parseEmailAddress(addr));
    } catch (error) {
      console.error('Failed to parse email addresses:', error);
      return [];
    }
  }
}
