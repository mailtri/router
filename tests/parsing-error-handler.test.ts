import { ParsingErrorHandler } from '../src/parsing-error-handler';

describe('ParsingErrorHandler', () => {
  let errorHandler: ParsingErrorHandler;

  beforeEach(() => {
    errorHandler = new ParsingErrorHandler();
  });

  describe('Error Handling', () => {
    it('should handle parsing errors gracefully', async() => {
      const error = new Error('Parsing failed');
      const emailData = Buffer.from('Invalid email content');

      const result = await errorHandler.handleParsingError(error, emailData);

      expect(result.messageId).toBe('unknown');
      expect(result.from.address).toBe('');
      expect(result.to).toHaveLength(0);
      expect(result.subject).toBe('');
      expect(result.body.normalized).toBe('');
      expect(result.attachments).toHaveLength(0);
      // Commands functionality removed
    });

    it('should create minimal email structure when basic extraction fails', async() => {
      const error = new Error('Complete parsing failure');
      const emailData = Buffer.from('Completely invalid data');

      // Mock the extractBasicInfo to throw an error
      jest
        .spyOn(errorHandler as any, 'extractBasicInfo')
        .mockRejectedValue(new Error('Basic extraction failed'));

      const result = await errorHandler.handleParsingError(error, emailData);

      expect(result.messageId).toMatch(/^minimal-\d+$/);
      expect(result.from.address).toBe('');
      expect(result.to).toHaveLength(0);
      expect(result.subject).toBe('');
      expect(result.body.normalized).toBe('');
      expect(result.attachments).toHaveLength(0);
      // Commands functionality removed
    });
  });

  describe('Header Extraction', () => {
    it('should extract headers from email content', () => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is the email body.`;

      const headers = errorHandler['extractHeaders'](Buffer.from(emailContent));

      expect(headers['from']).toBe('test@example.com');
      expect(headers['to']).toBe('recipient@example.com');
      expect(headers['subject']).toBe('Test Subject');
      expect(headers['date']).toBe('Mon, 1 Jan 2024 12:00:00 +0000');
      expect(headers['message-id']).toBe('<test@example.com>');
    });

    it('should handle malformed headers', () => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Invalid header line
Date: Mon, 1 Jan 2024 12:00:00 +0000

This is the email body.`;

      const headers = errorHandler['extractHeaders'](Buffer.from(emailContent));

      expect(headers['from']).toBe('test@example.com');
      expect(headers['to']).toBe('recipient@example.com');
      expect(headers['subject']).toBe('Test Subject');
      expect(headers['date']).toBe('Mon, 1 Jan 2024 12:00:00 +0000');
    });

    it('should stop at first empty line', () => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject

This is the email body.
From: another@example.com
To: another@example.com`;

      const headers = errorHandler['extractHeaders'](Buffer.from(emailContent));

      expect(headers['from']).toBe('test@example.com');
      expect(headers['to']).toBe('recipient@example.com');
      expect(headers['subject']).toBe('Test Subject');
      expect(headers['another@example.com']).toBeUndefined();
    });

    it('should handle empty email content', () => {
      const headers = errorHandler['extractHeaders'](Buffer.from(''));

      expect(headers).toEqual({});
    });

    it('should handle invalid email content', () => {
      const headers = errorHandler['extractHeaders'](
        Buffer.from('Invalid content without headers'),
      );

      expect(headers).toEqual({});
    });
  });

  describe('Email Address Parsing', () => {
    it('should parse email address with name', () => {
      const result = errorHandler['parseEmailAddress'](
        'John Doe <john@example.com>',
      );

      expect(result.address).toBe('john@example.com');
      expect(result.name).toBe('John Doe');
      expect(result.original).toBe('John Doe <john@example.com>');
    });

    it('should parse email address without name', () => {
      const result = errorHandler['parseEmailAddress']('john@example.com');

      expect(result.address).toBe('john@example.com');
      expect(result.name).toBe('');
      expect(result.original).toBe('john@example.com');
    });

    it('should handle empty email address', () => {
      const result = errorHandler['parseEmailAddress']('');

      expect(result.address).toBe('');
      expect(result.name).toBe('');
      expect(result.original).toBe('');
    });

    it('should handle malformed email address', () => {
      const result = errorHandler['parseEmailAddress']('invalid-email');

      expect(result.address).toBe('invalid-email');
      expect(result.name).toBe('');
      expect(result.original).toBe('invalid-email');
    });

    it('should handle email address with extra spaces', () => {
      const result = errorHandler['parseEmailAddress'](
        '  John Doe  <  john@example.com  >  ',
      );

      expect(result.address).toBe('john@example.com');
      expect(result.name).toBe('John Doe');
      expect(result.original).toBe('  John Doe  <  john@example.com  >  ');
    });
  });

  describe('Email Addresses Parsing', () => {
    it('should parse multiple email addresses', () => {
      const result = errorHandler['parseEmailAddresses'](
        'john@example.com, Jane Doe <jane@example.com>, bob@example.com',
      );

      expect(result).toHaveLength(3);
      expect(result[0]?.address).toBe('john@example.com');
      expect(result[0]?.name).toBe('');
      expect(result[1]?.address).toBe('jane@example.com');
      expect(result[1]?.name).toBe('Jane Doe');
      expect(result[2]?.address).toBe('bob@example.com');
      expect(result[2]?.name).toBe('');
    });

    it('should handle single email address', () => {
      const result = errorHandler['parseEmailAddresses']('john@example.com');

      expect(result).toHaveLength(1);
      expect(result[0]?.address).toBe('john@example.com');
    });

    it('should handle empty email addresses string', () => {
      const result = errorHandler['parseEmailAddresses']('');

      expect(result).toHaveLength(0);
    });

    it('should handle malformed email addresses', () => {
      const result = errorHandler['parseEmailAddresses'](
        'invalid-email, another-invalid',
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.address).toBe('invalid-email');
      expect(result[1]?.address).toBe('another-invalid');
    });
  });

  describe('Basic Info Extraction', () => {
    it('should extract basic information from email', async() => {
      const emailContent = `From: John Doe <john@example.com>
To: Jane Doe <jane@example.com>, bob@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is the email body.`;

      const result = await errorHandler['extractBasicInfo'](
        Buffer.from(emailContent),
      );

      expect(result.messageId).toBe('<test@example.com>');
      expect(result.from.address).toBe('john@example.com');
      expect(result.from.name).toBe('John Doe');
      expect(result.to).toHaveLength(2);
      expect(result.to[0]?.address).toBe('jane@example.com');
      expect(result.to[0]?.name).toBe('Jane Doe');
      expect(result.to[1]?.address).toBe('bob@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.body.normalized).toBe('');
      expect(result.attachments).toHaveLength(0);
      // Commands functionality removed
    });

    it('should handle missing headers', async() => {
      const emailContent = `Subject: Test Subject

This is the email body.`;

      const result = await errorHandler['extractBasicInfo'](
        Buffer.from(emailContent),
      );

      expect(result.messageId).toBe('unknown');
      expect(result.from.address).toBe('');
      expect(result.to).toHaveLength(0);
      expect(result.subject).toBe('Test Subject');
    });

    it('should handle empty email content', async() => {
      const result = await errorHandler['extractBasicInfo'](Buffer.from(''));

      expect(result.messageId).toBe('unknown');
      expect(result.from.address).toBe('');
      expect(result.to).toHaveLength(0);
      expect(result.subject).toBe('');
    });
  });

  describe('Minimal Email Creation', () => {
    it('should create minimal email structure', () => {
      const emailData = Buffer.from('Some email data');
      const result = errorHandler['createMinimalEmail'](emailData);

      expect(result.messageId).toMatch(/^minimal-\d+$/);
      expect(result.from.address).toBe('');
      expect(result.from.name).toBe('');
      expect(result.from.original).toBe('');
      expect(result.to).toHaveLength(0);
      expect(result.subject).toBe('');
      expect(result.body.normalized).toBe('');
      expect(result.attachments).toHaveLength(0);
      expect(result.headers).toEqual({});
      expect(result.date).toBeInstanceOf(Date);
      expect(result.size).toBe(emailData.length);
      // Commands functionality removed
    });
  });
});
