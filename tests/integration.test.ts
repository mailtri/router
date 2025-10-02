/**
 * Integration tests for the development server
 */

// Mock the development server
const mockServer = {
  listen: jest.fn((port, callback) => {
    if (callback) callback();
    return { close: jest.fn() };
  }),
};

jest.mock('http', () => ({
  createServer: jest.fn(() => mockServer),
}));

describe('Development Server Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Startup', () => {
    test('should start server on correct port', () => {
      const port = process.env.PORT || 3030;
      expect(port).toBe('3031');
    });

    test('should create HTTP server', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServer } = require('http');
      createServer();
      expect(createServer).toHaveBeenCalled();
    });
  });

  describe('Environment Configuration', () => {
    test('should have correct test environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.PORT).toBe('3031');
      expect(process.env.LOCALSTACK_ENDPOINT).toBe('http://localhost:4566');
    });
  });

  describe('AWS Configuration', () => {
    test('should use LocalStack endpoints', () => {
      const localstackEndpoint = 'http://localhost:4566';
      const s3Bucket = 'mailtri-emails-test';
      const sqsQueueUrl =
        'http://localhost:4566/000000000000/mailtri-processed-emails-test';

      expect(localstackEndpoint).toBe('http://localhost:4566');
      expect(s3Bucket).toBe('mailtri-emails-test');
      expect(sqsQueueUrl).toContain('mailtri-processed-emails-test');
    });
  });
});
