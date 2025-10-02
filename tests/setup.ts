/**
 * Jest test setup file
 * Configures test environment for mailtri-router
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3031'; // Use different port for tests
process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
process.env.S3_BUCKET = 'mailtri-emails-test';
process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/mailtri-processed-emails-test';

// Mock AWS SDK for tests
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({})
  })),
  PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({})
  })),
  SendMessageCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({})
  })),
  SendEmailCommand: jest.fn()
}));

// Mock mailparser
jest.mock('mailparser', () => ({
  simpleParser: jest.fn().mockResolvedValue({
    text: 'Test email content',
    html: '<p>Test email content</p>',
    attachments: []
  })
}));

// Global test timeout
jest.setTimeout(10000);
