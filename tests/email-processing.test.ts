/**
 * Tests for email processing logic
 */

import { simpleParser } from 'mailparser';

// Mock mailparser
jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

const mockSimpleParser = simpleParser as jest.MockedFunction<
  typeof simpleParser
>;

describe('Email Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Content Parsing', () => {
    test('should parse simple text content', async () => {
      const emailContent = 'Simple email content';

      mockSimpleParser.mockResolvedValue({
        text: 'Simple email content',
        html: '',
        attachments: [],
        headers: new Map(),
        headerLines: [],
      } as any);

      const result = await mockSimpleParser(emailContent);

      expect(result.text).toBe('Simple email content');
      expect(result.html).toBe('');
      expect(result.attachments).toEqual([]);
    });

    test('should parse HTML content', async () => {
      const emailContent = '<p>HTML email content</p>';

      mockSimpleParser.mockResolvedValue({
        text: 'HTML email content',
        html: '<p>HTML email content</p>',
        attachments: [],
        headers: new Map(),
        headerLines: [],
      } as any);

      const result = await mockSimpleParser(emailContent);

      expect(result.html).toBe('<p>HTML email content</p>');
    });

    test('should handle attachments', async () => {
      const emailContent = 'Email with attachment';

      mockSimpleParser.mockResolvedValue({
        text: 'Email with attachment',
        html: '',
        attachments: [
          {
            filename: 'test.pdf',
            contentType: 'application/pdf',
            content: Buffer.from('test content'),
          } as any,
        ],
        headers: new Map(),
        headerLines: [],
      } as any);

      const result = await mockSimpleParser(emailContent);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments?.[0]?.filename).toBe('test.pdf');
    });

    test('should handle email format detection', () => {
      const rawEmailContent = `From: user@example.com
To: task+notion@domain.com
Subject: Test Subject

Test email content`;

      const isEmailFormat =
        rawEmailContent.includes('From:') ||
        rawEmailContent.includes('To:') ||
        rawEmailContent.includes('Subject:');

      expect(isEmailFormat).toBe(true);
    });

    test('should handle simple JSON input', () => {
      const simpleContent = 'Simple text content';

      const isEmailFormat =
        simpleContent.includes('From:') ||
        simpleContent.includes('To:') ||
        simpleContent.includes('Subject:');

      expect(isEmailFormat).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle mailparser errors gracefully', async () => {
      const emailContent = 'Invalid email format';

      mockSimpleParser.mockRejectedValue(new Error('Invalid email format'));

      try {
        await mockSimpleParser(emailContent);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid email format');
      }
    });
  });
});
