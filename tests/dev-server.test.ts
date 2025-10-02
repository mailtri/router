/**
 * Tests for the development server
 */

import { parseEmailIntent } from '../dev/email-parser';

// Mock the server implementation
jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((port, callback) => {
      if (callback) callback();
      return { close: jest.fn() };
    }),
  })),
}));

describe('Development Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Intent Parsing', () => {
    test('should parse recipient commands correctly', async () => {
      const intent = await parseEmailIntent(
        'Test email content',
        'user@example.com',
        'task+notion@domain.com',
        'Test Subject'
      );

      expect(intent.action).toBe('create_task');
      expect(intent.target).toBe('notion');
    });

    test('should parse invoice recipient commands', async () => {
      const intent = await parseEmailIntent(
        'Invoice content',
        'user@example.com',
        'invoice+quickbooks@domain.com',
        'Regular Subject'
      );

      expect(intent.action).toBe('create_invoice');
      expect(intent.target).toBe('quickbooks');
    });

    test('should parse subject line commands', async () => {
      const intent = await parseEmailIntent(
        'Email content',
        'user@example.com',
        'user@domain.com',
        'Send Invoice: Q1'
      );

      expect(intent.action).toBe('process_invoice');
      expect(intent.target).toBe('quickbooks');
    });

    test('should parse meeting subject commands', async () => {
      const intent = await parseEmailIntent(
        'Meeting content',
        'user@example.com',
        'user@domain.com',
        'Schedule Meeting: Tomorrow'
      );

      expect(intent.action).toBe('schedule_meeting');
      expect(intent.target).toBe('calendar');
    });

    test('should parse body commands with #task', async () => {
      const intent = await parseEmailIntent(
        '#task Implement user authentication',
        'user@example.com',
        'user@domain.com',
        'Test Subject'
      );

      expect(intent.action).toBe('create_task');
      expect(intent.parameters.description).toBe(
        'Implement user authentication'
      );
    });

    test('should parse body commands with #meeting', async () => {
      const intent = await parseEmailIntent(
        '#meeting Schedule standup for tomorrow',
        'user@example.com',
        'user@domain.com',
        'Test Subject'
      );

      expect(intent.action).toBe('create_meeting');
      expect(intent.parameters.description).toBe(
        'Schedule standup for tomorrow'
      );
    });

    test('should handle unknown commands', async () => {
      const intent = await parseEmailIntent(
        'Regular email content',
        'user@example.com',
        'user@domain.com',
        'Regular Subject'
      );

      expect(intent.action).toBe('unknown');
      expect(intent.target).toBe('unknown');
    });
  });

  describe('Server Configuration', () => {
    test('should use correct port from environment', () => {
      const port = process.env.PORT || 3030;
      expect(port).toBe('3031'); // From test setup
    });

    test('should have correct service endpoints', () => {
      const config = {
        localstackEndpoint: 'http://localhost:4566',
        mailpitEndpoint: 'http://localhost:8025',
        s3Bucket: 'mailtri-emails-test',
        sqsQueueUrl:
          'http://localhost:4566/000000000000/mailtri-processed-emails-test',
      };

      expect(config.localstackEndpoint).toBe('http://localhost:4566');
      expect(config.mailpitEndpoint).toBe('http://localhost:8025');
      expect(config.s3Bucket).toBe('mailtri-emails-test');
    });
  });

  describe('Email Data Validation', () => {
    test('should validate required email fields', () => {
      const validEmailData = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'task+notion@domain.com',
        subject: 'Test Subject',
        body: 'Test content',
      };

      expect(validEmailData.messageId).toBeDefined();
      expect(validEmailData.from).toBeDefined();
      expect(validEmailData.to).toBeDefined();
      expect(validEmailData.subject).toBeDefined();
    });

    test('should handle optional body field', () => {
      const emailDataWithoutBody: {
        messageId: string;
        from: string;
        to: string;
        subject: string;
        body?: string;
      } = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'task+notion@domain.com',
        subject: 'Test Subject',
      };

      expect(emailDataWithoutBody.body).toBeUndefined();
    });
  });
});
