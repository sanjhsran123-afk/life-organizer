/**
 * SMS Provider Service for DayLedger Phone Verification
 *
 * Supports:
 * 1. Twilio REST API (via native fetch - zero extra dependencies)
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_PHONE_NUMBER (or TWILIO_MESSAGING_SERVICE_SID)
 * 2. Generic SMS Gateway / Webhook
 *    - SMS_GATEWAY_URL
 *    - SMS_GATEWAY_API_KEY
 *
 * If no SMS provider is configured in environment variables, phone verification
 * is marked unavailable and no verification code is dispatched or verified.
 */

/**
 * Checks whether an SMS provider is configured in environment variables.
 * @returns {boolean}
 */
export function isSmsConfigured() {
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );

  const hasGenericGateway = Boolean(
    process.env.SMS_GATEWAY_URL &&
    process.env.SMS_GATEWAY_API_KEY
  );

  return hasTwilio || hasGenericGateway;
}

/**
 * Normalize phone number to E.164 format if possible.
 * If number has 10 digits without country code, default to +91 or +1 if configured.
 * @param {string} phone
 * @returns {string}
 */
function formatE164(phone) {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  // If no leading +, prepend country code from env or default to +91 if 10 digits
  const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+91';
  if (cleaned.length === 10) {
    return `${defaultCountryCode}${cleaned}`;
  }
  return `+${cleaned}`;
}

/**
 * Sends a cryptographically generated verification code to the recipient via SMS.
 * Never logs the OTP code to server consoles or debug logs.
 *
 * @param {string} toPhone - Recipient phone number
 * @param {string} code - 6-digit numeric verification code
 * @returns {Promise<{ success: boolean; sid?: string }>}
 */
export async function sendVerificationSms(toPhone, code) {
  if (!isSmsConfigured()) {
    throw new Error('SMS service is not configured on this server. Phone verification is currently unavailable.');
  }

  const formattedTo = formatE164(toPhone);
  const smsBody = `Your DayLedger verification code is ${code}. Valid for 10 minutes. Do not share this code with anyone.`;

  // 1. Twilio REST API integration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', formattedTo);
    if (messagingServiceSid) {
      params.append('MessagingServiceSid', messagingServiceSid);
    } else if (fromPhone) {
      params.append('From', fromPhone);
    }
    params.append('Body', smsBody);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `SMS delivery failed with status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, sid: data.sid };
  }

  // 2. Generic SMS Gateway integration
  if (process.env.SMS_GATEWAY_URL && process.env.SMS_GATEWAY_API_KEY) {
    const response = await fetch(process.env.SMS_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        to: formattedTo,
        message: smsBody,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`SMS delivery via gateway failed with status ${response.status}`);
    }

    return { success: true };
  }

  throw new Error('No valid SMS provider configuration found.');
}
