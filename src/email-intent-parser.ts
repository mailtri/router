/**
 * Email intent parsing utilities for mailtri-router
 */

export interface EmailIntent {
  action: string;
  target: string;
  parameters: Record<string, unknown>;
}

/**
 * Parse email content and extract intent
 */
export async function parseEmailIntent(
  emailContent: string,
  from: string,
  to: string,
  subject: string,
): Promise<EmailIntent> {
  const intent: EmailIntent = {
    action: 'unknown',
    target: 'unknown',
    parameters: {},
  };

  // Parse recipient commands (e.g., task+notion@domain.com)
  const recipientMatch = to.match(/(\w+)\+(\w+)@/);
  if (recipientMatch && recipientMatch[1] && recipientMatch[2]) {
    intent.action = `create_${recipientMatch[1]}`;
    intent.target = recipientMatch[2];
  }

  // Parse subject line commands
  if (subject.toLowerCase().includes('invoice')) {
    intent.action = 'process_invoice';
    intent.target = 'quickbooks';
  } else if (subject.toLowerCase().includes('meeting')) {
    intent.action = 'schedule_meeting';
    intent.target = 'calendar';
  } else if (subject.toLowerCase().includes('task')) {
    intent.action = 'create_task';
    intent.target = 'notion';
  }

  // Parse body content commands
  const bodyMatch = emailContent.match(/#(\w+)\s+(.+)/);
  if (bodyMatch && bodyMatch[1] && bodyMatch[2]) {
    intent.action = `create_${bodyMatch[1]}`;
    intent.parameters.description = bodyMatch[2];
    console.log('🔍 Body command detected:', bodyMatch[1], bodyMatch[2]);
  }

  return intent;
}
