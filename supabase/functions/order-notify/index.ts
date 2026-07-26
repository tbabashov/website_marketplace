// order-notify — sends the buyer a short email when their order reaches a
// milestone (quote sent, payment confirmed/rejected, delivered). Fired by a
// Supabase Database Webhook on INSERT into public.order_events, and sends via
// Resend. See ./README.md for the one-time setup (secrets + webhook).
//
// Deploy:  supabase functions deploy order-notify --no-verify-jwt
// (the webhook authenticates with the x-notify-secret header, not a JWT.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Only these transitions are worth an email — the rest are internal churn.
const NOTIFY = new Set(['quoted', 'paid', 'payment_rejected', 'delivered']);

// Azerbaijani copy — the site's default and the audience's language. Each entry
// is { subject, heading, body } for one target status.
const COPY: Record<string, { subject: string; heading: string; body: string }> = {
  quoted: {
    subject: 'Sifarişiniz üçün qiymət hazırdır',
    heading: 'Qiymətiniz hazırdır',
    body: 'Sifarişiniz üçün sabit qiymət və hazır olma tarixi göndərildi. Baxıb qəbul etmək üçün sifariş səhifəsini açın.',
  },
  paid: {
    subject: 'Ödənişiniz təsdiqləndi',
    heading: 'Ödəniş təsdiqləndi',
    body: 'Köçürməni bank çıxarışımda gördüm və təsdiqlədim. İş başlayır — növbəti addımları sifariş səhifəsində izləyə bilərsiniz.',
  },
  payment_rejected: {
    subject: 'Ödəniş təsdiqlənmədi',
    heading: 'Ödənişi təsdiqləyə bilmədim',
    body: 'Göndərdiyiniz qəbzi bank çıxarışımla uyğunlaşdıra bilmədim. Səbəbi və növbəti addımı sifariş səhifəsində yazmışam.',
  },
  delivered: {
    subject: 'Saytınız hazırdır',
    heading: 'Saytınız təhvilə hazırdır',
    body: 'Sayt hazırdır və sizə təhvil verilir. Linki və qeydləri sifariş səhifəsində tapa bilərsiniz.',
  },
};

function emailHtml(heading: string, body: string, orderUrl: string, ref: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#efede7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#121210">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:36px">
        <tr><td style="font-weight:800;font-size:18px;letter-spacing:-.02em">websale<span style="color:#1b33e0">.</span>az</td></tr>
        <tr><td style="padding-top:24px;font-size:22px;font-weight:700;line-height:1.25">${heading}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#44443e">${body}</td></tr>
        <tr><td style="padding-top:8px;font-size:13px;color:#8a8a80">Sifariş: ${ref}</td></tr>
        <tr><td style="padding-top:28px">
          <a href="${orderUrl}" style="display:inline-block;background:#1b33e0;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px">Sifarişə bax</a>
        </td></tr>
        <tr><td style="padding-top:28px;font-size:12px;color:#8a8a80;line-height:1.6">Bu məktub WebSale.az sifarişinizlə bağlı avtomatik göndərilib.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  // Only the database webhook, carrying the shared secret, may call this.
  const secret = Deno.env.get('NOTIFY_SECRET');
  if (!secret || req.headers.get('x-notify-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }

  let payload: { record?: { order_id?: string; to_status?: string } };
  try {
    payload = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const record = payload.record;
  const status = record?.to_status;
  if (!record?.order_id || !status || !NOTIFY.has(status)) {
    return new Response('ignored', { status: 200 }); // not an emailable event
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: order } = await admin
    .from('orders')
    .select('id, ref, user_id')
    .eq('id', record.order_id)
    .maybeSingle();
  if (!order) return new Response('order gone', { status: 200 });

  const { data: userData } = await admin.auth.admin.getUserById(order.user_id);
  const to = userData?.user?.email;
  if (!to) return new Response('no email', { status: 200 });

  const copy = COPY[status];
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://websale.az').replace(/\/+$/, '');
  const html = emailHtml(copy.heading, copy.body, `${siteUrl}/orders/${order.id}`, order.ref);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL') ?? 'WebSale.az <onboarding@resend.dev>',
      to,
      subject: copy.subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error('resend error', res.status, await res.text());
    return new Response('email failed', { status: 500 });
  }
  return new Response('sent', { status: 200 });
});
