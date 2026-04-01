export interface Batch {
  id: string;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Dessert {
  id: string;
  name: string;
  unit: string;
  batches: Batch[];
}

export function totalQuantity(dessert: Dessert): number {
  return dessert.batches.reduce((s, b) => s + b.quantity, 0);
}

export function getDaysUntilExpiration(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(date + 'T00:00:00');
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export type AlertLevel = 'none' | 'warning' | 'danger';

/** Returns the most urgent alert level among all batches with stock > 0 */
export function getDessertAlertLevel(dessert: Dessert): AlertLevel {
  const activeBatches = dessert.batches.filter(b => b.quantity > 0);
  if (activeBatches.length === 0) return 'none';
  let worst: AlertLevel = 'none';
  for (const b of activeBatches) {
    const level = getBatchAlertLevel(b.expirationDate);
    if (level === 'danger') return 'danger';
    if (level === 'warning') worst = 'warning';
  }
  return worst;
}

export function getBatchAlertLevel(date: string): AlertLevel {
  const days = getDaysUntilExpiration(date);
  if (days <= 3) return 'danger';
  if (days <= 5) return 'warning';
  return 'none';
}

/** The earliest-expiring batch with quantity > 0 */
export function getUrgentBatch(dessert: Dessert): Batch | null {
  const active = dessert.batches.filter(b => b.quantity > 0);
  if (active.length === 0) return null;
  return active.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))[0];
}

/** Sell qty from earliest-expiring batches first (FIFO) */
export function sellFromBatches(dessert: Dessert, qty: number): Dessert {
  const batches = [...dessert.batches]
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
    .map(b => ({ ...b }));

  let remaining = qty;
  for (const b of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(b.quantity, remaining);
    b.quantity -= deduct;
    remaining -= deduct;
  }
  return { ...dessert, batches };
}
