import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class MailtriRouterStack extends cdk.Stack {
  public readonly emailBucket: s3.Bucket;
  public readonly processedQueue: sqs.Queue;
  public readonly emailProcessor: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for storing emails
    this.emailBucket = new s3.Bucket(this, 'EmailBucket', {
      bucketName: `mailtri-emails-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // SQS Queue for processed emails
    const dlq = new sqs.Queue(this, 'ProcessedDLQ', {
      queueName: 'mailtri-processed-emails-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    this.processedQueue = new sqs.Queue(this, 'ProcessedQueue', {
      queueName: 'mailtri-processed-emails',
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Lambda function for email processing
    this.emailProcessor = new lambda.Function(this, 'EmailProcessor', {
      functionName: 'mailtri-email-processor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-package'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        S3_BUCKET: this.emailBucket.bucketName,
        SQS_QUEUE_URL: this.processedQueue.queueUrl,
        WEBHOOK_URL: this.node.tryGetContext('webhookUrl') || '', // Optional webhook URL
        LOG_LEVEL: 'INFO',
      },
      logGroup: new logs.LogGroup(this, 'EmailProcessorLogGroup', {
        logGroupName: '/aws/lambda/mailtri-email-processor',
        retention: logs.RetentionDays.ONE_MONTH,
      }),
      deadLetterQueue: new sqs.Queue(this, 'EmailProcessorDLQ', {
        queueName: 'mailtri-email-processor-dlq',
        retentionPeriod: cdk.Duration.days(14),
      }),
    });

    // Grant permissions to Lambda
    this.emailBucket.grantReadWrite(this.emailProcessor);
    this.processedQueue.grantSendMessages(this.emailProcessor);

    // SES Configuration Set
    const sesConfigurationSet = new ses.ConfigurationSet(
      this,
      'SESConfigurationSet',
      {
        configurationSetName: 'mailtri-router',
        sendingEnabled: true,
      },
    );

    // IAM Role for SES to access S3 (created but not used in CDK due to SES limitations)
    new iam.Role(this, 'SESRole', {
      assumedBy: new iam.ServicePrincipal('ses.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    // Note: SES event destination configuration should be done via AWS CLI
    // after deployment due to CDK limitations with SES event destinations

    // Route 53 Configuration (optional)
    const domainName = this.node.tryGetContext('domainName');

    if (domainName && domainName !== 'example.com') {
      // Only create Route 53 records if a real domain is provided
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName,
      });

      // Create SES domain verification record
      new route53.TxtRecord(this, 'SESDomainVerification', {
        zone: hostedZone,
        recordName: `_amazonses.${domainName}`,
        values: ['SES domain verification will be added after deployment'],
      });

      // Create SPF record for email authentication
      new route53.TxtRecord(this, 'SPFRecord', {
        zone: hostedZone,
        recordName: domainName,
        values: ['v=spf1 include:amazonses.com ~all'],
      });

      // Create DMARC record for email authentication
      new route53.TxtRecord(this, 'DMARCRecord', {
        zone: hostedZone,
        recordName: `_dmarc.${domainName}`,
        values: [`v=DMARC1; p=quarantine; rua=mailto:dmarc@${domainName}`],
      });

      // Create DKIM records (these will be updated after SES domain verification)
      new route53.TxtRecord(this, 'DKIMRecord1', {
        zone: hostedZone,
        recordName: `dkim1._domainkey.${domainName}`,
        values: ['DKIM record will be added after SES domain verification'],
      });

      new route53.TxtRecord(this, 'DKIMRecord2', {
        zone: hostedZone,
        recordName: `dkim2._domainkey.${domainName}`,
        values: ['DKIM record will be added after SES domain verification'],
      });

      new route53.TxtRecord(this, 'DKIMRecord3', {
        zone: hostedZone,
        recordName: `dkim3._domainkey.${domainName}`,
        values: ['DKIM record will be added after SES domain verification'],
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'EmailBucketName', {
      value: this.emailBucket.bucketName,
      description: 'S3 Bucket for storing emails',
      exportName: 'MailtriEmailBucket',
    });

    new cdk.CfnOutput(this, 'ProcessedQueueUrl', {
      value: this.processedQueue.queueUrl,
      description: 'SQS Queue URL for processed emails',
      exportName: 'MailtriProcessedQueue',
    });

    new cdk.CfnOutput(this, 'EmailProcessorArn', {
      value: this.emailProcessor.functionArn,
      description: 'Lambda function ARN for email processing',
      exportName: 'MailtriEmailProcessor',
    });

    new cdk.CfnOutput(this, 'SESConfigurationSetName', {
      value: sesConfigurationSet.configurationSetName,
      description: 'SES Configuration Set Name',
      exportName: 'MailtriSESConfigurationSet',
    });

    if (domainName && domainName !== 'example.com') {
      new cdk.CfnOutput(this, 'DomainName', {
        value: domainName,
        description: 'Domain name for email routing',
        exportName: 'MailtriDomainName',
      });
    }
  }
}
