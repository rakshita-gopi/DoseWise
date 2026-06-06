function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return digits.startsWith('+') ? phone.trim() : `+${digits}`;
}

export async function sendSms(to, body) {
  const phone = normalizePhone(to);
  if (!phone) {
    console.warn('[SMS] No valid phone number provided');
    return { sent: false, reason: 'invalid_phone' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log(`[SMS] (dev mode) To: ${phone} | ${body}`);
    return { sent: false, reason: 'not_configured', devLogged: true };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: body }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[SMS] Twilio error:', err);
      return { sent: false, reason: 'provider_error' };
    }

    const data = await response.json();
    console.log(`[SMS] Sent to ${phone} (sid: ${data.sid})`);
    return { sent: true, sid: data.sid };
  } catch (err) {
    console.error('[SMS] Failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

export function resolveNotificationPhone(user, patient) {
  return user?.phone || patient?.emergencyContact?.phone || patient?.caregiverDetails?.phone || null;
}
