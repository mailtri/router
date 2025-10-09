import logger from './logger';
import { Config, EmailData } from './types';

/**
 * Send receipt webhook (immediate notification when email is received)
 */
export async function sendReceiptWebhook(
  config: Config,
  emailData: EmailData,
): Promise<void> {
  if (!config.webhookUrl) {
    return; // No webhook configured
  }

  try {
    const receiptPayload = {
      type: 'email_received',
      messageId: emailData.messageId,
      timestamp: new Date().toISOString(),
      source: config.isLocal ? 'local' : 'production',
      email: {
        from: emailData.from,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        hasBody: !!emailData.body,
        hasHtml: !!emailData.html,
      },
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'mailtri-router/1.0',
      },
      body: JSON.stringify(receiptPayload),
    });

    if (response.ok) {
      logger.info('Receipt webhook sent successfully');
    } else {
      logger.warn('Receipt webhook failed', {
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (error) {
    logger.error('Receipt webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - receipt webhook failure shouldn't stop processing
  }
}
