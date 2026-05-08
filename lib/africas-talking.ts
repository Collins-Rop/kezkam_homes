// Africa's Talking SMS utility
// Docs: https://developers.africastalking.com/docs/sms/sending
import { normalizePhone } from '@/lib/utils';

let atInstance: ReturnType<typeof import('africastalking')> | null = null;

function getATInstance() {
  if (!atInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AfricasTalking = require('africastalking');
    atInstance = AfricasTalking({
      apiKey: process.env.AT_API_KEY!,
      username: process.env.AT_USERNAME!,
    });
  }
  return atInstance!;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const normalizedTo = normalizePhone(to);

  // In development / missing credentials, log and skip
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    console.warn('[SMS] Africa\'s Talking credentials not set — skipping send');
    console.log(`[SMS] Would send to ${normalizedTo}: ${message}`);
    return { success: true, messageId: 'dev-mock-id' };
  }

  try {
    const at = getATInstance();
    const sms = at.SMS;

    const options: Record<string, unknown> = {
      to: [normalizedTo],
      message,
    };

    if (process.env.AT_SENDER_ID) {
      options.from = process.env.AT_SENDER_ID;
    }

    const result = await sms.send(options);
    const recipients = result?.SMSMessageData?.Recipients ?? [];
    const first = recipients[0];

    if (first?.status === 'Success') {
      return { success: true, messageId: first.messageId };
    }

    return { success: false, error: first?.status ?? 'Unknown error' };
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
