import { NextRequest, NextResponse } from 'next/server';
import { Dessert, getDaysUntilExpiration } from '../../../lib/types';

export async function POST(request: NextRequest) {
  const { level, items }: { level: 'warning' | 'danger'; items: Dessert[] } = await request.json();

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL;

  if (!apiKey || !toEmail) {
    return NextResponse.json({ ok: false, reason: 'Email not configured' }, { status: 200 });
  }

  const isUrgent = level === 'danger';
  const subject = isUrgent
    ? '🚨 URGENTE: Postres caducan en menos de 3 días'
    : '⚠️ Aviso: Postres próximos a caducar (menos de 5 días)';

  const itemRows = items
    .map(d => {
      const days = getDaysUntilExpiration(d.expirationDate);
      const daysText = days <= 0 ? 'HOY o ya caducado' : `en ${days} día${days === 1 ? '' : 's'}`;
      return `<tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 12px;font-weight:500;color:#1f2937">${d.name}</td>
        <td style="padding:10px 12px;text-align:center;color:#92400e;font-weight:bold">${d.quantity}</td>
        <td style="padding:10px 12px;text-align:center;color:#ef4444;font-weight:600">${daysText}</td>
      </tr>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#fafaf9;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:${isUrgent ? '#dc2626' : '#d97706'};padding:24px 28px">
      <h1 style="color:white;margin:0;font-size:20px">${isUrgent ? '🚨 Alerta urgente' : '⚠️ Aviso de caducidad'}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Control de Postres — ${new Date().toLocaleDateString('es-ES')}</p>
    </div>
    <div style="padding:24px 28px">
      <p style="color:#374151;margin-top:0">${isUrgent
        ? 'Los siguientes postres caducan en <strong>menos de 3 días</strong>. Considera regalarlos a cambio de publicidad o hacer alguna promoción.'
        : 'Los siguientes postres caducan en <strong>menos de 5 días</strong>. Planifica una estrategia para aprovecharlos.'}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Producto</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Stock</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Caduca</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:10px;border-left:4px solid #f59e0b">
        <p style="margin:0;color:#92400e;font-size:13px">Accede al sistema para ver el inventario completo y gestionar los productos.</p>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">Sistema de Control de Postres</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }
}

// Vercel Cron: runs daily at 8:00 AM
export async function GET(request: NextRequest) {
  // This endpoint is called by Vercel Cron — it checks all items server-side
  // Since we use localStorage (client-side), cron just returns OK
  // Email alerts are sent from the client on page load instead
  return NextResponse.json({ ok: true, message: 'Use POST from client to send alerts' });
}
