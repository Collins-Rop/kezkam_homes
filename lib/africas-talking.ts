// Africa's Talking SMS utility
// Docs: https://developers.africastalking.com/docs/sms/sending
import { normalizePhones } from '@/lib/utils';

// Do NOT cache the instance — always create fresh so env var updates take effect immediately
function getATInstance() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AfricasTalking = require('africastalking');
  return AfricasTalking({
    apiKey: process.env.AT_API_KEY!,
    username: process.env.AT_USERNAME!,
  });
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type SmsRecipient = {
  number?: string;
  status?: string;
  messageId?: string;
};

type SmsSendResult = {
  SMSMessageData?: {
    Message?: string;
    Recipients?: SmsRecipient[];
  };
};

type ParsedSmsResult = {
  successful: SmsRecipient[];
  failed: SmsRecipient[];
  error?: string;
};

function getSenderId(): string | undefined {
  const senderId = process.env.AT_SENDER_ID?.trim();
  if (!senderId) return undefined;

  // Africa's Talking sender IDs are approved exact strings; spaces are rejected.
  if (!/^[A-Za-z0-9]{1,11}$/.test(senderId)) {
    console.warn(`[SMS] Ignoring invalid AT_SENDER_ID "${senderId}"`);
    return undefined;
  }

  return senderId;
}

function formatMessageIds(recipients: SmsRecipient[]): string | undefined {
  const messageIds = recipients
    .map((recipient) => recipient.messageId)
    .filter(Boolean);

  return messageIds.length ? messageIds.join(', ') : undefined;
}

function formatFailure(result: SmsSendResult): string {
  const failed = result?.SMSMessageData?.Recipients?.filter(
    (recipient) => recipient.status !== 'Success',
  ) ?? [];

  if (failed.length) {
    return failed
      .map((recipient) =>
        `${recipient.number ?? 'unknown'}: ${recipient.status ?? 'Unknown error'}`,
      )
      .join('; ');
  }

  return result?.SMSMessageData?.Message ?? 'Unknown error';
}

async function sendAndParse(
  sms: { send(options: Record<string, unknown>): Promise<SmsSendResult> },
  options: Record<string, unknown>,
): Promise<ParsedSmsResult> {
  const result = await sms.send(options);
  const recipients = result?.SMSMessageData?.Recipients ?? [];

  return {
    successful: recipients.filter((recipient) => recipient.status === 'Success'),
    failed: recipients.filter((recipient) => recipient.status !== 'Success'),
    error: formatFailure(result),
  };
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const normalizedTo = normalizePhones(to);

  if (normalizedTo.length === 0) {
    return { success: false, error: 'No valid phone number provided' };
  }

  // In development / missing credentials, log and skip
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    console.warn('[SMS] Africa\'s Talking credentials not set — skipping send');
    console.log(`[SMS] Would send to ${normalizedTo.join(', ')}: ${message}`);
    return { success: true, messageId: 'dev-mock-id' };
  }

  try {
    const at = getATInstance();
    const sms = at.SMS;

    const options: Record<string, unknown> = {
      to: normalizedTo,
      message,
    };

    const senderId = getSenderId();
    if (senderId) {
      options.senderId = senderId;
    }

    const firstAttempt = await sendAndParse(sms, options);
    let successful = firstAttempt.successful;
    let failed = firstAttempt.failed;
    let error = firstAttempt.error;

    // Some Kenyan routes reject unapproved sender IDs carrier-by-carrier.
    // Retry failed recipients through the default AT route before marking failed.
    if (senderId && (failed.length > 0 || successful.length === 0)) {
      const failedNumbers = failed
        .map((recipient) => recipient.number)
        .filter((number): number is string => Boolean(number));
      const retryNumbers = failedNumbers.length > 0 ? failedNumbers : normalizedTo;

      if (retryNumbers.length > 0) {
        console.warn(
          `[SMS] Sender ID route failed for ${retryNumbers.join(', ')}; retrying without sender ID`,
        );

        const fallbackAttempt = await sendAndParse(sms, {
          to: retryNumbers,
          message,
        });

        successful = [...successful, ...fallbackAttempt.successful];
        failed = fallbackAttempt.failed;
        error = failed.length
          ? `Sender ID route failed (${firstAttempt.error}); fallback route failed (${fallbackAttempt.error})`
          : undefined;
      }
    }

    if (successful.length > 0) {
      return {
        success: true,
        messageId: formatMessageIds(successful),
        error,
      };
    }

    return {
      success: false,
      error,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'SMS send failed';
    console.error('[SMS] Error:', error);
    return { success: false, error };
  }
}

// ─────────────────────────────────────────────
// Message templates
// ─────────────────────────────────────────────

export function buildConfirmationSMS(params: {
  tenantName: string;
  month: string;
  rent: number;
  water: number;
  garbage: number;
  security: number;
  deposit?: number;
  referenceNumber?: string;
}): string {
  const { tenantName, month, rent, water, garbage, security, deposit, referenceNumber } = params;
  const total = rent + water + garbage + security + (deposit ?? 0);
  const ref = referenceNumber ? `\nRef: ${referenceNumber}` : '';
  const depositLine = deposit && deposit > 0 ? `\nDeposit: KES ${deposit.toLocaleString()}` : '';
  return [
    `Hi ${tenantName},`,
    `Payment confirmed for ${month}.`,
    `Rent: KES ${rent.toLocaleString()}`,
    `Water: KES ${water.toLocaleString()}`,
    `Garbage: KES ${garbage.toLocaleString()}`,
    `Security: KES ${security.toLocaleString()}${depositLine}`,
    `Total: KES ${total.toLocaleString()}${ref}`,
    `Thank you - Kezkam Homes`,
  ].join('\n');
}

export function buildReminderSMS(params: {
  tenantName: string;
  month: string;
  rent: number;
  water: number;
  garbage: number;
  security: number;
}): string {
  const { tenantName, month, rent, water, garbage, security } = params;
  const total = rent + water + garbage + security;
  return [
    `Hi ${tenantName},`,
    `Your ${month} bill is due:`,
    `Rent: KES ${rent.toLocaleString()}`,
    `Water: KES ${water.toLocaleString()}`,
    `Garbage: KES ${garbage.toLocaleString()}`,
    `Security: KES ${security.toLocaleString()}`,
    `Total: KES ${total.toLocaleString()}`,
    `Please pay by end of month.`,
    `- Kezkam Homes`,
  ].join('\n');
}

export function buildMoveOutSMS(tenantName: string): string {
  return `Hi ${tenantName}, your tenancy at Kezkam Homes has been recorded as ended. Thank you for staying with us. - Kezkam Homes`;
}
