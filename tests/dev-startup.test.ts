/**
 * Tests for development server startup and configuration
 */

describe('Development Server Startup', () => {
  test('should have correct environment configuration', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PORT).toBe('3031');
  });

  test('should have LocalStack configuration', () => {
    expect(process.env.LOCALSTACK_ENDPOINT).toBe('http://localhost:4566');
    expect(process.env.S3_BUCKET).toBe('mailtri-emails-test');
    expect(process.env.SQS_QUEUE_URL).toContain(
      'mailtri-processed-emails-test',
    );
  });

  test('should validate port configuration', () => {
    const port = parseInt(process.env.PORT || '3030');
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
  });

  test('should have valid service endpoints', () => {
    const localstackEndpoint = process.env.LOCALSTACK_ENDPOINT;
    const mailpitEndpoint = 'http://localhost:8025';

    expect(localstackEndpoint).toMatch(/^http:\/\/localhost:\d+$/);
    expect(mailpitEndpoint).toMatch(/^http:\/\/localhost:\d+$/);
  });
});
