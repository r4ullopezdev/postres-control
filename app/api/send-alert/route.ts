import { NextRequest, NextResponse } from 'next/server';
import { Dessert, getDaysUntilExpiration, getUrgentBatch, totalQuantity } from '../../../lib/types';

const TO_EMAILS = [
  'r4ul.lopez@gmail.com',
  'info@prontopizzapanama.com.pa',
];

export async function POST(request: NextRequest) {
  const { level, items }: { level: 'warning' | 'danger'; items: Dessert[] } = await request.json();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: 'RESEND_API_KEY not configured' }, { status: 200 });
  }

  const isUrgent = level === 'danger';
  const subject = isUrgent
    ? '🚨 URGENTE: Postres caducan en menos de 3 días'
    : '⚠️ Aviso: Postres próximos a caducar (menos de 5 días)';

  const itemRows = items.map(d => {
    const urgent = getUrgentBatch(d);
    if (!urgent) return '';
    const days = getDaysUntilExpiration(urgent.expirationDate);
    const daysText = days <= 0 ? '<strong style="color:#dc2626">HOY / Caducado</strong>' : `en <strong>${days} día${days === 1 ? '' : 's'}</strong>`;
    const batchCount = d.batches.filter(b => b.quantity > 0).length;
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 12px;font-weight:500;color:#1f2937">${d.name}${batchCount > 1 ? ` <span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px;font-size:11px">${batchCount} lotes</span>` : ''}</td>
      <td style="padding:10px 12px;text-align:center;color:#92400e;font-weight:bold">${totalQuantity(d)}</td>
      <td style="padding:10px 12px;text-align:center;color:#6b7280;font-size:13px">${new Date(urgent.expirationDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td style="padding:10px 12px;text-align:center">${daysText}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#fafaf9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:${isUrgent ? '#dc2626' : '#d97706'};padding:24px 28px">
      <h1 style="color:white;margin:0;font-size:20px">${isUrgent ? '🚨 Alerta urgente de caducidad' : '⚠️ Aviso de caducidad próxima'}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Control de Postres · ${new Date().toLocaleDateString('es-ES')}</p>
    </div>
    <div style="padding:24px 28px">
      <p style="color:#374151;margin-top:0">${isUrgent
        ? 'Los siguientes postres caducan en <strong>menos de 3 días</strong>. Considera regalarlos a cambio de publicidad o hacer una promoción.'
        : 'Los siguientes postres caducan en <strong>menos de 5 días</strong>. Planifica una estrategia para aprovecharlos.'}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Producto</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Stock</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Caduca</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Tiempo</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:24px;padding:16px;background:${isUrgent ? '#fef2f2' : '#fef3c7'};border-radius:10px;border-left:4px solid ${isUrgent ? '#ef4444' : '#f59e0b'}">
        <p style="margin:0;color:${isUrgent ? '#991b1b' : '#92400e'};font-size:13px">
          ${isUrgent
            ? '💡 <strong>Acción recomendada:</strong> Ofrece estos postres a cambio de una foto/mención en redes sociales.'
            : '💡 <strong>Nota:</strong> Revisa el stock y prepara estrategia de salida para estos productos.'}
        </p>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">Sistema de Control de Postres</p>
    </div>
  </div>
</body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
        to: TO_EMAILS,
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

export async function GET() {
  return NextResponse.json({ ok: true });
}
