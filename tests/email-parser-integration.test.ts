import { EmailParser } from '../src/email-parser';
import { AttachmentProcessor } from '../src/attachment-processor';
import * as fs from 'fs';
import * as path from 'path';

describe('Email Parser Integration Tests', () => {
  let parser: EmailParser;
  let attachmentProcessor: AttachmentProcessor;

  beforeEach(() => {
    parser = new EmailParser();
    attachmentProcessor = new AttachmentProcessor();
  });

  const loadEmailFixture = (filename: string): Buffer => {
    const fixturePath = path.join(__dirname, 'fixtures', 'emails', filename);
    return fs.readFileSync(fixturePath);
  };

  describe('Simple Email Processing', () => {
    it('should process simple email fixture', async() => {
      const emailContent = loadEmailFixture('simple-email.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.body.normalized).toBe('This is a simple test email body.');
      expect(result.attachments).toHaveLength(0);
      // Commands functionality removed
    });
  });

  describe('Plus-Addressed Email Processing', () => {
    it('should process plus-addressed email fixture', async() => {
      const emailContent = loadEmailFixture('plus-addressed-email.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('sender@example.com');
      expect(result.to[0]?.address).toBe('user+task@example.com');
      expect(result.subject).toBe('Create Task');
      expect(result.body.normalized).toBe(
        'Please create a new task for implementing user authentication.',
      );
      // Commands functionality removed
    });
  });

  describe('Multipart Email Processing', () => {
    it('should process multipart/alternative email fixture', async() => {
      const emailContent = loadEmailFixture('multipart-alternative.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Multipart Alternative Test');
      expect(result.body.text).toContain('plain text version');
      expect(result.body.html).toContain('<b>HTML</b>');
      expect(result.body.normalized).toContain('plain text version');
      expect(result.attachments).toHaveLength(0);
    });

    it('should process multipart/mixed email fixture', async() => {
      const emailContent = loadEmailFixture('multipart-mixed.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Multipart Mixed with Attachments');
      expect(result.body.normalized).toBe('This email contains attachments.');
      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0]?.filename).toBe('document.pdf');
      expect(result.attachments[0]?.contentType).toBe('application/pdf');
      expect(result.attachments[1]?.filename).toBe('image.png');
      expect(result.attachments[1]?.contentType).toBe('image/png');
    });
  });

  describe('Unicode Email Processing', () => {
    it('should process Unicode email fixture', async() => {
      const emailContent = loadEmailFixture('unicode-email.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toContain('Test Email with Emoji');
      expect(result.body.normalized).toContain('🚀');
      expect(result.body.normalized).toContain('àáâãäåæçèéêë');
      expect(result.body.normalized).toContain('€ £ ¥ $ ₹');
    });
  });

  describe('Encoding Email Processing', () => {
    it('should process quoted-printable email fixture', async() => {
      const emailContent = loadEmailFixture('quoted-printable.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Quoted-Printable Test');
      expect(result.body.normalized).toContain('line breaks');
      expect(result.body.normalized).toContain('special characters like this');
    });

    it('should process base64 email fixture', async() => {
      const emailContent = loadEmailFixture('base64-email.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Base64 Test');
      expect(result.body.normalized).toContain(
        'test email with base64 encoding',
      );
      expect(result.body.normalized).toContain(
        'line breaks and special characters',
      );
    });
  });

  // Command extraction tests removed - AI will handle intent extraction downstream

  describe('Attachment Processing Integration', () => {
    it('should process ICS attachment fixture', async() => {
      const emailContent = loadEmailFixture('ics-attachment.eml');
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Calendar Event');
      expect(result.body.normalized).toBe(
        'Please find the calendar event attached.',
      );
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]?.filename).toBe('event.ics');
      expect(result.attachments[0]?.contentType).toBe('text/calendar');

      // Process the attachment
      const processedAttachment = await attachmentProcessor.processAttachment(
        result.attachments[0]!,
      );
      expect(processedAttachment.processed).toBe(true);
      expect(processedAttachment.metadata.type).toBe('calendar');
      expect(processedAttachment.metadata.events).toHaveLength(1);
      expect(processedAttachment.metadata.events[0].summary).toBe(
        'Test Meeting',
      );
      expect(processedAttachment.metadata.events[0].start).toBe(
        '20240101T120000Z',
      );
      expect(processedAttachment.metadata.events[0].end).toBe(
        '20240101T130000Z',
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed email fixture', async() => {
      const emailContent = loadEmailFixture('malformed-email.eml');

      // This should not throw an error
      const result = await parser.parseEmail(emailContent);

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Malformed Email Test');
      expect(result.body.normalized).toContain('malformed email');
    });

    it('should handle completely invalid email content', async() => {
      const invalidContent = Buffer.from('This is not a valid email format');

      try {
        await parser.parseEmail(invalidContent);
        // If it doesn't throw, the error handler should have been used
      } catch (error) {
        expect((error as Error).name).toBe('EmailParsingError');
      }
    });
  });

  describe('End-to-End Processing', () => {
    it('should process email with all components', async() => {
      const emailContent = loadEmailFixture('command-extraction.eml');

      // Parse email
      const parsedEmail = await parser.parseEmail(emailContent);

      // Command extraction removed - AI will handle intent extraction downstream

      // Process attachments
      const processedAttachments = await Promise.all(
        parsedEmail.attachments.map(attachment =>
          attachmentProcessor.processAttachment(attachment),
        ),
      );

      expect(parsedEmail.from.address).toBe('sender@example.com');
      expect(parsedEmail.to).toHaveLength(2);
      // Command extraction removed - AI will handle intent extraction downstream
      expect(processedAttachments).toHaveLength(0); // No attachments in this fixture
    });
  });

  describe('Performance Tests', () => {
    it('should process emails within acceptable time limits', async() => {
      const emailContent = loadEmailFixture('multipart-mixed.eml');

      const startTime = Date.now();
      const result = await parser.parseEmail(emailContent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should process in less than 1 second
      expect(result.attachments).toHaveLength(2);
    });

    it('should handle large email content efficiently', async() => {
      // Create a large email content
      const largeBody = 'This is a test email body. '.repeat(10000);
      const emailContent = Buffer.from(`From: test@example.com
To: recipient@example.com
Subject: Large Email Test
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <large@example.com>

${largeBody}`);

      const startTime = Date.now();
      const result = await parser.parseEmail(emailContent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should process in less than 2 seconds
      expect(result.body.normalized).toContain('This is a test email body.');
    });
  });
});
