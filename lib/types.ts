export interface Dessert {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string; // YYYY-MM-DD
  createdAt: string;
}

export type AlertLevel = 'none' | 'warning' | 'danger';

export function getDaysUntilExpiration(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAlertLevel(expirationDate: string): AlertLevel {
  const days = getDaysUntilExpiration(expirationDate);
  if (days <= 3) return 'danger';
  if (days <= 5) return 'warning';
  return 'none';
}
