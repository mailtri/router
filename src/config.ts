import { Config, S3ClientConfig, SQSClientConfig } from './types';

export function parseConfig(): {
  config: Config;
  s3ClientConfig: S3ClientConfig;
  sqsClientConfig: SQSClientConfig;
  } {
  const config: Config = {
    // Server configuration
    port: process.env.PORT || 3030,
    isLocal:
      process.env.NODE_ENV === 'development' || process.env.IS_LOCAL === 'true',

    // AWS configuration
    awsEndpoint:
      process.env.AWS_ENDPOINT_URL ||
      (process.env.IS_LOCAL === 'true' ? 'http://localhost:4566' : null),
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId:
      process.env.AWS_ACCESS_KEY_ID ||
      (process.env.IS_LOCAL === 'true' ? 'test' : null),
    awsSecretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY ||
      (process.env.IS_LOCAL === 'true' ? 'test' : null),

    // Resource configuration
    s3Bucket: process.env.S3_BUCKET || 'mailtri-emails',
    sqsQueueName: process.env.SQS_QUEUE_NAME || 'mailtri-processed-emails',
    sqsQueueUrl: process.env.SQS_QUEUE_URL || null,

    // Optional webhook
    webhookUrl: process.env.WEBHOOK_URL || null,
  };

  // Initialize AWS clients
  const s3ClientConfig: S3ClientConfig = {
    region: config.awsRegion,
  };

  if (config.awsEndpoint) {
    s3ClientConfig.endpoint = config.awsEndpoint;
  }

  if (config.awsAccessKeyId && config.awsSecretAccessKey) {
    s3ClientConfig.credentials = {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    };
  }

  if (config.isLocal) {
    s3ClientConfig.forcePathStyle = true;
  }

  const sqsClientConfig: SQSClientConfig = {
    region: config.awsRegion,
  };

  if (config.awsEndpoint) {
    sqsClientConfig.endpoint = config.awsEndpoint;
  }

  if (config.awsAccessKeyId && config.awsSecretAccessKey) {
    sqsClientConfig.credentials = {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    };
  }

  return { config, s3ClientConfig, sqsClientConfig };
}
