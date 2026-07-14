import type { VercelRequest, VercelResponse } from '@vercel/node';

const META_PIXEL_ID = '873230481338340';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { eventName, eventSourceUrl, fbc, fbp, eventId } = req.body || {};

    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor || '').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    const accessToken = process.env.META_CAPI_TOKEN;
    const testEventCode = process.env.META_TEST_EVENT_CODE;

    const eventPayload: Record<string, any> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: {
        client_ip_address: clientIp || undefined,
        client_user_agent: userAgent || undefined,
        fbc: fbc || undefined,
        fbp: fbp || undefined,
      },
    };

    const body: Record<string, any> = {
      data: [eventPayload],
      access_token: accessToken,
    };

    if (testEventCode) {
      body.test_event_code = testEventCode;
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      console.error('Meta CAPI error:', errText);
      res.status(500).json({ error: 'Falha ao enviar evento pro Meta' });
      return;
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Erro no /api/track:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
